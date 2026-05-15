/**
 * healer.js
 *
 * Auto-healing de tests fallidos. Cuando Playwright reporta un fallo
 * por selector incorrecto, este módulo:
 *
 * 1. Parsea el output de Playwright para identificar qué falló y por qué
 * 2. Abre el browser y reproduce la acción que causó el fallo
 * 3. Busca el texto esperado en el DOM real post-acción
 * 4. Si lo encuentra, reescribe el selector en el archivo .spec.js
 *
 * Solo actúa sobre fallos de tipo "selector encontró el elemento pero
 * el texto/valor no coincide". No intenta curar fallos de lógica,
 * timeouts de red, o errores de sintaxis.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Elimina los códigos de escape ANSI del output de Playwright.
 * Playwright colorea su output con secuencias como \u001b[32m (verde),
 * \u001b[39m (reset), etc. Estas secuencias rompen los regex del parser
 * porque quedan intercaladas en el texto que queremos extraer.
 */
function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Parsea el output de texto de Playwright y extrae los fallos accionables.
 */
function parseFailures(playwrightOutput, cwd) {
  const clean = stripAnsi(playwrightOutput);
  const failures = [];
  const errorBlocks = clean.split(/\n\s*\d+\) /);

  for (const block of errorBlocks) {
    if (!block.includes('toHaveText') && !block.includes('toContainText')) continue;

    const expectedMatch = block.match(/Expected:\s+"([^"]+)"/);
    if (!expectedMatch) continue;
    const expectedText = expectedMatch[1];

    const locatorMatch = block.match(/Locator:\s+locator\('([^']+)'\)/);
    if (!locatorMatch) continue;
    const locator = locatorMatch[1];

    const fileMatch = block.match(/at\s+([^\n]+\.spec\.js):(\d+):/);
    if (!fileMatch) continue;

    let filePath = fileMatch[1].trim();
    const line = parseInt(fileMatch[2], 10);

    if (!path.isAbsolute(filePath)) {
      filePath = path.join(cwd, filePath);
    }
    filePath = path.normalize(filePath);

    failures.push({ filePath, line, expectedText, locator });
  }

  const seen = new Set();
  return failures.filter(f => {
    const key = `${f.filePath}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extrae las acciones de interacción previas a la línea del fallo.
 */
function extractActionsBeforeLine(filePath, failLine) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const actions = [];

  for (let i = failLine - 2; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('test(') || line.startsWith('test.beforeEach')) break;

    if (
      line.includes('page.fill(') ||
      line.includes('page.click(') ||
      line.includes('page.goto(') ||
      line.includes('page.press(') ||
      line.includes('page.selectOption(')
    ) {
      actions.unshift(line);
    }
  }

  return actions;
}

/**
 * Extrae la URL del goto del beforeEach.
 */
function extractGotoUrl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/page\.goto\('([^']+)'\)/);
  return match ? match[1] : null;
}

/**
 * Abre el browser, reproduce las acciones, y busca el texto esperado
 * en el DOM resultante. Devuelve el selector del elemento que lo contiene.
 */
async function findSelectorInLiveDom(url, actions, expectedText) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url);

    for (const action of actions) {
      if (action.includes('page.goto(')) continue;
      try {
        const fn = new Function('page', `return (async () => { ${action} })()`);
        await fn(page);
        await page.waitForTimeout(500);
      } catch {
        console.log(`   ⚠️  Acción no ejecutable: ${action.substring(0, 60)}`);
      }
    }

    await page.waitForTimeout(1000);

    const candidateSelectors = [
      '#flash',
      '.flash',
      '.alert',
      '.error',
      '.message',
      '.notification',
      '[role="alert"]',
      'p',
      'span',
      'div',
    ];

    for (const selector of candidateSelectors) {
      const elements = await page.locator(selector).all();
      for (const el of elements) {
        try {
          const text = await el.textContent();
          if (text && text.includes(expectedText)) {
            const id = await el.getAttribute('id');
            const className = await el.getAttribute('class');
            await browser.close();
            if (id) return `#${id}`;
            if (className) {
              const firstClass = className.trim().split(/\s+/)[0];
              return `.${firstClass}`;
            }
            return selector;
          }
        } catch {
          continue;
        }
      }
    }

    await browser.close();
    return null;

  } catch (err) {
    await browser.close();
    throw err;
  }
}

/**
 * Reemplaza el selector incorrecto en el archivo .spec.js y cambia
 * toHaveText por toContainText cuando corresponde.
 *
 * Por qué toContainText: cuando el healer encuentra el texto esperado
 * dentro de un elemento que tiene contenido adicional (como el botón ×
 * de cierre en mensajes flash), toHaveText falla porque exige match
 * exacto. toContainText verifica que el texto esté contenido dentro,
 * sin importar el resto del contenido del elemento.
 */
function patchFile(filePath, failLine, oldLocator, newSelector) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const targetLine = lines[failLine - 1];

  if (!targetLine) {
    console.log(`   ⚠️  No se encontró la línea ${failLine}`);
    return false;
  }

  const oldPattern = `locator('${oldLocator}')`;
  const newPattern = `locator('${newSelector}')`;

  if (!targetLine.includes(oldPattern)) {
    console.log(`   ⚠️  Patrón no encontrado en línea ${failLine}: ${oldPattern}`);
    return false;
  }

  // Primero reemplazamos el selector
  let newLine = targetLine.replace(oldPattern, newPattern);

  // Luego cambiamos toHaveText por toContainText.
  // El healer encontró el texto dentro del elemento pero puede haber
  // contenido adicional (espacios, botón de cierre, etc.), entonces
  // toHaveText (match exacto) siempre fallará. toContainText es correcto.
  newLine = newLine.replace('.toHaveText(', '.toContainText(');

  lines[failLine - 1] = newLine;
  fs.writeFileSync(filePath, lines.join('\n'));
  return true;
}

/**
 * Función principal. Detecta fallos, intenta curarlos, retorna resumen.
 */
async function healFailures(playwrightOutput, cwd) {
  const failures = parseFailures(playwrightOutput, cwd);

  if (failures.length === 0) {
    return { healed: 0, failed: 0, details: [] };
  }

  console.log(`\n🔧 Auto-healing: ${failures.length} fallo(s) accionable(s) detectado(s)\n`);

  let healed = 0;
  let failed = 0;
  const details = [];

  for (const failure of failures) {
    const { filePath, line, expectedText, locator } = failure;

    console.log(`   → Curando: "${expectedText}" en ${path.basename(filePath)}:${line}`);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Archivo no encontrado: ${filePath}`);
      failed++;
      details.push(`❌ ${path.basename(filePath)}:${line} — archivo no encontrado`);
      continue;
    }

    const url = extractGotoUrl(filePath);
    if (!url) {
      console.log(`   ⚠️  No se pudo extraer la URL`);
      failed++;
      details.push(`❌ ${path.basename(filePath)}:${line} — URL no encontrada`);
      continue;
    }

    const actions = extractActionsBeforeLine(filePath, line);

    try {
      const newSelector = await findSelectorInLiveDom(url, actions, expectedText);

      if (!newSelector) {
        console.log(`   ⚠️  Texto "${expectedText}" no encontrado en DOM post-acción`);
        failed++;
        details.push(`❌ ${path.basename(filePath)}:${line} — texto no encontrado en DOM`);
        continue;
      }

      if (newSelector === locator) {
        console.log(`   ⚠️  Selector encontrado es el mismo que el original`);
        failed++;
        details.push(`❌ ${path.basename(filePath)}:${line} — mismo selector`);
        continue;
      }

      const patched = patchFile(filePath, line, locator, newSelector);

      if (patched) {
        console.log(`   ✅ Curado: locator('${locator}').toHaveText → locator('${newSelector}').toContainText`);
        healed++;
        details.push(`✅ ${path.basename(filePath)}:${line} — ${locator} → ${newSelector}`);
      } else {
        failed++;
        details.push(`❌ ${path.basename(filePath)}:${line} — patch falló`);
      }

    } catch (err) {
      console.log(`   ⚠️  Error durante healing: ${err.message}`);
      failed++;
      details.push(`❌ ${path.basename(filePath)}:${line} — ${err.message}`);
    }
  }

  return { healed, failed, details };
}

module.exports = { healFailures };