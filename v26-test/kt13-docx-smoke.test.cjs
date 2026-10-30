/* KT13 actual DOCX smoke test against the committed original institutional templates.
   Runs in GitHub Actions; fails closed on missing logos, signatures, or XML. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),fflate=require('fflate');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/v26-test/'});
const w=dom.window;
w.fflate=fflate;
w.fetch=async path=>{
 const full='v26-test/'+path;
 if(!fs.existsSync(full))return {ok:false};
 const bytes=fs.readFileSync(full);
 return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
const context=vm.createContext({window:w,document:w.document,DOMParser:w.DOMParser,XMLSerializer:w.XMLSerializer,TextDecoder,TextEncoder,Blob,fetch:w.fetch,console});
for(const name of ['v26-expert-draft.js','v26-template-word.js','v26-expert-word.js'])
 vm.runInContext(fs.readFileSync('v26-test/'+name,'utf8'),context,{filename:name});
function paragraphTexts(xml){
 const doc=new w.DOMParser().parseFromString(xml,'application/xml');
 assert.equal(doc.getElementsByTagName('parsererror').length,0,'Generated Word XML is valid');
 return [...doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','t')].map(x=>x.textContent);
}
async function run(scenario){
 const paths=w.V26TemplateWord.templatePaths;
 const bytes=fs.readFileSync('v26-test/'+paths[scenario==='А'?'A':'B']);
 const sourceZip=fflate.unzipSync(bytes);
 const original=paragraphTexts(new TextDecoder().decode(sourceZip['word/document.xml']));
 const originalDoc=new w.DOMParser().parseFromString(new TextDecoder().decode(sourceZip['word/document.xml']),'application/xml');
 const body=originalDoc.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','body')[0];
 const signature=[...body.children].filter(p=>p.localName==='p'&&/електронен\s+подпис|електронно\s+подпис|подписал|подпис\s*:/i.test([...p.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','t')].map(t=>t.textContent).join('')));
 // Source templates need not contain literal signature labels: slots are generated explicitly.
 const paragraphs=scenario==='А'?['С реализацията на инвестиционното предложение','Електроснабдяването е описано','Водоснабдяването е описано','Отпадъчните води са описани']:['С реализацията на инвестиционното предложение','Електроснабдяването е описано','Водозахранването е описано','Отпадъчните води са описани'];
 const metadata={recipient:'Тестов адресат',address:'Тестов адрес',subject:'Тестово инвестиционно предложение',incomingReference:'вх. № 123',salutation:'Уважаеми госпожи и господа,',parcelIds:'36676.129.457',legalParagraphs:Array(7).fill('Експертно потвърден правен текст за теста.'),procedureFinding:'Експертно потвърдена процедура.',impactFindings:Array(5).fill('Експертно потвърдено въздействие.')};
 const draft=w.V26ExpertDraft.build({results:[{input:'36676.129.457'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{}});
 const mapPng=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aN0AAAAASUVORK5CYII=','base64'));
 const blob=await w.V26ExpertWord.make(draft,mapPng);
 const out=fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const xml=new TextDecoder().decode(out['word/document.xml']);
 const texts=paragraphTexts(xml).join(' ');
 const expertPs=[...new w.DOMParser().parseFromString(xml,'application/xml').getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')].map(p=>p.textContent);
 assert(expertPs[0].includes('Място за електронен подпис — вътрешно съгласуване'),'Expert: opening blank signature slot missing');
 assert(expertPs[expertPs.length-1].includes('Място за електронен подпис — окончателно подписване'),'Expert: closing blank signature slot missing');
 for(const value of [metadata.recipient,metadata.subject,'36676.129.457','Приложение №1 — ГИС анализ'])assert(texts.includes(value),'Missing expert content: '+value);
 assert(out['word/media/v26-gis-overview.png'],'Expert GIS image missing');
 assert(xml.includes('rIdV26Map'),'Expert GIS image reference missing');
 for(const key of Object.keys(sourceZip).filter(x=>!['word/document.xml','word/_rels/document.xml.rels','[Content_Types].xml'].includes(x)))assert.deepEqual(out[key],sourceZip[key],'Institutional DOCX part changed: '+key);
 // The classic renderer is tested against the same draft; do not allow silent
 // divergence between expert and template-based outputs.
 const classic=await w.V26TemplateWord.make(draft.scenario,draft.characterization,draft.metadata);
 const classicZip=fflate.unzipSync(new Uint8Array(await classic.arrayBuffer()));
 const classicText=paragraphTexts(new TextDecoder().decode(classicZip['word/document.xml'])).join(' ');
 const classicPs=[...new w.DOMParser().parseFromString(new TextDecoder().decode(classicZip['word/document.xml']),'application/xml').getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')].map(p=>p.textContent);
 assert(classicPs[0].includes('Място за електронен подпис — вътрешно съгласуване'),'Classic: opening blank signature slot missing');
 assert(classicPs[classicPs.length-1].includes('Място за електронен подпис — окончателно подписване'),'Classic: closing blank signature slot missing');
 for(const value of [metadata.recipient,metadata.subject,'36676.129.457'])assert(classicText.includes(value),'Classic Word missing: '+value);
 console.log('Expert + classic DOCX scenario '+scenario+': PASS');
}
(async()=>{await run('А');await run('Б')})().catch(e=>{console.error(e);process.exitCode=1});
