import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(process.env.KT130_BROWSER_PACKAGE+'/package.json');
const {chromium}=require('playwright');
const html=readFileSync('index.html','utf8');
const login='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/auth/login';
const old='v26-test/v27-preview/KT79_25_V27_35_STABLE_WORKING_BLOCK06.html';
assert(html.includes(login));assert(html.includes(old));
for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu))new vm.Script(script[1]);
mkdirSync('kt130-public-qa',{recursive:true});
const browser=await chromium.launch({headless:true});
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
  const counter=await page.locator('#counter').textContent();
  await page.clock.fastForward(4300);assert.notEqual(await page.locator('#counter').textContent(),counter);
  assert(await entry.isVisible(),'Automatic slide change must not hide entry');
  const popupPromise=page.waitForEvent('popup');
  await entry.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
  assert.equal(new URL(popup.url()).origin,'https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev');await popup.close();
  for(let i=0;i<11;i++)await page.clock.fastForward(4300);
  assert(await page.locator('#tree').isVisible());assert(await entry.isVisible(),'Entry must survive automatic transition to tree');
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
  const primary=page.locator('#expert-analysis-v26 a').first(),previous=page.locator('#expert-analysis-v26 a').last();
  assert.equal(await primary.getAttribute('href'),login);assert.equal(await previous.getAttribute('href'),old);
  await page.locator('#expert-analysis-v26').scrollIntoViewIfNeeded();await page.screenshot({path:'kt130-public-qa/'+label+'-block06.png'});
  await page.locator('#classicTree').click();assert(await entry.isVisible());
  assert.deepEqual(errors,[]);await context.close();
 }
 const response=await fetch(login,{redirect:'follow'});assert.equal(response.status,200);
 console.log('PASS persistent intro/tree entry, timed advance, safe desktop/mobile position, protected login popup, both Block06 entries, previous version retained, no script errors');
}finally{await browser.close()}
