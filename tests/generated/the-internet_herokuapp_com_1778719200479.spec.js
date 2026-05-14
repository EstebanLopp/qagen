const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/context_menu');
  });

  test('Verificar el enlace de Elemental Selenium', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await link.click();
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      link.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});