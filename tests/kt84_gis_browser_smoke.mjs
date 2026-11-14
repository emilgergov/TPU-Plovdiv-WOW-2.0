/* KT84-A isolated real Chromium smoke: test latest branch WITHOUT publishing to main.
   Not an expert acceptance. Validates hosted 258-shard GIS route through actual UI scripts. */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:8765';
const errors=[],events=[];
await fs.mkdir('test-results/kt84', {recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push('JS: '+String(e.message)));
 page.on('console',m=>{if(m.type()==='error')events.push('Console: '+m.text().slice(0,240));});
 const url=origin+'/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html';
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 if(response?.status()!==200)throw Error('Preview HTML status: '+response?.status());
 const scopeCheck=await page.evaluate(()=>({
  diagnostic:window.KT80V568QA?.loaded===true,
  missing:window.KT80V568QA?.missing||[],
  evidence:!!document.getElementById('kt80V565Evidence'),
  proposal:!!document.getElementById('kt80V565OneProposal'),
  snapshot:typeof window.KT80ScopeEvidence?.snapshot==='function'
 }));
 if(!scopeCheck.diagnostic||!scopeCheck.evidence||!scopeCheck.proposal||!scopeCheck.snapshot)
  throw Error('Stage 2 subject/scope integration is incomplete after DOM initialization: '+JSON.stringify(scopeCheck));
 console.log('KT84_B_SCOPE_UI',JSON.stringify(scopeCheck));
 const result=await page.evaluate(async()=>{
  const timeout=ms=>new Promise((_,reject)=>setTimeout(()=>reject(Error('GIS browser load timeout')),ms));
  if(!window.KT80FullGISSource?.load||!window.V26BrowserGIS?.lookup)
   throw Error('Full GIS bridge is not wired into the integrated test HTML');
  await Promise.race([window.KT80FullGISSource.load(),timeout(60000)]);
  const ids=['56784.13.102','36676.129.457'];
  const gis=await Promise.race([window.V26BrowserGIS.lookup(ids),timeout(60000)]);
  return {gisReady:window.KT80FullGISSource.isLoaded(),
   sourceState:document.getElementById('kt80FullGISReady')?.textContent||'',
   parcels:gis.results.map(x=>({id:x.cadnum,status:x.status,polygons:x.geojson?.features?.length||0,
     archiveOverlays:x.archived_overlay_records?.length||0})),
   mapElement:!!document.getElementById('kt80GISMap'),
   caseInput:!!document.getElementById('kt80InputFile')};
 });
 // Exercise the actual Stage 3 GIS drawing mechanism, not just the lookup adapter.
 const mapResult=await page.evaluate(async()=>{
  const input=document.getElementById('kt80ParcelInput');
  if(!input||!window.KT80FreeGIS?.find)throw Error('Stage 3 actual map UI is not wired');
  input.value=['56784.13.102','36676.129.457'].join(String.fromCharCode(10));
  await window.KT80FreeGIS.find();
  const displayed=document.querySelectorAll('#kt80GISParcels path.kt80-map-parcel').length;
  return {drawnPolygons:displayed,
    emptyHidden:document.getElementById('kt80GISMapEmpty')?.hidden===true,
    selected:window.KT80FreeGIS.getMap()?.selected||'',
    actualCount:window.KT80FreeGIS.getResults()?.length||0,
    caption:document.getElementById('kt80GISMapCaption')?.textContent||''};
 });
 if(mapResult.drawnPolygons<2||!mapResult.emptyHidden||mapResult.actualCount!==2)
  throw Error('Stage 3 integrated GIS drawing did not render both real parcel polygons: '+JSON.stringify(mapResult));
 await page.screenshot({path:'test-results/kt84/gis-browser.png',fullPage:true});
 console.log(JSON.stringify({stage:'isolated_chromium_map_render',mapResult},null,2));
 if(!result.gisReady||result.parcels.length!==2||result.parcels.some(x=>x.polygons<1))
  throw Error('No real full GIS polygon returned for known control parcels');
 if(!result.mapElement||!result.caseInput)throw Error('Integrated test page missing GIS or workflow elements');
 console.log(JSON.stringify({stage:'isolated_chromium_full_gis',url,result,jsErrors:errors.slice(0,10),consoleErrors:events.slice(0,10)},null,2));
}finally{await browser.close();}
