const { test, expect } = require('@playwright/test');

test.describe('Pruebas de navegación en la página principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com');
  });

  test('Navegar a A/B Testing', async ({ page }) => {
    await page.click('text=A/B Testing');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/abtest');
  });

  test('Navegar a Add/Remove Elements', async ({ page }) => {
    await page.click('text=Add/Remove Elements');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/add_remove_elements/');
  });

  test('Navegar a Basic Auth', async ({ page }) => {
    await page.click('text=Basic Auth');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/basic_auth');
  });

  test('Navegar a Broken Images', async ({ page }) => {
    await page.click('text=Broken Images');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/broken_images');
  });

  test('Navegar a Challenging DOM', async ({ page }) => {
    await page.click('text=Challenging DOM');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/challenging_dom');
  });

  test('Navegar a Checkboxes', async ({ page }) => {
    await page.click('text=Checkboxes');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/checkboxes');
  });

  test('Navegar a Context Menu', async ({ page }) => {
    await page.click('text=Context Menu');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/context_menu');
  });

  test('Navegar a Digest Authentication', async ({ page }) => {
    await page.click('text=Digest Authentication');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/digest_auth');
  });

  test('Navegar a Disappearing Elements', async ({ page }) => {
    await page.click('text=Disappearing Elements');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/disappearing_elements');
  });

  test('Navegar a Drag and Drop', async ({ page }) => {
    await page.click('text=Drag and Drop');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/drag_and_drop');
  });

  test('Navegar a Dropdown', async ({ page }) => {
    await page.click('text=Dropdown');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/dropdown');
  });

  test('Navegar a Dynamic Content', async ({ page }) => {
    await page.click('text=Dynamic Content');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/dynamic_content');
  });

  test('Navegar a Dynamic Controls', async ({ page }) => {
    await page.click('text=Dynamic Controls');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/dynamic_controls');
  });

  test('Navegar a Dynamic Loading', async ({ page }) => {
    await page.click('text=Dynamic Loading');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/dynamic_loading');
  });

  test('Navegar a Entry Ad', async ({ page }) => {
    await page.click('text=Entry Ad');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/entry_ad');
  });

  test('Navegar a Exit Intent', async ({ page }) => {
    await page.click('text=Exit Intent');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/exit_intent');
  });

  test('Navegar a File Download', async ({ page }) => {
    await page.click('text=File Download');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/download');
  });

  test('Navegar a File Upload', async ({ page }) => {
    await page.click('text=File Upload');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/upload');
  });

  test('Navegar a Floating Menu', async ({ page }) => {
    await page.click('text=Floating Menu');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/floating_menu');
  });

  test('Navegar a Forgot Password', async ({ page }) => {
    await page.click('text=Forgot Password');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/forgot_password');
  });

  test('Navegar a Form Authentication', async ({ page }) => {
    await page.click('text=Form Authentication');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/login');
  });

  test('Navegar a Frames', async ({ page }) => {
    await page.click('text=Frames');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/frames');
  });

  test('Navegar a Geolocation', async ({ page }) => {
    await page.click('text=Geolocation');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/geolocation');
  });

  test('Navegar a Horizontal Slider', async ({ page }) => {
    await page.click('text=Horizontal Slider');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/horizontal_slider');
  });

  test('Navegar a Hovers', async ({ page }) => {
    await page.click('text=Hovers');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/hovers');
  });

  test('Navegar a Infinite Scroll', async ({ page }) => {
    await page.click('text=Infinite Scroll');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/infinite_scroll');
  });

  test('Navegar a Inputs', async ({ page }) => {
    await page.click('text=Inputs');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/inputs');
  });

  test('Navegar a JQuery UI Menus', async ({ page }) => {
    await page.click('text=JQuery UI Menus');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/jqueryui/menu');
  });

  test('Navegar a JavaScript Alerts', async ({ page }) => {
    await page.click('text=JavaScript Alerts');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/javascript_alerts');
  });

  test('Navegar a JavaScript onload event error', async ({ page }) => {
    await page.click('text=JavaScript onload event error');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/javascript_error');
  });

  test('Navegar a Key Presses', async ({ page }) => {
    await page.click('text=Key Presses');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/key_presses');
  });

  test('Navegar a Large & Deep DOM', async ({ page }) => {
    await page.click('text=Large & Deep DOM');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/large');
  });

  test('Navegar a Multiple Windows', async ({ page }) => {
    await page.click('text=Multiple Windows');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/windows');
  });

  test('Navegar a Nested Frames', async ({ page }) => {
    await page.click('text=Nested Frames');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/nested_frames');
  });

  test('Navegar a Notification Messages', async ({ page }) => {
    await page.click('text=Notification Messages');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/notification_message');
  });

  test('Navegar a Redirect Link', async ({ page }) => {
    await page.click('text=Redirect Link');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/redirector');
  });

  test('Navegar a Secure File Download', async ({ page }) => {
    await page.click('text=Secure File Download');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/download_secure');
  });

  test('Navegar a Shadow DOM', async ({ page }) => {
    await page.click('text=Shadow DOM');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/shadowdom');
  });

  test('Navegar a Shifting Content', async ({ page }) => {
    await page.click('text=Shifting Content');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/shifting_content');
  });

  test('Navegar a Slow Resources', async ({ page }) => {
    await page.click('text=Slow Resources');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/slow');
  });

  test('Navegar a Sortable Data Tables', async ({ page }) => {
    await page.click('text=Sortable Data Tables');
    expect(page.url()).toBe('https://the-internet.herokuapp.com/tables');
 