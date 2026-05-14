const { test, expect } = require('@playwright/test');

test.describe('Horizontal Slider Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/horizontal_slider');
  });

  test('Slider can be moved to the right', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await slider.setInputFiles({ value: '0.7' });
    const value = await slider.evaluate(el => el.value);
    expect(value).toBe('0.7');
  });

  test('Slider can be moved to the left', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await slider.setInputFiles({ value: '0.3' });
    const value = await slider.evaluate(el => el.value);
    expect(value).toBe('0.3');
  });

  test('Slider can be set to the minimum value', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await slider.setInputFiles({ value: '0' });
    const value = await slider.evaluate(el => el.value);
    expect(value).toBe('0');
  });

  test('Slider can be set to the maximum value', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await slider.setInputFiles({ value: '1' });
    const value = await slider.evaluate(el => el.value);
    expect(value).toBe('1');
  });

  test('Link navigates to Elemental Selenium', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await link.click();
    expect(page.url()).toBe('http://elementalselenium.com/');
  });
});