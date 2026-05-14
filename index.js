const { analyzeApp } = require('./src/analyzer');
const { crawlRoutes } = require('./src/crawler');

const url = process.argv[2];
const mode = process.argv[3] || 'single';

if (!url) {
  console.log('❌ Debes proporcionar una URL');
  console.log('Uso:');
  console.log('  node index.js https://ejemplo.com          (analiza una página)');
  console.log('  node index.js https://ejemplo.com crawl    (detecta y analiza todas las rutas)');
  process.exit(1);
}

async function run() {
  if (mode === 'crawl') {
    const routes = await crawlRoutes(url);
    console.log('\n🤖 Analizando cada ruta...\n');
    for (const route of routes) {
      await analyzeApp(route);
    }
  } else {
    await analyzeApp(url);
  }
}

run().catch(console.error);