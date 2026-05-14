const { test, expect } = require('@playwright/test');

test.describe('Pruebas de autenticación digest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/digest_auth');
  });

  test('Debería mostrar un mensaje de autenticación', async ({ page }) => {
    await page.authenticate({ username: 'admin', password: 'admin' });
    const response = await page.goto('https://the-internet.herokuapp.com/digest_auth');
    expect(response.status()).toBe(200);
  });

  test('Debería fallar sin credenciales', async ({ page }) => {
    const response = await page.goto('https://the-internet.herokuapp.com/digest_auth');
    expect(response.status()).toBe(401);
  });
});