import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(process.env.KT130_BROWSER_PACKAGE+'/package.json');
const {chromium}=require('playwright');
const html=readFileSync('index.html','utf8');
const login='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/auth/login';
const fallback='https://kt133-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/auth/login';
const old='v26-test/v27-preview/KT79_25_V27_35_STABLE_WORKING_BLOCK06.html';
assert(html.includes(login));assert(html.includes('https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/auth/login'));assert(html.includes(old));
for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu))new vm.Script(script[1]);
mkdirSync('kt130-public-qa',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.KT130_BROWSER_EXECUTABLE?{executablePath:process.env.KT130_BROWSER_EXECUTABLE}:{})});
try{
 for(const [label,width,height] of [['desktop',1920,1080],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  await page.route('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.goto('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/',{waitUntil:'domcontentloaded'});
  const entry=page.locator('#kt130PublicEntry');
  await entry.waitFor({state:'visible'});assert.equal(await entry.getAttribute('href'),login);
  assert.equal(await entry.evaluate(x=>x.parentElement.tagName),'BODY','Entry must be outside timed intro');
  await page.locator('#frame').evaluate(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r}));
  await page.screenshot({path:'kt130-public-qa/'+label+'-intro.png'});
  const buttons=page.locator('#intro .bottom button,#intro .bottom .classic-link'),boxes=await buttons.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height,color:c.color,background:c.backgroundColor}}));
  for(const r of boxes)assert(r.x>=0&&r.right<=width&&r.bottom<=height);
  assert.equal(new Set(boxes.map(r=>r.background)).size,1);assert.equal(new Set(boxes.map(r=>r.height)).size,1);
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),'Opening buttons must not overlap');}
  const counter=await page.locator('#counter').textContent();
  await page.clock.fastForward(4300);assert.notEqual(await page.locator('#counter').textContent(),counter);
  assert(await entry.isVisible(),'Automatic slide change must not hide entry');
  const popupPromise=page.waitForEvent('popup');
  await entry.click();const popup=await popupPromise;await popup.waitForURL(url=>url.origin===new URL(login).origin,{timeout:30000});await popup.waitForLoadState('domcontentloaded');
  assert.equal(new URL(popup.url()).origin,new URL(login).origin);await popup.close();
  // Run every scheduled scene callback, even if Chromium throttles the opener during popup navigation.
  await page.clock.runFor(11 * 4200 + 1000);
  await page.locator('#tree').waitFor({state:'visible',timeout:5000});assert(await entry.isVisible(),'Entry must survive automatic transition to tree');
  const rect=await entry.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width&&rect.y+rect.height<=height);
  assert(await entry.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  if(label==='desktop'){
   const map=await page.locator('[data-route="map"]').boundingBox();
   assert(!(rect.x<map.x+map.width&&rect.x+rect.width>map.x&&rect.y<map.y+map.height&&rect.y+rect.height>map.y),'New entry must not cover map hotspot');
  }
  assert.equal(await page.locator('#wowBlock06Entry').getAttribute('href'),login);
  await page.screenshot({path:'kt130-public-qa/'+label+'-tree.png'});
  await page.locator('#classicPanel').evaluate(el=>{el.hidden=false});
  await page.waitForTimeout(1);assert(!(await entry.isVisible()),'Do not cover classical document panel');
  const rows=page.locator('#expert-analysis-v26 .expert-version-list > li');
  assert.equal(await rows.count(),4);
  assert.match(await rows.first().innerText(),/Текуща стабилна тестова версия[\s\S]*КТ134/u);
  assert.equal(await rows.nth(1).locator('a').getAttribute('href'),fallback);
  assert.match(await rows.nth(1).innerText(),/КТ133/u);
  const primary=rows.first().locator('a'),previous=rows.last().locator('a');
  assert.equal(await primary.getAttribute('href'),login);assert.equal(await previous.getAttribute('href'),old);
  await page.locator('#expert-analysis-v26').scrollIntoViewIfNeeded();await page.screenshot({path:'kt130-public-qa/'+label+'-block06.png'});
  await page.locator('#classicTree').click();assert(await entry.isVisible());
  assert.deepEqual(errors,[]);await context.close();
 }
 const response=await fetch(login,{redirect:'follow'});assert.equal(response.status,200);
 console.log('PASS persistent intro/tree entry, timed advance, safe desktop/mobile position, protected login popup, KT134 current plus KT133 fallback in Block06, previous stable version retained, no script errors');
}finally{await browser.close()}
