'use strict';
/* KT40 — real browser V27 ZIP integration QA, executed on GitHub Actions.
 * Two separate DOCXs + two real PDFs + README; both deterministic GIS
 * scenarios, with synthetic non-personal data only. Never claims
 * example parcel positions reflect cadastral reality.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const crypto=require('node:crypto'),path=require('node:path');
const {JSDOM}=require('jsdom'),fflate=require('fflate'),JSZip=require('jszip'),PdfPrinter=require('pdfmake'),pdfParse=require('pdf-parse');
const OUT='out/v27-kt40';
fs.mkdirSync(OUT,{recursive:true});
const font='/usr/share/fonts/truetype/dejavu/';
const printer=new PdfPrinter({Roboto:{normal:font+'DejaVuSans.ttf',bold:font+'DejaVuSans-Bold.ttf',italics:font+'DejaVuSans-Oblique.ttf',bolditalics:font+'DejaVuSans-BoldOblique.ttf'}});
async function generatePDF(def){
 return new Promise((resolve,reject)=>{
  const doc=printer.createPdfKitDocument(def),parts=[];
  doc.on('data',b=>parts.push(b));doc.on('error',reject);
  doc.on('end',()=>resolve(new Blob([Buffer.concat(parts)],{type:'application/pdf'})));
  doc.end();
 });
}
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/v26-test/'});
const win=dom.window;
win.fflate=fflate;
win.V26OfflinePDF={generate:generatePDF};
win.fetch=async p=>{
 const pathname=String(p);
 if(!/^templates\/V26_3_Obrazec_[AB]\.docx$/.test(pathname))throw Error('Unexpected template path '+pathname);
 const full=path.join('v26-test',pathname),buffer=fs.readFileSync(full);
 return {ok:true,arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)};
};
const ctx=vm.createContext({window:win,document:win.document,
 DOMParser:win.DOMParser,XMLSerializer:win.XMLSerializer,
 TextEncoder,TextDecoder,Blob,Uint8Array,Uint32Array,ArrayBuffer,URL,console,
 fetch:win.fetch,crypto:crypto.webcrypto});
for(const file of [
 'v26-test/v26-expert-draft.js',
 'v26-test/v26-template-word.js',
 'v26-test/v27-preview/v27-approved-classic-word-ab.js',
 'v26-test/v27-preview/v26-expert-word.js',
 'v26-test/v27-preview/v27-approved-expert-word-r02.js',
 'v26-test/v27-preview/v26-draft-package.js'
]){
 const src=fs.readFileSync(file,'utf8');
 new vm.Script(src,{filename:file});
 vm.runInContext(src,ctx,{filename:file});
}
const html=fs.readFileSync('v26-test/v27-preview/index.html','utf8');
const classicA='v27-approved-classic-word-ab.js',expertR02='v27-approved-expert-word-r02.js';
for(const file of [classicA,expertR02]){
 assert(html.includes('src="v27-preview/'+file+'?'),'Preview HTML does not load '+file);
}
assert(html.indexOf(classicA)>html.indexOf('v26-template-word.js') &&
 html.indexOf(expertR02)>html.indexOf('v26-expert-word.js'), 'New browser adapters must be loaded after originals');
assert.equal(win.V26ExpertWord.layout,'V27_EXPERT_R02_APPROVED');
assert.equal(win.V26TemplateWord.layout,'KT35_A_KT39_B_APPROVED');
const source='[[CHARACTERIZATION]]\nПри разглеждане на заявената складова дейност са отчетени функционалното предназначение и транспортното обслужване.\n'+
 '[[LEGAL]]\nНормативните основания са съпоставени със заявения предмет, като непотвърдените документи остават за проверка.\n'+
 '[[PROCEDURE]]\nВ рамките на описания предмет е извършена преценка на приложимите нормативни процедури при наличните доказателства.\n'+
 '[[IMPACTS]]\nОтчетени са възможните преки, косвени и кумулативни въздействия, без да се извеждат заключения единствено от GIS резултата.';
const mapPngBytes=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64'));
const id='99999.999.9999',geojson={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[24.0,42.0],[24.001,42],[24.001,42.001],[24,42.001],[24,42.0]]]},properties:{}}]};
const metadata={recipient:'ТЕСТОВ ВЪЗЛОЖИТЕЛ — СИНТЕТИЧЕН',address:'ТЕСТОВ АДРЕС — СИНТЕТИЧЕН',
 subject:'Синтетично ИП за учебна проверка на Word А/Б',
 incomingReference:'Вх. № ОВОС-ТЕСТ / 01.11.2026 г.',
 salutation:'УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА,',location:'тестово землище',
 legalParagraphs:Array(7).fill('[ЗА ЕКСПЕРТНА ПРОВЕРКА — нормативна приложимост]'),
 procedureFinding:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — административен извод]',
 impactFindings:Array(5).fill('[ЗА ЕКСПЕРТНА ПРОВЕРКА — въздействие]'),
 legalFindingSources:[],procedureFindingSources:[]};
const legal=[{id:'P_OS_02',title:'Наредба за оценка за съвместимост — чл. 2, ал. 1, т. 1–3',
 source:'https://www.moew.government.bg/',verified:true,verified_scope:'официален текст на чл. 2',
 article:'чл. 2, ал. 1, т. 1–3',page:'стр. 1',project_revision_accepted:true,revision_verified:false},
 {id:'P_ZBR_31',title:'Закон за биологичното разнообразие — чл. 31, ал. 1',
 source:'https://www.moew.government.bg/',verified:true,verified_scope:'официален текст на чл. 31',
 article:'чл. 31, ал. 1',page:'стр. 8',project_revision_accepted:true,revision_verified:false}];
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="700" height="450"><rect width="700" height="450" fill="white"/></svg>';
async function run(label,intersection){
 const result={input:id,cadnum:id,status:'Намерен',geojson,location:'тестово землище',
  area_m2_source:550, ...(intersection?{verified_zone_intersections:['BG0000194'],overlap_geojson:geojson}:{intersection_verified_outside:true})};
 const register={mapSvg:svg,mapPngBytes,
  includeAnnex2:true,v27Package:true,v27AiDraft:source,
  verifiedCaseMetadata:metadata,verifiedCharacterizationParagraphs:[
   'С реализацията на инвестиционното предложение се предвижда синтетичен складов обект.',
   'Електроснабдяването се предвижда от мрежата.',
   'Водоснабдяването се предвижда от водопровод.',
   'Отпадъчните води ще се отвеждат във водоплътна яма.'
  ],
  records:legal,unifiedContext:{commonEvidence:{findings:[],warnings:[]}}
 };
 const zipped=await win.V26DraftPackage.make([result],{[id]:'leading'},register);
 assert(zipped.size>10000,'Complete ZIP unexpectedly small');
 const zip=await JSZip.loadAsync(await zipped.arrayBuffer());
 const files=Object.keys(zip.files).sort(),expected=[
  '01_Proekt_na_stanovishte_Klasicheski.docx',
  '02_Proekt_na_stanovishte_Eksperten.docx',
  '03_GIS_analiz.pdf',
  '04_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'].sort();
 assert.deepEqual(files,expected,'Incorrect ZIP document composition');
 const docs={};
 for(const name of expected){
  const buffer=await zip.file(name).async('nodebuffer');
  if(name.endsWith('.docx')){
   assert.equal(buffer.subarray(0,2).toString(),'PK');
   const d=await JSZip.loadAsync(buffer);
   for(const part of ['word/document.xml','word/styles.xml','word/_rels/document.xml.rels'])
    assert(d.file(part),name+' missing '+part);
   const content=await d.file('word/document.xml').async('string');
   const x=new win.DOMParser().parseFromString(content,'application/xml');
   assert.equal(x.getElementsByTagName('parsererror').length,0);
   const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
   const paras=[...x.getElementsByTagNameNS(ns,'p')].map(p=>[...p.getElementsByTagNameNS(ns,'t')].map(z=>z.textContent).join(''));
   const joined=paras.join('\n');
   assert(joined.includes(id),name+' missing confirmed parcel');
   assert(joined.includes('Синтетично ИП'),name+' missing confirmed subject');
   assert(!joined.includes('Асеновград')&&!joined.includes('ПАНЧЕВА')&&!joined.includes('„Родопи-Средни“'),
    name+' includes stale example');
   assert(!joined.includes('не е необходимо провеждане на процедура'),
    'Unverified administrative final finding leaked into '+name);
   const body=x.getElementsByTagNameNS(ns,'body')[0];
   const visible=[...body.getElementsByTagNameNS(ns,'p')].filter(p=>[...p.getElementsByTagNameNS(ns,'t')].some(t=>t.textContent.trim()));
   for(const p of visible){
    const prs=p.getElementsByTagNameNS(ns,'pPr');
    assert(prs.length>0,'Missing text paragraph format');
    const line=prs[0].getElementsByTagNameNS(ns,'spacing')[0];
    assert(line&&line.getAttributeNS(ns,'line')==='240','Required 1.0 line spacing');
    for(const r of p.getElementsByTagNameNS(ns,'r')){
     if(![...r.getElementsByTagNameNS(ns,'t')].some(x=>x.textContent))continue;
     const f=r.getElementsByTagNameNS(ns,'rFonts')[0];
     assert(f&&f.getAttributeNS(ns,'ascii')==='Verdana','Required Verdana font');
    }
   }
   if(name.includes('Eksperten')){
    assert(d.file('word/media/v27-gis-overview.png'),'Missing original GIS map PNG');
    assert(content.includes('rIdV27GISMap'),'GIS map is not referenced');
    assert(!joined.includes('УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА'),'Rejected salutation remains');
    assert(joined.includes('ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ'));
    assert(joined.includes('по чл. 2, ал. 2 от Наредбата за ОС'));
    for(const head of ['1. ПРЕДМЕТ','2. ПРОСТРАНСТВЕНО','3. ПРЕЦЕНКА','4. ПРЕЦЕНКА'])
     assert(joined.includes(head),'Missing approved heading '+head);
    assert(joined.includes('чл. 31, ал. 1'),'Normative archive ZBR reference missing');
    assert(joined.includes('чл. 2, ал. 1'),'Normative archive OS reference missing');
    assert(joined.includes('При преценката са отчетени'),'Competent authority voice missing');
    assert(joined.includes('възможните преки, косвени и кумулативни въздействия'),
     'AI-authored, safety-reviewed impact narrative missing');
    if(intersection)assert(joined.includes('BG0000194')&&!joined.includes('не попадат в границите'));
    else assert(joined.includes('не попадат в границите')&&!joined.includes('BG0000194'));
    const map=body.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','inline');
    assert(map.length>=1,'No map drawing object');
    docs.expert=joined;
   } else {
    if(intersection)assert(joined.includes('BG0000194')&&!joined.includes('не попадат в границите'));
    else assert(joined.includes('не попадат в границите')&&!joined.includes('BG0000194'));
    docs.classic=joined;
   }
   fs.writeFileSync(path.join(OUT,label+'-'+name),buffer);
  }else if(name.endsWith('.pdf')){
   assert.equal(buffer.subarray(0,5).toString(),'%PDF-');
   const parsed=await pdfParse(buffer);
   assert(parsed.numpages>0&&parsed.text.includes(id),'PDF content not case-specific: '+name);
   fs.writeFileSync(path.join(OUT,label+'-'+name),buffer);
  }else assert(buffer.toString('utf8').includes('РАБОТЕН ПАКЕТ'));
 }
 fs.writeFileSync(path.join(OUT,label+'-V27-5-files.zip'),Buffer.from(await zipped.arrayBuffer()));
 console.log('KT40 complete V27 ZIP '+label+': PASS 5/5 files; GIS/Word/PDF same parcel; no stale facts; no invented conclusion.');
}
(async()=>{await run('A-outside',false);await run('B-intersection',true);
 console.log('V27 KT40 browser integration: PASS A and B, full PDF1/PDF2/Classic/Expert/README.');
})().catch(e=>{console.error(e);process.exitCode=1});
