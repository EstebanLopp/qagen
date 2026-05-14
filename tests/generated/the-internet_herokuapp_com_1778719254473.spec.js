const { test, expect } = require('@playwright/test');

test.describe('Pruebas de la página Entry Ad', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/entry_ad');
  });

  test('Verificar que el modal se muestra al hacer clic en "click here"', async ({ page }) => {
    await page.click('text=click here');
    const modal = await page.locator('#modal');
    await expect(modal).toBeVisible();
  });

  test('Verificar que el enlace "Elemental Selenium" redirige correctamente', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});