const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Nested Frames', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/nested_frames');
  });

  test('Verificar que el frame superior contenga el texto correcto', async ({ page }) => {
    const frame = page.frameLocator('frame[name="frame-top"]');
    const text = await frame.locator('body').textContent();
    expect(text).toContain('TOP');
  });

  test('Verificar que el frame izquierdo contenga el texto correcto', async ({ page }) => {
    const frame = page.frameLocator('frame[name="frame-left"]');
    const text = await frame.locator('body').textContent();
    expect(text).toContain('LEFT');
  });

  test('Verificar que el frame derecho contenga el texto correcto', async ({ page }) => {
    const frame = page.frameLocator('frame[name="frame-right"]');
    const text = await frame.locator('body').textContent();
    expect(text).toContain('RIGHT');
  });

  test('Verificar que el frame inferior contenga el texto correcto', async ({ page }) => {
    const frame = page.frameLocator('frame[name="frame-bottom"]');
    const text = await frame.locator('body').textContent();
    expect(text).toContain('BOTTOM');
  });

  test('Verificar que el frame central contenga el texto correcto', async ({ page }) => {
    const frame = page.frameLocator('frame[name="frame-middle"]');
    const text = await frame.locator('body').textContent();
    expect(text).toContain('MIDDLE');
  });
});