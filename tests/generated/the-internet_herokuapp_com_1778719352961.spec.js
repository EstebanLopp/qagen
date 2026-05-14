const { test, expect } = require('@playwright/test');

test.describe('Pruebas de Scroll Infinito', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/infinite_scroll');
  });

  test('Verificar que el enlace "next page" esté presente', async ({ page }) => {
    const nextPageLink = await page.locator('text=next page');
    await expect(nextPageLink).toBeVisible();
  });

  test('Verificar que el enlace "Elemental Selenium" esté presente', async ({ page }) => {
    const elementalSeleniumLink = await page.locator('text=Elemental Selenium');
    await expect(elementalSeleniumLink).toBeVisible();
  });

  test('Navegar al enlace "next page" y verificar la URL', async ({ page }) => {
    await page.click('text=next page');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/infinite_scroll/1');
  });

  test('Navegar al enlace "Elemental Selenium" y verificar la URL', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});