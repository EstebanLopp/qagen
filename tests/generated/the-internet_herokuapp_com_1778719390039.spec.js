const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/large');
  });

  test('Verificar que el enlace "Elemental Selenium" esté presente', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
  });

  test('Verificar que el enlace "Elemental Selenium" redirija a la URL correcta', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
  });

  test('Verificar que el enlace "Elemental Selenium" se abra en una nueva pestaña', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toHaveAttribute('target', '_blank');
  });
});