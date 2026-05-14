const { chromium } = require('playwright');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeApp(url) {
  console.log(`\n🔍 Analizando: ${url}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);

  const elements = await page.evaluate(() => {
    const result = {
      buttons: [],
      inputs: [],
      forms: [],
      links: []
    };

    document.querySelectorAll('button').forEach(el => {
      result.buttons.push(el.innerText.trim());
    });

    document.querySelectorAll('input').forEach(el => {
      result.inputs.push({
        type: el.type,
        name: el.name,
        placeholder: el.placeholder
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

  console.log('✅ Elementos encontrados');
  console.log('🤖 Generando tests con IA...\n');

  await browser.close();

  const tests = await generateTests(url, elements);
  saveTests(tests, url);

  return tests;
}

async function generateTests(url, elements) {
  const prompt = `
Eres un experto en testing automatizado con Playwright.
Analiza estos elementos de la página ${url} y genera tests completos en Playwright.

Elementos encontrados:
- Botones: ${JSON.stringify(elements.buttons)}
- Inputs: ${JSON.stringify(elements.inputs)}
- Formularios: ${JSON.stringify(elements.forms)}
- Links: ${JSON.stringify(elements.links)}

Reglas estrictas:
1. Genera SOLO código JavaScript válido
2. Usa SOLO estos imports: const { test, expect } = require('@playwright/test');
3. Cada test debe ser independiente
4. NO repitas ningún bloque de código
5. NO agregues comentarios fuera de los tests
6. Cierra correctamente TODOS los bloques con llaves

Estructura exacta a seguir:
const { test, expect } = require('@playwright/test');

test.describe('Nombre descriptivo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${url}');
  });

  test('descripcion del test', async ({ page }) => {
    // test aqui
  });
});
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Eres un generador de código. Respondes ÚNICAMENTE con código JavaScript válido y completo. Sin explicaciones, sin markdown, sin texto adicional.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.2
  });

  return response.choices[0].message.content;
}

function saveTests(tests, url) {
  const domain = new URL(url).hostname.replace(/\./g, '_');
  const filename = `${domain}_${Date.now()}.spec.js`;
  const filepath = path.join(__dirname, '..', 'tests', 'generated', filename);

  // Limpiar código si viene con backticks de markdown
  const cleanTests = tests.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');

  fs.writeFileSync(filepath, cleanTests);
  console.log(`✅ Tests guardados en: tests/generated/${filename}\n`);
  console.log('📄 Código generado:\n');
  console.log(cleanTests);
}

module.exports = { analyzeApp };