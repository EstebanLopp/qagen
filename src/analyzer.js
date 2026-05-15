const { chromium } = require('playwright');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { detectFlow } = require('./flow-detector');

dotenv.config();

// Validación temprana: si no hay API key, el error aparece aquí con
// un mensaje claro, no en medio de la ejecución después de abrir browsers
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Falta OPENAI_API_KEY en el archivo .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function detectPageCategory(url) {
  const u = url.toLowerCase();
  if (u.includes('basic_auth') || u.includes('digest_auth')) return 'auth';
  if (u.includes('download_secure')) return 'auth_required';
  if (u.includes('dynamic_content')) return 'dynamic';
  if (u.includes('typos')) return 'dynamic';
  if (u.includes('entry_ad') || u.includes('exit_intent')) return 'modal';
  if (u.includes('context_menu')) return 'context_menu';
  if (u.includes('tinymce')) return 'iframe_editor';
  if (u.includes('nested_frames')) return 'nested_frames';
  if (u.includes('key_presses')) return 'key_presses';
  return 'standard';
}

async function analyzeApp(url) {
  console.log(`\n🔍 Analizando: ${url}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);

  const elements = await page.evaluate(() => {
    const result = { buttons: [], inputs: [], forms: [], links: [] };

    document.querySelectorAll('button').forEach(el => {
      result.buttons.push({
        text: el.innerText.trim(),
        type: el.type,
        disabled: el.disabled,
        visible: el.offsetParent !== null
      });
    });

    document.querySelectorAll('input').forEach(el => {
      result.inputs.push({
        type: el.type,
        name: el.name,
        placeholder: el.placeholder,
        disabled: el.disabled,
        checked: el.checked,
        value: el.value,
        visible: el.offsetParent !== null
      });
    });

    document.querySelectorAll('form').forEach((el, i) => {
      result.forms.push(`form-${i}`);
    });

    document.querySelectorAll('a').forEach(el => {
      if (el.innerText.trim()) {
        result.links.push({
          text: el.innerText.trim(),
          href: el.href,
          target: el.target || '_self'
        });
      }
    });

    return result;
  });

  const pageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      h1: document.querySelector('h1')?.innerText?.trim() || '',
      h2: document.querySelector('h2')?.innerText?.trim() || '',
      hasIframe: document.querySelectorAll('iframe').length > 0,
      hasFileInput: document.querySelectorAll('input[type="file"]').length > 0,
      hasShadowDOM: Array.from(document.querySelectorAll('*')).some(el => el.shadowRoot)
    };
  });

  const bodyHTML = await page.evaluate(() => {
    const main = document.querySelector('.example') ||
                 document.querySelector('main') ||
                 document.querySelector('#content') ||
                 document.body;
    return main.innerHTML
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);
  });

  await browser.close();

  const flow = detectFlow(url, elements, pageInfo);

  console.log(`✅ Elementos encontrados`);
  console.log(`🧠 Flujo detectado: ${flow.type} (confianza: ${flow.confidence})`);
  console.log(`🤖 Generando tests con IA...\n`);

  const pageCategory = detectPageCategory(url);
  const result = await generateTests(url, elements, bodyHTML, pageInfo, pageCategory, flow);

  if (!result) {
    throw new Error(`No se pudo generar código válido para ${url}`);
  }

  const filepath = saveTests(result.code, url);
  return filepath;
}

async function generateTests(url, elements, bodyHTML, pageInfo, pageCategory, flow) {
  const categoryInstructions = {
    auth: `INSTRUCCIÓN ESPECIAL - PÁGINA CON AUTENTICACIÓN:
- El beforeEach debe usar: await page.goto('${url.replace('://', '://admin:admin@')}');
- Para verificar contenido usa locators específicos: page.locator('h1'), page.locator('p')
- NUNCA uses expect(page).toHaveText() — eso no existe. Usa expect(page.locator('...')).toBeVisible()
- Testea solo visibilidad de elementos, no texto exacto`,

    auth_required: `INSTRUCCIÓN ESPECIAL - PÁGINA PROTEGIDA:
- Esta página requiere autenticación que no podemos proveer
- Genera SOLO 1 test: verificar que la página responde (toHaveURL)
- NO intentes acceder al contenido protegido`,

    dynamic: `INSTRUCCIÓN ESPECIAL - CONTENIDO DINÁMICO:
- El contenido CAMBIA en cada carga, NUNCA verifiques texto exacto
- Cuando un selector resuelve múltiples elementos usa .first(): expect(locator.first()).toBeVisible()
- NUNCA uses toBeVisible() en un locator que puede resolver múltiples elementos sin .first()
- Usa selectores de estructura como: page.locator('.content').first()`,

    modal: `INSTRUCCIÓN ESPECIAL - PÁGINA CON MODAL/OVERLAY:
- El modal aparece automáticamente al cargar, puede tardar
- Para verificar el modal: await page.waitForSelector('.modal', { state: 'visible' })
- Para cerrar: busca el botón de cierre dentro del modal
- NO asumas que el modal ya está visible al inicio del test`,

    context_menu: `INSTRUCCIÓN ESPECIAL - MENÚ CONTEXTUAL:
- Para disparar el context menu: await page.click('#hot-spot', { button: 'right' })
- El alert aparece inmediatamente después del click derecho
- Para aceptar el alert: page.on('dialog', dialog => dialog.accept())
- Registra el handler ANTES del click`,

    iframe_editor: `INSTRUCCIÓN ESPECIAL - EDITOR EN IFRAME (TinyMCE):
- El editor carga dentro de un iframe que tarda en renderizar
- USA: await page.waitForSelector('iframe[id*="mce"]', { state: 'attached' })
- Para acceder al contenido: page.frameLocator('iframe[id*="mce"]').locator('body')
- NUNCA uses toHaveValue() en un iframe editor — usa toContainText() en el body del iframe
- Genera SOLO tests de visibilidad del iframe, no del contenido interno`,

    nested_frames: `INSTRUCCIÓN ESPECIAL - FRAMES ANIDADOS:
- Esta página usa frames HTML clásicos, no iframes modernos
- Accede con: page.frame({ name: 'frame-top' }) o page.frame({ url: /.*/ })
- SOLO testea que los frames existen: expect(page.frame('frame-top')).not.toBeNull()
- NO intentes acceder al contenido dentro de los frames`,

    key_presses: `INSTRUCCIÓN ESPECIAL - KEY PRESSES:
- El input tiene id="target". Para enviar teclas DEBES hacer click primero:
  await page.click('#target');
  await page.press('#target', 'Enter');
- El resultado aparece en #result
- Usa toContainText('You entered:') sin especificar la tecla exacta
- NUNCA presiones teclas sin hacer click en el input primero`,

    iframe: `INSTRUCCIÓN ESPECIAL - PÁGINA CON IFRAME:
- Usa page.frameLocator('selector') para acceder al contenido del iframe
- Verifica que el iframe existe antes de interactuar: toBeVisible()`,

    standard: ''
  };

  const specialInstruction = categoryInstructions[pageCategory] || '';

  const restrictions = [];
  if (pageInfo.hasIframe && pageCategory === 'standard') {
    restrictions.push('- La página tiene iframes: usa page.frameLocator() para su contenido');
  }
  if (pageInfo.hasShadowDOM) {
    restrictions.push('- La página tiene Shadow DOM: NO generes tests para su contenido interno');
  }
  if (pageInfo.hasFileInput) {
    restrictions.push('- La página tiene input de archivo: usa page.setInputFiles() SOLO para file inputs');
  }

  const flowContext = flow.type !== 'unknown'
    ? `
CONTEXTO DE FLUJO (resultado del análisis semántico de la página):
- Tipo de flujo detectado: ${flow.type}
- Confianza de la detección: ${flow.confidence}
- Escenarios críticos que DEBES cubrir en este orden de prioridad:
${flow.testingHints.map((hint, i) => `  ${i + 1}. ${hint}`).join('\n')}

Estos escenarios están ordenados por importancia de negocio. Priorizalos
sobre cualquier otro test que puedas considerar generar.
`
    : '';

  const prompt = `
Eres un experto en testing automatizado con Playwright v1.60.
Genera tests válidos para la URL: ${url}

ESTADO REAL DE LA PÁGINA (esto es lo que existe, no inventes nada más):
- Título real: "${pageInfo.title}"
- H1 real: "${pageInfo.h1}"
- H2 real: "${pageInfo.h2}"

HTML real (úsalo para entender el comportamiento):
${bodyHTML}

Elementos con su estado actual:
- Botones: ${JSON.stringify(elements.buttons)}
- Inputs: ${JSON.stringify(elements.inputs)}
- Formularios: ${JSON.stringify(elements.forms)}
- Links: ${JSON.stringify(elements.links)}

${flowContext}
${specialInstruction ? `\n${specialInstruction}\n` : ''}
${restrictions.length > 0 ? '\nRESTRICCIONES ESPECÍFICAS:\n' + restrictions.join('\n') : ''}

REGLAS CRÍTICAS:
1. Usa SOLO: const { test, expect } = require('@playwright/test');
2. Para autenticación básica/digest: await page.goto('https://admin:admin@url');
   NUNCA uses page.authenticate().
3. Para sliders (input[type="range"]): usa page.fill() o keyboard.press(), NUNCA setInputFiles().
4. Para descargas:
   const [download] = await Promise.all([
     page.waitForEvent('download'),
     page.click('selector')
   ]);
5. Assertions válidas: toBeVisible(), toBeHidden(), toBeEnabled(), toBeDisabled(),
   toBeChecked(), toHaveURL(), toHaveText(), toHaveAttribute(), toContainText().
   NUNCA uses toBeClickable().
6. SOLO testea lo que existe en el HTML. No inventes lógica.
7. Para checkboxes: usa el campo "checked" del estado real para determinar el estado inicial.
8. Genera máximo 5 tests. Prioriza flujos reales del usuario.
9. NO generes tests para links a elementalselenium.com.
10. Para toHaveTitle() usa el título real proporcionado arriba, como string exacto.
11. Cierra TODOS los bloques con llaves.
12. Para verificar que un campo password enmascara el texto, usa SIEMPRE:
    await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password');
    NUNCA verifiques el valor del campo ni uses .not.toBe() para esto.

Estructura exacta:
const { test, expect } = require('@playwright/test');

test.describe('Nombre descriptivo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${url}');
  });

  test('descripcion', async ({ page }) => {
    // test
  });
});
  `;

  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let response;

    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un generador de código Playwright. Respondes ÚNICAMENTE con código JavaScript válido y completo. Sin explicaciones, sin markdown, sin backticks, sin texto adicional. El código debe poder ejecutarse con npx playwright test sin modificaciones.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });
    } catch (apiError) {
      console.log(`⚠️  Intento ${attempt}/${maxRetries}: error al llamar OpenAI — ${apiError.message}`);
      if (attempt === maxRetries) return null;
      continue;
    }

    let code = response.choices[0].message.content
      .replace(/```javascript\n?/g, '')
      .replace(/```\n?/g, '');

    try {
      new Function(code);
      return { code, valid: true };
    } catch (syntaxError) {
      console.log(`⚠️  Intento ${attempt}/${maxRetries}: código inválido — ${syntaxError.message}`);
    }
  }

  return null;
}

function saveTests(code, url) {
  const domain = new URL(url).hostname.replace(/\./g, '_');
  const filename = `${domain}_${Date.now()}.spec.js`;
  const filepath = path.join(__dirname, '..', 'tests', 'generated', filename);

  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  let clean = code
    .replace(/```javascript\n?/g, '')
    .replace(/```\n?/g, '');

  clean = clean.replace(/\.toBeChecked\(false\)/g, '.not.toBeChecked()');
  clean = clean.replace(/\.toBeChecked\(true\)/g, '.toBeChecked()');
  clean = clean.replace(
    /toHaveTitle\(\/(.+?)\/\)/g,
    (match, inner) => inner.includes('/') ? `toHaveTitle('${inner}')` : match
  );
  clean = clean.replace(
    /await expect\(page\)\.toHaveText\(/g,
    'await expect(page.locator("body")).toContainText('
  );

  fs.writeFileSync(filepath, clean);
  console.log(`✅ Tests guardados en: tests/generated/${filename}\n`);

  return filepath;
}

module.exports = { analyzeApp };