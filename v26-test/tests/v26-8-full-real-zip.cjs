'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {JSDOM}=require('jsdom'),fflate=require('fflate'),JSZip=require('jszip'),PdfPrinter=require('pdfmake'),pdfParse=require('pdf-parse');
const font='/usr/share/fonts/truetype/dejavu/';
const printer=new PdfPrinter({Roboto:{normal:font+'DejaVuSans.ttf',bold:font+'DejaVuSans-Bold.ttf',italics:font+'DejaVuSans-Oblique.ttf',bolditalics:font+'DejaVuSans-BoldOblique.ttf'}});
async function pdf(def){return new Promise((resolve,reject)=>{const d=printer.createPdfKitDocument(def),parts=[];d.on('data',p=>parts.push(p));d.on('error',reject);d.on('end',()=>resolve(new Blob([Buffer.concat(parts)],{type:'application/pdf'})));d.end()})}
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/v26-test/'});
const w=dom.window;w.fflate=fflate;
w.fetch=async p=>{const filename=path.join('v26-test',p);if(!fs.existsSync(filename))return {ok:false};const b=fs.readFileSync(filename);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
w.V26OfflinePDF={generate:pdf};
const context=vm.createContext({window:w,document:w.document,DOMParser:w.DOMParser,XMLSerializer:w.XMLSerializer,TextDecoder,TextEncoder,Blob,Uint8Array,Uint32Array,ArrayBuffer,fetch:w.fetch,console});
for(const name of ['v26-expert-draft.js','v26-template-word.js','v26-expert-word.js','v26-draft-package.js'])vm.runInContext(fs.readFileSync('v26-test/'+name,'utf8'),context,{filename:name});
const id='36676.129.457',geojson={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]},properties:{}}]};
const metadata={recipient:'Тестов адресат',address:'Тестов адрес',subject:'Тестово инвестиционно предложение',incomingReference:'вх. № 123',salutation:'Уважаеми госпожи и господа,',settlement:'с. Марково',landArea:'землище Марково',legalParagraphs:Array(7).fill('Експертно потвърден тестов текст.'),procedureFinding:'Тестова процедура.',impactFindings:Array(5).fill('Тестово въздействие.')};
const names=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'];
async function run(scenario,annex2){
 const parcel={input:id,cadnum:id,status:'Намерен',geojson,area_m2_source:450,...(scenario==='Б'?{verified_zone_intersections:['BG0002057']}:{intersection_verified_outside:true})};
 const register={includeAnnex2:annex2,unifiedContext:{commonEvidence:{findings:[],warnings:[]}},verifiedCaseMetadata:metadata,verifiedCharacterizationParagraphs:['С реализацията на инвестиционното предложение','Електроснабдяването е описано','Водоснабдяването е описано','Отпадъчните води са описани'],records:[{id:'Z1',title:'Тестова заповед BG0002057',zone_code:'BG0002057',source:'https://example.org/zone'}]};
 const blob=await w.V26DraftPackage.make([parcel],{[id]:'leading'},register);
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const expected=annex2?names:names.filter(n=>!n.startsWith('04_'));
 assert.deepEqual(Object.keys(zip.files).sort(),expected.slice().sort(),'ZIP contents');
 for(const name of expected){
  const bytes=await zip.file(name).async('nodebuffer');
  if(name.endsWith('.docx')){
   assert.equal(bytes.subarray(0,2).toString(),'PK');
   const doc=await JSZip.loadAsync(bytes),xml=await doc.file('word/document.xml').async('string');
   assert(xml.includes(id),'DOCX parcel missing: '+name);
   assert(xml.includes('Тестов адресат'),'DOCX recipient missing: '+name);
   assert(doc.file('word/styles.xml'),'Original template styles missing');
  }else if(name.endsWith('.pdf')){
   assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
   const parsed=await pdfParse(bytes);
   assert(parsed.numpages>=1);
   assert(parsed.text.includes(id),'PDF parcel missing: '+name);
  }else assert(bytes.toString('utf8').includes('РАБОТЕН ПАКЕТ'));
 }
 console.log('PASS full real ZIP scenario '+scenario+', PDF2 '+annex2+': '+expected.length+' files');
}
(async()=>{await run('А',false);await run('Б',true)})().catch(e=>{console.error(e);process.exitCode=1});
