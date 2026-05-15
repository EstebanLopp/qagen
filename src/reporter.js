/**
 * reporter.js
 *
 * Genera un reporte HTML de la sesión de QAgen.
 * Muestra qué hizo el agente en términos de negocio:
 * qué flujo detectó, cuántos tests generó, cuáles pasaron,
 * cuáles curó y cuáles no pudo curar.
 *
 * Este reporte es para el cliente final, no para el desarrollador.
 * Un cliente sin conocimiento de Playwright debe poder leerlo y
 * entender el valor que QAgen aportó.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parsea el output de Playwright para extraer el resultado de cada test.
 * Devuelve un array de { name, status } donde status es 'passed' o 'failed'.
 */
function parseTestResults(output) {
  const results = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Playwright imprime cada test como:
    // "  ✓  1 archivo.spec.js:8:3 › Suite › Nombre del test (2.1s)"
    // "  ✘  2 archivo.spec.js:15:3 › Suite › Nombre del test (7.0s)"
    const passMatch = line.match(/✓\s+\d+\s+[^\s]+\s+›\s+[^›]+›\s+(.+?)\s+\(\d/);
    const failMatch = line.match(/✘\s+\d+\s+[^\s]+\s+›\s+[^›]+›\s+(.+?)\s+\(\d/);

    if (passMatch) {
      results.push({ name: passMatch[1].trim(), status: 'passed' });
    } else if (failMatch) {
      // Excluir retries — son duplicados del fallo original
      if (!line.includes('retry #')) {
        results.push({ name: failMatch[1].trim(), status: 'failed' });
      }
    }
  }

  return results;
}

/**
 * Calcula la duración total en formato legible.
 */
function formatDuration(startTime) {
  const seconds = Math.round((Date.now() - startTime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Devuelve el emoji y color según el tipo de flujo detectado.
 */
function flowBadge(flowType) {
  const badges = {
    login:       { emoji: '🔐', label: 'Login',       color: '#3b82f6' },
    register:    { emoji: '📝', label: 'Registro',    color: '#8b5cf6' },
    checkout:    { emoji: '🛒', label: 'Checkout',    color: '#f59e0b' },
    search:      { emoji: '🔍', label: 'Búsqueda',    color: '#06b6d4' },
    'crud-form': { emoji: '📋', label: 'Formulario',  color: '#10b981' },
    dashboard:   { emoji: '📊', label: 'Dashboard',   color: '#6366f1' },
    unknown:     { emoji: '❓', label: 'Desconocido', color: '#6b7280' },
  };
  return badges[flowType] || badges.unknown;
}

/**
 * Escapa caracteres HTML para evitar XSS en el reporte.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Genera el HTML completo del reporte.
 *
 * @param {object} session
 * @param {string}      session.url
 * @param {number}      session.startTime
 * @param {object}      session.flow          { type, confidence }
 * @param {string}      session.testsFile     nombre del archivo .spec.js generado
 * @param {string}      session.firstOutput   output de la primera ejecución
 * @param {object}      session.healing       { healed, failed, details }
 * @param {string|null} session.finalOutput   output de la re-ejecución (null si no hubo healing)
 */
function generateHTML(session) {
  const { url, startTime, flow, testsFile, firstOutput, healing, finalOutput } = session;

  const duration = formatDuration(startTime);
  const date = new Date().toLocaleString('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const badge = flowBadge(flow.type);

  // Si hubo healing y re-ejecución mostramos los resultados finales,
  // que reflejan el estado real después de las correcciones
  const firstResults = parseTestResults(firstOutput);
  const finalResults = finalOutput ? parseTestResults(finalOutput) : null;
  const displayResults = finalResults || firstResults;

  const totalTests = displayResults.length;
  const passedTests = displayResults.filter(t => t.status === 'passed').length;
  const failedTests = displayResults.filter(t => t.status === 'failed').length;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  const rateColor = successRate === 100 ? '#10b981' : successRate >= 60 ? '#f59e0b' : '#ef4444';

  const testRows = displayResults.map(t => {
    const icon = t.status === 'passed' ? '✓' : '✘';
    const color = t.status === 'passed' ? '#10b981' : '#ef4444';
    const bg = t.status === 'passed' ? '#f0fdf4' : '#fef2f2';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;
                  background:${bg};border-radius:6px;margin-bottom:6px;">
        <span style="color:${color};font-weight:700;font-size:16px;min-width:20px;">${icon}</span>
        <span style="color:#1f2937;font-size:14px;">${escapeHtml(t.name)}</span>
      </div>`;
  }).join('');

  const healingRows = healing.details.map(d => {
    const isSuccess = d.startsWith('✅');
    const bg = isSuccess ? '#f0fdf4' : '#fef2f2';
    const color = isSuccess ? '#065f46' : '#7f1d1d';
    return `
      <div style="padding:8px 14px;background:${bg};border-radius:6px;
                  margin-bottom:6px;font-size:13px;color:${color};font-family:monospace;">
        ${escapeHtml(d)}
      </div>`;
  }).join('');

  const healingSection = healing.healed > 0 || healing.failed > 0 ? `
    <div style="margin-top:32px;">
      <h2 style="font-size:18px;font-weight:600;color:#1f2937;margin-bottom:16px;">
        🔧 Auto-healing
      </h2>
      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#10b981;">${healing.healed}</div>
          <div style="font-size:13px;color:#065f46;margin-top:4px;">Tests curados</div>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#ef4444;">${healing.failed}</div>
          <div style="font-size:13px;color:#7f1d1d;margin-top:4px;">No pudieron curarse</div>
        </div>
      </div>
      ${healingRows ? `<div style="margin-top:8px;">${healingRows}</div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgen — Reporte de sesión</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      color: #1f2937;
      min-height: 100vh;
      padding: 32px 16px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 28px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
  </style>
</head>
<body>
  <div style="max-width:720px;margin:0 auto;">

    <!-- Header -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:24px;">🤖</span>
        <span style="font-size:22px;font-weight:700;color:#1f2937;">QAgen</span>
        <span style="font-size:13px;color:#6b7280;margin-left:4px;">Reporte de sesión</span>
      </div>
      <div style="font-size:13px;color:#9ca3af;">${date} · Duración: ${duration}</div>
    </div>

    <!-- URL analizada -->
    <div class="card">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;
                  letter-spacing:0.05em;margin-bottom:8px;">URL analizada</div>
      <div style="font-size:15px;color:#2563eb;word-break:break-all;">${escapeHtml(url)}</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:6px;">
        Archivo generado: <code style="color:#374151;">${escapeHtml(testsFile)}</code>
      </div>
    </div>

    <!-- Flujo detectado -->
    <div class="card">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;
                  letter-spacing:0.05em;margin-bottom:12px;">Flujo crítico detectado</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:32px;">${badge.emoji}</span>
        <div>
          <div style="font-size:20px;font-weight:700;color:${badge.color};">${badge.label}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px;">
            Confianza: <span style="font-weight:600;color:#374151;">${flow.confidence}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Resultados -->
    <div class="card">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;
                  letter-spacing:0.05em;margin-bottom:16px;">
        Resultados${finalResults ? ' (después del healing)' : ''}
      </div>

      <!-- Tasa de éxito -->
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:20px;">
        <span style="font-size:48px;font-weight:700;color:${rateColor};">${successRate}%</span>
        <span style="font-size:15px;color:#6b7280;">${passedTests} de ${totalTests} tests pasaron</span>
      </div>

      <!-- Barra de progreso -->
      <div style="height:8px;background:#f3f4f6;border-radius:4px;margin-bottom:24px;overflow:hidden;">
        <div style="height:100%;width:${successRate}%;background:${rateColor};border-radius:4px;"></div>
      </div>

      <!-- Lista de tests -->
      ${testRows}

      ${healingSection}
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:12px;color:#9ca3af;padding:16px 0;">
      Generado por QAgen · El agente de QA autónomo
    </div>

  </div>
</body>
</html>`;
}

/**
 * Función principal. Genera y guarda el reporte HTML en la raíz del proyecto.
 *
 * @param {object} session  datos de la sesión (ver generateHTML)
 * @returns {string}  ruta del archivo generado
 */
function generateReport(session) {
  const html = generateHTML(session);
  const outputPath = path.join(process.cwd(), 'qagen-report.html');
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`\n📋 Reporte QAgen generado: qagen-report.html`);
  return outputPath;
}

module.exports = { generateReport };