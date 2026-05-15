const { analyzeApp } = require('./src/analyzer');
const { crawlRoutes } = require('./src/crawler');
const { healFailures } = require('./src/healer');
const { spawnSync } = require('child_process');

const url = process.argv[2];
const mode = process.argv[3] || 'single';

if (!url) {
  console.log('❌ Debes proporcionar una URL');
  console.log('Uso:');
  console.log('  node index.js https://ejemplo.com          (analiza y testea una página)');
  console.log('  node index.js https://ejemplo.com crawl    (detecta, analiza y testea todas las rutas)');
  process.exit(1);
}

/**
 * Ejecuta los tests y devuelve el output como string además de
 * mostrarlo en consola. Necesitamos el texto para que el healer
 * pueda parsear los fallos.
 */
function runTests() {
  console.log('\n🧪 Ejecutando tests generados...\n');

  // pipe en lugar de inherit para capturar el output como string
  // y poder pasárselo al healer
  const result = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/generated'],
    {
      cwd: process.cwd(),
      shell: true,
      encoding: 'utf8',
      // Capturamos stdout y stderr pero también los mostramos
      stdio: ['inherit', 'pipe', 'pipe']
    }
  );

  // Mostrar el output en consola como lo haría inherit
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const output = (result.stdout || '') + (result.stderr || '');
  const hasFailed = result.status === 1;

  if (result.status !== 0 && result.status !== 1) {
    console.log(`\n⚠️  Playwright terminó con código inesperado: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  }

  return { output, hasFailed };
}

/**
 * Vuelve a ejecutar los tests después del healing para confirmar
 * que los parches funcionaron. Solo muestra el resumen final.
 */
function rerunTests() {
  console.log('\n🔁 Re-ejecutando tests después del healing...\n');

  const result = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/generated'],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true
    }
  );

  return result.status;
}

async function run() {
  if (mode === 'crawl') {
    const routes = await crawlRoutes(url);
    console.log('\n🤖 Analizando cada ruta...\n');

    const failed = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`\n[${i + 1}/${routes.length}] ${route}`);

      try {
        await analyzeApp(route);
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
    await analyzeApp(url);
  }

  // Primera ejecución de tests
  const { output, hasFailed } = runTests();

  // Si hubo fallos, intentar curarlos
  if (hasFailed) {
    const healResult = await healFailures(output, process.cwd());

    if (healResult.healed > 0) {
      console.log(`\n✅ Healing completado: ${healResult.healed} test(s) curado(s)`);
      if (healResult.failed > 0) {
        console.log(`⚠️  ${healResult.failed} fallo(s) no pudieron ser curados`);
      }

      // Re-ejecutar para confirmar que los parches funcionaron
      rerunTests();
    } else {
      console.log('\n⚠️  No se pudieron curar los fallos automáticamente');
      console.log('   Revisa los tests manualmente o mejora los selectores en el prompt');
    }
  }

  console.log('\n📊 Reporte disponible en: playwright-report/index.html');
  console.log('   Ejecuta "npx playwright show-report" para abrirlo\n');
}

run().catch(console.error);