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
 const aiDraft=['[[CHARACTERIZATION]]','Конкретна характеристика на тестов склад и офиси.','[[LEGAL]]','Конкретна правна преценка по тестовите материали.','[[PROCEDURE]]','Конкретна процедурна преценка по тестовите материали.','[[IMPACTS]]','Конкретни въздействия на тестовия склад.'].join('\n');
 const enriched=w.V26ExpertDraft.build({results:[{input:'36676.129.457',location:'гр. Пловдив, община Пловдив, област Пловдив'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{},aiDraft});
 const mapPngBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64');
 const blob=await w.V26ExpertWord.make(enriched,{mapPngBytes:new Uint8Array(mapPngBytes)});

 const out=fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 assert(out['word/media/v27-gis-overview.png'],`Actual embedded GIS PNG missing; DOCX media: ${Object.keys(out).filter(k=>k.includes('media/')).join(', ')}`);
 assert.deepEqual(Buffer.from(out['word/media/v27-gis-overview.png']),mapPngBytes,'GIS PNG bytes changed');
 const rels=new TextDecoder().decode(out['word/_rels/document.xml.rels']);
 assert(rels.includes('rIdV27GISMap')&&rels.includes('media/v27-gis-overview.png'),'DOCX GIS image relationship missing');
 const contentTypes=new TextDecoder().decode(out['[Content_Types].xml']);
 assert(contentTypes.includes('image/png'),'DOCX PNG content type missing');
 const xml=new TextDecoder().decode(out['word/document.xml']);
 const texts=paragraphTexts(xml).join(' ');
 for(const phrase of ['Конкретна характеристика на тестов склад и офиси.','Конкретна правна преценка по тестовите материали.','Конкретна процедурна преценка по тестовите материали.','Конкретни въздействия','гр. Пловдив, община Пловдив'])assert(texts.includes(phrase),'AI section or parcel location not integrated: '+phrase);
 assert(texts.includes('Конкретна характеристика на тестов склад и офиси.'),'Validated AI characterization must be included in expert Word');
 assert(!/намалява риска|по-нисък риск|липса на значими въздействия/i.test(texts),'Unsupported GIS-to-impact inference leaked into Word');
 assert(texts.includes('Конкретна процедурна преценка'),'Safeguarded AI procedural assessment must be included in expert Word');
 assert(texts.includes('Конкретна правна преценка'),'Validated AI legal reasoning must be included in expert Word');
 assert(texts.includes('VII. ЗАКЛЮЧЕНИЕ И УКАЗАНИЯ')&&texts.includes('VIII. СЪПЪТСТВАЩИ ДОКУМЕНТИ'),'Expert Word must include a separate conclusion section');
 assert(texts.includes('Пространственият резултат от ГИС анализа сам по себе си не установява приложимата процедура'),'Conclusion must not infer a legal determination from GIS alone');
 assert(!texts.includes('[[CHARACTERIZATION]]'),'AI section markers leaked into Word');
 assert(!texts.includes('Експертно потвърден правен текст за теста.'),'Generic legal boilerplate duplicated AI text');
 const expertPs=[...new w.DOMParser().parseFromString(xml,'application/xml').getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')].map(p=>p.textContent);
 // KT24.3: expert signature spaces are blank and carry no visible labels.
 assert.equal(expertPs[0].trim(),'','Expert: opening signature space must be blank');
 assert.equal(expertPs[expertPs.length-1].trim(),'','Expert: closing signature space must be blank');
 assert(!/Място за електронен подпис|РАБОТЕН ЕКСПЕРТЕН ПРОЕКТ — НЕ Е АДМИНИСТРАТИВЕН АКТ/.test(texts),'Expert: visible workflow labels leaked into document');
 for(const value of [metadata.recipient,metadata.subject,'36676.129.457','Картографското извлечение от ГИС анализа'])assert(texts.includes(value),'Missing expert content: '+value);
 for(const key of Object.keys(sourceZip).filter(x=>!['word/document.xml','word/_rels/document.xml.rels','[Content_Types].xml'].includes(x)))assert.deepEqual(out[key],sourceZip[key],'Institutional DOCX part changed: '+key);
 // The classic renderer is tested against the same draft; do not allow silent
 // divergence between expert and template-based outputs.
 const classic=await w.V26TemplateWord.make(draft.scenario,draft.characterization,draft.metadata);
 const classicZip=fflate.unzipSync(new Uint8Array(await classic.arrayBuffer()));
 const classicText=paragraphTexts(new TextDecoder().decode(classicZip['word/document.xml'])).join(' ');
 const classicPs=[...new w.DOMParser().parseFromString(new TextDecoder().decode(classicZip['word/document.xml']),'application/xml').getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')].map(p=>p.textContent);
 // KT24.3: both classic signature slots are deliberately blank, with no visible labels.
 assert.equal(classicPs[0].trim(),'','Classic: opening signature space must be blank');
 assert.equal(classicPs[classicPs.length-1].trim(),'','Classic: closing signature space must be blank');
 assert(!/Място за електронен подпис|РАБОТЕН ПРОЕКТ — ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(classicText),'Classic: visible workflow labels leaked into document');
 for(const value of [metadata.recipient,metadata.subject,'36676.129.457'])assert(classicText.includes(value),'Classic Word missing: '+value);
 console.log('Expert + classic DOCX scenario '+scenario+': PASS');
}
(async()=>{await run('А');await run('Б')})().catch(e=>{console.error(e);process.exitCode=1});
