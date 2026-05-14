const { test, expect } = require('@playwright/test');

test.describe('Floating Menu Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/floating_menu');
  });

  test('Home link should navigate to the home section', async ({ page }) => {
    await page.click('text=Home');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/floating_menu#home');
  });

  test('News link should navigate to the news section', async ({ page }) => {
    await page.click('text=News');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/floating_menu#news');
  });

  test('Contact link should navigate to the contact section', async ({ page }) => {
    await page.click('text=Contact');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/floating_menu#contact');
  });

  test('About link should navigate to the about section', async ({ page }) => {
    await page.click('text=About');
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/floating_menu#about');
  });

  test('Elemental Selenium link should open in a new tab', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=Elemental Selenium')
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});