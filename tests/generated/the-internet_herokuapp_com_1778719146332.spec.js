const { test, expect } = require('@playwright/test');

test.describe('Pruebas de la página AB Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/abtest');
  });

  test('Verificar que el título de la página sea correcto', async ({ page }) => {
    const title = await page.title();
    expect(title).toBe('A/B Test Variation 1');
  });

  test('Verificar la existencia del enlace "Elemental Selenium"', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
  });

  test('Verificar que el enlace "Elemental Selenium" redirija correctamente', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await link.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toBe('http://elementalselenium.com/');
  });
});