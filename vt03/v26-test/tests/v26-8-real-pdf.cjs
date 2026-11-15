'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const PdfPrinter=require('pdfmake'),pdfParse=require('pdf-parse'),path=require('node:path');
const font='/usr/share/fonts/truetype/dejavu/';
const printer=new PdfPrinter({Roboto:{normal:font+'DejaVuSans.ttf',bold:font+'DejaVuSans-Bold.ttf',italics:font+'DejaVuSans-Oblique.ttf',bolditalics:font+'DejaVuSans-BoldOblique.ttf'}});
const source=fs.readFileSync('v26-test/v26-draft-package.js','utf8');
const injected=source.replace('window.V26DraftPackage=Object.freeze({make,standalonePDF});','window.__renderQA={gisPdf,normativePdf};window.V26DraftPackage=Object.freeze({make,standalonePDF});');
assert.notEqual(source,injected);
const ctx={window:{}};vm.runInNewContext(injected,ctx);
async function render(def){return new Promise((resolve,reject)=>{const doc=printer.createPdfKitDocument(def),parts=[];doc.on('data',p=>parts.push(p));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(parts)));doc.end()})}
(async()=>{
 const id='36676.129.457',geojson={features:[{geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]}}]};
 const parcel={input:id,cadnum:id,status:'Намерен',geojson,area_m2_source:450,verified_zone_intersections:['BG0002057']};
 const meta={verifiedCaseMetadata:{settlement:'с. Марково',landArea:'землище Марково'},records:[]};
 for(const [name,def] of [['PDF1',ctx.window.__renderQA.gisPdf([parcel],meta)],['PDF2',ctx.window.__renderQA.normativePdf([parcel],meta)]]){
  const bytes=await render(def);
  assert(bytes.length>1000,name+' too small');
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-',name+' header');
  const parsed=await pdfParse(bytes);
  assert(parsed.numpages>=1,name+' no pages');
  assert(parsed.text.includes(id),name+' missing parcel ID');
  assert(parsed.text.includes('Марково'),name+' missing settlement');
  console.log('PASS '+name+': '+parsed.numpages+' page(s), '+bytes.length+' bytes, readable Cyrillic and parcel metadata');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
