/* Run: npm install --no-save jszip && node expert-v26/tests/document-smoke.cjs */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),JSZip=require('jszip');
const source=fs.readFileSync('expert-v26/v26-draft-package.js','utf8');
const docs=[];
const context={JSZip,Blob,URL,document:{createElement(){throw Error('Unexpected CDN request')}},window:{JSZip,pdfMake:{createPdf(def){docs.push(def);return {getBlob(cb){cb(new Blob(['%PDF-1.4\\n'+('x'.repeat(200))],{type:'application/pdf'}))}}}}}};
vm.runInNewContext(source,context,{filename:'v26-draft-package.js'});
const geometry={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]},properties:{}}]};
(async()=>{
 const result=[{input:'47295.27.259',cadnum:'47295.27.259',status:'Намерен',geojson:geometry,area_m2_geometry:679.581}];
 const roles={'47295.27.259':'leading'};
 const blob=await context.window.V26DraftPackage.make(result,roles,{records:[{id:'N1',title:'Тестов запис',verified:false}]});
 const zip=await JSZip.loadAsync(blob);
 const names=Object.keys(zip.files);
 for(const name of ['01_Predlozhenie_RABOTEN_PROEKT.docx','02_Prilozhenie_1_GIS.pdf','03_Prilozhenie_2_Normativno.pdf','README_BG.txt'])assert(names.includes(name),'Missing '+name);
 const docx=await JSZip.loadAsync(await zip.file('01_Predlozhenie_RABOTEN_PROEKT.docx').async('nodebuffer'));
 const xml=await docx.file('word/document.xml').async('string');
 assert(xml.includes('47295.27.259')&&xml.includes('ПРЕДСТОИ'));
 assert.equal(docs.length,2);
 assert(docs[0].content.some(x=>x.svg?.includes('<svg')));
 assert(docs[1].content.some(x=>x.text?.includes('ПРЕДСТОИ')));
 await assert.rejects(()=>context.window.V26DraftPackage.make(result,{},null),/роли/);
 console.log('PASS: ZIP entries, DOCX content, GIS SVG, PDF document definitions, role guard.');
 console.log('NOTE: PDF bytes are mocked; this does not validate actual pdfMake rendering.');
})().catch(e=>{console.error(e);process.exitCode=1});
