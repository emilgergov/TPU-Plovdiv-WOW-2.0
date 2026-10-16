import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const root=process.cwd(), out=resolve(root,'wow-test-results','visual');
mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.pdf':'application/pdf'};
const server=createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
  const file=resolve(root,'.'+name);
  if(!(file.startsWith(root+'/')||file.startsWith(root+'\\'))||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return}
  res.setHeader('Content-Type',mime[extname(file).toLowerCase()]||'application/octet-stream');
  createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
let failed=0;
async function shot(name,viewport,path,selector,action){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  try{
    await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator(selector).waitFor({state:'visible',timeout:20000});
    if(action)await action(page);
    await page.waitForTimeout(1100);
    await page.screenshot({path:resolve(out,name+'.png'),fullPage:false,animations:'disabled'});
    console.log('VISUAL PASS',name);
  }catch(e){failed++;console.error('VISUAL FAIL',name,e.message);await page.screenshot({path:resolve(out,name+'-failure.png'),fullPage:false}).catch(()=>{});}
  finally{await page.close()}
}
const desktop={width:1365,height:900},mobile={width:390,height:844};
await shot('01-tree-desktop',desktop,'/index.html#tree','#tree');
await shot('02-tree-mobile',mobile,'/index.html#tree','#tree');
await shot('03-media-hub-desktop',desktop,'/index.html#media','#wowMediaHub');
await shot('04-video-desktop',desktop,'/index.html#video','#wowVideoPanel');
await shot('05-video-mobile',mobile,'/index.html#video','#wowVideoPanel');
await shot('06-zones-desktop',desktop,'/WOW_APP.html#wow-route=zones','body');
await shot('07-zones-mobile',mobile,'/WOW_APP.html#wow-route=zones','body');
await shot('08-gis-desktop',desktop,'/WOW_APP.html#wow-route=map','body',async p=>{
  await p.getByText('Отвори GIS картата на цял екран',{exact:false}).first().click({timeout:15000});
  await p.locator('#gisLayer.open').waitFor({state:'visible',timeout:15000});
});
// Check that every fruit is reachable and tappable within the mobile scroll region.
{
 const page=await browser.newPage({viewport:mobile,hasTouch:true,isMobile:true,deviceScaleFactor:1});
 try{
  await page.goto(base+'/index.html#tree',{waitUntil:'domcontentloaded'});
  await page.locator('#tree').waitFor({state:'visible'});
  const stage=page.locator('.tree-stage');
  const bounds=await stage.evaluate(e=>({width:e.clientWidth,content:e.scrollWidth}));
  if(bounds.content<=bounds.width+100)throw Error('Mobile tree is not horizontally scrollable: '+JSON.stringify(bounds));
  const fruits=page.locator('#tree .hotspot');
  for(let i=0;i<await fruits.count();i++){
   const fruit=fruits.nth(i);
   await fruit.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'}));
   const state=await fruit.evaluate(e=>{
    const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    return {x,y,hit:document.elementFromPoint(x,y)===e,viewport:innerWidth};
   });
   if(!state.hit||state.x<0||state.x>mobile.width)throw Error('Mobile fruit inaccessible '+i+': '+JSON.stringify(state));
  }
  await page.screenshot({path:resolve(out,'09-tree-mobile-scrolled.png'),animations:'disabled'});
  console.log('VISUAL PASS mobile fruit reachability '+await fruits.count()+' hotspots');
 }catch(e){failed++;console.error('VISUAL FAIL mobile fruit reachability',e.message);}
 finally{await page.close()}
}
await browser.close();await new Promise(r=>server.close(r));
if(failed)process.exitCode=1;
