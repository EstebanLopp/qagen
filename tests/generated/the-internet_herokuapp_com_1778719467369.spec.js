const { test, expect } = require('@playwright/test');

test.describe('Pruebas de la página de Typos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/typos');
  });

  test('Verificar el texto del primer párrafo', async ({ page }) => {
    const paragraph = await page.locator('div.example > p').first();
    await expect(paragraph).toHaveText(/This example demonstrates a typo/);
  });

  test('Verificar el enlace a Elemental Selenium', async ({ page }) => {
    const link = await page.locator('a:has-text("Elemental Selenium")');
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('Verificar que el enlace se abra en una nueva pestaña', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.locator('a:has-text("Elemental Selenium")').click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});