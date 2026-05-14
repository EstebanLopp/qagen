const { test, expect } = require('@playwright/test');

test.describe('Pruebas de descarga segura', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/download_secure');
  });

  test('Verificar que el enlace de descarga esté presente', async ({ page }) => {
    const downloadLink = await page.locator('text=some-file.txt');
    await expect(downloadLink).toBeVisible();
  });

  test('Verificar que el enlace de descarga sea clickeable', async ({ page }) => {
    const downloadLink = await page.locator('text=some-file.txt');
    await expect(downloadLink).toBeEnabled();
  });

  test('Descargar el archivo y verificar la respuesta', async ({ page }) => {
    const downloadLink = await page.locator('text=some-file.txt');
    await downloadLink.click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadLink.click()
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});