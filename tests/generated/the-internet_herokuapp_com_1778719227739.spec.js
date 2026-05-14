const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/dropdown');
  });

  test('Verificar que el enlace "Elemental Selenium" está presente', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
  });

  test('Verificar que el enlace "Elemental Selenium" redirige correctamente', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await link.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://elementalselenium.com/');
  });
});