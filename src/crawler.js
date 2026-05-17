const { chromium } = require('playwright');

async function crawlRoutes(baseUrl) {
  console.log(`\nCrawling routes: ${baseUrl}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(baseUrl);

  const routes = await page.evaluate((base) => {
    const found = new Set();
    found.add(base);

    document.querySelectorAll('a').forEach(el => {
      const href = el.href;
      if (
        href &&
        href.startsWith(base) &&
        !href.includes('#') &&
        !href.includes('mailto') &&
        !href.includes('javascript')
      ) {
        found.add(href);
      }
    });

    return Array.from(found);
  }, baseUrl);

  await browser.close();

  console.log(`Found ${routes.length} route(s):`);
  routes.forEach(r => console.log(`  ${r}`));

  return routes;
}

module.exports = { crawlRoutes };