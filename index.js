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

const args = process.argv.slice(2);
const command = args[0];

// ─── Command routing ───────────────────────────────────────────────────────

if (command === 'config') {
  runConfigWizard().catch(console.error);
  return;
}

if (!command || command === '--help') {
  console.log('\nQAgen — Autonomous QA agent\n');
  console.log('Usage:');
  console.log('  qagen https://your-app.com                    Analyze and test a single page');
  console.log('  qagen https://your-app.com crawl              Crawl and test all routes');
  console.log('  qagen --urls https://app.com/a https://app.com/b   Test specific URLs');
  console.log('  qagen config                                  Configure your OpenAI API key\n');
  process.exit(1);
}

// ─── Mode detection ────────────────────────────────────────────────────────

// --urls mode: qagen --urls url1 url2 url3 ...
const isUrlsMode = command === '--urls';

// crawl mode: qagen https://url crawl
const isCrawlMode = !isUrlsMode && args[1] === 'crawl';

// single mode: qagen https://url
const isSingleMode = !isUrlsMode && !isCrawlMode;

const url = isUrlsMode ? null : command;
const urlsList = isUrlsMode ? args.slice(1) : [];

if (isUrlsMode && urlsList.length === 0) {
  console.log('\nError: --urls requires at least one URL.\n');
  console.log('Example: qagen --urls https://app.com/login https://app.com/dashboard\n');
  process.exit(1);
}

if (!isUrlsMode && (!url || url.startsWith('--'))) {
  console.log('\nError: invalid URL provided.\n');
  process.exit(1);
}

const QAGEN_DIR = path.join(process.cwd(), '.qagen');

// ─── Setup ─────────────────────────────────────────────────────────────────

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

// ─── Test execution ────────────────────────────────────────────────────────

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

// ─── Analysis helpers ──────────────────────────────────────────────────────

async function analyzeRoutes(routes, session, timeline) {
  const failed = [];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    console.log(`[${i + 1}/${routes.length}] ${route}`);

    try {
      const analyzeStart = Date.now();
      const result = await analyzeApp(route, QAGEN_DIR);
      timeline.push({
        label: `Analyzed ${new URL(route).pathname || '/'}`,
        startedAt: analyzeStart,
        duration: Date.now() - analyzeStart
      });
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
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  initQagenDir();
  ensurePlaywrightConfig();
  clearPreviousTests();

  const timeline = [];
  const sessionStart = Date.now();

  // The session URL is used for the report header and failure analysis.
  // In --urls mode we use the first URL as the primary reference.
  const sessionUrl = isUrlsMode ? urlsList[0] : url;

  const session = {
    url: sessionUrl,
    startTime: sessionStart,
    flow: { type: 'unknown', confidence: 'low' },
    testsFile: '',
    firstOutput: '',
    healing: { healed: 0, failed: 0, details: [] },
    finalOutput: null,
    failureAnalyses: [],
    timeline,
    memoryBefore: 0,
    memoryAfter: 0,
    qagenDir: QAGEN_DIR
  };

  // ── Route collection ──────────────────────────────────────────────────────

  if (isUrlsMode) {
    // User provided explicit list of URLs
    console.log(`\nAnalyzing ${urlsList.length} URL(s)...\n`);
    await analyzeRoutes(urlsList, session, timeline);

  } else if (isCrawlMode) {
    // Auto-detect routes from the base URL
    const crawlStart = Date.now();
    const routes = await crawlRoutes(url);
    timeline.push({ label: 'Route crawl', startedAt: crawlStart, duration: Date.now() - crawlStart });

    console.log('\nAnalyzing routes...\n');
    await analyzeRoutes(routes, session, timeline);

  } else {
    // Single page mode
    const analyzeStart = Date.now();
    const result = await analyzeApp(url, QAGEN_DIR);
    timeline.push({
      label: 'Page analysis + test generation',
      startedAt: analyzeStart,
      duration: Date.now() - analyzeStart
    });
    session.testsFile = path.basename(result.filepath);
    session.flow = result.flow;
    session.memoryBefore = result.memoryCount;
  }

  // ── Test execution ────────────────────────────────────────────────────────

  const runStart = Date.now();
  const { output, hasFailed } = runTests();
  timeline.push({ label: 'Test execution', startedAt: runStart, duration: Date.now() - runStart });
  session.firstOutput = output;

  // ── Healing ───────────────────────────────────────────────────────────────

  if (hasFailed) {
    const healStart = Date.now();
    const healResult = await healFailures(output, QAGEN_DIR);
    timeline.push({ label: 'Self-healing', startedAt: healStart, duration: Date.now() - healStart });
    session.healing = healResult;
    session.memoryAfter = session.memoryBefore + healResult.healed;

    if (healResult.healed > 0) {
      console.log(`\nHealing complete: ${healResult.healed} test(s) fixed`);
      if (healResult.failed > 0) {
        console.log(`${healResult.failed} failure(s) could not be healed`);
      }
      const rerunStart = Date.now();
      session.finalOutput = rerunTests();
      timeline.push({ label: 'Re-run after healing', startedAt: rerunStart, duration: Date.now() - rerunStart });
    } else {
      console.log('\nCould not automatically heal failures');
      session.memoryAfter = session.memoryBefore;
    }

    const outputToAnalyze = session.finalOutput || output;
    session.failureAnalyses = await analyzeUnresolvedFailures(outputToAnalyze, sessionUrl);
  } else {
    session.memoryAfter = session.memoryBefore;
  }

  // ── Report ────────────────────────────────────────────────────────────────

  generateReport(session);

  console.log('\nPlaywright report: .qagen/playwright-report/index.html');
  console.log('Run "npx playwright show-report .qagen/playwright-report" to open it\n');
}

run().catch(console.error);