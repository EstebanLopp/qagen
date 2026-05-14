const { test, expect } = require('@playwright/test');

test.describe('Pruebas de controles dinámicos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/dynamic_controls');
  });

  test('Verificar que el botón Remove elimina el checkbox', async ({ page }) => {
    await page.click('text=Remove');
    await expect(page.locator('input[type="checkbox"]')).toBeHidden();
  });

  test('Verificar que el botón Enable habilita el input de texto', async ({ page }) => {
    await page.click('text=Enable');
    await expect(page.locator('input[type="text"]')).toBeEnabled();
  });

  test('Verificar que el checkbox está presente antes de hacer clic en Remove', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
  });

  test('Verificar que el input de texto está deshabilitado inicialmente', async ({ page }) => {
    const inputText = page.locator('input[type="text"]');
    await expect(inputText).toBeDisabled();
  });

  test('Verificar el enlace a Elemental Selenium', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
    await expect(link).toHaveAttribute('target', '_blank');
  });
});