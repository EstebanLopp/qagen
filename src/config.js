const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CONFIG_DIR = path.join(os.homedir(), '.qagen');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const MEMORY_FILE = path.join(CONFIG_DIR, 'memory.json');

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function resolveApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  const config = readConfig();
  if (config.openaiApiKey) return config.openaiApiKey;

  try {
    const dotenvPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, 'utf8');
      const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch {
    // fall through
  }

  return null;
}

async function runConfigWizard() {
  console.log('\nQAgen Configuration\n');

  const currentConfig = readConfig();
  const hasKey = !!currentConfig.openaiApiKey;

  if (hasKey) {
    const masked = currentConfig.openaiApiKey.substring(0, 7) + '...' +
                   currentConfig.openaiApiKey.slice(-4);
    console.log(`Current API key: ${masked}`);
    console.log('Press Enter to keep it, or type a new one.\n');
  } else {
    console.log('An OpenAI API key is required to use QAgen.');
    console.log('Get one at: https://platform.openai.com/api-keys\n');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const apiKey = await new Promise(resolve => {
    rl.question('OpenAI API Key: ', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!apiKey && hasKey) {
    console.log('\nNo changes made.\n');
    return;
  }

  if (!apiKey) {
    console.log('\nNo API key provided. Configuration cancelled.\n');
    process.exit(1);
  }

  if (!apiKey.startsWith('sk-')) {
    console.log('\nWarning: key does not start with "sk-". Saved anyway — verify it is correct.\n');
  }

  writeConfig({ ...currentConfig, openaiApiKey: apiKey });
  console.log('\nAPI key saved to ~/.qagen/config.json');
  console.log('You can now run: qagen https://your-app.com\n');
}

function readMemory(domain) {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    const memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    return memory[domain]?.selectors || [];
  } catch {
    return [];
  }
}

function saveToMemory(domain, wrong, correct, context) {
  try {
    let memory = {};

    if (fs.existsSync(MEMORY_FILE)) {
      memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }

    if (!memory[domain]) {
      memory[domain] = { selectors: [] };
    }

    const existing = memory[domain].selectors.findIndex(s => s.wrong === wrong);
    const entry = { wrong, correct, context, assertion: 'toContainText' };

    if (existing >= 0) {
      memory[domain].selectors[existing] = entry;
    } else {
      memory[domain].selectors.push(entry);
    }

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
  } catch (err) {
    console.log(`Warning: could not save to memory — ${err.message}`);
  }
}

module.exports = { resolveApiKey, runConfigWizard, readMemory, saveToMemory };