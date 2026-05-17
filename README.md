# QAgen 🤖

Agente de QA autónomo que analiza tu aplicación web, genera tests de Playwright con IA, los ejecuta y se repara solo cuando fallan.

```
qagen https://tu-app.com
```

---

## Qué hace

1. **Analiza** — Detecta todos los elementos interactivos de la página
2. **Entiende** — Identifica el flujo crítico: login, registro, checkout, etc.
3. **Genera** — Crea tests de Playwright automáticamente con IA
4. **Ejecuta** — Corre los tests y reporta resultados
5. **Se repara** — Si un selector falla, lo busca en el DOM real y lo corrige
6. **Aprende** — Recuerda las correcciones para no repetir los mismos errores

---

## Requisitos

- Node.js 18+
- Una API key de OpenAI ([obtener aquí](https://platform.openai.com/api-keys))

---

## Instalación

```bash
npm install -g qagen
npx playwright install chromium
```

---

## Configuración

La primera vez que uses QAgen, configura tu API key:

```bash
qagen config
```

La key se guarda en `~/.qagen/config.json` y funciona desde cualquier directorio.

---

## Uso

**Analizar una página:**
```bash
qagen https://tu-app.com/login
```

**Analizar toda la aplicación:**
```bash
qagen https://tu-app.com crawl
```

QAgen crea una carpeta `.qagen/` en tu directorio actual con todos los archivos generados. Agrega `.qagen/` a tu `.gitignore` (QAgen lo hace automáticamente si ya tienes un `.gitignore`).

---

## Reportes

Después de cada ejecución se generan dos reportes:

- **`.qagen/qagen-report.html`** — Resumen de la sesión: flujo detectado, tests, healing
- **`.qagen/playwright-report/`** — Reporte detallado de Playwright

```bash
npx playwright show-report .qagen/playwright-report
```

---

## Cómo funciona el auto-healing

Cuando un test falla porque un selector no encuentra el elemento correcto, QAgen:

1. Abre el browser en modo headless
2. Reproduce las mismas acciones del test fallido
3. Busca el texto esperado en el DOM real
4. Reemplaza el selector incorrecto por el correcto
5. Guarda la corrección en `~/.qagen/memory.json`

La próxima vez que analices la misma aplicación, la IA ya sabe qué selectores usar.

---

## Estructura generada

```
tu-proyecto/
└── .qagen/
    ├── tests/generated/      Tests generados por la IA
    ├── playwright-report/    Reporte detallado de Playwright
    ├── test-results/         Screenshots de tests fallidos
    ├── playwright.config.js  Configuración de Playwright (auto-generada)
    └── qagen-report.html     Reporte de sesión de QAgen
```

---

## Estado del proyecto

QAgen está en desarrollo activo. Actualmente en Fase 1 — MVP CLI.

**Funciona hoy:**
- Crawler automático de rutas
- Detección de flujos críticos (login, registro, checkout, búsqueda, formularios)
- Generación de tests con IA
- Auto-healing de selectores rotos
- Memoria contextual por dominio
- Reporte HTML de sesión

**En desarrollo:**
- Análisis de causa raíz de fallos
- Integración con CI/CD
- Dashboard web