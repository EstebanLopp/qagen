const { test, expect } = require('@playwright/test');

test.describe('Pruebas de autenticación básica', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/basic_auth');
  });

  test('Verificar mensaje de autenticación', async ({ page }) => {
    await page.authenticate({ username: 'admin', password: 'admin' });
    const message = await page.locator('h3').innerText();
    expect(message).toBe('Basic Auth');
  });

  test('Intentar acceder sin autenticación', async ({ page }) => {
    const response = await page.goto('https://the-internet.herokuapp.com/basic_auth');
    expect(response.status()).toBe(401);
  });

  test('Verificar contenido después de autenticación', async ({ page }) => {
    await page.authenticate({ username: 'admin', password: 'admin' });
    const content = await page.locator('p').innerText();
    expect(content).toContain('Congratulations! You must have the proper credentials.');
  });
});