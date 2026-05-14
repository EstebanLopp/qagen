const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página de contenido cambiante', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/shifting_content');
  });

  test('Verificar enlace "Example 1: Menu Element"', async ({ page }) => {
    const link = page.locator('text=Example 1: Menu Element');
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/shifting_content/menu');
  });

  test('Verificar enlace "Example 2: An image"', async ({ page }) => {
    const link = page.locator('text=Example 2: An image');
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/shifting_content/image');
  });

  test('Verificar enlace "Example 3: List"', async ({ page }) => {
    const link = page.locator('text=Example 3: List');
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/shifting_content/list');
  });

  test('Verificar enlace "Elemental Selenium"', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await link.click();
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      link.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});