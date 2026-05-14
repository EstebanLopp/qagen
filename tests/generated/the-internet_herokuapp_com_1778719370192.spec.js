const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en el menú de JQuery UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/jqueryui/menu');
  });

  test('Verificar enlace a JQuery UI Menus', async ({ page }) => {
    const link = await page.locator('text=JQuery UI Menus');
    await expect(link).toHaveAttribute('href', 'http://api.jqueryui.com/menu/');
  });

  test('Verificar enlace a Disabled', async ({ page }) => {
    const link = await page.locator('text=Disabled');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/jqueryui/menu#');
  });

  test('Verificar enlace a Should not see this', async ({ page }) => {
    const link = await page.locator('text=Should not see this');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/jqueryui/menu#');
  });

  test('Verificar enlace a Enabled', async ({ page }) => {
    const link = await page.locator('text=Enabled');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/jqueryui/menu#');
  });

  test('Verificar enlace a Downloads', async ({ page }) => {
    const link = await page.locator('text=Downloads');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/jqueryui/menu#');
  });

  test('Verificar enlace a PDF', async ({ page }) => {
    const link = await page.locator('text=PDF');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/download/jqueryui/menu/menu.pdf');
  });

  test('Verificar enlace a CSV', async ({ page }) => {
    const link = await page.locator('text=CSV');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/download/jqueryui/menu/menu.csv');
  });

  test('Verificar enlace a Excel', async ({ page }) => {
    const link = await page.locator('text=Excel');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/download/jqueryui/menu/menu.xls');
  });

  test('Verificar enlace a Back to JQuery UI', async ({ page }) => {
    const link = await page.locator('text=Back to JQuery UI');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/jqueryui');
  });

  test('Verificar enlace a Elemental Selenium', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
  });
});