const { test, expect } = require('@playwright/test');

test.describe('Pruebas de inicio de sesión', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/login');
  });

  test('Debería mostrar un mensaje de error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[name="username"]', 'usuario_invalido');
    await page.fill('input[name="password"]', 'contraseña_invalida');
    await page.click('button[type="submit"]');
    const errorMessage = await page.locator('div[class="flash error"]').textContent();
    expect(errorMessage).toContain('invalid');
  });

  test('Debería permitir el inicio de sesión con credenciales válidas', async ({ page }) => {
    await page.fill('input[name="username"]', 'tomsmith');
    await page.fill('input[name="password"]', 'SuperSecretPassword!');
    await page.click('button[type="submit"]');
    const successMessage = await page.locator('div[class="flash success"]').textContent();
    expect(successMessage).toContain('You logged into a secure area!');
  });

  test('Debería redirigir al usuario al enlace de Elemental Selenium', async ({ page }) => {
    await page.click('text=Elemental Selenium');
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    expect(newPage.url()).toBe('http://elementalselenium.com/');
  });
});