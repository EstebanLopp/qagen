const { test, expect } = require('@playwright/test');

test.describe('Login Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/login');
  });

  test('Validate elements exist', async ({ page }) => {
    // Validar que el botón de Login existe
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();

    // Validar que el campo de username existe
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeVisible();

    // Validar que el campo de password existe
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Validar que el link de Elemental Selenium existe
    const elementalSeleniumLink = page.locator('a[href="https://elementalselenium.com/"]');
    await expect(elementalSeleniumLink).toBeVisible();
  });

  test('Login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'tomsmith');
    await page.fill('input[name="password"]', 'SuperSecretPassword!');
    await page.click('button[type="submit"]');

    // Validar que se redirige a la página de éxito
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
    await expect(page.locator('div.flash.success')).toContainText('You logged into a secure area!');
  });

  test('Login failed with invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Validar que se queda en la página de login
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/login');
    await expect(page.locator('div.flash.error')).toContainText('Your username is invalid!');
  });
});
