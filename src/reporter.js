const fs = require('fs');
const path = require('path');

function parseTestResults(output) {
  const results = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const passMatch = line.match(/✓\s+\d+\s+[^\s]+\s+›\s+[^›]+›\s+(.+?)\s+\(\d/);
    const failMatch = line.match(/✘\s+\d+\s+[^\s]+\s+›\s+[^›]+›\s+(.+?)\s+\(\d/);

    if (passMatch) {
      results.push({ name: passMatch[1].trim(), status: 'passed' });
    } else if (failMatch) {
      if (!line.includes('retry #')) {
        results.push({ name: failMatch[1].trim(), status: 'failed' });
      }
    }
  }

  return results;
}

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatTotalDuration(startTime) {
  return formatDuration(Date.now() - startTime);
}

function flowConfig(flowType) {
  const configs = {
    login:       { label: 'Login',     color: '#3b82f6', bg: '#eff6ff' },
    register:    { label: 'Register',  color: '#8b5cf6', bg: '#f5f3ff' },
    checkout:    { label: 'Checkout',  color: '#f59e0b', bg: '#fffbeb' },
    search:      { label: 'Search',    color: '#06b6d4', bg: '#ecfeff' },
    'crud-form': { label: 'Form',      color: '#10b981', bg: '#f0fdf4' },
    dashboard:   { label: 'Dashboard', color: '#6366f1', bg: '#eef2ff' },
    unknown:     { label: 'Unknown',   color: '#6b7280', bg: '#f9fafb' },
  };
  return configs[flowType] || configs.unknown;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTimeline(timeline) {
  if (!timeline || timeline.length === 0) return '';

  const steps = timeline.map((event, i) => {
    const isLast = i === timeline.length - 1;
    return `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:${isLast ? '0' : '16px'};">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
          <div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;margin-top:4px;"></div>
          ${!isLast ? '<div style="width:2px;flex:1;background:#e5e7eb;margin-top:4px;min-height:20px;"></div>' : ''}
        </div>
        <div style="padding-bottom:${isLast ? '0' : '4px'};">
          <div style="font-size:14px;color:#1f2937;font-weight:500;">${escapeHtml(event.label)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${formatDuration(event.duration)}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="section-label">Session timeline</div>
      ${steps}
    </div>`;
}

function buildValueSection(healing, memoryBefore, memoryAfter) {
  const items = [];

  if (healing.healed > 0) {
    items.push({
      value: healing.healed,
      label: healing.healed === 1 ? 'test self-healed' : 'tests self-healed',
      sublabel: 'Would have failed permanently without QAgen',
      color: '#10b981',
      bg: '#f0fdf4'
    });
  }

  const learned = memoryAfter - memoryBefore;
  if (learned > 0) {
    items.push({
      value: learned,
      label: learned === 1 ? 'new selector learned' : 'new selectors learned',
      sublabel: `Will not repeat this mistake on future runs`,
      color: '#3b82f6',
      bg: '#eff6ff'
    });
  }

  if (memoryBefore > 0) {
    items.push({
      value: memoryBefore,
      label: memoryBefore === 1 ? 'selector applied from memory' : 'selectors applied from memory',
      sublabel: 'Previous corrections prevented recurring failures',
      color: '#8b5cf6',
      bg: '#f5f3ff'
    });
  }

  if (items.length === 0) return '';

  const cards = items.map(item => `
    <div style="flex:1;background:${item.bg};border-radius:10px;padding:20px;">
      <div style="font-size:36px;font-weight:700;color:${item.color};line-height:1;">${item.value}</div>
      <div style="font-size:14px;font-weight:600;color:${item.color};margin-top:6px;">${item.label}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.4;">${item.sublabel}</div>
    </div>`).join('');

  return `
    <div class="card">
      <div class="section-label">Value generated</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${cards}
      </div>
    </div>`;
}

function buildFailureAnalysisSection(analyses) {
  if (!analyses || analyses.length === 0) return '';

  const typeLabels = {
    selector_incorrecto: { label: 'Wrong selector',  color: '#f59e0b', bg: '#fffbeb' },
    texto_incorrecto:    { label: 'Wrong text',       color: '#f59e0b', bg: '#fffbeb' },
    elemento_ausente:    { label: 'Missing element',  color: '#ef4444', bg: '#fef2f2' },
    timing:              { label: 'Timing issue',     color: '#8b5cf6', bg: '#f5f3ff' },
    logica_de_test:      { label: 'Test logic',       color: '#6366f1', bg: '#eef2ff' },
    bug_real:            { label: 'Possible bug',     color: '#dc2626', bg: '#fef2f2' },
    desconocido:         { label: 'Unknown',          color: '#6b7280', bg: '#f9fafb' },
  };

  const rows = analyses.map(a => {
    const typeInfo = typeLabels[a.type] || typeLabels.desconocido;
    return `
      <div style="border:1px solid #f3f4f6;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="background:${typeInfo.bg};color:${typeInfo.color};
                       font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;
                       text-transform:uppercase;letter-spacing:0.05em;">
            ${escapeHtml(typeInfo.label)}
          </span>
          <span style="font-size:14px;font-weight:500;color:#1f2937;">
            ${escapeHtml(a.testName)}
          </span>
        </div>
        <p style="font-size:13px;color:#4b5563;margin-bottom:10px;line-height:1.6;">
          ${escapeHtml(a.explanation)}
        </p>
        <div style="background:#f8fafc;border-left:3px solid ${typeInfo.color};
                    padding:10px 14px;border-radius:0 6px 6px 0;">
          <span style="font-size:11px;color:#9ca3af;font-weight:600;
                       text-transform:uppercase;letter-spacing:0.05em;">Recommended action </span>
          <span style="font-size:13px;color:#374151;">${escapeHtml(a.recommendation)}</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="section-label">Unresolved failures — root cause analysis</div>
      <p style="font-size:13px;color:#6b7280;margin-bottom:16px;line-height:1.6;">
        These failures could not be healed automatically. QAgen analyzed each one to help you understand what went wrong.
      </p>
      ${rows}
    </div>`;
}

function generateHTML(session) {
  const {
    url, startTime, flow, testsFile,
    firstOutput, healing, finalOutput,
    failureAnalyses = [],
    timeline = [],
    memoryBefore = 0,
    memoryAfter = 0
  } = session;

  const totalDuration = formatTotalDuration(startTime);
  const date = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const fc = flowConfig(flow.type);
  const firstResults = parseTestResults(firstOutput);
  const finalResults = finalOutput ? parseTestResults(finalOutput) : null;
  const displayResults = finalResults || firstResults;

  const totalTests = displayResults.length;
  const passedTests = displayResults.filter(t => t.status === 'passed').length;
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  const rateColor = successRate === 100 ? '#10b981' : successRate >= 60 ? '#f59e0b' : '#ef4444';

  const testRows = displayResults.map(t => {
    const passed = t.status === 'passed';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;
                  background:${passed ? '#f0fdf4' : '#fef2f2'};
                  border-radius:7px;margin-bottom:6px;">
        <div style="width:18px;height:18px;border-radius:50%;
                    background:${passed ? '#10b981' : '#ef4444'};
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:white;font-size:11px;font-weight:700;">${passed ? '✓' : '✘'}</span>
        </div>
        <span style="color:#1f2937;font-size:14px;">${escapeHtml(t.name)}</span>
      </div>`;
  }).join('');

  const healingRows = healing.details.map(d => {
    const isSuccess = d.startsWith('OK');
    return `
      <div style="padding:8px 12px;background:${isSuccess ? '#f0fdf4' : '#fef2f2'};
                  border-radius:6px;margin-bottom:6px;font-size:12px;
                  color:${isSuccess ? '#065f46' : '#7f1d1d'};font-family:monospace;">
        ${escapeHtml(d)}
      </div>`;
  }).join('');

  const healingSection = healing.healed > 0 || healing.failed > 0 ? `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #f3f4f6;">
      <div class="section-label">Self-healing activity</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#10b981;line-height:1;">${healing.healed}</div>
          <div style="font-size:12px;color:#065f46;margin-top:4px;">healed</div>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#ef4444;line-height:1;">${healing.failed}</div>
          <div style="font-size:12px;color:#7f1d1d;margin-top:4px;">unresolved</div>
        </div>
      </div>
      ${healingRows}
    </div>` : '';

  const timelineSection = buildTimeline(timeline);
  const valueSection = buildValueSection(healing, memoryBefore, memoryAfter);
  const failureSection = buildFailureAnalysisSection(failureAnalyses);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgen — Session Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1f2937;
      min-height: 100vh;
      padding: 40px 16px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 28px;
      margin-bottom: 16px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .section-label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto;">

    <!-- Header -->
    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">QAgen</span>
        <span style="font-size:12px;color:#9ca3af;">v0.1.8</span>
      </div>
      <div style="font-size:13px;color:#64748b;">${date} · ${totalDuration} total</div>
    </div>

    <!-- URL + Flow -->
    <div class="card">
      <div class="section-label">Target</div>
      <div style="font-size:15px;color:#2563eb;word-break:break-all;margin-bottom:16px;
                  font-weight:500;">${escapeHtml(url)}</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:${fc.bg};color:${fc.color};font-size:12px;font-weight:600;
                     padding:4px 12px;border-radius:999px;">${fc.label}</span>
        <span style="font-size:13px;color:#9ca3af;">
          ${flow.confidence} confidence · ${testsFile ? escapeHtml(testsFile) : ''}
        </span>
      </div>
    </div>

    <!-- Results -->
    <div class="card">
      <div class="section-label">Test results${finalResults ? ' — after healing' : ''}</div>

      <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:24px;">
        <div>
          <span style="font-size:56px;font-weight:800;color:${rateColor};
                       line-height:1;letter-spacing:-2px;">${successRate}%</span>
        </div>
        <div style="padding-bottom:8px;">
          <div style="font-size:15px;font-weight:600;color:#1f2937;">${passedTests} of ${totalTests} passed</div>
          ${failedTests > 0 ? `<div style="font-size:13px;color:#ef4444;margin-top:2px;">${failedTests} failed</div>` : ''}
        </div>
      </div>

      <div style="height:6px;background:#f1f5f9;border-radius:3px;margin-bottom:24px;overflow:hidden;">
        <div style="height:100%;width:${successRate}%;background:${rateColor};border-radius:3px;"></div>
      </div>

      ${testRows}
      ${healingSection}
    </div>

    ${valueSection}
    ${timelineSection}
    ${failureSection}

    <!-- Footer -->
    <div style="text-align:center;font-size:12px;color:#cbd5e1;padding:20px 0;">
      QAgen · Autonomous QA for web applications
    </div>

  </div>
</body>
</html>`;
}

function generateReport(session) {
  const qagenDir = session.qagenDir || process.cwd();
  const html = generateHTML(session);
  const outputPath = path.join(qagenDir, 'qagen-report.html');
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log('Session report: .qagen/qagen-report.html');
  return outputPath;
}

module.exports = { generateReport };