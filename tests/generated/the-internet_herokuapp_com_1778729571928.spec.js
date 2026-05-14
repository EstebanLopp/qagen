const { test, expect } = require('@playwright/test');

test.describe('Login Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/login');
  });

  test('should have the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('The Internet');
  });

  test('should display the login form', async ({ page }) => {
    await expect(page.locator('form#login')).toBeVisible();
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should allow user to log in with valid credentials', async ({ page }) => {
    await page.fill('input#username', 'tomsmith');
    await page.fill('input#password', 'SuperSecretPassword!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*secure/);
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.fill('input#username', 'invalidUser');
    await page.fill('input#password', 'invalidPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('h4.subheader')).toHaveText('Your username is invalid!');
  });

  test('should have visible username and password fields', async ({ page }) => {
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });
});