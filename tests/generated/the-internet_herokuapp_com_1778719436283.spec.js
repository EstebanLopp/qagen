const { test, expect } = require('@playwright/test');

test.describe('Pruebas de la página Slow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/slow');
  });

  test('Verificar el enlace a Elemental Selenium', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await link.click();
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      link.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});