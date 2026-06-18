#!/usr/bin/env node
process.env.NODE_NO_WARNINGS = '1';

const { analyzeApp } = require('./src/analyzer');
const { crawlRoutes } = require('./src/crawler');
const { healFailures } = require('./src/healer');
const { generateReport } = require('./src/reporter');
const { runConfigWizard } = require('./src/config');
const { analyzeUnresolvedFailures } = require('./src/failure-analyzer');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const command = process.argv[2];
const mode = process.argv[3] || 'single';

if (command === 'config') {
  runConfigWizard().catch(console.error);
  return;
}

const url = command;

if (!url || url.startsWith('--')) {
  console.log('\nQAgen — Autonomous QA agent\n');
  console.log('Usage:');
  console.log('  qagen https://your-app.com           Analyze and test a single page');
  console.log('  qagen https://your-app.com crawl     Crawl and test all routes');
  console.log('  qagen config                         Configure your OpenAI API key\n');
  process.exit(1);
}

const QAGEN_DIR = path.join(process.cwd(), '.qagen');

function initQagenDir() {
  const dirs = [
    QAGEN_DIR,
    path.join(QAGEN_DIR, 'tests', 'generated'),
    path.join(QAGEN_DIR, 'playwright-report'),
    path.join(QAGEN_DIR, 'test-results'),
  ];

  dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.qagen/')) {
      fs.appendFileSync(gitignorePath, '\n# QAgen generated files\n.qagen/\n');
      console.log('.qagen/ added to .gitignore\n');
    }
  }
}

function ensurePlaywrightConfig() {
  const configPath = path.join(QAGEN_DIR, 'playwright.config.js');
  if (fs.existsSync(configPath)) return;

  const config = `const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/generated',
  timeout: 30000,
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off'
  }
});
`;

  fs.writeFileSync(configPath, config, 'utf8');
}

function clearPreviousTests() {
  const dir = path.join(QAGEN_DIR, 'tests', 'generated');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.js'));
  if (files.length > 0) {
    files.forEach(f => fs.unlinkSync(path.join(dir, f)));
    console.log(`Cleared ${files.length} test file(s) from previous session\n`);
  }
}

function runTests() {
  console.log('\nRunning tests...\n');

  const result = spawnSync(
    'npx',
    [
      'playwright', 'test',
      '--config', path.join(QAGEN_DIR, 'playwright.config.js')
    ],
    {
      cwd: QAGEN_DIR,
      shell: true,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' }
    }
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const output = (result.stdout || '') + (result.stderr || '');
  const hasFailed = result.status === 1;

  if (result.status !== 0 && result.status !== 1) {
    console.log(`\nUnexpected Playwright exit code: ${result.status}`);
    if (result.error) console.log(`Error: ${result.error.message}`);
  }

  return { output, hasFailed };
}

function rerunTests() {
  console.log('\nRe-running tests after healing...\n');

  const result = spawnSync(
    'npx',
    [
      'playwright', 'test',
      '--config', path.join(QAGEN_DIR, 'playwright.config.js')
    ],
    {
      cwd: QAGEN_DIR,
      shell: true,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' }
    }
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return (result.stdout || '') + (result.stderr || '');
}

async function run() {
  initQagenDir();
  ensurePlaywrightConfig();
  clearPreviousTests();

  // Timeline tracks each step with its timestamp and duration.
  // This data powers the session timeline in the HTML report.
  const timeline = [];
  const sessionStart = Date.now();

  function addEvent(label, startedAt) {
    timeline.push({ label, startedAt, duration: Date.now() - startedAt });
  }

  const session = {
    url,
    startTime: sessionStart,
    flow: { type: 'unknown', confidence: 'low' },
    testsFile: '',
    firstOutput: '',
    healing: { healed: 0, failed: 0, details: [] },
    finalOutput: null,
    failureAnalyses: [],
    timeline,
    memoryBefore: 0,  // selectors known before this session
    memoryAfter: 0,   // selectors known after healing
    qagenDir: QAGEN_DIR
  };

  if (mode === 'crawl') {
    const crawlStart = Date.now();
    const routes = await crawlRoutes(url);
    addEvent('Route crawl', crawlStart);

    console.log('\nAnalyzing routes...\n');
    const failed = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`[${i + 1}/${routes.length}] ${route}`);

      try {
        const analyzeStart = Date.now();
        const result = await analyzeApp(route, QAGEN_DIR);
        addEvent(`Analyzed ${new URL(route).pathname}`, analyzeStart);
        session.testsFile = path.basename(result.filepath);
        session.flow = result.flow;
        session.memoryBefore = result.memoryCount;
      } catch (err) {
        console.log(`Failed to analyze ${route}: ${err.message}`);
        failed.push(route);
      }
    }

    if (failed.length > 0) {
      console.log('\nFailed routes:');
      failed.forEach(r => console.log(`  ${r}`));
    }

  } else {
    const analyzeStart = Date.now();
    const result = await analyzeApp(url, QAGEN_DIR);
    addEvent('Page analysis + test generation', analyzeStart);
    session.testsFile = path.basename(result.filepath);
    session.flow = result.flow;
    session.memoryBefore = result.memoryCount;
  }

  const runStart = Date.now();
  const { output, hasFailed } = runTests();
  addEvent('Test execution', runStart);
  session.firstOutput = output;

  if (hasFailed) {
    const healStart = Date.now();
    const healResult = await healFailures(output, QAGEN_DIR);
    addEvent('Self-healing', healStart);
    session.healing = healResult;
    session.memoryAfter = session.memoryBefore + healResult.healed;

    if (healResult.healed > 0) {
      console.log(`\nHealing complete: ${healResult.healed} test(s) fixed`);
      if (healResult.failed > 0) {
        console.log(`${healResult.failed} failure(s) could not be healed`);
      }
      const rerunStart = Date.now();
      session.finalOutput = rerunTests();
      addEvent('Re-run after healing', rerunStart);
    } else {
      console.log('\nCould not automatically heal failures');
      session.memoryAfter = session.memoryBefore;
    }

    const outputToAnalyze = session.finalOutput || output;
    session.failureAnalyses = await analyzeUnresolvedFailures(outputToAnalyze, url);
  } else {
    session.memoryAfter = session.memoryBefore;
  }

  generateReport(session);

  console.log('\nPlaywright report: .qagen/playwright-report/index.html');
  console.log('Run "npx playwright show-report .qagen/playwright-report" to open it\n');
}

run().catch(console.error);