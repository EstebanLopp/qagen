const { test, expect } = require('@playwright/test');

test.describe('Checkboxes Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/checkboxes');
  });

  test('Checkbox 1 should be unchecked by default', async ({ page }) => {
    const checkbox1 = page.locator('input[type="checkbox"]:nth-of-type(1)');
    await expect(checkbox1).not.toBeChecked();
  });

  test('Checkbox 2 should be checked by default', async ({ page }) => {
    const checkbox2 = page.locator('input[type="checkbox"]:nth-of-type(2)');
    await expect(checkbox2).toBeChecked();
  });

  test('Check Checkbox 1', async ({ page }) => {
    const checkbox1 = page.locator('input[type="checkbox"]:nth-of-type(1)');
    await checkbox1.check();
    await expect(checkbox1).toBeChecked();
  });

  test('Uncheck Checkbox 2', async ({ page }) => {
    const checkbox2 = page.locator('input[type="checkbox"]:nth-of-type(2)');
    await checkbox2.uncheck();
    await expect(checkbox2).not.toBeChecked();
  });

  test('Visit Elemental Selenium link', async ({ page }) => {
    const link = page.locator('a[href="http://elementalselenium.com/"]');
    await link.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toBe('http://elementalselenium.com/');
  });
});