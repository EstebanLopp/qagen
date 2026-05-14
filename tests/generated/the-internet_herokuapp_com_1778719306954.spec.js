const { test, expect } = require('@playwright/test');

test.describe('Login Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/login');
  });

  test('should display login form', async ({ page }) => {
    const form = await page.locator('form#login');
    await expect(form).toBeVisible();
  });

  test('should accept valid username and password', async ({ page }) => {
    await page.fill('input[name="username"]', 'tomsmith');
    await page.fill('input[name="password"]', 'SuperSecretPassword!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'invalidUser');
    await page.fill('input[name="password"]', 'invalidPassword');
    await page.click('button[type="submit"]');
    const errorMessage = await page.locator('.flash.error');
    await expect(errorMessage).toBeVisible();
  });

  test('should navigate to Elemental Selenium link', async ({ page }) => {
    await page.click('text=Elemental Selenium');
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});