const { test, expect } = require('@playwright/test');

test.describe('Pruebas de enlaces en la página de elementos desaparecidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/disappearing_elements');
  });

  test('Verificar enlace de Home', async ({ page }) => {
    const homeLink = await page.locator('text=Home');
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/');
  });

  test('Verificar enlace de About', async ({ page }) => {
    const aboutLink = await page.locator('text=About');
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/about/');
  });

  test('Verificar enlace de Contact Us', async ({ page }) => {
    const contactLink = await page.locator('text=Contact Us');
    await expect(contactLink).toBeVisible();
    await contactLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/contact-us/');
  });

  test('Verificar enlace de Portfolio', async ({ page }) => {
    const portfolioLink = await page.locator('text=Portfolio');
    await expect(portfolioLink).toBeVisible();
    await portfolioLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/portfolio/');
  });

  test('Verificar enlace de Gallery', async ({ page }) => {
    const galleryLink = await page.locator('text=Gallery');
    await expect(galleryLink).toBeVisible();
    await galleryLink.click();
    await expect(page).toHaveURL('https://the-internet.herokuapp.com/gallery/');
  });

  test('Verificar enlace de Elemental Selenium', async ({ page }) => {
    const elementalLink = await page.locator('text=Elemental Selenium');
    await expect(elementalLink).toBeVisible();
    await elementalLink.click();
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      elementalLink.click()
    ]);
    await expect(newPage).toHaveURL('http://elementalselenium.com/');
  });
});