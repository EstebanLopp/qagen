const { test, expect } = require('@playwright/test');

test.describe('Pruebas de notificación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/notification_message');
  });

  test('Verificar el enlace "Click here"', async ({ page }) => {
    const link = page.locator('text=Click here');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/notification_message');
  });

  test('Verificar el enlace "Elemental Selenium"', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await link.click();
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      link.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });

  test('Cerrar notificación', async ({ page }) => {
    const closeButton = page.locator('text=×');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(closeButton).not.toBeVisible();
  });
});