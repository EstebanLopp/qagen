const { test, expect } = require('@playwright/test');

test.describe('Dynamic Loading Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/dynamic_loading');
  });

  test('should navigate to Example 1', async ({ page }) => {
    await page.click('text=Example 1: Element on page that is hidden');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/dynamic_loading/1');
  });

  test('should navigate to Example 2', async ({ page }) => {
    await page.click('text=Example 2: Element rendered after the fact');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/dynamic_loading/2');
  });

  test('should navigate to Elemental Selenium', async ({ page }) => {
    await page.click('text=Elemental Selenium');
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});