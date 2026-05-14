const { test, expect } = require('@playwright/test');

test.describe('Testing TinyMCE Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/tinymce');
  });

  test('Verificar que el editor de texto está visible', async ({ page }) => {
    const editor = await page.locator('#tinymce');
    await expect(editor).toBeVisible();
  });

  test('Verificar que el enlace "POWERED BY TINY" está presente y es accesible', async ({ page }) => {
    const link = await page.locator('text=POWERED BY TINY');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://www.tiny.cloud/?utm_campaign=editor_referral&utm_medium=poweredby&utm_source=tinymce&utm_content=v5');
  });

  test('Verificar que el enlace "Elemental Selenium" está presente y es accesible', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
  });

  test('Verificar que los botones del menú están visibles', async ({ page }) => {
    const buttons = ['File', 'Edit', 'View', 'Format'];
    for (const button of buttons) {
      const buttonLocator = await page.locator(`text=${button}`);
      await expect(buttonLocator).toBeVisible();
    }
  });
});