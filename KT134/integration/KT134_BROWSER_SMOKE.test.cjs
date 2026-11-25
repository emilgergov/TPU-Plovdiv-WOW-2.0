'use strict';
// Browser smoke of the full E1–E5 integrated page, not an acceptance test with real parcels.
// Never sends actual dossiers or secrets to the worker.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright-core');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
const html='/vt03/kt80/KT134_PDF1_ISOLATED_REGRESSION_TEST.html';
const contentType={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const srv=http.createServer((req,res)=>{
 let url;
 try{url=new URL(req.url,'http://localhost')}catch(_){res.writeHead(400);return res.end()}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(err.code==='ENOENT'?404:500);return res.end()}
  res.writeHead(200,{'Content-Type':contentType[path.extname(file)]||'application/octet-stream',
   'Cache-Control':'no-store'});res.end(bytes);
 });
});
(async()=>{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const port=srv.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 let missing=[],crashes=[];
 try{
  const page=await browser.newPage();
  page.on('response',r=>{if(r.status()===404&&new URL(r.url()).pathname.match(/\.(js|mjs|css)$/))missing.push(r.url())});
  page.on('pageerror',e=>{crashes.push(e.message)});
  const response=await page.goto('http://127.0.0.1:'+port+html,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200);
  await page.waitForTimeout(1800);
  // KT134: client-side Stage4 and Stage5 modules must actually initialize.
  // These objects appear after the existing delayed DOM bootstrap.
  await page.waitForFunction(()=>typeof window.KT96EGStage4?.refresh==='function'&&
    typeof window.KT117Document?.refresh==='function',undefined,{timeout:12000});
  await page.waitForFunction(()=>typeof window.KT134AutoMode?.active==='function',undefined,{timeout:12000});
  assert.equal(await page.evaluate(()=>window.KT134AutoMode.active()),false,
    'Automated route must NEVER activate without explicit selection');
  assert.equal(await page.locator('#kt134AutoPipeline button').count(),2,
    'Automatic route must provide a single opt-in plus final approval button');
  assert.equal(await page.locator('script[src*="KT134_SPATIAL_GATE_CONSISTENCY.js"]').count(),1);
  assert.equal(await page.locator('script[src*="KT82_A_PDF1_V600_KT134_CANDIDATE.js"]').count(),1);
  assert.equal(await page.locator('link[href*="KT134_PANEL15_REAL_GIS.css"]').count(),1);
  assert.deepEqual(missing,[],'Missing script or CSS resources: '+missing.join(','));
  const check=await page.evaluate(()=>({
    spatialGate:typeof window.KT83P2SpatialGate?.check,
    pdfBridge:typeof window.KT80PDF1Bridge?.makePDF,
    caseState:typeof window.KT80WorkflowState,
    title:document.title
  }));
  assert.equal(check.spatialGate,'function','Stage3 GIS gate not initialized');
  assert.equal(check.pdfBridge,'function','PDF1 generator bridge not initialized');
  console.log('KT134 browser smoke PASS: loaded HTML, Stage3 GIS, Stage4 EG author and Stage5 document modules');
  // Page errors are reported but cannot all be treated as regressions: production
  // services may be absent in local isolated mode. Do not claim E1–E5 end-to-end.
  if(crashes.length)console.log('Local-only page errors requiring classification:',JSON.stringify(crashes.slice(0,20)));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>srv.close());
