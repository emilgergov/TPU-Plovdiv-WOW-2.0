/* Real PDF rendering test: run from repository root with npm packages pdfmake, jszip, pdf-parse. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),JSZip=require('jszip');
const PdfPrinter=require('pdfmake');
const path=require('node:path');
const fontPath='/usr/share/fonts/truetype/dejavu';
const fonts={Roboto:{normal:path.join(fontPath,'DejaVuSans.ttf'),bold:path.join(fontPath,'DejaVuSans-Bold.ttf'),italics:path.join(fontPath,'DejaVuSans-Oblique.ttf'),bolditalics:path.join(fontPath,'DejaVuSans-BoldOblique.ttf')}};
const printer=new PdfPrinter(fonts);
function render(def){return new Promise((resolve,reject)=>{const pdf=printer.createPdfKitDocument(def);const parts=[];pdf.on('data',p=>parts.push(p));pdf.on('error',reject);pdf.on('end',()=>resolve(new Blob([Buffer.concat(parts)],{type:'application/pdf'})));pdf.end()})}
const sandbox={Blob,JSZip,window:{JSZip,pdfMake:{createPdf(def){return {getBlob(cb){render(def).then(cb).catch(e=>{console.error(e);process.exitCode=1})}}}}},document:{createElement(){throw Error('Unexpected CDN fetch')}}};
vm.runInNewContext(fs.readFileSync('expert-v26/v26-draft-package.js','utf8'),sandbox);
const poly={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]},properties:{}}]};
(async()=>{
 const parcel=[{input:'47295.27.259',cadnum:'47295.27.259',status:'Намерен',geojson:poly,area_m2_geometry:679.581}];
 const blob=await sandbox.window.V26DraftPackage.make(parcel,{'47295.27.259':'leading'},{records:[{id:'TEST',title:'Непроверен запис',verified:false}]});
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const names=['01_Predlozhenie_RABOTEN_PROEKT.docx','02_Prilozhenie_1_GIS.pdf','03_Prilozhenie_2_Normativno.pdf'];
 for(const name of names)assert(zip.file(name),'Missing '+name);
 for(const name of names.slice(1)){
  const b=await zip.file(name).async('nodebuffer');
  assert.equal(b.subarray(0,5).toString(),'%PDF-','PDF signature '+name);
  assert(b.length>1000,'PDF too small '+name);
 }
 const doc=await JSZip.loadAsync(await zip.file(names[0]).async('nodebuffer'));
 assert((await doc.file('word/document.xml').async('string')).includes('ПРЕДСТОИ'));
 console.log('PASS: two real PDF byte streams and one DOCX inside ZIP');
})().catch(e=>{console.error(e);process.exitCode=1});
