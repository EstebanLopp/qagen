const { analyzeApp } = require('./src/analyzer');

const url = process.argv[2];

if (!url) {
  console.log('❌ Debes proporcionar una URL');
  console.log('Uso: node index.js https://ejemplo.com');
  process.exit(1);
}

analyzeApp(url).catch(console.error);