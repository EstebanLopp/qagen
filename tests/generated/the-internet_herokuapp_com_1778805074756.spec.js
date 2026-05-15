const { test, expect } = require('@playwright/test');

test.describe('Login Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/login');
  });

  test('Login exitoso con credenciales válidas', async ({ page }) => {
    await page.fill('input[name="username"]', 'tomsmith');
    await page.fill('input[name="password"]', 'SuperSecretPassword!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*secure/);
  });

  test('Mensaje de error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[name="username"]', 'invalidUser');
    await page.fill('input[name="password"]', 'invalidPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('h4.subheader')).toHaveText('Your username is invalid!');
  });

  test('Campo password enmascara el texto', async ({ page }) => {
    await page.fill('input[name="password"]', 'testPassword');
    const passwordInput = await page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('Redirección después del login exitoso', async ({ page }) => {
    await page.fill('input[name="username"]', 'tomsmith');
    await page.fill('input[name="password"]', 'SuperSecretPassword!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*secure/);
  });

  test('Formulario no se envía vacío', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('h4.subheader')).toHaveText('Your username is invalid!');
  });
});