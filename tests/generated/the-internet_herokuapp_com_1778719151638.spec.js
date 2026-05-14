const { test, expect } = require('@playwright/test');

test.describe('Pruebas de añadir y eliminar elementos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/add_remove_elements/');
  });

  test('Debería añadir un elemento al hacer clic en "Add Element"', async ({ page }) => {
    await page.click('text=Add Element');
    const deleteButton = page.locator('.added-manually');
    await expect(deleteButton).toBeVisible();
  });

  test('Debería eliminar un elemento al hacer clic en "Delete"', async ({ page }) => {
    await page.click('text=Add Element');
    await page.click('.added-manually >> text=Delete');
    const deleteButton = page.locator('.added-manually');
    await expect(deleteButton).toBeHidden();
  });

  test('El enlace "Elemental Selenium" debería ser accesible', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});