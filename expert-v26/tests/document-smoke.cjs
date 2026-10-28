/* V26 document contract smoke: original A/B template routing, optional PDF2, role and GIS guards. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),JSZip=require('jszip');
const source=fs.readFileSync('expert-v26/v26-draft-package.js','utf8');
const docs=[],calls=[];
const BrowserJSZip=class extends JSZip{file(name,data,options){if(data instanceof Blob)return super.file(name,data.arrayBuffer().then(b=>new Uint8Array(b)),options);return super.file(name,data,options)}};
const docx=async()=>{const z=new JSZip();z.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>TEST</w:t></w:r></w:p></w:body></w:document>');return new Blob([await z.generateAsync({type:'nodebuffer'})])};
const context={JSZip:BrowserJSZip,Blob,TextDecoder,URL,document:{createElement(){throw Error('Unexpected CDN request')}},window:{JSZip:BrowserJSZip,V26TemplateWord:{async make(scenario,paragraphs,metadata){calls.push({scenario,paragraphs,metadata});return docx()}},pdfMake:{vfs:{'Roboto-Regular.ttf':'mock'},createPdf(def){docs.push(def);return {getBlob(cb){cb(new Blob(['%PDF-1.4\n'+('x'.repeat(200))],{type:'application/pdf'}))}}}}}};
vm.runInNewContext(source,context,{filename:'v26-draft-package.js'});
const geometry={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]},properties:{}}]};
const id='47295.27.259',base={input:id,cadnum:id,status:'Намерен',geojson:geometry,area_m2_geometry:679.581};
const paragraphs=['строителство','ток','вода','отпадъчни води'];
const metadata={subject:'Тестов предмет',legalParagraphs:['Правна констатация']};
(async()=>{
 const cases=[
  {scenario:'А',parcel:{...base,intersection_verified_outside:true,verified_zone_intersections:[]}},
  {scenario:'Б',parcel:{...base,verified_zone_intersections:['BG0002057']}}
 ];
 for(const c of cases){
  for(const includeAnnex2 of [false,true]){
   const before=docs.length;
   const blob=await context.window.V26DraftPackage.make([c.parcel],{[id]:'leading'},{records:[{id:'N1',title:'Тестов запис',verified:false}],verifiedCharacterizationParagraphs:paragraphs,verifiedCaseMetadata:metadata,includeAnnex2});
   const zip=await JSZip.loadAsync(await blob.arrayBuffer());
   assert(zip.file('01_Predlozhenie_RABOTEN_PROEKT.docx'));
   assert(zip.file('02_Prilozhenie_1_GIS.pdf'));
   assert.equal(Boolean(zip.file('03_Prilozhenie_2_Normativno.pdf')),includeAnnex2);
   assert.equal(calls.at(-1).scenario,c.scenario);
   assert.equal(calls.at(-1).metadata,metadata);
   assert.equal(calls.at(-1).paragraphs,paragraphs);
   assert.equal(docs.length-before,includeAnnex2?2:1);
  }
 }
 await assert.rejects(()=>context.window.V26DraftPackage.make([cases[0].parcel],{},{}),/роли/);
 await assert.rejects(()=>context.window.V26DraftPackage.make([{...base,verified_zone_intersections:[],intersection_verified_outside:false}],{[id]:'leading'},{verifiedCharacterizationParagraphs:paragraphs,verifiedCaseMetadata:metadata}),/Не е доказано/);
 console.log('PASS: A/B Word routing, shared metadata, mandatory PDF1, optional PDF2, role and GIS guards (mock PDF and DOCX).');
})().catch(e=>{console.error(e);process.exitCode=1});
