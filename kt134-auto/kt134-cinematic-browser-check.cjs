const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

async function main() {
  await fs.mkdir('visual-check', {recursive: true});
  const { createKt134NativeAuthProxy } = await import('./kt134-kt125-native-auth-proxy.mjs');
  const login = createKt134NativeAuthProxy({nativeFetch: async () => new Response(
    '<!doctype html><html lang="bg"><head><meta charset="utf-8"></head><body><main><h1>Вход за експерти</h1><form method="post" action="/auth/login"><fieldset><label>Потребителско име<input name="username"></label><label>Парола<input name="password" type="password"></label></fieldset><button>Влез</button></form></main></body></html>',
    {headers: {'content-type': 'text/html; charset=utf-8'}}
  )});
  const gateway = await fs.readFile('tests/kt133-proxy-visuals-patch.cjs', 'utf8');
  const stageStyle = gateway.match(/<style id="kt134-stage-cinematic">[^<]+<\/style>/)[0];
  const stagePath = '/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html';
  const browser = await chromium.launch({channel: 'chrome'});
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({viewport: {width, height: 960}});
      const origin = 'https://kt134-preview.example';
      await page.route(origin + '/**', async route => {
        const { pathname } = new URL(route.request().url());
        if (pathname === '/auth/login') {
          const response = await login(new Request(origin + '/auth/login'));
          return route.fulfill({status: response.status, contentType: 'text/html', body: await response.text()});
        }
        if (pathname === stagePath) {
          const html = await fs.readFile('classic-reference' + stagePath, 'utf8');
          return route.fulfill({contentType: 'text/html', body: html.replace('</head>', stageStyle + '</head>')
            .replace('</body>', '<script defer src="/kt80/KT133_APPROVED_VISUALS.js"></script></body>')});
        }
        if (/^\/(vt03|kt80|v26-test)\/[\w./-]+$/.test(pathname) && !pathname.includes('..')) {
          const asset = await fs.readFile('classic-reference' + pathname).catch(() => null);
          if (asset) return route.fulfill({body: asset, contentType: /\.m?js$/.test(pathname) ? 'text/javascript' : 'application/octet-stream'});
        }
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
      await page.goto(origin + '/auth/login');
      await page.getByRole('heading', {name: 'Вход за експерти'}).waitFor();
      assert.ok(await page.locator('#wow-approved-login').count());
      assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), /data:image\/webp/);
      await page.screenshot({path: 'visual-check/login-fixture-' + width + '.png', fullPage: true});
      if (width === 1440) {
        for (let i = 1; i <= 5; i++) {
          await page.goto(origin + stagePath + '?kt134-stage=' + i, {waitUntil: 'domcontentloaded'});
          await page.waitForFunction(() => document.body.dataset.kt80View === 'stage');
          assert.equal(await page.locator('#kt134-stage-cinematic').count(), 1);
          await page.locator('#kt80DashboardBack').waitFor();
          await page.screenshot({path: 'visual-check/stage-' + i + '.png'});
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
