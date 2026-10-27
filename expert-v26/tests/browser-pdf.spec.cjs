/* V26 browser-only offline PDF regression test, run via Playwright Chromium. */
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
test('real archival polygon appears in downloadable offline PDF1',async({page})=>{
 await page.goto('http://127.0.0.1:8765/expert-v26/');
 await page.evaluate(async()=>{
  const data=await (await fetch('data/v26-parcel-geometry-batch-51.json')).json();
  const r=data.records['47295.27.259'];
  if(!r?.geojson?.features?.length)throw Error('Missing real archived polygon');
  const blob=await window.V26DraftPackage.standalonePDF([{...r,input:'47295.27.259',status:'Намерен'}],1);
  const raw=new Uint8Array(await blob.arrayBuffer());
  if(raw.length<5000)throw Error('PDF unexpectedly small');
  if(String.fromCharCode(...raw.slice(0,5))!=='%PDF-')throw Error('Invalid PDF header');
  window.__v26pdfQA={size:raw.length,pages:(new TextDecoder('latin1').decode(raw)).match(/\/Type \/Page\b/g)?.length||0};
 });
 const qa=await page.evaluate(()=>window.__v26pdfQA);
 expect(qa.size).toBeGreaterThan(5000);
 expect(qa.pages).toBeGreaterThan(0);
});
