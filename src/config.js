/**
 * config.js
 *
 * Maneja la configuración global de QAgen.
 * La configuración se guarda en ~/.qagen/config.json para que
 * esté disponible desde cualquier directorio donde se ejecute el CLI,
 * sin depender de un archivo .env local.
 *
 * Flujo de resolución de la API key (en orden de prioridad):
 * 1. Variable de entorno OPENAI_API_KEY (ya establecida en el sistema)
 * 2. ~/.qagen/config.json (configurada con `qagen config`)
 * 3. .env en el directorio actual (fallback para desarrollo local)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Directorio y archivo de configuración global
const CONFIG_DIR = path.join(os.homedir(), '.qagen');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Lee la configuración guardada.
 * Devuelve un objeto vacío si no existe todavía.
 *
 * @returns {object}
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Guarda la configuración en ~/.qagen/config.json.
 * Crea el directorio si no existe.
 *
 * @param {object} config
 */
function writeConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Resuelve la API key de OpenAI desde las fuentes disponibles.
 * Prioridad: variable de entorno → config global → .env local
 *
 * @returns {string|null}
 */
function resolveApiKey() {
  // 1. Variable de entorno del sistema (la más prioritaria)
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  // 2. Configuración global guardada con `qagen config`
  const config = readConfig();
  if (config.openaiApiKey) {
    return config.openaiApiKey;
  }

  // 3. Archivo .env local (útil en desarrollo)
  try {
    const dotenvPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, 'utf8');
      const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch {
    // Si falla la lectura del .env, continuamos sin ella
  }

  return null;
}

/**
 * Flujo interactivo para configurar QAgen.
 * Le pide al usuario su API key de OpenAI y la guarda globalmente.
 * Se ejecuta cuando el usuario corre `qagen config`.
 */
async function runConfigWizard() {
  console.log('\n⚙️  Configuración de QAgen\n');

  const currentConfig = readConfig();
  const hasKey = !!currentConfig.openaiApiKey;

  if (hasKey) {
    const maskedKey = currentConfig.openaiApiKey.substring(0, 7) + '...' +
                      currentConfig.openaiApiKey.slice(-4);
    console.log(`   API key actual: ${maskedKey}`);
    console.log('   Ingresa una nueva para reemplazarla, o presiona Enter para mantenerla.\n');
  } else {
    console.log('   Necesitas una API key de OpenAI para usar QAgen.');
    console.log('   Puedes obtenerla en: https://platform.openai.com/api-keys\n');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const apiKey = await new Promise(resolve => {
    rl.question('   OpenAI API Key: ', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });

  // Si el usuario no ingresó nada y ya había una key, mantener la actual
  if (!apiKey && hasKey) {
    console.log('\n   ✅ Configuración sin cambios.\n');
    return;
  }

  // Validación básica del formato de la key
  if (!apiKey) {
    console.log('\n   ❌ No ingresaste una API key. Configuración cancelada.\n');
    process.exit(1);
  }

  if (!apiKey.startsWith('sk-')) {
    console.log('\n   ⚠️  La key no parece válida (debe empezar con "sk-").');
    console.log('   Guardada de todas formas — verifica que sea correcta.\n');
  }

  writeConfig({ ...currentConfig, openaiApiKey: apiKey });

  console.log('\n   ✅ API key guardada en ~/.qagen/config.json');
  console.log('   Ya puedes usar: qagen https://tu-app.com\n');
}

module.exports = { resolveApiKey, runConfigWizard };