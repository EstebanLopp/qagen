const { test, expect } = require('@playwright/test');

test.describe('Geolocation Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/geolocation');
  });

  test('Should display alert when clicking "Where am I?" button', async ({ page }) => {
    const [alert] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click('text=Where am I?')
    ]);
    expect(alert.message()).toContain('You are');
    await alert.dismiss();
  });

  test('Should navigate to Elemental Selenium link', async ({ page }) => {
    await page.click('text=Elemental Selenium');
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    expect(newPage.url()).toBe('http://elementalselenium.com/');
    await newPage.close();
  });
});