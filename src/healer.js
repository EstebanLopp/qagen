const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { saveToMemory } = require('./config');

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

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

function extractGotoUrl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/page\.goto\('([^']+)'\)/);
  return match ? match[1] : null;
}

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
        continue;
      }
    }

    await page.waitForTimeout(1000);

    const candidateSelectors = [
      '#flash', '.flash', '.alert', '.error', '.message',
      '.notification', '[role="alert"]', 'p', 'span', 'div'
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
            if (className) return `.${className.trim().split(/\s+/)[0]}`;
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

function patchFile(filePath, failLine, oldLocator, newSelector) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const targetLine = lines[failLine - 1];

  if (!targetLine) return false;

  const oldPattern = `locator('${oldLocator}')`;
  const newPattern = `locator('${newSelector}')`;

  if (!targetLine.includes(oldPattern)) return false;

  let newLine = targetLine.replace(oldPattern, newPattern);
  newLine = newLine.replace('.toHaveText(', '.toContainText(');

  lines[failLine - 1] = newLine;
  fs.writeFileSync(filePath, lines.join('\n'));
  return true;
}

async function healFailures(playwrightOutput, cwd) {
  const failures = parseFailures(playwrightOutput, cwd);

  if (failures.length === 0) {
    return { healed: 0, failed: 0, details: [] };
  }

  console.log(`\nAuto-healing: ${failures.length} actionable failure(s) detected\n`);

  let healed = 0;
  let failed = 0;
  const details = [];

  for (const failure of failures) {
    const { filePath, line, expectedText, locator } = failure;
    const fileName = path.basename(filePath);

    console.log(`  Healing: "${expectedText}" in ${fileName}:${line}`);

    if (!fs.existsSync(filePath)) {
      console.log(`  File not found: ${filePath}`);
      failed++;
      details.push(`FAIL ${fileName}:${line} — file not found`);
      continue;
    }

    const url = extractGotoUrl(filePath);
    if (!url) {
      console.log(`  Could not extract URL from file`);
      failed++;
      details.push(`FAIL ${fileName}:${line} — URL not found`);
      continue;
    }

    const actions = extractActionsBeforeLine(filePath, line);

    try {
      const newSelector = await findSelectorInLiveDom(url, actions, expectedText);

      if (!newSelector) {
        console.log(`  Text "${expectedText}" not found in live DOM`);
        failed++;
        details.push(`FAIL ${fileName}:${line} — text not found in DOM`);
        continue;
      }

      if (newSelector === locator) {
        console.log(`  Same selector found — different issue`);
        failed++;
        details.push(`FAIL ${fileName}:${line} — same selector`);
        continue;
      }

      const patched = patchFile(filePath, line, locator, newSelector);

      if (patched) {
        console.log(`  Healed: ${locator} -> ${newSelector}`);
        healed++;

        const domain = new URL(url).hostname;
        saveToMemory(domain, locator, newSelector, `message after action on ${url}`);

        details.push(`OK ${fileName}:${line} — ${locator} -> ${newSelector}`);
      } else {
        failed++;
        details.push(`FAIL ${fileName}:${line} — patch failed`);
      }
    } catch (err) {
      console.log(`  Error during healing: ${err.message}`);
      failed++;
      details.push(`FAIL ${fileName}:${line} — ${err.message}`);
    }
  }

  return { healed, failed, details };
}

module.exports = { healFailures };