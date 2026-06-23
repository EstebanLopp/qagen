const { chromium } = require('playwright');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { detectFlow } = require('./flow-detector');
const { resolveApiKey, readMemory } = require('./config');

dotenv.config();

const apiKey = resolveApiKey();

if (!apiKey) {
  console.error('\nError: OpenAI API key not found.');
  console.error('Run: qagen config\n');
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

function detectPageCategory(url) {
  const u = url.toLowerCase();
  if (u.includes('basic_auth') || u.includes('digest_auth')) return 'auth';
  if (u.includes('download_secure')) return 'auth_required';
  if (u.includes('dynamic_content') || u.includes('typos')) return 'dynamic';
  if (u.includes('entry_ad') || u.includes('exit_intent')) return 'modal';
  if (u.includes('context_menu')) return 'context_menu';
  if (u.includes('tinymce')) return 'iframe_editor';
  if (u.includes('nested_frames')) return 'nested_frames';
  if (u.includes('key_presses')) return 'key_presses';
  return 'standard';
}

/**
 * @param {string} url
 * @param {string} qagenDir
 * @param {{ username: string, password: string } | null} credentials
 */
async function analyzeApp(url, qagenDir, credentials = null) {
  console.log(`\nAnalyzing: ${url}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);

  // Wait for the page to fully render before extracting elements.
  // SPAs built with React, Vue or Angular load their content via JavaScript
  // after the initial HTML response. Without this wait, the analyzer may
  // capture an empty or partial DOM.
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch {
    // If networkidle times out (some apps have long-polling connections),
    // fall through — the DOM is usually stable enough at this point.
  }

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

  const pageInfo = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.innerText?.trim() || '',
    h2: document.querySelector('h2')?.innerText?.trim() || '',
    hasIframe: document.querySelectorAll('iframe').length > 0,
    hasFileInput: document.querySelectorAll('input[type="file"]').length > 0,
    hasShadowDOM: Array.from(document.querySelectorAll('*')).some(el => el.shadowRoot)
  }));

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
  const domain = new URL(url).hostname;
  const knownSelectors = readMemory(domain);

  console.log(`Flow detected: ${flow.type} (confidence: ${flow.confidence})`);

  if (knownSelectors.length > 0) {
    console.log(`Memory: ${knownSelectors.length} known selector(s) for ${domain}`);
  }

  if (credentials && (flow.type === 'login' || flow.type === 'register')) {
    console.log(`Credentials: using provided username/password`);
  }

  console.log('Generating tests...\n');

  const pageCategory = detectPageCategory(url);
  const result = await generateTests(url, elements, bodyHTML, pageInfo, pageCategory, flow, knownSelectors, credentials);

  if (!result) {
    throw new Error(`Failed to generate valid test code for ${url}`);
  }

  const filepath = saveTests(result.code, url, qagenDir);
  return { filepath, flow, memoryCount: knownSelectors.length };
}

async function generateTests(url, elements, bodyHTML, pageInfo, pageCategory, flow, knownSelectors, credentials = null) {
  const categoryInstructions = {
    auth: `SPECIAL INSTRUCTION - AUTHENTICATED PAGE:
- beforeEach must use: await page.goto('${url.replace('://', '://admin:admin@')}');
- Use specific locators: page.locator('h1'), page.locator('p')
- NEVER use expect(page).toHaveText() — use expect(page.locator('...')).toBeVisible()
- Only test element visibility, not exact text`,

    auth_required: `SPECIAL INSTRUCTION - PROTECTED PAGE:
- This page requires authentication that cannot be provided
- Generate ONLY 1 test: verify the page responds (toHaveURL)
- Do NOT attempt to access protected content`,

    dynamic: `SPECIAL INSTRUCTION - DYNAMIC CONTENT:
- Content CHANGES on each load, NEVER verify exact text
- When a selector resolves multiple elements use .first(): expect(locator.first()).toBeVisible()
- NEVER use toBeVisible() on a locator that may resolve multiple elements without .first()`,

    modal: `SPECIAL INSTRUCTION - MODAL/OVERLAY PAGE:
- The modal appears automatically on load, may take time
- To verify the modal: await page.waitForSelector('.modal', { state: 'visible' })
- Do NOT assume the modal is already visible at test start`,

    context_menu: `SPECIAL INSTRUCTION - CONTEXT MENU:
- To trigger context menu: await page.click('#hot-spot', { button: 'right' })
- Register the alert handler BEFORE the click
- To accept: page.on('dialog', dialog => dialog.accept())`,

    iframe_editor: `SPECIAL INSTRUCTION - IFRAME EDITOR (TinyMCE):
- Wait for iframe: await page.waitForSelector('iframe[id*="mce"]', { state: 'attached' })
- Access content: page.frameLocator('iframe[id*="mce"]').locator('body')
- NEVER use toHaveValue() in an iframe editor — use toContainText() on the iframe body
- Only test iframe visibility, not internal content`,

    nested_frames: `SPECIAL INSTRUCTION - NESTED FRAMES:
- This page uses classic HTML frames, not modern iframes
- Access with: page.frame({ name: 'frame-top' })
- ONLY test that frames exist: expect(page.frame('frame-top')).not.toBeNull()`,

    key_presses: `SPECIAL INSTRUCTION - KEY PRESSES:
- Click the input before pressing keys: await page.click('#target');
- Then: await page.press('#target', 'Enter');
- Result appears in #result
- Use toContainText('You entered:') without specifying the exact key`,

    iframe: `SPECIAL INSTRUCTION - IFRAME PAGE:
- Use page.frameLocator('selector') to access iframe content
- Verify the iframe exists before interacting: toBeVisible()`,

    standard: ''
  };

  const specialInstruction = categoryInstructions[pageCategory] || '';

  const restrictions = [];
  if (pageInfo.hasIframe && pageCategory === 'standard') {
    restrictions.push('- Page has iframes: use page.frameLocator() for their content');
  }
  if (pageInfo.hasShadowDOM) {
    restrictions.push('- Page has Shadow DOM: do NOT generate tests for its internal content');
  }
  if (pageInfo.hasFileInput) {
    restrictions.push('- Page has file input: use page.setInputFiles() ONLY for file inputs');
  }

  const flowContext = flow.type !== 'unknown'
    ? `
FLOW CONTEXT (result of semantic page analysis):
- Detected flow: ${flow.type}
- Confidence: ${flow.confidence}
- Critical scenarios to cover in priority order:
${flow.testingHints.map((hint, i) => `  ${i + 1}. ${hint}`).join('\n')}

These scenarios are ordered by business importance. Prioritize them over any others.
`
    : '';

  const memoryContext = knownSelectors.length > 0
    ? `
SELECTOR MEMORY (corrections learned from previous sessions on this domain):
${knownSelectors.map(s => `- NEVER use "${s.wrong}" for "${s.context}". Use locator("${s.correct}").${s.assertion || 'toContainText'} instead.`).join('\n')}

This comes from real errors detected and corrected automatically. Follow it strictly.
`
    : '';

  // If credentials are provided and the page is a login flow,
  // inject them into the prompt so the AI uses real credentials
  // instead of placeholder values like 'testuser' or 'password123'
  const credentialsContext = credentials && (flow.type === 'login' || flow.type === 'register')
    ? `
CREDENTIALS (use these exact values in login tests):
- Username: ${credentials.username}
- Password: ${credentials.password}

Use these credentials when testing successful login scenarios.
For invalid credential tests, use a deliberately wrong password like "${credentials.password}_invalid".
`
    : '';

  const prompt = `
You are an expert in automated testing with Playwright v1.60.
Generate valid tests for the URL: ${url}

REAL PAGE STATE (only test what exists here):
- Title: "${pageInfo.title}"
- H1: "${pageInfo.h1}"
- H2: "${pageInfo.h2}"

Real HTML:
${bodyHTML}

Current element state:
- Buttons: ${JSON.stringify(elements.buttons)}
- Inputs: ${JSON.stringify(elements.inputs)}
- Forms: ${JSON.stringify(elements.forms)}
- Links: ${JSON.stringify(elements.links)}

${flowContext}
${memoryContext}
${credentialsContext}
${specialInstruction ? `\n${specialInstruction}\n` : ''}
${restrictions.length > 0 ? '\nSPECIFIC RESTRICTIONS:\n' + restrictions.join('\n') : ''}

CRITICAL RULES:
1. Use ONLY: const { test, expect } = require('@playwright/test');
2. For basic/digest auth: await page.goto('https://admin:admin@url'); NEVER use page.authenticate().
3. For sliders (input[type="range"]): use page.fill() or keyboard.press(), NEVER setInputFiles().
4. For downloads: const [download] = await Promise.all([page.waitForEvent('download'), page.click('selector')]);
5. Valid assertions: toBeVisible(), toBeHidden(), toBeEnabled(), toBeDisabled(), toBeChecked(), toHaveURL(), toHaveText(), toHaveAttribute(), toContainText(). NEVER use toBeClickable().
6. ONLY test what exists in the HTML. Do not invent logic.
   NEVER assume what happens after an action. Do not test for validation messages,
   error states, or post-action content unless those exact elements appear in the HTML provided above.
   NEVER test visibility of elements that have hidden attribute in the HTML. If an element
   is hidden in the initial state, skip it.
7. For checkboxes: use the "checked" field from real state to determine initial state.
8. Generate maximum 5 tests. Prioritize real user flows.
9. Do NOT generate tests for links to elementalselenium.com.
10. For toHaveTitle() use the exact real title provided above.
11. Close ALL blocks with braces.
12. To verify a password field masks text, ALWAYS use:
    await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password');
    NEVER check the field value or use .not.toBe() for this.
    Only generate this test if input[type="password"] exists in the HTML above.

Exact structure:
const { test, expect } = require('@playwright/test');

test.describe('Descriptive name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${url}');
  });

  test('description', async ({ page }) => {
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
            content: 'You are a Playwright code generator. Respond ONLY with valid, complete JavaScript code. No explanations, no markdown, no backticks, no additional text. The code must run with npx playwright test without modifications.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });
    } catch (apiError) {
      console.log(`API call failed (attempt ${attempt}/${maxRetries}): ${apiError.message}`);
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
      console.log(`Invalid code syntax (attempt ${attempt}/${maxRetries}): ${syntaxError.message}`);
    }
  }

  return null;
}

function saveTests(code, url, qagenDir) {
  const domain = new URL(url).hostname.replace(/\./g, '_');
  const filename = `${domain}_${Date.now()}.spec.js`;
  const filepath = path.join(qagenDir, 'tests', 'generated', filename);

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
  clean = clean.replace(
    /page\.locator\(`text=\$\{([^}]+)\}`\)/g,
    'page.getByText($1, { exact: true }).first()'
  );
  clean = clean.replace(
    /page\.locator\('text=([^']+)'\)/g,
    "page.getByText('$1', { exact: true }).first()"
  );

  fs.writeFileSync(filepath, clean);
  console.log(`Tests saved: .qagen/tests/generated/${filename}\n`);

  return filepath;
}

module.exports = { analyzeApp };