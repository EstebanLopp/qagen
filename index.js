const { analyzeApp } = require('./src/analyzer');
const { crawlRoutes } = require('./src/crawler');
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

function runTests() {
  console.log('\n🧪 Ejecutando tests generados...\n');

  // Pasamos el directorio completo en lugar de rutas individuales.
  // Esto evita el problema de separadores \ en Windows que Playwright
  // interpreta como expresiones regulares en lugar de paths de archivo.
  const result = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/generated'],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true
    }
  );

  if (result.status !== 0 && result.status !== 1) {
    console.log(`\n⚠️  Playwright terminó con código inesperado: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  }

  console.log('\n📊 Reporte disponible en: playwright-report/index.html');
  console.log('   Ejecuta "npx playwright show-report" para abrirlo\n');
}

async function run() {
  if (mode === 'crawl') {
    const routes = await crawlRoutes(url);
    console.log('\n🤖 Analizando cada ruta...\n');

    const filepaths = [];
    const failed = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`\n[${i + 1}/${routes.length}] ${route}`);

      try {
        const filepath = await analyzeApp(route);
        filepaths.push(filepath);
      } catch (err) {
        console.log(`⚠️  Falló el análisis de ${route}: ${err.message}`);
        failed.push(route);
      }
    }

    if (failed.length > 0) {
      console.log('\n⚠️  Rutas que fallaron:');
      failed.forEach(r => console.log(`   → ${r}`));
    }

    if (filepaths.length > 0) {
      runTests();
    } else {
      console.log('\n❌ No se generó ningún test. Revisa los errores anteriores.');
    }

  } else {
    await analyzeApp(url);
    runTests();
  }
}

run().catch(console.error);