const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/generated',
  timeout: 30000,
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off'
  }
});