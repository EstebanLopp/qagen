const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página de frames', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/frames');
  });

  test('Verificar enlace a Nested Frames', async ({ page }) => {
    const nestedFramesLink = page.locator('text=Nested Frames');
    await expect(nestedFramesLink).toBeVisible();
    await nestedFramesLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/nested_frames');
  });

  test('Verificar enlace a iFrame', async ({ page }) => {
    const iframeLink = page.locator('text=iFrame');
    await expect(iframeLink).toBeVisible();
    await iframeLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/iframe');
  });

  test('Verificar enlace a Elemental Selenium', async ({ page }) => {
    const elementalSeleniumLink = page.locator('text=Elemental Selenium');
    await expect(elementalSeleniumLink).toBeVisible();
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      elementalSeleniumLink.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});