#!/usr/bin/env node

const { analyzeApp } = require('./src/analyzer');
const { crawlRoutes } = require('./src/crawler');
const { healFailures } = require('./src/healer');
const { generateReport } = require('./src/reporter');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const url = process.argv[2];
const mode = process.argv[3] || 'single';

if (!url) {
  console.log('❌ Debes proporcionar una URL');
  console.log('Uso:');
  console.log('  qagen https://ejemplo.com          (analiza y testea una página)');
  console.log('  qagen https://ejemplo.com crawl    (detecta, analiza y testea todas las rutas)');
  process.exit(1);
}

/**
 * Elimina todos los archivos .spec.js de sesiones anteriores.
 * Cada ejecución de QAgen es una sesión nueva — mezclar tests
 * de sesiones distintas produce reportes incorrectos y tiempos
 * de ejecución que crecen indefinidamente.
 */
function clearPreviousTests() {
  const dir = path.join(process.cwd(), 'tests', 'generated');

  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.js'));

  if (files.length > 0) {
    files.forEach(f => fs.unlinkSync(path.join(dir, f)));
    console.log(`🧹 ${files.length} test(s) de sesiones anteriores eliminado(s)\n`);
  }
}

/**
 * Ejecuta los tests y devuelve el output como string además de
 * mostrarlo en consola.
 */
function runTests() {
  console.log('\n🧪 Ejecutando tests generados...\n');

  const result = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/generated'],
    {
      cwd: process.cwd(),
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
 * Re-ejecuta los tests después del healing para confirmar que
 * los parches funcionaron.
 */
function rerunTests() {
  console.log('\n🔁 Re-ejecutando tests después del healing...\n');

  const result = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/generated'],
    {
      cwd: process.cwd(),
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
  // Limpiar tests de sesiones anteriores antes de empezar.
  // Garantiza que solo se ejecutan los tests de esta sesión.
  clearPreviousTests();

  const session = {
    url,
    startTime: Date.now(),
    flow: { type: 'unknown', confidence: 'low' },
    testsFile: '',
    firstOutput: '',
    healing: { healed: 0, failed: 0, details: [] },
    finalOutput: null
  };

  if (mode === 'crawl') {
    const routes = await crawlRoutes(url);
    console.log('\n🤖 Analizando cada ruta...\n');

    const failed = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`\n[${i + 1}/${routes.length}] ${route}`);

      try {
        const result = await analyzeApp(route);
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
    const result = await analyzeApp(url);
    session.testsFile = path.basename(result.filepath);
    session.flow = result.flow;
  }

  // Primera ejecución
  const { output, hasFailed } = runTests();
  session.firstOutput = output;

  // Healing si hubo fallos
  if (hasFailed) {
    const healResult = await healFailures(output, process.cwd());
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
  }

  // Generar reporte de sesión
  generateReport(session);

  console.log('\n📊 Reporte Playwright: playwright-report/index.html');
  console.log('   Ejecuta "npx playwright show-report" para abrirlo\n');
}

run().catch(console.error);