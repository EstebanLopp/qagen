const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página de ventanas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/windows');
  });

  test('Verificar enlace "Click Here"', async ({ page }) => {
    const link = await page.locator('text=Click Here');
    await expect(link).toBeVisible();
    await link.click();
    const newPage = await page.context().waitForEvent('page');
    await expect(newPage).toHaveURL('https://the-internet.herokuapp.com/windows/new');
    await newPage.close();
  });

  test('Verificar enlace "Elemental Selenium"', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await link.click();
    const newPage = await page.context().waitForEvent('page');
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
    await newPage.close();
  });
});