const OpenAI = require('openai');
const { resolveApiKey } = require('./config');

const apiKey = resolveApiKey();
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const FAILURE_TYPES = {
  selector_incorrecto: 'Selector incorrecto',
  texto_incorrecto:    'Texto incorrecto',
  elemento_ausente:    'Elemento ausente',
  timing:              'Timing',
  logica_de_test:      'Logica del test',
  bug_real:            'Posible bug real',
  desconocido:         'Desconocido'
};

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function extractFailureDetails(playwrightOutput) {
  const clean = stripAnsi(playwrightOutput);
  const failures = [];
  const errorBlocks = clean.split(/\n\s*\d+\) /);

  for (const block of errorBlocks) {
    if (!block.includes('Error:')) continue;

    const testNameMatch = block.match(/^(.+?)\n/);
    const testName = testNameMatch ? testNameMatch[1].trim() : 'Unknown test';

    const errorMatch = block.match(/Error:\s+(.+?)(?:\n|$)/);
    const error = errorMatch ? errorMatch[1].trim() : '';

    const locatorMatch = block.match(/Locator:\s+(.+?)(?:\n|$)/);
    const locator = locatorMatch ? locatorMatch[1].trim() : '';

    const expectedMatch = block.match(/Expected:\s+"([^"]+)"/);
    const expected = expectedMatch ? expectedMatch[1] : '';

    const receivedMatch = block.match(/Received:\s+"([^"]+)"/);
    const received = receivedMatch ? receivedMatch[1] : '';

    const fileMatch = block.match(/at\s+([^\n]+\.spec\.js):(\d+):/);
    const file = fileMatch ? fileMatch[1].trim() : '';
    const line = fileMatch ? parseInt(fileMatch[2], 10) : 0;

    const codeMatch = block.match(/>\s+\d+\s+\|(.+?)(?:\n|$)/);
    const codeLine = codeMatch ? codeMatch[1].trim() : '';

    if (error && (locator || file)) {
      failures.push({ testName, error, locator, expected, received, file, line, codeLine });
    }
  }

  const seen = new Set();
  return failures.filter(f => {
    const key = `${f.file}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildBasicAnalysis(failure) {
  const { error, locator, expected, received } = failure;

  if (error.includes('toHaveText') && received && received.length > 0) {
    return {
      type: 'selector_incorrecto',
      explanation: `El elemento "${locator}" contiene texto diferente al esperado. El texto buscado puede estar en otro elemento de la página.`,
      recommendation: `Verificar qué elemento contiene el texto "${expected}" después de la acción.`
    };
  }

  if (error.includes('Timeout') || error.includes('waiting for')) {
    return {
      type: 'timing',
      explanation: `El elemento "${locator}" no estuvo disponible dentro del tiempo límite. Puede ser un problema de carga asíncrona o que el elemento no existe en esta ruta.`,
      recommendation: 'Agregar un waitForSelector explícito o verificar que el elemento existe en esta página.'
    };
  }

  if (error.includes('locator') && error.includes('not found')) {
    return {
      type: 'elemento_ausente',
      explanation: `El selector "${locator}" no encontró ningún elemento en la página. El elemento puede no existir o tener un selector diferente.`,
      recommendation: 'Inspeccionar el HTML de la página para encontrar el selector correcto.'
    };
  }

  return {
    type: 'desconocido',
    explanation: `El test falló con el error: ${error.substring(0, 150)}`,
    recommendation: 'Revisar el test manualmente para determinar la causa exacta del fallo.'
  };
}

async function analyzeFailure(failure, url) {
  if (!openai) return buildBasicAnalysis(failure);

  const prompt = `Eres un experto en testing automatizado con Playwright. Analiza este fallo de test y explica qué salió mal.

URL testeada: ${url}
Nombre del test: ${failure.testName}
Error: ${failure.error}
Locator usado: ${failure.locator || 'no disponible'}
Texto esperado: ${failure.expected || 'no disponible'}
Texto recibido: ${failure.received || 'no disponible'}
Línea de código: ${failure.codeLine || 'no disponible'}

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta, sin markdown ni texto adicional:
{
  "type": "selector_incorrecto|texto_incorrecto|elemento_ausente|timing|logica_de_test|bug_real|desconocido",
  "explanation": "Explicación clara en español de qué salió mal y por qué (máximo 2 oraciones)",
  "recommendation": "Acción concreta que el desarrollador debe tomar (máximo 1 oración)"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un analizador de fallos de tests. Respondes ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    const raw = response.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    if (parsed.type && parsed.explanation && parsed.recommendation) {
      return parsed;
    }

    return buildBasicAnalysis(failure);
  } catch {
    return buildBasicAnalysis(failure);
  }
}

async function analyzeUnresolvedFailures(playwrightOutput, url) {
  const failures = extractFailureDetails(playwrightOutput);

  if (failures.length === 0) return [];

  console.log(`\nAnalyzing ${failures.length} unresolved failure(s)...\n`);

  const analyses = [];

  for (const failure of failures) {
    const analysis = await analyzeFailure(failure, url);
    analyses.push({
      testName: failure.testName,
      file: failure.file,
      line: failure.line,
      ...analysis
    });

    const label = FAILURE_TYPES[analysis.type] || 'Desconocido';
    console.log(`   [${label}] ${analysis.explanation}`);
    console.log(`   Action: ${analysis.recommendation}\n`);
  }

  return analyses;
}

module.exports = { analyzeUnresolvedFailures };