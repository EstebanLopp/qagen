const { test, expect } = require('@playwright/test');

test.describe('Pruebas de hover en perfiles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/hovers');
  });

  test('Verificar el enlace del perfil del usuario 1', async ({ page }) => {
    await page.hover('div.figure:nth-child(1)');
    const link = await page.locator('div.figure:nth-child(1) a').first();
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/users/1');
    await expect(link).toHaveText('View profile');
  });

  test('Verificar el enlace del perfil del usuario 2', async ({ page }) => {
    await page.hover('div.figure:nth-child(2)');
    const link = await page.locator('div.figure:nth-child(2) a').first();
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/users/2');
    await expect(link).toHaveText('View profile');
  });

  test('Verificar el enlace del perfil del usuario 3', async ({ page }) => {
    await page.hover('div.figure:nth-child(3)');
    const link = await page.locator('div.figure:nth-child(3) a').first();
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/users/3');
    await expect(link).toHaveText('View profile');
  });

  test('Verificar el enlace de Elemental Selenium', async ({ page }) => {
    const link = await page.locator('a[href="http://elementalselenium.com/"]');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveText('Elemental Selenium');
  });
});