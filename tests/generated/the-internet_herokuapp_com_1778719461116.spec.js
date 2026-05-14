const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página de códigos de estado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/status_codes');
  });

  test('Verificar enlace a IANA', async ({ page }) => {
    const link = page.locator('a[href="http://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('http://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml');
  });

  test('Verificar enlace a código 200', async ({ page }) => {
    const link = page.locator('a[href="https://the-internet.herokuapp.com/status_codes/200"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/status_codes/200');
  });

  test('Verificar enlace a código 301', async ({ page }) => {
    const link = page.locator('a[href="https://the-internet.herokuapp.com/status_codes/301"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/status_codes/301');
  });

  test('Verificar enlace a código 404', async ({ page }) => {
    const link = page.locator('a[href="https://the-internet.herokuapp.com/status_codes/404"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/status_codes/404');
  });

  test('Verificar enlace a código 500', async ({ page }) => {
    const link = page.locator('a[href="https://the-internet.herokuapp.com/status_codes/500"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/status_codes/500');
  });

  test('Verificar enlace a Elemental Selenium', async ({ page }) => {
    const link = page.locator('a[href="http://elementalselenium.com/"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('http://elementalselenium.com/');
  });
});