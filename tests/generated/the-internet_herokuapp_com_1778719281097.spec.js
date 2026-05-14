const { test, expect } = require('@playwright/test');

test.describe('Pruebas de carga de archivos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/upload');
  });

  test('Debería permitir cargar un archivo válido', async ({ page }) => {
    const filePath = 'path/to/your/file.txt';
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('input[type="submit"]');
    const message = await page.locator('h3').innerText();
    expect(message).toBe('File Uploaded!');
  });

  test('Debería mostrar un error al intentar cargar un archivo no válido', async ({ page }) => {
    const filePath = 'path/to/your/invalid_file.txt';
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('input[type="submit"]');
    const message = await page.locator('h3').innerText();
    expect(message).toBe('File Uploaded!');
  });

  test('Debería tener un enlace a Elemental Selenium', async ({ page }) => {
    const link = page.locator('text=Elemental Selenium');
    await expect(link).toHaveAttribute('href', 'http://elementalselenium.com/');
    await expect(link).toHaveAttribute('target', '_blank');
  });
});