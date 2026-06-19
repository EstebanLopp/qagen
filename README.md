# QAgen

[![npm version](https://img.shields.io/npm/v/@estebanlopp/qagen.svg)](https://www.npmjs.com/package/@estebanlopp/qagen)
[![npm downloads](https://img.shields.io/npm/dm/@estebanlopp/qagen.svg)](https://www.npmjs.com/package/@estebanlopp/qagen)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**Autonomous QA agent for web applications.**

QAgen analyzes your app, generates Playwright tests using AI, executes them, and self-heals broken selectors — without manual intervention.

---

## The problem

Most small development teams don't have dedicated QA. They write manual tests, break them constantly with UI changes, and spend more time maintaining automation than building product. With fast deployment cycles, this gets worse.

## How QAgen works

QAgen operates as an autonomous QA agent with four core capabilities:

**1. Semantic flow detection**
QAgen analyzes the DOM and identifies the critical business flow of each page — login, registration, checkout, search, CRUD forms, dashboards — before generating a single test. This means tests are generated with business context, not just element detection.

**2. AI-powered test generation**
Based on the detected flow and real DOM state, QAgen generates Playwright test files targeting the scenarios that matter most: successful flows, error states, field validation, redirects.

**3. Autonomous self-healing**
When a test fails due to a broken selector, QAgen opens a headless browser, reproduces the exact actions that caused the failure, finds the correct element in the live DOM, and patches the test file automatically.

**4. Contextual memory**
Healed selectors are stored per domain in `~/.qagen/memory.json`. On subsequent runs against the same application, the AI already knows which selectors to use — eliminating recurring failures.

---

## Requirements

- Node.js 18+
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Playwright installed in your project (`npm install @playwright/test && npx playwright install chromium`)

---

## Installation

```bash
npm install -g @estebanlopp/qagen
```

On first use, configure your OpenAI API key:

```bash
qagen config
```

The key is stored globally in `~/.qagen/config.json` and works from any directory.

---

## Usage

Analyze a single page:

```bash
qagen https://your-app.com/login
```

Crawl and analyze the entire application:

```bash
qagen https://your-app.com crawl
```

QAgen creates a `.qagen/` folder in your current directory containing all generated files. If a `.gitignore` file exists, `.qagen/` is added automatically.

---

## Output

After each run, two reports are generated:

- `.qagen/qagen-report.html` — Session summary: detected flow, test results, self-healing activity
- `.qagen/playwright-report/` — Full Playwright HTML report with screenshots on failure

```bash
npx playwright show-report .qagen/playwright-report
```

---

## What gets generated

```
your-project/
└── .qagen/
    ├── tests/generated/       AI-generated test files
    ├── playwright-report/     Detailed Playwright report
    ├── test-results/          Screenshots of failed tests
    ├── playwright.config.js   Auto-generated Playwright config
    └── qagen-report.html      QAgen session report
```

---

## Current status

QAgen is in active development. Current version: `0.2.0` — MVP CLI, tested against real web applications.

Working today:
- Automatic route crawling
- Critical flow detection (login, register, checkout, search, forms, dashboard)
- AI test generation with business context
- Autonomous self-healing with live DOM inspection
- Contextual memory per domain
- Root cause analysis for unresolved failures
- Session HTML report

In progress:
- CI/CD integration
- Web dashboard

---

## License

ISC
