/* KT84 FINAL: actual three-scenario GIS + PI Master + PDF1 in integrated Chromium.
   Not a normative competence finding and not official procedural selection. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',
  {waitUntil:'domcontentloaded',timeout:90000});
 await page.evaluate(async()=>{
  if(!window.KT80FullGISSource?.load||!window.KT80FreeGIS?.find)throw Error('GIS bridge unavailable');
  await window.KT80FullGISSource.load();
  // Synthetic expert context only for this spatial integration; never a legal conclusion.
  window.KT80WorkflowState.step=3;
  window.KT80WorkflowState.subjectConfirmed={text:'Тестов предмет',scope:'Тестов обхват',expertConfirmed:true,scopeConfirmed:true};
  window.KT80WorkflowState.normativeGate={decision:'REQUIRED',expertConfirmed:true,reason:'Тест на геометрията'};
  document.getElementById('kt80ParcelInput').value=['56784.13.102','36676.129.457','46989.205.218'].join('\n');
 });
 const downloadPromise=page.waitForEvent('download',{timeout:120000}).catch(()=>null);
 await page.evaluate(()=>document.getElementById('kt80FindParcels').click());
 await page.waitForFunction(()=>{
  const gis=window.KT80FreeGISResults,pi=window.KT80PIMaster?.getResult?.();
  return gis?.results?.length===3&&gis.results.every(r=>r.geojson?.features?.length>0&&
   Array.isArray(r.verified_zone_intersections)&&typeof r.intersection_verified_outside==='boolean')&&
   pi?.items?.length===3&&window.KT80FreeGIS?.getMap?.()?.zones?.length===32;
 },null,{timeout:110000});
 const proof=await page.evaluate(()=>{
  const x=window.KT83P2Automatic.current();
  const checked=window.KT83P2SpatialGate.check(x);
  return {code:checked.code,ok:checked.ok,
   gis:x.live.results.map(r=>({id:r.cadnum||r.input,polygons:r.geojson.features.length,
    verifiedOverlaps:r.verified_zone_intersections.length,verifiedOutside:r.intersection_verified_outside})),
   pi:x.pi.items.map(r=>r.status),zones:x.zones.length,
   mapPaths:document.querySelectorAll('#kt80GISParcels path.kt80-map-parcel').length};
 });
 assert.equal(proof.ok,true,'all three real GIS and PI MASTER inputs must support PDF1');
 assert.equal(proof.mapPaths,3,'map renders all three real parcels');
 await page.evaluate(()=>window.KT83P2Automatic.begin());
 const download=await downloadPromise;
 assert.ok(download,'actual PDF1 must be downloaded after automatic event');
 await fs.mkdir('test-results/kt84-final',{recursive:true});
 const path='test-results/kt84-final/full-abc.pdf';
 await download.saveAs(path);
 const bytes=await fs.readFile(path);
 assert.ok(bytes.byteLength>1000);
 assert.equal(bytes.toString('utf8',0,4),'%PDF');
 const receipt=await page.evaluate(()=>{
  const x=window.KT83P2Automatic.current();
  const r=window.KT83NormativeBridge?.pdfStatus?.();
  return {ok:window.KT83P2SpatialGate.pdfReceiptMatches(x,r),bytes:r?.bytes||0,
   caseId:r?.caseId||null,status:document.getElementById('kt80PDF1Status')?.textContent||''};
 });
 assert.equal(receipt.ok,true,'the generated PDF1 receipt belongs to the same case and evidence revision');
 const legalHandoff=await page.evaluate(()=>{
  const bridge=window.KT83NormativeBridge;
  if(!bridge?.getEvidence)throw Error('Stage4 spatial evidence bridge unavailable');
  const before=bridge.getEvidence();
  // Deliberately remove a PI MASTER proof AFTER valid PDF1 completion. The
  // normative bridge must not retain a falsely ready FULL_GIS_PDF1 state.
  const pi=window.KT80PIMaster.getResult();
  const old=pi.items[0].status;
  pi.items[0].status='MISSING';
  const after=bridge.getEvidence();
  pi.items[0].status=old;
  const restored=bridge.getEvidence();
  return {before:before.scenario,after:after.scenario,restored:restored.scenario,
   beforePdf:before.pdfOK,afterPdf:after.pdfOK,restoredPdf:restored.pdfOK};
 });
 assert.equal(legalHandoff.before,'FULL_GIS_PDF1',
  'Stage4 must receive verified GIS + real PDF1');
 assert.equal(legalHandoff.after,'GIS_INCOMPLETE',
  'Stage4 must not label GIS fully verified when PI MASTER is incomplete');
 assert.equal(legalHandoff.afterPdf,false);
 assert.equal(legalHandoff.restored,'FULL_GIS_PDF1');

 assert.equal(errors.length,0,'no uncaught JS exceptions');
 console.log('KT84_FINAL_REAL_THREE_SCENARIO_GIS_PDF1',JSON.stringify({proof,receipt,legalHandoff,bytes:bytes.byteLength,errors}));
}finally{await browser.close();}
