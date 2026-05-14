const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Key Presses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/key_presses');
  });

  test('Debería mostrar "You entered: A" al presionar la tecla A', async ({ page }) => {
    await page.fill('input[type="text"]', 'A');
    await page.keyboard.press('A');
    const message = await page.locator('#result').innerText();
    expect(message).toBe('You entered: A');
  });

  test('Debería mostrar "You entered: B" al presionar la tecla B', async ({ page }) => {
    await page.fill('input[type="text"]', 'B');
    await page.keyboard.press('B');
    const message = await page.locator('#result').innerText();
    expect(message).toBe('You entered: B');
  });

  test('Debería mostrar "You entered: C" al presionar la tecla C', async ({ page }) => {
    await page.fill('input[type="text"]', 'C');
    await page.keyboard.press('C');
    const message = await page.locator('#result').innerText();
    expect(message).toBe('You entered: C');
  });

  test('Debería mostrar "You entered: Enter" al presionar la tecla Enter', async ({ page }) => {
    await page.fill('input[type="text"]', '');
    await page.keyboard.press('Enter');
    const message = await page.locator('#result').innerText();
    expect(message).toBe('You entered: Enter');
  });

  test('Debería mostrar "You entered: Backspace" al presionar la tecla Backspace', async ({ page }) => {
    await page.fill('input[type="text"]', 'Test');
    await page.keyboard.press('Backspace');
    const message = await page.locator('#result').innerText();
    expect(message).toBe('You entered: Backspace');
  });
});