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

// ─── Argument parsing ──────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

function parseArgs(args) {
  const result = {
    command: null,
    urls: [],
    username: null,
    password: null,
    mode: 'single'
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--username' || arg === '-u') {
      result.username = args[++i];
    } else if (arg === '--password' || arg === '-p') {
      result.password = args[++i];
    } else if (arg === '--urls') {
      // Collect all following URLs until next flag or end
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        result.urls.push(args[i]);
        i++;
      }
      result.command = '--urls';
      continue;
    } else if (arg === 'config') {
      result.command = 'config';
    } else if (arg === 'crawl') {
      result.mode = 'crawl';
    } else if (!arg.startsWith('--') && !result.command) {
      result.command = arg; // first positional = URL or command
    }

    i++;
  }

  // Fallback to env variables for credentials
  if (!result.username) result.username = process.env.QAGEN_USERNAME || null;
  if (!result.password) result.password = process.env.QAGEN_PASSWORD || null;

  return result;
}

const parsed = parseArgs(rawArgs);

// ─── Command routing ───────────────────────────────────────────────────────

if (parsed.command === 'config') {
  runConfigWizard().catch(console.error);
  return;
}

if (!parsed.command) {
  console.log('\nQAgen — Autonomous QA agent\n');
  console.log('Usage:');
  console.log('  qagen https://app.com                                  Analyze a single page');
  console.log('  qagen https://app.com crawl                            Crawl and test all routes');
  console.log('  qagen --urls https://app.com/a https://app.com/b      Test specific URLs');
  console.log('  qagen https://app.com --username admin --password secret   With credentials');
  console.log('  qagen config                                           Configure OpenAI API key\n');
  console.log('Credentials can also be set via environment variables:');
  console.log('  QAGEN_USERNAME=admin QAGEN_PASSWORD=secret qagen https://app.com\n');
  process.exit(1);
}

const isUrlsMode = parsed.command === '--urls';
const isCrawlMode = !isUrlsMode && parsed.mode === 'crawl';
const url = isUrlsMode ? null : parsed.command;
const urlsList = isUrlsMode ? parsed.urls : [];
const credentials = parsed.username && parsed.password
  ? { username: parsed.username, password: parsed.password }
  : null;

if (isUrlsMode && urlsList.length === 0) {
  console.log('\nError: --urls requires at least one URL.\n');
  console.log('Example: qagen --urls https://app.com/login https://app.com/dashboard\n');
  process.exit(1);
}

if (credentials) {
  console.log(`\nCredentials loaded for: ${parsed.username}`);
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
      const result = await analyzeApp(route, QAGEN_DIR, credentials);
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

  if (isUrlsMode) {
    console.log(`\nAnalyzing ${urlsList.length} URL(s)...\n`);
    await analyzeRoutes(urlsList, session, timeline);

  } else if (isCrawlMode) {
    const crawlStart = Date.now();
    const routes = await crawlRoutes(url);
    timeline.push({ label: 'Route crawl', startedAt: crawlStart, duration: Date.now() - crawlStart });
    console.log('\nAnalyzing routes...\n');
    await analyzeRoutes(routes, session, timeline);

  } else {
    const analyzeStart = Date.now();
    const result = await analyzeApp(url, QAGEN_DIR, credentials);
    timeline.push({
      label: 'Page analysis + test generation',
      startedAt: analyzeStart,
      duration: Date.now() - analyzeStart
    });
    session.testsFile = path.basename(result.filepath);
    session.flow = result.flow;
    session.memoryBefore = result.memoryCount;
  }

  const runStart = Date.now();
  const { output, hasFailed } = runTests();
  timeline.push({ label: 'Test execution', startedAt: runStart, duration: Date.now() - runStart });
  session.firstOutput = output;

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

  generateReport(session);

  console.log('\nPlaywright report: .qagen/playwright-report/index.html');
  console.log('Run "npx playwright show-report .qagen/playwright-report" to open it\n');
}

run().catch(console.error);