const { test, expect } = require('@playwright/test');

test.describe('Pruebas de imágenes rotas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/broken_images');
  });

  test('Verificar que la página contiene el enlace a Elemental Selenium', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
  });

  test('Verificar que las imágenes rotas están presentes en la página', async ({ page }) => {
    const brokenImages = await page.locator('img[alt="Missing image"]');
    const count = await brokenImages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Verificar que el enlace a Elemental Selenium abre en una nueva pestaña', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      link.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});