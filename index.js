#!/usr/bin/env node

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
  console.log('\n🤖 QAgen — El agente de QA autónomo\n');
  console.log('Uso:');
  console.log('  qagen https://ejemplo.com          Analiza y testea una página');
  console.log('  qagen https://ejemplo.com crawl    Detecta y testea todas las rutas');
  console.log('  qagen config                       Configura tu API key de OpenAI\n');
  process.exit(1);
}

const QAGEN_DIR = path.join(process.cwd(), '.qagen');

/**
 * Inicializa la carpeta .qagen/ con su estructura interna y
 * agrega .qagen/ al .gitignore del usuario si existe.
 */
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
      fs.appendFileSync(gitignorePath, '\n# QAgen — archivos generados automáticamente\n.qagen/\n');
      console.log('📝 .qagen/ agregado a .gitignore\n');
    }
  }
}

/**
 * Genera el playwright.config.js dentro de .qagen/ si no existe.
 */
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

/**
 * Elimina todos los archivos .spec.js de sesiones anteriores.
 */
function clearPreviousTests() {
  const dir = path.join(QAGEN_DIR, 'tests', 'generated');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.js'));
  if (files.length > 0) {
    files.forEach(f => fs.unlinkSync(path.join(dir, f)));
    console.log(`🧹 ${files.length} test(s) de sesiones anteriores eliminado(s)\n`);
  }
}

/**
 * Ejecuta los tests y devuelve el output completo.
 */
function runTests() {
  console.log('\n🧪 Ejecutando tests generados...\n');

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
      stdio: ['inherit', 'pipe', 'pipe']
    }
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const output = (result.stdout || '') + (result.stderr || '');
  const hasFailed = result.status === 1;

  if (result.status !== 0 && result.status !== 1) {
    console.log(`\n⚠️  Playwright terminó con código inesperado: ${result.status}`);
    if (result.error) console.log(`   Error: ${result.error.message}`);
  }

  return { output, hasFailed };
}

/**
 * Re-ejecuta los tests después del healing.
 */
function rerunTests() {
  console.log('\n🔁 Re-ejecutando tests después del healing...\n');

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
      stdio: ['inherit', 'pipe', 'pipe']
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

  const session = {
    url,
    startTime: Date.now(),
    flow: { type: 'unknown', confidence: 'low' },
    testsFile: '',
    firstOutput: '',
    healing: { healed: 0, failed: 0, details: [] },
    finalOutput: null,
    failureAnalyses: [],  // análisis de fallos no resueltos
    qagenDir: QAGEN_DIR
  };

  if (mode === 'crawl') {
    const routes = await crawlRoutes(url);
    console.log('\n🤖 Analizando cada ruta...\n');

    const failed = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`\n[${i + 1}/${routes.length}] ${route}`);

      try {
        const result = await analyzeApp(route, QAGEN_DIR);
        session.testsFile = path.basename(result.filepath);
        session.flow = result.flow;
      } catch (err) {
        console.log(`⚠️  Falló el análisis de ${route}: ${err.message}`);
        failed.push(route);
      }
    }

    if (failed.length > 0) {
      console.log('\n⚠️  Rutas que fallaron:');
      failed.forEach(r => console.log(`   → ${r}`));
    }

  } else {
    const result = await analyzeApp(url, QAGEN_DIR);
    session.testsFile = path.basename(result.filepath);
    session.flow = result.flow;
  }

  // Primera ejecución
  const { output, hasFailed } = runTests();
  session.firstOutput = output;

  if (hasFailed) {
    const healResult = await healFailures(output, QAGEN_DIR);
    session.healing = healResult;

    if (healResult.healed > 0) {
      console.log(`\n✅ Healing completado: ${healResult.healed} test(s) curado(s)`);
      if (healResult.failed > 0) {
        console.log(`⚠️  ${healResult.failed} fallo(s) no pudieron ser curados`);
      }
      session.finalOutput = rerunTests();
    } else {
      console.log('\n⚠️  No se pudieron curar los fallos automáticamente');
    }

    // Analizar los fallos que quedaron sin resolver.
    // Usamos el output final si hubo healing, si no el primero.
    const outputToAnalyze = session.finalOutput || output;
    session.failureAnalyses = await analyzeUnresolvedFailures(
      outputToAnalyze,
      url,
    );
  }

  generateReport(session);

  console.log('\n📊 Reporte Playwright disponible en: .qagen/playwright-report/index.html');
  console.log('   Ejecuta "npx playwright show-report .qagen/playwright-report" para abrirlo\n');
}

run().catch(console.error);