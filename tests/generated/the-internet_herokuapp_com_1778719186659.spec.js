const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/challenging_dom');
  });

  test('Verificar enlace "bar" 1', async ({ page }) => {
    const link = await page.locator('text=bar').nth(0);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom');
  });

  test('Verificar enlace "bar" 2', async ({ page }) => {
    const link = await page.locator('text=bar').nth(1);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom');
  });

  test('Verificar enlace "baz"', async ({ page }) => {
    const link = await page.locator('text=baz');
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom');
  });

  test('Verificar enlace "edit" 1', async ({ page }) => {
    const link = await page.locator('text=edit').nth(0);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 1', async ({ page }) => {
    const link = await page.locator('text=delete').nth(0);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "edit" 2', async ({ page }) => {
    const link = await page.locator('text=edit').nth(1);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 2', async ({ page }) => {
    const link = await page.locator('text=delete').nth(1);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "edit" 3', async ({ page }) => {
    const link = await page.locator('text=edit').nth(2);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 3', async ({ page }) => {
    const link = await page.locator('text=delete').nth(2);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "edit" 4', async ({ page }) => {
    const link = await page.locator('text=edit').nth(3);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 4', async ({ page }) => {
    const link = await page.locator('text=delete').nth(3);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "edit" 5', async ({ page }) => {
    const link = await page.locator('text=edit').nth(4);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 5', async ({ page }) => {
    const link = await page.locator('text=delete').nth(4);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "edit" 6', async ({ page }) => {
    const link = await page.locator('text=edit').nth(5);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 6', async ({ page }) => {
    const link = await page.locator('text=delete').nth(5);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "edit" 7', async ({ page }) => {
    const link = await page.locator('text=edit').nth(6);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#edit');
  });

  test('Verificar enlace "delete" 7', async ({ page }) => {
    const link = await page.locator('text=delete').nth(6);
    await expect(link).toHaveAttribute('href', 'https://the-internet.herokuapp.com/challenging_dom#delete');
  });

  test('Verificar enlace "Elemental Selenium"', async ({ page }) => {
    const link = await page.locator('text=Elemental Selenium');
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
  });
});