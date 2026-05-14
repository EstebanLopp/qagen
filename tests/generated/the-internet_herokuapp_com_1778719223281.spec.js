const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/drag_and_drop');
  });

  test('Verificar que el elemento A se puede mover al área de destino', async ({ page }) => {
    const source = await page.locator('#column-a');
    const target = await page.locator('#column-b');
    await source.dragTo(target);
    const targetText = await target.innerText();
    expect(targetText).toBe('A');
  });

  test('Verificar que el elemento B se puede mover al área de destino', async ({ page }) => {
    const source = await page.locator('#column-b');
    const target = await page.locator('#column-a');
    await source.dragTo(target);
    const targetText = await target.innerText();
    expect(targetText).toBe('B');
  });

  test('Verificar el enlace a Elemental Selenium', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await link.click();
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      link.click()
    ]);
    await newPage.waitForLoadState();
    expect(newPage.url()).toBe('http://elementalselenium.com/');
  });
});