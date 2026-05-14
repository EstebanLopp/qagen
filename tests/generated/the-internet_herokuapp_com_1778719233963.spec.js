const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página de contenido dinámico', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/dynamic_content');
  });

  test('Verificar enlace "click here"', async ({ page }) => {
    const link = await page.locator('text=click here');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/dynamic_content?with_content=static');
  });

  test('Verificar enlace "Elemental Selenium"', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await link.click();
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      link.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});