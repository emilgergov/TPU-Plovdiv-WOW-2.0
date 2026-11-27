import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(process.env.KT130_BROWSER_PACKAGE+'/package.json');
const {chromium}=require('playwright');
const html=readFileSync('index.html','utf8');
const legacy=readFileSync('wow-presentation.html','utf8');
const login='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/auth/login';
assert(html.includes(login),'Portal must retain the existing protected KT134 login');
assert(html.includes('href="wow-presentation.html"'),'Portal must lead to the preserved WOW presentation');
assert(legacy.includes('id="intro"'),'Eleven-scene presentation must be preserved');
assert(legacy.includes('id="tree"'),'Interactive WOW tree must be preserved');
assert(legacy.includes('class="doclinks expert-version-list"'),'Original Block 06 must remain in presentation');
assert(legacy.includes('kt133-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/auth/login'),'Legacy KT133 fallback must remain accessible');
mkdirSync('kt130-public-qa',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.KT130_BROWSER_EXECUTABLE?{executablePath:process.env.KT130_BROWSER_EXECUTABLE}:{})});
try {
 for(const [label,width,height] of [['desktop',1920,1080],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.route('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/wow-presentation.html',route=>route.fulfill({status:200,contentType:'text/html',body:legacy}));
  await page.goto('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/',{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/WOW Портал/iu);
  const cards=page.locator('.choices .tile');
  assert.equal(await cards.count(),2,'Portal must expose exactly two top-level destinations');
  const anchors=cards.locator('a.action');
  assert.equal(await anchors.count(),2,'Each destination needs one visible primary action');
  assert.equal(await anchors.nth(0).getAttribute('href'),login);
  assert.equal(await anchors.nth(1).getAttribute('href'),'wow-presentation.html');
  for(let i=0;i<2;i++){
   assert(await anchors.nth(i).isVisible(),`Action ${i} is not visible`);
   const r=await cards.nth(i).boundingBox();
   assert(r&&r.x>=-1&&r.x+r.width<=width+1,'Cinematic card must fit viewport');
  }
  const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();
  assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'Two cards must not overlap');
  await page.screenshot({path:`kt130-public-qa/${label}-portal.png`,fullPage:true});
  await anchors.nth(1).click();
  await page.waitForURL(/wow-presentation\.html/,{timeout:15000});
  assert(await page.locator('#intro').count()===1,'WOW presentation must start without replacing its controls');
  assert.deepEqual(errors,[],'Portal must not introduce script failures');
  await context.close();
 }
 console.log('PASS WOW Portal: two exclusive functional entries, saved KT134 login, preserved WOW presentation and KT133 Block 06 backup, desktop/mobile layout');
}finally{await browser.close()}
