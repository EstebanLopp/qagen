const { test, expect } = require('@playwright/test');

test.describe('Tests para la página de Inputs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/inputs');
  });

  test('Debería permitir ingresar un número en el input', async ({ page }) => {
    const input = page.locator('input[type="number"]');
    await input.fill('123');
    const value = await input.inputValue();
    expect(value).toBe('123');
  });

  test('Debería permitir borrar el número en el input', async ({ page }) => {
    const input = page.locator('input[type="number"]');
    await input.fill('456');
    await input.fill('');
    const value = await input.inputValue();
    expect(value).toBe('');
  });

  test('Debería permitir ingresar un número negativo en el input', async ({ page }) => {
    const input = page.locator('input[type="number"]');
    await input.fill('-789');
    const value = await input.inputValue();
    expect(value).toBe('-789');
  });

  test('Debería permitir ingresar un número decimal en el input', async ({ page }) => {
    const input = page.locator('input[type="number"]');
    await input.fill('12.34');
    const value = await input.inputValue();
    expect(value).toBe('12.34');
  });

  test('Debería abrir el enlace de Elemental Selenium en una nueva pestaña', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    expect(newPage.url()).toBe('http://elementalselenium.com/');
  });
});