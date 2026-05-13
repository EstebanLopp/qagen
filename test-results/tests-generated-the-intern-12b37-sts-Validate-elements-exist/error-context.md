# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\generated\the-internet_herokuapp_com_1778643675605.spec.js >> Login Page Tests >> Validate elements exist
- Location: tests\generated\the-internet_herokuapp_com_1778643675605.spec.js:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="https://elementalselenium.com/"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('a[href="https://elementalselenium.com/"]')

```

```yaml
- link "Fork me on GitHub":
  - /url: https://github.com/tourdedave/the-internet
  - img "Fork me on GitHub"
- heading "Login Page" [level=2]
- heading "This is where you can log into the secure area. Enter tomsmith for the username and SuperSecretPassword! for the password. If the information is wrong you should see error messages." [level=4]:
  - text: This is where you can log into the secure area. Enter
  - emphasis: tomsmith
  - text: for the username and
  - emphasis: SuperSecretPassword!
  - text: for the password. If the information is wrong you should see error messages.
- text: Username
- textbox "Username"
- text: Password
- textbox "Password"
- button " Login"
- separator
- text: Powered by
- link "Elemental Selenium":
  - /url: http://elementalselenium.com/
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('Login Page Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('https://the-internet.herokuapp.com/login');
  6  |   });
  7  | 
  8  |   test('Validate elements exist', async ({ page }) => {
  9  |     // Validar que el botón de Login existe
  10 |     const loginButton = page.locator('button[type="submit"]');
  11 |     await expect(loginButton).toBeVisible();
  12 | 
  13 |     // Validar que el campo de username existe
  14 |     const usernameInput = page.locator('input[name="username"]');
  15 |     await expect(usernameInput).toBeVisible();
  16 | 
  17 |     // Validar que el campo de password existe
  18 |     const passwordInput = page.locator('input[name="password"]');
  19 |     await expect(passwordInput).toBeVisible();
  20 | 
  21 |     // Validar que el link de Elemental Selenium existe
  22 |     const elementalSeleniumLink = page.locator('a[href="https://elementalselenium.com/"]');
> 23 |     await expect(elementalSeleniumLink).toBeVisible();
     |                                         ^ Error: expect(locator).toBeVisible() failed
  24 |   });
  25 | 
  26 |   test('Login successfully with valid credentials', async ({ page }) => {
  27 |     await page.fill('input[name="username"]', 'tomsmith');
  28 |     await page.fill('input[name="password"]', 'SuperSecretPassword!');
  29 |     await page.click('button[type="submit"]');
  30 | 
  31 |     // Validar que se redirige a la página de éxito
  32 |     await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
  33 |     await expect(page.locator('div.flash.success')).toContainText('You logged into a secure area!');
  34 |   });
  35 | 
  36 |   test('Login failed with invalid credentials', async ({ page }) => {
  37 |     await page.fill('input[name="username"]', 'wronguser');
  38 |     await page.fill('input[name="password"]', 'wrongpassword');
  39 |     await page.click('button[type="submit"]');
  40 | 
  41 |     // Validar que se queda en la página de login
  42 |     await expect(page).toHaveURL('https://the-internet.herokuapp.com/login');
  43 |     await expect(page.locator('div.flash.error')).toContainText('Your username is invalid!');
  44 |   });
  45 | });
  46 | 
```