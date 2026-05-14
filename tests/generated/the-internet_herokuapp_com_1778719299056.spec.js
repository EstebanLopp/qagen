const { test, expect } = require('@playwright/test');

test.describe('Pruebas de la página de recuperación de contraseña', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/forgot_password');
  });

  test('Debería permitir enviar un correo para recuperar la contraseña', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('text=Retrieve password');
    await expect(page).toHaveURL(/.*email_sent/);
  });

  test('Debería mostrar un mensaje de error al enviar un correo vacío', async ({ page }) => {
    await page.click('text=Retrieve password');
    await expect(page.locator('input[name="email"]')).toHaveClass(/is-invalid/);
  });

  test('El enlace a Elemental Selenium debería abrirse en una nueva pestaña', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});