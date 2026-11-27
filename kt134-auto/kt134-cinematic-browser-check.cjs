const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

async function main() {
  await fs.mkdir('visual-check', {recursive: true});
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({viewport: {width, height: 960}});
      const origin = 'https://kt134-preview.example';
      await page.route(origin + '/**', async route => {
        const { pathname } = new URL(route.request().url());
        const files = {
          '/': ['portal-reference/index.html', 'text/html'],
          '/scenes/wow-plovdiv-panorama.webp': ['portal-reference/scenes/wow-plovdiv-panorama.webp', 'image/webp'],
          '/kt134/dashboard': ['kt134-auto/KT134_EMBEDDED_DASHBOARD.html', 'text/html'],
          '/kt134/final-test': ['kt134-auto/KT134_PROTECTED_INTEGRATION_UI.html', 'text/html']
        };
        const asset = files[pathname];
        if (asset) return route.fulfill({body: await fs.readFile(asset[0]), contentType: asset[1]});
        return route.fulfill({status: 401, contentType: 'application/json', body: '{}'});
      });
      await page.goto(origin);
      const expert = page.getByRole('link', {name: 'Вход за експерти'});
      assert.equal(await expert.getAttribute('target'), null);
      assert.match(await expert.getAttribute('href'), /\/auth\/login$/);
      const panorama = await page.evaluate(async () => {
        const im = new Image();
        im.src = '/scenes/wow-plovdiv-panorama.webp';
        await im.decode();
        return im.naturalWidth;
      });
      assert.ok(panorama > 1000);
      await page.screenshot({path: 'visual-check/portal-' + width + '.png', fullPage: true});

      await page.goto(origin + '/kt134/dashboard');
      const stageLinks = page.locator('.grid .stage a');
      assert.equal(await stageLinks.count(), 5);
      for (let i = 0; i < 5; i++) {
        assert.equal(await stageLinks.nth(i).getAttribute('target'), null);
        assert.match(await stageLinks.nth(i).getAttribute('href'), new RegExp('kt134-stage=' + (i + 1) + '$'));
      }
      const cards = await page.locator('.grid .stage').evaluateAll(async stages => {
        const images = stages.map(stage => {
          const background = getComputedStyle(stage, '::before').backgroundImage;
          const data = background.match(/data:image\/webp;base64,[A-Za-z0-9+/=]+/)[0];
          const im = new Image();
          im.src = data;
          return im;
        });
        await Promise.all(images.map(im => im.decode()));
        return new Set(images.map(im => im.src)).size;
      });
      assert.equal(cards, 5);
      assert.equal(await page.locator('#auto').evaluate(el => el.open), false);
      await page.screenshot({path: 'visual-check/dashboard-' + width + '.png', fullPage: true});

      await page.locator('#auto summary').click();
      const frame = page.frameLocator('#kt134-live');
      await frame.locator('#route .node').first().waitFor();
      assert.equal(await frame.locator('#route .node').count(), 5);
      assert.equal(await frame.locator('#route .gate').count(), 2);
      assert.equal(await frame.getByRole('progressbar').getAttribute('aria-valuenow'), '0');
      assert.equal(await frame.getByRole('button', {name: 'Стартирай автоматичния анализ'}).isDisabled(), true);
      await page.locator('#auto').screenshot({path: 'visual-check/automatic-' + width + '.png'});
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
