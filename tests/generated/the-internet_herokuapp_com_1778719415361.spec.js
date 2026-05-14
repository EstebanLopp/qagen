const { test, expect } = require('@playwright/test');

test.describe('Pruebas de redirección', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/redirector');
  });

  test('Verificar redirección al hacer clic en el enlace "here"', async ({ page }) => {
    await page.click('text=here');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/redirect');
  });

  test('Verificar que el enlace "Elemental Selenium" abre la URL correcta', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});