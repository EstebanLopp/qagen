/**
 * flow-detector.js
 *
 * Detecta el tipo de flujo crítico de una página web a partir de las
 * señales del DOM que ya recopiló el analyzer: inputs, botones, links,
 * título, H1 y URL.
 *
 * Devuelve un objeto con:
 *   - type: string  → el flujo detectado
 *   - confidence: 'high' | 'medium' | 'low'
 *   - signals: string[]  → las señales concretas que activaron la detección
 *   - testingHints: string[]  → qué debe priorizar el generador de tests
 */

// Cada flujo tiene una lista de señales. Cada señal tiene un peso (points).
// El detector acumula puntos por señal encontrada y el flujo con más puntos gana.
const FLOW_DEFINITIONS = {
  login: {
    signals: [
      // Señales de URL
      { type: 'url',    pattern: /login|signin|sign-in|acceso|entrar/i,         points: 3 },
      // Señales de texto visible (título, H1, H2, botones)
      { type: 'text',   pattern: /log\s?in|sign\s?in|iniciar sesi[oó]n/i,       points: 3 },
      // Señales de inputs específicos
      { type: 'input',  name: /user|email|correo/i,                              points: 2 },
      { type: 'input',  name: /pass|password|contrase[ñn]a/i,                   points: 3 },
      // Señales de botones
      { type: 'button', text: /log\s?in|sign\s?in|entrar|acceder|ingresar/i,    points: 3 },
      // Penalización: si hay campo de confirmación de contraseña, probablemente es registro
      { type: 'input',  name: /confirm|repeat|verificar/i,                       points: -3 },
    ],
    testingHints: [
      'Testea login exitoso con credenciales válidas',
      'Testea mensaje de error con credenciales inválidas',
      'Verifica que el campo password enmascara el texto (type=password)',
      'Verifica redirección después del login exitoso',
      'Testea que el formulario no se envía vacío',
    ]
  },

  register: {
    signals: [
      { type: 'url',    pattern: /register|signup|sign-up|registro|crear|new.?account/i, points: 3 },
      { type: 'text',   pattern: /register|sign\s?up|crear cuenta|nuevo usuario/i,        points: 3 },
      { type: 'input',  name: /confirm|repeat|verificar/i,                                points: 3 },
      { type: 'input',  name: /name|nombre/i,                                             points: 2 },
      { type: 'input',  name: /email|correo/i,                                            points: 1 },
      { type: 'input',  name: /pass|password/i,                                           points: 1 },
      { type: 'button', text: /register|sign\s?up|crear|registrar|continue/i,             points: 3 },
    ],
    testingHints: [
      'Testea registro exitoso con datos válidos',
      'Verifica validación de email con formato inválido',
      'Testea que las contraseñas deben coincidir',
      'Verifica campos requeridos al enviar vacío',
      'Testea que el usuario ya registrado muestra error',
    ]
  },

  checkout: {
    signals: [
      { type: 'url',    pattern: /checkout|cart|carrito|pago|payment|order/i,    points: 3 },
      { type: 'text',   pattern: /checkout|cart|carrito|payment|order|pago/i,    points: 3 },
      { type: 'input',  name: /card|tarjeta|credit|cvv|expir/i,                  points: 4 },
      { type: 'input',  name: /address|direcci[oó]n|zip|postal/i,                points: 3 },
      { type: 'button', text: /pay|pagar|comprar|buy|purchase|confirmar|order/i, points: 4 },
      { type: 'text',   pattern: /\$|€|total|subtotal|precio/i,                  points: 2 },
    ],
    testingHints: [
      'Verifica que el total se calcula correctamente',
      'Testea validación de número de tarjeta inválido',
      'Verifica que campos de dirección son requeridos',
      'Testea el flujo completo de compra',
      'Verifica mensaje de confirmación después del pago',
    ]
  },

  search: {
    signals: [
      { type: 'url',    pattern: /search|buscar|query|q=/i,                      points: 2 },
      { type: 'text',   pattern: /search|buscar|encuentra|find/i,                points: 2 },
      { type: 'input',  name: /search|query|buscar|q/i,                          points: 3 },
      { type: 'input',  placeholder: /search|buscar|encuentra/i,                 points: 3 },
      { type: 'button', text: /search|buscar|find|go/i,                          points: 2 },
    ],
    testingHints: [
      'Testea búsqueda con término válido y verifica resultados',
      'Testea búsqueda vacía',
      'Testea búsqueda con término sin resultados',
      'Verifica que el término buscado aparece en los resultados',
    ]
  },

  'crud-form': {
    signals: [
      { type: 'url',    pattern: /new|create|edit|update|add|nuevo|crear|editar/i, points: 2 },
      { type: 'text',   pattern: /new|create|edit|update|add|nuevo|crear|editar/i, points: 2 },
      // Forms con múltiples inputs pero sin señales de login/registro/checkout
      { type: 'form',   minInputs: 3,                                              points: 2 },
      { type: 'button', text: /save|guardar|submit|send|create|update|add/i,       points: 3 },
      { type: 'button', text: /cancel|cancelar|delete|eliminar/i,                  points: 1 },
    ],
    testingHints: [
      'Testea creación exitosa con datos válidos',
      'Verifica validación de campos requeridos',
      'Testea cancelar/descartar cambios',
      'Verifica que los datos guardados se muestran correctamente',
    ]
  },

  dashboard: {
    signals: [
      { type: 'url',    pattern: /dashboard|panel|home|inicio|overview|main/i,   points: 2 },
      { type: 'text',   pattern: /dashboard|panel|resumen|overview|bienvenido/i, points: 2 },
      // Dashboards tienen muchos links de navegación pero pocos forms
      { type: 'link',   minLinks: 5,                                              points: 2 },
      { type: 'form',   maxInputs: 1,                                             points: 1 },
    ],
    testingHints: [
      'Verifica que los elementos principales de navegación son visibles',
      'Verifica que el usuario autenticado ve su información',
      'Testea que los links de navegación funcionan',
    ]
  }
};

/**
 * Normaliza todo el texto visible de la página en un solo string
 * para hacer matching más fácil contra los patrones de señales de texto.
 */
function buildTextCorpus(pageInfo, elements) {
  const parts = [
    pageInfo.title || '',
    pageInfo.h1 || '',
    pageInfo.h2 || '',
    ...elements.buttons.map(b => b.text || ''),
    ...elements.links.map(l => l.text || ''),
  ];
  return parts.join(' ');
}

/**
 * Evalúa cuántos puntos acumula un flujo dado para esta página.
 * Retorna { score, signals } donde signals son las señales activadas.
 */
function scoreFlow(flowName, definition, url, elements, pageInfo) {
  let score = 0;
  const activatedSignals = [];
  const textCorpus = buildTextCorpus(pageInfo, elements);

  for (const signal of definition.signals) {

    if (signal.type === 'url') {
      if (signal.pattern.test(url)) {
        score += signal.points;
        activatedSignals.push(`URL contiene patrón "${signal.pattern.source}" (+${signal.points})`);
      }
    }

    else if (signal.type === 'text') {
      if (signal.pattern.test(textCorpus)) {
        score += signal.points;
        activatedSignals.push(`Texto visible contiene "${signal.pattern.source}" (+${signal.points})`);
      }
    }

    else if (signal.type === 'input') {
      const matchingInputs = elements.inputs.filter(input => {
        const nameMatch = signal.name
          ? signal.name.test(input.name || '') || signal.name.test(input.placeholder || '')
          : false;
        const placeholderMatch = signal.placeholder
          ? signal.placeholder.test(input.placeholder || '')
          : false;
        return nameMatch || placeholderMatch;
      });

      if (matchingInputs.length > 0) {
        score += signal.points;
        const direction = signal.points > 0 ? `+${signal.points}` : signal.points;
        activatedSignals.push(`Input con nombre/placeholder "${signal.name?.source || signal.placeholder?.source}" (${direction})`);
      }
    }

    else if (signal.type === 'button') {
      const matchingButtons = elements.buttons.filter(b =>
        signal.text.test(b.text || '')
      );
      if (matchingButtons.length > 0) {
        score += signal.points;
        activatedSignals.push(`Botón con texto "${signal.text.source}" (+${signal.points})`);
      }
    }

    else if (signal.type === 'form') {
      const inputCount = elements.inputs.length;
      if (signal.minInputs !== undefined && inputCount >= signal.minInputs) {
        score += signal.points;
        activatedSignals.push(`Formulario con ${inputCount} inputs >= ${signal.minInputs} (+${signal.points})`);
      }
      if (signal.maxInputs !== undefined && inputCount <= signal.maxInputs) {
        score += signal.points;
        activatedSignals.push(`Formulario con ${inputCount} inputs <= ${signal.maxInputs} (+${signal.points})`);
      }
    }

    else if (signal.type === 'link') {
      const linkCount = elements.links.length;
      if (signal.minLinks !== undefined && linkCount >= signal.minLinks) {
        score += signal.points;
        activatedSignals.push(`${linkCount} links >= ${signal.minLinks} (+${signal.points})`);
      }
    }
  }

  return { score, signals: activatedSignals };
}

/**
 * Función principal. Recibe los datos ya recolectados por el analyzer
 * y devuelve el flujo detectado con su contexto.
 *
 * @param {string} url
 * @param {object} elements  - { buttons, inputs, forms, links }
 * @param {object} pageInfo  - { title, h1, h2, ... }
 * @returns {{ type, confidence, signals, testingHints }}
 */
function detectFlow(url, elements, pageInfo) {
  const results = [];

  for (const [flowName, definition] of Object.entries(FLOW_DEFINITIONS)) {
    const { score, signals } = scoreFlow(flowName, definition, url, elements, pageInfo);
    if (score > 0) {
      results.push({ type: flowName, score, signals, testingHints: definition.testingHints });
    }
  }

  // Ordenar por score descendente
  results.sort((a, b) => b.score - a.score);

  if (results.length === 0 || results[0].score < 2) {
    return {
      type: 'unknown',
      confidence: 'low',
      signals: ['No se encontraron señales suficientes para clasificar el flujo'],
      testingHints: [
        'Verifica que la página carga correctamente',
        'Testea los elementos interactivos visibles',
        'Verifica el título de la página',
      ]
    };
  }

  const winner = results[0];
  const runnerUp = results[1];

  // Confianza alta: el ganador tiene ventaja clara sobre el segundo
  // Confianza media: hay competencia entre dos flujos
  // Confianza baja: score bajo o muy reñido
  let confidence;
  if (winner.score >= 6 && (!runnerUp || winner.score >= runnerUp.score * 1.5)) {
    confidence = 'high';
  } else if (winner.score >= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    type: winner.type,
    confidence,
    signals: winner.signals,
    testingHints: winner.testingHints
  };
}

module.exports = { detectFlow };