const { test, expect } = require('@playwright/test');

test.describe('Descargas de archivos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/download');
  });

  test('Descargar tmp4xae50am.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=tmp4xae50am.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('tmp4xae50am.txt');
  });

  test('Descargar 84b607eb-8949-4174-90e5-4fd050482c97.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=84b607eb-8949-4174-90e5-4fd050482c97.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('84b607eb-8949-4174-90e5-4fd050482c97.txt');
  });

  test('Descargar tmpwx2_6qnl.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=tmpwx2_6qnl.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('tmpwx2_6qnl.txt');
  });

  test('Descargar Accessmodifier.jpeg', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=Accessmodifier.jpeg'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('Accessmodifier.jpeg');
  });

  test('Descargar random_data.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=random_data.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('random_data.txt');
  });

  test('Descargar 13589_24-Apr-2026.pdf', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=13589_24-Apr-2026.pdf'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('13589_24-Apr-2026.pdf');
  });

  test('Descargar testUpload.json', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=testUpload.json'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('testUpload.json');
  });

  test('Descargar some-file.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=some-file.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('some-file.txt');
  });

  test('Descargar sample-zip-file.zip', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=sample-zip-file.zip'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('sample-zip-file.zip');
  });

  test('Descargar upload-sample.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=upload-sample.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('upload-sample.txt');
  });

  test('Descargar EXAMEN TECNICO MECANICO ELECTRICO.docx', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=EXAMEN TECNICO MECANICO ELECTRICO.docx'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('EXAMEN TECNICO MECANICO ELECTRICO.docx');
  });

  test('Descargar file.json', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=file.json'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('file.json');
  });

  test('Descargar sample_media_file.png', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=sample_media_file.png'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('sample_media_file.png');
  });

  test('Descargar selenium-snapshot.png', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=selenium-snapshot.png'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('selenium-snapshot.png');
  });

  test('Descargar LambdaTest.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.click('text=LambdaTest.txt'),
      page.waitForEvent('download')
    ]);
    expect(download.suggestedFilename()).toBe('LambdaTest.txt');
  });
});