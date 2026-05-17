/**
 * failure-analyzer.js
 *
 * Analiza fallos de tests que el healer no pudo curar automáticamente.
 * Usa IA para explicar en lenguaje natural qué salió mal y por qué,
 * clasificar el tipo de fallo, y sugerir una acción concreta.
 *
 * Tipos de fallo que puede clasificar:
 * - selector_incorrecto: el elemento existe pero el selector no lo encuentra
 * - texto_incorrecto: el selector es correcto pero el texto esperado no coincide
 * - elemento_ausente: el elemento no existe en la página en ese momento
 * - timing: el elemento existe pero no estaba listo cuando se verificó
 * - logica_de_test: el test está mal construido independientemente de la app
 * - bug_real: el comportamiento de la app no es el esperado (posible bug)
 * - desconocido: no hay suficiente información para clasificar
 */

const OpenAI = require('openai');
const { resolveApiKey } = require('./config');

const apiKey = resolveApiKey();
const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Parsea el output de Playwright para extraer los bloques de error
 * completos — no solo el mensaje principal sino todo el contexto.
 *
 * @param {string} playwrightOutput
 * @returns {Array<{testName, error, locator, expected, received, file, line}>}
 */
function extractFailureDetails(playwrightOutput) {
  // Limpiar códigos ANSI
  // eslint-disable-next-line no-control-regex
  const clean = playwrightOutput.replace(/\u001b\[[0-9;]*m/g, '');
  const failures = [];

  // Separar bloques de error por numeración de Playwright
  const errorBlocks = clean.split(/\n\s*\d+\) /);

  for (const block of errorBlocks) {
    if (!block.includes('Error:')) continue;

    // Extraer nombre del test desde la primera línea del bloque
    const testNameMatch = block.match(/^(.+?)\n/);
    const testName = testNameMatch ? testNameMatch[1].trim() : 'Test desconocido';

    // Extraer el mensaje de error principal
    const errorMatch = block.match(/Error:\s+(.+?)(?:\n|$)/);
    const error = errorMatch ? errorMatch[1].trim() : '';

    // Extraer locator si existe
    const locatorMatch = block.match(/Locator:\s+(.+?)(?:\n|$)/);
    const locator = locatorMatch ? locatorMatch[1].trim() : '';

    // Extraer valor esperado
    const expectedMatch = block.match(/Expected:\s+"([^"]+)"/);
    const expected = expectedMatch ? expectedMatch[1] : '';

    // Extraer valor recibido
    const receivedMatch = block.match(/Received:\s+"([^"]+)"/);
    const received = receivedMatch ? receivedMatch[1] : '';

    // Extraer archivo y línea
    const fileMatch = block.match(/at\s+([^\n]+\.spec\.js):(\d+):/);
    const file = fileMatch ? fileMatch[1].trim() : '';
    const line = fileMatch ? parseInt(fileMatch[2], 10) : 0;

    // Extraer el fragmento de código donde ocurrió el error
    const codeMatch = block.match(/>\s+\d+\s+\|(.+?)(?:\n|$)/);
    const codeLine = codeMatch ? codeMatch[1].trim() : '';

    // Solo incluir si tenemos suficiente información
    if (error && (locator || file)) {
      failures.push({ testName, error, locator, expected, received, file, line, codeLine });
    }
  }

  // Deduplicar por archivo+línea (retries generan duplicados)
  const seen = new Set();
  return failures.filter(f => {
    const key = `${f.file}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Analiza un fallo individual con IA y devuelve una explicación estructurada.
 *
 * @param {object} failure  datos del fallo extraídos por extractFailureDetails
 * @param {string} url      URL de la página que se estaba testeando
 * @returns {Promise<{type, explanation, recommendation}>}
 */
async function analyzeFailure(failure, url) {
  // Si no hay OpenAI disponible, devolver análisis básico sin IA
  if (!openai) {
    return buildBasicAnalysis(failure);
  }

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

    // Validar que tiene los campos esperados
    if (parsed.type && parsed.explanation && parsed.recommendation) {
      return parsed;
    }

    return buildBasicAnalysis(failure);

  } catch {
    // Si la IA falla, usar análisis basado en reglas
    return buildBasicAnalysis(failure);
  }
}

/**
 * Análisis básico basado en reglas cuando la IA no está disponible.
 * Detecta patrones comunes sin necesidad de llamada a la API.
 *
 * @param {object} failure
 * @returns {{type, explanation, recommendation}}
 */
function buildBasicAnalysis(failure) {
  const { error, locator, expected, received } = failure;

  // Texto esperado existe pero en lugar diferente
  if (error.includes('toHaveText') && received && received.length > 0) {
    return {
      type: 'selector_incorrecto',
      explanation: `El elemento "${locator}" contiene texto diferente al esperado. El texto buscado puede estar en otro elemento de la página.`,
      recommendation: `Verificar qué elemento contiene el texto "${expected}" después de la acción.`
    };
  }

  // Elemento no encontrado en el tiempo límite
  if (error.includes('Timeout') || error.includes('waiting for')) {
    return {
      type: 'timing',
      explanation: `El elemento "${locator}" no estuvo disponible dentro del tiempo límite. Puede ser un problema de carga asíncrona o el elemento no existe en esta ruta.`,
      recommendation: 'Agregar un waitForSelector explícito o verificar que el elemento existe en esta página.'
    };
  }

  // Error de locator no encontrado
  if (error.includes('locator') && error.includes('not found')) {
    return {
      type: 'elemento_ausente',
      explanation: `El selector "${locator}" no encontró ningún elemento en la página. El elemento puede no existir o tener un selector diferente.`,
      recommendation: 'Inspeccionar el HTML de la página para encontrar el selector correcto.'
    };
  }

  // Fallo genérico
  return {
    type: 'desconocido',
    explanation: `El test falló con el error: ${error.substring(0, 150)}`,
    recommendation: 'Revisar el test manualmente para determinar la causa exacta del fallo.'
  };
}

/**
 * Función principal. Recibe el output de Playwright y los fallos
 * que el healer no pudo curar, analiza cada uno con IA, y devuelve
 * un array de análisis enriquecidos.
 *
 * @param {string} playwrightOutput  output completo de Playwright
 * @param {string} url               URL que se estaba testeando
 * @param {number} healedCount       cuántos fallos ya curó el healer
 * @returns {Promise<Array<{testName, type, explanation, recommendation}>>}
 */
async function analyzeUnresolvedFailures(playwrightOutput, url, healedCount) {
  const failures = extractFailureDetails(playwrightOutput);

  // Si el healer curó todos los fallos, no hay nada que analizar
  if (failures.length === 0) return [];

  // Si el healer curó algunos, los fallos que quedan son los no curables.
  // extractFailureDetails ya deduplica retries, así que cada fallo
  // aparece una sola vez.
  console.log(`\n🔬 Analizando ${failures.length} fallo(s) no resuelto(s)...\n`);

  const analyses = [];

  for (const failure of failures) {
    const analysis = await analyzeFailure(failure, url);
    analyses.push({
      testName: failure.testName,
      file: failure.file,
      line: failure.line,
      ...analysis
    });

    // Mostrar en consola para feedback inmediato
    const typeLabels = {
      selector_incorrecto: '🎯 Selector incorrecto',
      texto_incorrecto:    '📝 Texto incorrecto',
      elemento_ausente:    '👻 Elemento ausente',
      timing:              '⏱️  Timing',
      logica_de_test:      '🧠 Lógica del test',
      bug_real:            '🐛 Posible bug real',
      desconocido:         '❓ Desconocido'
    };

    console.log(`   ${typeLabels[analysis.type] || '❓ Desconocido'}`);
    console.log(`   ${analysis.explanation}`);
    console.log(`   → ${analysis.recommendation}\n`);
  }

  return analyses;
}

module.exports = { analyzeUnresolvedFailures };