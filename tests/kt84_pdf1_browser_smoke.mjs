/* KT84-A: independent integration evidence for actual PDF1 in isolated Chromium.
   Fail closed: no mocked geometry, PI Master, zones, PDF blob or administrative claims.
*/
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 page.on('pageerror',error=>console.error('BROWSER JS:',error.message));
 const url='http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html';
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 // Follow the actual expert button: it starts GIS and PI MASTER listeners together.
 await page.evaluate(async()=>{
  await window.KT80FullGISSource.load();
  document.getElementById('kt80ParcelInput').value=['56784.13.102','36676.129.457'].join(String.fromCharCode(10));
  document.getElementById('kt80FindParcels').click();
 });
 await page.waitForFunction(()=>window.KT80FreeGIS?.getResults?.()?.length===2
   && window.KT80PIMaster?.getResult?.()?.items?.length===2,null,{timeout:60000});
 const state=await page.evaluate(()=>({found:window.KT80FreeGIS.getResults().length,
   drawn:document.querySelectorAll('#kt80GISParcels path.kt80-map-parcel').length}));
 if(state.found!==2||state.drawn!==2)throw Error('Missing two drawn real parcels before PDF1');
 await page.waitForFunction(()=>window.KT80FreeGIS?.getMap?.()?.zones?.length===32,null,{timeout:60000});
 const evidence=await page.evaluate(()=>{
  const pi=window.KT80PIMaster?.getResult?.();
  return {zones:window.KT80FreeGIS.getMap().zones.length,
    piCount:pi?.items?.length??null,
    piStatus:pi?.items?.map(x=>x.status)||[],
    pdfReady:!!window.KT80PDF1Bridge?.makePDF};
 });
 console.log('PDF1_PRECONDITIONS',JSON.stringify(evidence));
 if(!evidence.pdfReady)throw Error('PDF1 bridge missing');
 const pending=page.waitForEvent('download',{timeout:30000}).catch(()=>null);
 await page.evaluate(()=>window.KT80PDF1Bridge.makePDF());
 const status=await page.locator('#kt80PDF1Status').textContent().catch(()=>'(status unavailable)');
 if(!status?.includes('Готово!'))throw Error('Real PDF1 generator rejected input: '+status);
 const download=await pending;
 if(!download)throw Error('PDF1 signaled success but no actual browser download occurred');
 await fs.mkdir('test-results/kt84-pdf1',{recursive:true});
 const output='test-results/kt84-pdf1/'+download.suggestedFilename();
 await download.saveAs(output);
 const fd=await fs.open(output,'r'),buf=Buffer.alloc(4);await fd.read(buf,0,4,0);await fd.close();
 const stats=await fs.stat(output);
 if(buf.toString()!=='%PDF'||stats.size<1000)throw Error('Invalid generated PDF1');
 console.log('PDF1_SUCCESS',JSON.stringify({filename:download.suggestedFilename(),bytes:stats.size,header:buf.toString(),...evidence}));
}finally{await browser.close();}
