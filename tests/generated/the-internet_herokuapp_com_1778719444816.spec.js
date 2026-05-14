const { test, expect } = require('@playwright/test');

test.describe('Tests de la página de tablas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/tables');
  });

  test('Verificar que la tabla 1 tiene 4 filas', async ({ page }) => {
    const rows = await page.locator('table#table1 tbody tr').count();
    expect(rows).toBe(4);
  });

  test('Verificar que la tabla 2 tiene 4 filas', async ({ page }) => {
    const rows = await page.locator('table#table2 tbody tr').count();
    expect(rows).toBe(4);
  });

  test('Verificar que el enlace "Elemental Selenium" es visible', async ({ page }) => {
    const link = page.locator('a[href="http://elementalselenium.com/"]');
    await expect(link).toBeVisible();
  });

  test('Verificar que el enlace "edit" de la primera fila de la tabla 1 es clickeable', async ({ page }) => {
    const editLink = page.locator('table#table1 tbody tr:first-child a:has-text("edit")');
    await expect(editLink).toBeClickable();
  });

  test('Verificar que el enlace "delete" de la primera fila de la tabla 1 es clickeable', async ({ page }) => {
    const deleteLink = page.locator('table#table1 tbody tr:first-child a:has-text("delete")');
    await expect(deleteLink).toBeClickable();
  });

  test('Verificar que el enlace "edit" de la primera fila de la tabla 2 es clickeable', async ({ page }) => {
    const editLink = page.locator('table#table2 tbody tr:first-child a:has-text("edit")');
    await expect(editLink).toBeClickable();
  });

  test('Verificar que el enlace "delete" de la primera fila de la tabla 2 es clickeable', async ({ page }) => {
    const deleteLink = page.locator('table#table2 tbody tr:first-child a:has-text("delete")');
    await expect(deleteLink).toBeClickable();
  });
});