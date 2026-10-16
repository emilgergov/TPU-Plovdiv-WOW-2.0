import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const root=process.cwd(), out=resolve(root,'wow-test-results');mkdirSync(out,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.pdf':'application/pdf','.wav':'audio/wav'};
const server=createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return} const file=resolve(root,'.'+name);if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\')){res.writeHead(403).end();return}if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return}res.setHeader('Content-Type',MIME[extname(file).toLowerCase()]||'application/octet-stream');createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});const results=[];let failures=0;
async function check(name,fn){let page;try{page=await browser.newPage({viewport:{width:1365,height:900}});let errors=[];page.on('pageerror',e=>errors.push((e.stack||e.message).slice(0,900)));await fn(page);if(errors.length)throw Error('JS errors: '+errors.slice(0,4).join(' | '));results.push({name,status:'PASS'});console.log('PASS',name)}catch(e){failures++;results.push({name,status:'FAIL',detail:String(e.message||e)});console.error('FAIL',name,e.message);if(page)await page.screenshot({path:resolve(out,`failure-${failures}.png`),fullPage:true}).catch(()=>{})}finally{await page?.close()}}
await check('Intro and 11-scene controls',async p=>{await p.goto(base+'/index.html');await p.locator('#intro').waitFor({state:'visible'});if(await p.locator('#next').count()!==1)throw Error('Missing next button');for(let i=0;i<10;i++)await p.locator('#next').click({timeout:5000});await p.locator('#tree').waitFor({state:'visible',timeout:15000})});
await check('Tree entry and eight navigation buttons',async p=>{await p.goto(base+'/index.html#tree');await p.locator('#tree').waitFor({state:'visible'});for(const route of ['zones','species','measures','photos','indicators','financing','map'])if(await p.locator(`#tree [data-route="${route}"]`).count()!==1)throw Error(`Missing fruit: ${route}`)});
for(const route of ['zones','species','measures','indicators','financing','map'])await check(`Tree click: ${route}`,async p=>{await p.goto(base+'/index.html#tree');await p.locator('#tree').waitFor({state:'visible'});await p.locator(`#tree [data-route="${route}"]`).click({timeout:8000});await p.locator('#app.active').waitFor({state:'visible',timeout:15000});if(await p.locator('#backTree').isVisible())throw Error('Duplicate tree return control visible');const frame=p.frameLocator('#app');await frame.locator('body').waitFor({state:'visible',timeout:15000});const text=await frame.locator('body').innerText();if(text.length<100)throw Error('Empty embedded app');await p.keyboard.press('Escape');await p.locator('#tree').waitFor({state:'visible'});if(await p.locator('#app').isVisible())throw Error('Embedded app did not close')});
await check('Media hub routes to photo archive',async p=>{await p.goto(base+'/index.html#tree');await p.locator('#tree [data-route="photos"]').click();await p.locator('#wowMediaHub').waitFor({state:'visible'});await p.getByRole('button',{name:/Фотоархив/}).click();await p.locator('#app.active').waitFor({state:'visible',timeout:15000});if(await p.locator('#backTree').isVisible())throw Error('Duplicate tree return control visible');await p.keyboard.press('Escape');await p.locator('#tree').waitFor({state:'visible'});if(await p.locator('#app').isVisible())throw Error('Photo archive did not close')});
await check('Media hub back to tree',async p=>{await p.goto(base+'/index.html#media');await p.locator('#wowMediaHub').waitFor({state:'visible'});await p.locator('#wowMediaBack').click();await p.locator('#tree').waitFor({state:'visible'});if(await p.locator('#wowMediaHub').isVisible())throw Error('Media hub remains visible')});
await check('Fruit hit areas do not overlap',async p=>{await p.goto(base+'/index.html#tree');const overlap=await p.evaluate(()=>{const buttons=[...document.querySelectorAll('#tree .hotspot')];return buttons.flatMap((a,i)=>buttons.slice(i+1).filter(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.max(0,Math.min(x.right,y.right)-Math.max(x.left,y.left))*Math.max(0,Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top))>10}).map(b=>[a.dataset.route||'video',b.dataset.route||'video']))});if(overlap.length)throw Error('Overlapping fruits: '+JSON.stringify(overlap))});
await check('Eighth video fruit and return',async p=>{await p.goto(base+'/index.html#tree');await p.locator('[data-video-fruit]').click();await p.locator('#wowVideoPanel').waitFor({state:'visible'});if(!p.url().endsWith('#video'))throw Error('Wrong video hash');const v=p.locator('#wowVideo');if(!await v.isVisible())throw Error('Video element hidden');const media=await v.evaluate(async el=>{el.muted=true;try{await el.play()}catch(e){throw Error('Video playback rejected: '+e.message)}return await new Promise((ok,bad)=>{const timeout=setTimeout(()=>bad(Error('Video did not advance')),12000);const start=el.currentTime;const tick=()=>{if(el.currentTime>start+0.15&&el.videoWidth>0){clearTimeout(timeout);ok({time:el.currentTime,width:el.videoWidth})}else if(el.error){clearTimeout(timeout);bad(Error('Video media error '+el.error.code))}else setTimeout(tick,250)};tick()})});if(media.width<1)throw Error('Video image missing');await p.locator('#closeWowVideo').click();await p.locator('#tree').waitFor({state:'visible'});if(await v.evaluate(el=>!el.paused))throw Error('Video continues playing after close');if(await p.locator('#wowVideoPanel').isVisible())throw Error('Video did not close')});
await check('All eight fruits clickable without overlap',async p=>{await p.goto(base+'/index.html#tree');for(const selector of [...['zones','species','measures','photos','indicators','financing','map'].map(r=>'#tree [data-route="'+r+'"]'),'#tree [data-video-fruit]']){const state=await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return {hit:document.elementFromPoint(x,y)===e,x,y}});if(!state.hit)throw Error('Overlapping or blocked fruit: '+selector+' '+JSON.stringify(state))}});
await check('Direct video route',async p=>{await p.goto(base+'/index.html#video');await p.locator('#wowVideoPanel').waitFor({state:'visible'})});
await check('Classic panel and return',async p=>{await p.goto(base+'/index.html#tree');await p.locator('#tree').waitFor({state:'visible'});await p.locator('#tree [data-classic]').first().click();await p.locator('#classicPanel').waitFor({state:'visible'});await p.locator('#classicTree').click();await p.locator('#tree').waitFor({state:'visible'})});
await check('GIS full screen actually visible',async p=>{await p.goto(base+'/WOW_APP.html#wow-route=map',{waitUntil:'domcontentloaded',timeout:25000});await p.waitForTimeout(3500);const buttons=p.getByText('Отвори GIS картата на цял екран',{exact:false});if(!await buttons.count())throw Error('Full screen GIS control missing');await buttons.first().click({timeout:10000});await p.waitForTimeout(1200);const state=await p.locator('#gisLayer').evaluate(e=>({open:e.classList.contains('open'),display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,rect:e.getBoundingClientRect().toJSON()}));if(!state.open||state.display==='none'||state.visibility==='hidden'||state.rect.width<100||state.rect.height<100)throw Error('GIS overlay not visible: '+JSON.stringify(state))});
await check('Zone BG0002057 present',async p=>{await p.goto(base+'/WOW_APP.html#wow-route=zones',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2800);if(!await p.getByText('BG0002057',{exact:false}).count())throw Error('BG0002057 missing in zones view')});
await check('Video media URL serves playable MP4',async p=>{await p.goto(base+'/index.html#tree');const src=await p.locator('#wowVideo').getAttribute('src');if(!src)throw Error('Video source is empty');const response=await p.request.get(base+'/'+src);if(!response.ok())throw Error('Video HTTP '+response.status()+' for '+src);const type=response.headers()['content-type']||'';if(!type.includes('video/mp4'))throw Error('Wrong video MIME: '+type);const length=Number(response.headers()['content-length']||0);if(length&&length<1000000)throw Error('Video file suspiciously small: '+length)});
await check('Mobile video fruit actually opens and closes',async p=>{await p.setViewportSize({width:390,height:844});await p.goto(base+'/index.html#tree');await p.locator('[data-video-fruit]').click({timeout:8000});await p.locator('#wowVideoPanel').waitFor({state:'visible'});await p.locator('#closeWowVideo').click();await p.locator('#tree').waitFor({state:'visible'});if(await p.locator('#wowVideoPanel').isVisible())throw Error('Mobile video panel remained open')});
await check('Single return and menu actions on desktop and mobile',async p=>{for(const size of [{width:1365,height:768},{width:390,height:844}]){await p.setViewportSize(size);await p.goto(base+'/index.html#tree');await p.locator('#tree').waitFor({state:'visible'});if(await p.locator('#backTree').isVisible())throw Error('Duplicate floating return is visible');if(await p.locator('#tree [data-route="zones"]').count()!==1)throw Error('Zones hotspot missing');const menu=p.locator('#tree .tree-more summary');await menu.click();await p.locator('#tree details.tree-more[open]').waitFor({state:'attached',timeout:3000});for(const id of ['replay','openApp']){const control=p.locator('#'+id);await control.waitFor({state:'visible',timeout:5000});const rect=await control.boundingBox();if(!rect||rect.width<10||rect.height<10)throw Error('Menu action has no usable hit area: '+id)}if(await p.locator('#wowMediaHub').isVisible())throw Error('Unexpected media overlay');await p.locator('#tree [data-route="zones"]').click();await p.locator('#app.active').waitFor({state:'visible',timeout:15000});await p.keyboard.press('Escape');await p.locator('#tree').waitFor({state:'visible'});if(await p.locator('#app').isVisible())throw Error('Escape failed to return to tree')}});
await check('Media hub uses neutral video label',async p=>{await p.goto(base+'/index.html#media');await p.locator('#wowMediaHub').waitFor({state:'visible'});const text=await p.locator('#wowMediaHub').innerText();if(!text.includes('Панорамно видео'))throw Error('Neutral video label missing');if(text.includes('Видео с Тера'))throw Error('Deprecated character shown in media menu')});
await check('Mobile tree controls',async p=>{await p.setViewportSize({width:390,height:844});await p.goto(base+'/index.html#tree');await p.locator('#tree').waitFor({state:'visible'});if(!await p.locator('[data-video-fruit]').count())throw Error('Missing mobile video fruit');for(const r of ['zones','species','measures','photos','indicators','financing','map'])if(!await p.locator(`#tree [data-route="${r}"]`).count())throw Error('Missing mobile route '+r)});
await check('All 32 zones have unique codes and contextual Natu guidance',async p=>{
 await p.goto(base+'/WOW_APP.html#wow-route=zones',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>Boolean(window.WOWUnified?.context),null,{timeout:15000});
 const initial=await p.locator('#wowUnifiedContent .wow-u-zone-grid button').allTextContents();
 const codes=initial.map(t=>(t.match(/BG\d{7}/)||[])[0]).filter(Boolean);
 if(codes.length!==32||new Set(codes).size!==32)throw Error('Expected 32 unique zone buttons; got '+codes.length+' unique '+new Set(codes).size);
 for(const code of codes){
  const info=await p.evaluate(code=>{
   if(!window.WOWUnified.setZone(code))return {error:'setZone returned false'};
   const ctx=window.WOWUnified.context();
   return {ctx,heading:document.querySelector('#wowUnifiedContent')?.innerText||'',natu:document.querySelector('#wowNatuContext')?.textContent||'',crumb:document.querySelector('#wowUnifiedBreadcrumb')?.textContent||''};
  },code);
  if(info.error||info.ctx.zoneCode!==code||!info.heading.includes(code)||!info.crumb.includes(code)||!info.natu.includes('Нату:'))throw Error('Zone context mismatch '+code+': '+JSON.stringify(info).slice(0,450));
 }
});
await check('Measures and indicators filter strictly to selected zone',async p=>{
 await p.goto(base+'/WOW_APP.html#wow-route=zones',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>Boolean(window.WOWUnified?.context),null,{timeout:15000});
 const codes=await p.locator('#wowUnifiedContent .wow-u-zone-grid button').allTextContents();
 const first=(codes[0].match(/BG\d{7}/)||[])[0],second=(codes[1].match(/BG\d{7}/)||[])[0];
 if(!first||!second||first===second)throw Error('Need two distinct zone codes');
 for(const view of ['measures','indicators','financing']){
  await p.evaluate(({first,view})=>{window.WOWUnified.setZone(first);window.WOWUnified.navigate(view)}, {first,view});
  const search=p.locator('#wowUnifiedContent input[aria-label="Търсене на зона"]');
  await search.waitFor({state:'visible'});
  if(await search.inputValue()!==first)throw Error('Selected zone not carried to '+view);
  const heads=await p.locator('#wowUnifiedContent section h3').allTextContents();
  if(heads.length!==1||!heads[0].includes(first)||heads[0].includes(second))throw Error('Wrong zone in '+view+': '+heads.join('|'));
  const natu=await p.locator('#wowNatuContext').innerText();
  if(!natu.includes(first)&&!await p.locator('#wowUnifiedBreadcrumb').innerText().then(t=>t.includes(first)))throw Error('Guide lost selected zone '+view);
 }
});
await check('792 species search and individual narrative render in browser',async p=>{
 await p.goto(base+'/index.html#tree',{waitUntil:'domcontentloaded'});
 await p.locator('#tree [data-route="species"]').click();
 // The shell can restore an earlier zone selection asynchronously after the fruit click.
 // Assert the actual app route before checking its content; do not confuse a route race
 // with a missing 792-species registry.
 await p.waitForFunction(()=>{
  const f=document.querySelector('#app');
  return !!(f?.contentWindow?.WOWUnified?.navigate && f?.contentDocument?.getElementById('wowUnifiedContent'));
 },null,{timeout:15000});
 await p.evaluate(()=>{const api=document.querySelector('#app').contentWindow.WOWUnified;if(!api.navigate('species'))throw Error('Species route unavailable')});
 await p.waitForFunction(()=>document.querySelector('#app')?.contentWindow?.WOWUnified?.context?.()?.view==='species',null,{timeout:10000});
 const frame=p.frameLocator('#app');
 const search=frame.locator('#wowSpeciesCatalogue input[type="search"]');
 try{await search.waitFor({state:'visible',timeout:12000})}catch(e){
 const state=await p.evaluate(()=>{const f=document.querySelector('#app');try{const d=f.contentDocument;return {src:f.src,active:f.className,ready:d?.readyState,route:f.contentWindow?.WOWUnified?.context?.(),root:!!d?.getElementById('wowUnifiedContent'),script:!!d?.getElementById('wow-species-catalogue'),panel:!!d?.getElementById('wowSpeciesCatalogue'),panelText:d?.getElementById('wowSpeciesCatalogue')?.innerText?.slice(0,350),scripts:[...d?.scripts||[]].filter(x=>x.src.includes('species')).map(x=>x.src)}}catch(err){return {error:String(err)}}});
 throw Error('Species catalogue missing: '+JSON.stringify(state)+'; '+e.message);
}
 const response=await p.request.get(base+'/data/species-stories-792.json');
 if(!response.ok())throw Error('Species JSON HTTP '+response.status());
 const data=await response.json();const names=Object.keys(data);
 if(names.length!==792)throw Error('Species count mismatch');
 const name=names.find(n=>n.length>6)||names[0];
 await search.fill(name);
 const btn=frame.locator('#wowSpeciesCatalogue button').filter({hasText:name}).first();
 await btn.waitFor({state:'visible',timeout:5000});await btn.click();
 const content=await frame.locator('#wowSpeciesCatalogue').innerText();
 if(!content.includes(name)||!content.includes(data[name]))throw Error('Species narrative not displayed for '+name);
});
writeFileSync(resolve(out,'report.json'),JSON.stringify({tested:results.length,passed:results.length-failures,failed:failures,results},null,2));writeFileSync(resolve(out,'report.txt'),results.map(r=>`${r.status}\t${r.name}${r.detail?'\t'+r.detail:''}`).join('\n')+`\nTOTAL ${results.length} FAIL ${failures}\n`);await browser.close();await new Promise(r=>server.close(r));process.exitCode=failures?1:0;
