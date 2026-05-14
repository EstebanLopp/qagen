const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Shadow DOM en la página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/shadowdom');
  });

  test('Verificar el enlace Elemental Selenium', async ({ page }) => {
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