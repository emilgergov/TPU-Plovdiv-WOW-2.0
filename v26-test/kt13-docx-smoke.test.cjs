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
// Package 3: PDF document-definition contract for both GIS and normative PDFs.
const packageDefinitions=fs.readFileSync('v26-test/v26-draft-package.js','utf8');
assert(packageDefinitions.includes('function gisPdf(results,options={})'),'PDF1 GIS builder missing');
assert(packageDefinitions.includes('function normativePdf(results,register)'),'PDF2 normative builder missing');
assert(packageDefinitions.includes('pdfBlob(gisPdf(results,register))'),'ZIP does not generate PDF1 from GIS data');
assert(packageDefinitions.includes('pdfBlob(normativePdf(results,register))'),'ZIP does not generate PDF2 from normative data');
assert(packageDefinitions.includes("await pdf1.slice(0,4).text()!=='%PDF'"),'PDF1 signature validation missing');
assert(packageDefinitions.includes("await pdf2.slice(0,4).text()!=='%PDF'"),'PDF2 signature validation missing');
// Package 3: static package-manifest contract, including optional PDF2.
const packageSource=fs.readFileSync('v26-test/v26-draft-package.js','utf8');
for(const name of ['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'])
 assert(packageSource.includes(name),'Missing ZIP output contract: '+name);
assert(packageSource.includes("...(includeAnnex2?["),'PDF2 must remain conditional on requested documentary analysis');
assert(packageSource.includes("new Set(actualFiles).size!==actualFiles.length"),'Duplicate ZIP entries must fail closed');
assert(packageSource.includes("expectedFiles.some(name=>!actualFiles.includes(name))"),'Missing ZIP artifacts must fail closed');
// Package 3: exercise the real ZIP writer and inspect extracted artifacts.
const zipWriterSource=packageSource.slice(packageSource.indexOf('function zipWriter(){'),packageSource.indexOf('function scenarioFromGIS('));
assert(zipWriterSource.startsWith('function zipWriter(){'),'ZIP writer source not found');
const actualZipWriter=vm.runInNewContext(zipWriterSource+';zipWriter',{Uint8Array,Uint32Array,TextEncoder,Blob,Math,Error,Array,Set});
(async()=>{
 for(const withPdf2 of [false,true]){
  const z=actualZipWriter();
  const files=[
   ['01_Proekt_na_stanovishte_Klasicheski.docx',new Uint8Array([80,75,3,4])],
   ['02_Proekt_na_stanovishte_Eksperten.docx',new Uint8Array([80,75,3,4])],
   ['03_Prilozhenie_1_GIS_analiz.pdf','%PDF-1.4'],
   ...(withPdf2?[['04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','%PDF-1.4']]:[]),
   ['README_BG.txt','Работен пакет']
  ];
  for(const [name,bytes] of files)z.file(name,bytes);
  const blob=await z.generateAsync();
  const extracted=fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.deepEqual(Object.keys(extracted).sort(),files.map(x=>x[0]).sort(),'Actual ZIP file list differs');
  for(const [name,bytes] of files){
   const expected=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;
   assert.equal(Buffer.compare(Buffer.from(extracted[name]),Buffer.from(expected)),0,'Corrupt ZIP payload: '+name);
  }
 }
 console.log('Package 3 ZIP writer extraction with/without PDF2: PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
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
 // KT24.3 K06-K07: invalid AI/raw characterization must fail before altering A/B.
 for(const bad of [
  ['С реализацията на инвестиционното предложение С реализацията на инвестиционното предложение',...paragraphs.slice(1)],
  ['С реализацията на инвестиционното предложение [ЗА ЕКСПЕРТНА ПРОВЕРКА]',...paragraphs.slice(1)]
 ]){
  await assert.rejects(()=>w.V26TemplateWord.make(scenario,bad,metadata),/Повторено начало|Технически маркер/);
 }
 // KT24.3 K08: duplicated AI sentences must not enter either classic template.
 const repeated='С реализацията на инвестиционното предложение се предвижда изграждане на тестов обект. Изграждането на обекта ще се извърши в границите на имота.';
 await assert.rejects(()=>w.V26TemplateWord.make(scenario,[repeated+' Изграждането на обекта ще се извърши в границите на имота.',...paragraphs.slice(1)],metadata),/Повторено изречение/);
 await assert.rejects(()=>w.V26TemplateWord.make(scenario,[repeated+'   Изграждането   на обекта ще се извърши в границите на имота.',...paragraphs.slice(1)],metadata),/Повторено изречение/);
 const draft=w.V26ExpertDraft.build({results:[{input:'36676.129.457'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{}});
 const aiDraft=['[[CHARACTERIZATION]]','Конкретна характеристика на тестов склад и офиси.','[[LEGAL]]','Конкретна правна преценка по тестовите материали.','[[PROCEDURE]]','Конкретна процедурна преценка по тестовите материали.','[[IMPACTS]]','Конкретни въздействия на тестовия склад.','[[CONCLUSION]]','За тестовия склад не са представени проверени правни основания за окончателно процедурно произнасяне.'].join('\n');
 const enriched=w.V26ExpertDraft.build({results:[{input:'36676.129.457',location:'гр. Пловдив, община Пловдив, област Пловдив'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{},aiDraft});
 const mapPngBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64');
 const blob=await w.V26ExpertWord.make(enriched,{mapPngBytes:new Uint8Array(mapPngBytes)});

 const out=fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 assert(out['word/media/v27-gis-overview.png'],`Actual embedded GIS PNG missing; DOCX media: ${Object.keys(out).filter(k=>k.includes('media/')).join(', ')}`);
 assert.deepEqual(Buffer.from(out['word/media/v27-gis-overview.png']),mapPngBytes,'GIS PNG bytes changed');
 const rels=new TextDecoder().decode(out['word/_rels/document.xml.rels']);
 assert(rels.includes('rIdV27GISMap')&&rels.includes('media/v27-gis-overview.png'),'DOCX GIS image relationship missing');

 // KT24.3 E14: verify the map paragraph directly precedes its centered caption,
 // and Word receives keepNext/keepLines to prevent a caption orphan.
 const documentXml=new TextDecoder().decode(out['word/document.xml']);
 const parsedDocument=new w.DOMParser().parseFromString(documentXml,'application/xml');
 const wordNs='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const bodyParagraphs=[...parsedDocument.getElementsByTagNameNS(wordNs,'body')[0].children].filter(x=>x.localName==='p');
 const mapIndex=bodyParagraphs.findIndex(p=>p.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','inline').length>0);
 assert(mapIndex>=0&&mapIndex+1<bodyParagraphs.length,'Expert GIS map paragraph missing');
 const mapPara=bodyParagraphs[mapIndex],captionPara=bodyParagraphs[mapIndex+1];
 const paraText=p=>[...p.getElementsByTagNameNS(wordNs,'t')].map(t=>t.textContent).join('');
 // KT24.3 E03: the authority draft must have the exact approved title once.
 const headings=bodyParagraphs.map(paraText).filter(t=>t==='ПРОЕКТ НА СТАНОВИЩЕ');
 assert.equal(headings.length,1,'Expert Word must contain exactly one approved title ПРОЕКТ НА СТАНОВИЩЕ');
 assert(!bodyParagraphs.some(p=>/РАБОТЕН ЕКСПЕРТЕН ПРОЕКТ|НЕ Е АДМИНИСТРАТИВЕН АКТ/i.test(paraText(p))),'Prohibited draft banner must not appear');

 assert.equal(paraText(captionPara),'Фигура 1. Пространствено положение на имотите спрямо защитените зони от мрежата „Натура 2000“.','Figure 1 caption must immediately follow map');
 assert(mapPara.getElementsByTagNameNS(wordNs,'keepNext').length>0&&mapPara.getElementsByTagNameNS(wordNs,'keepLines').length>0,'Map and caption must be kept together');
 assert([...captionPara.getElementsByTagNameNS(wordNs,'jc')].some(j=>j.getAttributeNS(wordNs,'val')==='center'),'Figure 1 caption must be centered');

 const contentTypes=new TextDecoder().decode(out['[Content_Types].xml']);
 assert(contentTypes.includes('image/png'),'DOCX PNG content type missing');
 const xml=new TextDecoder().decode(out['word/document.xml']);
 const texts=paragraphTexts(xml).join(' ');
 for(const phrase of ['Конкретна характеристика на тестов склад и офиси.','Конкретна правна преценка по тестовите материали.','Конкретна процедурна преценка по тестовите материали.','Конкретни въздействия','гр. Пловдив, община Пловдив'])assert(texts.includes(phrase),'AI section or parcel location not integrated: '+phrase);
 assert(texts.includes('Конкретна характеристика на тестов склад и офиси.'),'Validated AI characterization must be included in expert Word');

 // KT24.3 E07/E08/E26: AI can repeat the same dossier paragraph with
 // different whitespace or trailing punctuation; export it only once.
 const repeatedAi=aiDraft.replace('Конкретна характеристика на тестов склад и офиси.','Конкретна характеристика на тестов склад и офиси.\n\n  Конкретна   характеристика на тестов склад и офиси!');
 const repeatedBlob=await w.V26ExpertWord.make({...enriched,aiDraft:repeatedAi},{mapPngBytes:new Uint8Array(mapPngBytes)});
 const repeatedZip=fflate.unzipSync(new Uint8Array(await repeatedBlob.arrayBuffer()));
 const repeatedXml=new TextDecoder().decode(repeatedZip['word/document.xml']);
 const repeatedParas=paragraphTexts(repeatedXml);
 assert.equal(repeatedParas.filter(p=>p.includes('Конкретна характеристика на тестов склад и офиси')).length,1,'Expert AI characterization duplicated across paragraphs');

 assert(!/намалява риска|по-нисък риск|липса на значими въздействия/i.test(texts),'Unsupported GIS-to-impact inference leaked into Word');
 assert(!/(?:^|[\s,.;:])(?:считам|предлагам|по мое мнение|според мен)(?=[\s,.;:]|$)/im.test(texts),'Personal expert opinion leaked into authority draft');
 assert(texts.includes('Конкретна процедурна преценка'),'Safeguarded AI procedural assessment must be included in expert Word');
 assert(texts.includes('Конкретна правна преценка'),'Validated AI legal reasoning must be included in expert Word');
 assert(texts.includes('VII. ЗАКЛЮЧЕНИЕ И УКАЗАНИЯ')&&texts.includes('VIII. СЪПЪТСТВАЩИ ДОКУМЕНТИ'),'Expert Word must include a separate conclusion section');
 assert(texts.includes('За тестовия склад не са представени проверени правни основания'),'Evidence-aware AI conclusion must be rendered');
 assert(texts.includes('За тестовия склад не са представени проверени правни основания'),'Conclusion must preserve explicit absence of verified legal grounds');
 // KT24.3 negative-path: unsafe AI conclusions must not become an administrative disposition.
 const unsafeDraft=aiDraft.replace('За тестовия склад не са представени проверени правни основания за окончателно процедурно произнасяне.','Считам, че не се изисква оценка и предлагам разрешаване на инвестиционното предложение.');
 const unsafeBlob=await w.V26ExpertWord.make({...enriched,aiDraft:unsafeDraft},{mapPngBytes:new Uint8Array(mapPngBytes)});
 const unsafeZip=fflate.unzipSync(new Uint8Array(await unsafeBlob.arrayBuffer()));
 const unsafeText=paragraphTexts(new TextDecoder().decode(unsafeZip['word/document.xml'])).join(' ');
 assert(!unsafeText.includes('Считам, че не се изисква оценка'),'Unsupported AI conclusion must be rejected');
 assert(unsafeText.includes('Окончателният процедурен извод и евентуалните указания'),'Rejected conclusion must fall back to evidence-gated text');
 assert(!texts.includes('[[CHARACTERIZATION]]'),'AI section markers leaked into Word');
 assert(!texts.includes('Експертно потвърден правен текст за теста.'),'Generic legal boilerplate duplicated AI text');
 const expertPs=[...new w.DOMParser().parseFromString(xml,'application/xml').getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')].map(p=>p.textContent);
 // KT24.3: expert signature spaces are blank and carry no visible labels.
 assert.equal(expertPs[0].trim(),'','Expert: opening signature space must be blank');
 assert.equal(expertPs[expertPs.length-1].trim(),'','Expert: closing signature space must be blank');
 assert(!/Място за електронен подпис|РАБОТЕН ЕКСПЕРТЕН ПРОЕКТ — НЕ Е АДМИНИСТРАТИВЕН АКТ/.test(texts),'Expert: visible workflow labels leaked into document');

 // KT24.3 E25: audit visible expert runs for Verdana 10 and subject-only italics.
 const visibleRuns=[...parsedDocument.getElementsByTagNameNS(wordNs,'body')[0].getElementsByTagNameNS(wordNs,'r')]
  .filter(run=>[...run.getElementsByTagNameNS(wordNs,'t')].some(t=>t.textContent.trim()));
 for(const run of visibleRuns){
  const runText=[...run.getElementsByTagNameNS(wordNs,'t')].map(t=>t.textContent).join('');
  const pr=run.getElementsByTagNameNS(wordNs,'rPr')[0];
  assert(pr,'Expert text run lacks explicit styling: '+runText.slice(0,50));
  const fonts=pr.getElementsByTagNameNS(wordNs,'rFonts')[0];
  assert(fonts&&fonts.getAttributeNS(wordNs,'ascii')==='Verdana'&&fonts.getAttributeNS(wordNs,'hAnsi')==='Verdana','Expert run must use Verdana: '+runText.slice(0,50));
  const sz=pr.getElementsByTagNameNS(wordNs,'sz')[0];
  assert(sz&&sz.getAttributeNS(wordNs,'val')==='20','Expert run must use 10 pt: '+runText.slice(0,50));
  const italic=pr.getElementsByTagNameNS(wordNs,'i')[0];
  if(italic&&italic.getAttributeNS(wordNs,'val')!=='0')assert(metadata.subject.includes(runText),'Italics outside confirmed subject: '+runText.slice(0,50));
 }
 const subjectRuns=visibleRuns.filter(run=>[...run.getElementsByTagNameNS(wordNs,'t')].some(t=>t.textContent.includes('Тестово инвестиционно предложение')));
 assert(subjectRuns.length>0,'Confirmed subject missing from expert run structure');

 for(const value of [metadata.recipient,metadata.subject,'36676.129.457','Картографското извлечение от ГИС анализа'])assert(texts.includes(value),'Missing expert content: '+value);

 // KT24.3 E04/E05/E06: actual metadata, exact confirmed subject, and mandatory reference fallback.
 for(const value of ['До: '+metadata.recipient,'Адрес: '+metadata.address,'Относно: ',metadata.subject,'Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г.'])
  assert(texts.includes(value),'Expert administrative requisite missing: '+value);
 const subjectParagraphs=bodyParagraphs.filter(p=>paraText(p).includes(metadata.subject));
 assert(subjectParagraphs.length>=2,'Expert must reproduce confirmed subject in reference and subject section');
 assert(subjectParagraphs.every(p=>paraText(p).includes(metadata.subject)),'Expert confirmed subject must remain unaltered');

 for(const key of Object.keys(sourceZip).filter(x=>!['word/document.xml','word/_rels/document.xml.rels','[Content_Types].xml'].includes(x)))assert.deepEqual(out[key],sourceZip[key],'Institutional DOCX part changed: '+key);
 // The classic renderer is tested against the same draft; do not allow silent
 // divergence between expert and template-based outputs.
 const classic=await w.V26TemplateWord.make(draft.scenario,draft.characterization,draft.metadata);
 // Package 3: package the actual A/B-generated DOCX pair, extract and verify both.
 for(const withPdf2 of [false,true]){
  const writer=actualZipWriter();
  writer.file('01_Proekt_na_stanovishte_Klasicheski.docx',classic);
  writer.file('02_Proekt_na_stanovishte_Eksperten.docx',blob);
  writer.file('03_Prilozhenie_1_GIS_analiz.pdf','%PDF-1.4\\nfixture');
  if(withPdf2)writer.file('04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','%PDF-1.4\\nfixture');
  writer.file('README_BG.txt','Scenario '+scenario);
  const archive=fflate.unzipSync(new Uint8Array(await (await writer.generateAsync()).arrayBuffer()));
  assert.equal(Object.keys(archive).length,withPdf2?5:4,'Unexpected ZIP file count');
  for(const [name,original] of [['01_Proekt_na_stanovishte_Klasicheski.docx',classic],['02_Proekt_na_stanovishte_Eksperten.docx',blob]]){
   const bytes=new Uint8Array(await original.arrayBuffer());
   assert.equal(Buffer.compare(Buffer.from(archive[name]),Buffer.from(bytes)),0,'Generated '+scenario+' DOCX changed inside ZIP: '+name);
   const doc=fflate.unzipSync(archive[name]);
   assert(doc['word/document.xml'],'Missing Word document XML: '+name);
  }
  assert.equal(Boolean(archive['04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf']),withPdf2,'PDF2 inclusion mismatch');
 }
 const classicZip=fflate.unzipSync(new Uint8Array(await classic.arrayBuffer()));
 const classicText=paragraphTexts(new TextDecoder().decode(classicZip['word/document.xml'])).join(' ');
 const classicPs=[...new w.DOMParser().parseFromString(new TextDecoder().decode(classicZip['word/document.xml']),'application/xml').getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')].map(p=>p.textContent);
 // KT24.3: both classic signature slots are deliberately blank, with no visible labels.
 assert.equal(classicPs[0].trim(),'','Classic: opening signature space must be blank');
 assert.equal(classicPs[classicPs.length-1].trim(),'','Classic: closing signature space must be blank');
 assert(!/Място за електронен подпис|РАБОТЕН ПРОЕКТ — ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(classicText),'Classic: visible workflow labels leaked into document');
 assert(!Object.keys(classicZip).some(k=>/^word\/media\/v27-gis-overview\.png$/.test(k)),'Classic Word must not embed the expert GIS map');
 assert(!classicText.includes('Фигура 1. Пространствено положение'),'Classic Word must not include the expert GIS figure caption');
 assert(!classicText.includes('VII. ЗАКЛЮЧЕНИЕ И УКАЗАНИЯ'),'Classic template must not inherit expert-only sections');

 // KT24.3: compare original A/B normative and all five impact paragraphs byte-for-byte as visible text.
 // The generated document inserts exactly one blank signature paragraph before template paragraph zero.
 const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const sourcePs=[...originalDoc.getElementsByTagNameNS(NS,'body')[0].children].filter(p=>p.localName==='p');
 const generatedDoc=new w.DOMParser().parseFromString(new TextDecoder().decode(classicZip['word/document.xml']),'application/xml');
 const generatedPs=[...generatedDoc.getElementsByTagNameNS(NS,'body')[0].children].filter(p=>p.localName==='p');
 const pText=p=>[...p.getElementsByTagNameNS(NS,'t')].map(t=>t.textContent).join('');
 const immutableIndices=[...(scenario==='А'?[22,23,24,25,31]:[20,21,22,23,24,25,31]),26,27,28,29,30];
 for(const i of immutableIndices){
  const originalText=pText(sourcePs[i]);
  const expectedText=originalText.replace(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g,id=>id==='36676.129.457'?id:'36676.129.457');
  assert.equal(pText(generatedPs[i+1]),expectedText,'Classic '+scenario+': normative/impact paragraph '+(i+1)+' changed beyond confirmed cadastral ID substitution');
  // KT24.3 K09-K12: immutable legal and impact paragraphs must retain the
  // source template's paragraph/run structure and formatting. Only yellow
  // authoring marks may be cleared; verified parcel IDs may be substituted.
  const sourceP=sourcePs[i],outputP=generatedPs[i+1];
  const structure=p=>[...p.children].map(n=>n.localName).join('|');
  assert.equal(structure(outputP),structure(sourceP),'Classic '+scenario+': original paragraph structure changed at '+(i+1));
  const runs=p=>[...p.getElementsByTagNameNS(NS,'r')];
  const sourceRuns=runs(sourceP),outputRuns=runs(outputP);
  assert.equal(outputRuns.length,sourceRuns.length,'Classic '+scenario+': original run count changed at '+(i+1));
  const formatting=run=>{
   const pr=[...run.children].find(n=>n.localName==='rPr');
   return pr?[...pr.children].filter(n=>!['highlight','shd'].includes(n.localName)).map(n=>n.localName+':'+[...n.attributes].map(a=>a.name+'='+a.value).sort().join(',')).join('|'):'';
  };
  for(let j=0;j<sourceRuns.length;j++)
   assert.equal(formatting(outputRuns[j]),formatting(sourceRuns[j]),'Classic '+scenario+': original run formatting changed at '+(i+1)+', run '+j);

 }

 for(const part of Object.keys(sourceZip).filter(k=>!['word/document.xml','word/_rels/document.xml.rels','[Content_Types].xml'].includes(k)))assert.deepEqual(classicZip[part],sourceZip[part],'Classic original template part changed: '+part);

 for(const value of [metadata.recipient,metadata.subject,'36676.129.457'])assert(classicText.includes(value),'Classic Word missing: '+value);

 // KT24.3 K03-K04: assert both original A/B outputs carry dossier address,
 // confirmed addressee, and the exact approved fallback for incomplete registration.
 for(const value of ['До: '+metadata.recipient,'Адрес: '+metadata.address,'Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г.'])
  assert(classicText.includes(value),'Classic '+scenario+': mandatory addressee/address/registration missing: '+value);
 assert(classicText.includes('Относно: '+metadata.subject),'Classic '+scenario+': confirmed subject not reproduced in subject line');


 // KT24.3 E20: first-person plural AI claims cannot enter an authority-issued draft.
 const unsafeAiDraft=aiDraft.replace('Конкретна правна преценка по тестовите материали.','Считаме, че предложението е допустимо.').replace('Конкретна процедурна преценка по тестовите материали.','Според нас процедурата е приключена.');
 const unsafePluralDraft=w.V26ExpertDraft.build({results:[{input:'36676.129.457',location:'гр. Пловдив, община Пловдив, област Пловдив'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{},aiDraft:unsafeAiDraft});
 const safeBlob=await w.V26ExpertWord.make(unsafePluralDraft,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const safeZip=fflate.unzipSync(new Uint8Array(await safeBlob.arrayBuffer()));
 const safeText=paragraphTexts(new TextDecoder().decode(safeZip['word/document.xml'])).join(' ');
 assert(!safeText.includes('Считаме, че')&&!safeText.includes('Според нас'),'First-person plural AI opinion leaked into authority Word');
 assert(safeText.includes('Правните основания се уточняват'),'Unsafe legal AI section must use evidence-limited fallback');

 // KT24.3 E15-E23: enforce the same evidence and authority rules across
 // legal, procedure and impacts sections, not only the final conclusion.
 const sectionSafetyCases=[
  {old:'Конкретна правна преценка по тестовите материали.',replacement:'Правното основание е чл. ХХ от приложимата наредба.',forbidden:'чл. ХХ',fallback:'Правните основания се уточняват'},
  {old:'Конкретна процедурна преценка по тестовите материали.',replacement:'Възложителят следва да предприеме необходимите действия.',forbidden:'Възложителят следва да предприеме необходимите действия.',fallback:'Приложимата процедура се определя'},
  {old:'Конкретни въздействия на тестовия склад.',replacement:'Според нас въздействията са допустими.',forbidden:'Според нас въздействията са допустими.',fallback:'От ГИС анализа е установен единствено'}
 ];
 for(const c of sectionSafetyCases){
  const candidate={...enriched,aiDraft:aiDraft.replace(c.old,c.replacement)};
  const result=await w.V26ExpertWord.make(candidate,{mapPngBytes:new Uint8Array(mapPngBytes)});
  const resultZip=fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
  const resultText=paragraphTexts(new TextDecoder().decode(resultZip['word/document.xml'])).join(' ');
  assert(!resultText.includes(c.forbidden),'Unsafe AI section escaped evidence gate: '+c.forbidden);
  assert(resultText.includes(c.fallback),'Unsafe AI section did not use explicit review fallback: '+c.fallback);
 }

 // Package 2: content safety across all five AI-authored sections in A/B DOCX.
 const fiveSectionCases=[
  {old:'Конкретна характеристика на тестов склад и офиси.',replacement:'Според мен инвестиционното предложение е подходящо.',forbidden:'Според мен инвестиционното предложение е подходящо.'},
  {old:'Конкретна правна преценка по тестовите материали.',replacement:'Правното основание е чл. ХХ от приложимата наредба.',forbidden:'чл. ХХ'},
  {old:'Конкретна процедурна преценка по тестовите материали.',replacement:'Не се изисква оценка за съвместимост.',forbidden:'Не се изисква оценка за съвместимост.'},
  {old:'Конкретни въздействия на тестовия склад.',replacement:'Липсват въздействия върху защитените зони.',forbidden:'Липсват въздействия върху защитените зони.'},
  {old:'За тестовия склад не са представени проверени правни основания за окончателно процедурно произнасяне.',replacement:'Предлагам инвестиционното предложение да бъде разрешено.',forbidden:'Предлагам инвестиционното предложение да бъде разрешено.'}
 ];
 for(const c of fiveSectionCases){
  const candidate={...enriched,aiDraft:aiDraft.replace(c.old,c.replacement)};
  const blob=await w.V26ExpertWord.make(candidate,{mapPngBytes:new Uint8Array(mapPngBytes)});
  const text=paragraphTexts(new TextDecoder().decode(fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()))['word/document.xml'])).join(' ');
  assert(!text.includes(c.forbidden),'Unsafe content entered '+scenario+' expert Word: '+c.forbidden);
 }
 // KT02: a plausible but unverified article number must not reach the expert Word.
 const citationDraft=aiDraft.replace('Конкретна правна преценка по тестовите материали.','Съгласно чл. 31, ал. 1 от Закона за биологичното разнообразие се извършва преценка.');
 const citationModel={...enriched,aiDraft:citationDraft,legalSources:[]};
 const citationBlob=await w.V26ExpertWord.make(citationModel,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const citationZip=fflate.unzipSync(new Uint8Array(await citationBlob.arrayBuffer()));
 const citationText=paragraphTexts(new TextDecoder().decode(citationZip['word/document.xml'])).join(' ');
 assert(!citationText.includes('Съгласно чл. 31'),'Unverified AI legal article escaped DOCX gate');
 assert(citationText.includes('Правните основания се уточняват'),'Unverified article did not trigger legal fallback');

 // KT02: matching article numbers in different legal acts must not be interchangeable.
 const legalText='Съгласно чл. 31, ал. 1 от Закон за биологичното разнообразие се извършва преценка.';
 const legalSource={title:'Закон за биологичното разнообразие',source:'Проверен архив',article:'чл. 31, ал. 1',verifiedScope:'тест',revisionVerified:true};
 const wrongAct={...enriched,aiDraft:aiDraft.replace('Конкретна правна преценка по тестовите материали.',legalText),legalSources:[{...legalSource,title:'Закон за опазване на околната среда'}]};
 const wrongBlob=await w.V26ExpertWord.make(wrongAct,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const wrongText=paragraphTexts(new TextDecoder().decode(fflate.unzipSync(new Uint8Array(await wrongBlob.arrayBuffer()))['word/document.xml'])).join(' ');
 assert(!wrongText.includes(legalText),'Matching article from a different act escaped DOCX gate');
 assert(wrongText.includes('Правните основания се уточняват'),'Wrong legal act did not trigger fallback');

 // KT02: a correctly identified verified act and article must remain usable in DOCX.
 const correctAct={...enriched,aiDraft:aiDraft.replace('Конкретна правна преценка по тестовите материали.',legalText),legalSources:[legalSource]};
 const correctBlob=await w.V26ExpertWord.make(correctAct,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const correctText=paragraphTexts(new TextDecoder().decode(fflate.unzipSync(new Uint8Array(await correctBlob.arrayBuffer()))['word/document.xml'])).join(' ');
 assert(correctText.includes(legalText),'Verified act and article incorrectly rejected from DOCX');
 const unapprovedAct={...enriched,aiDraft:aiDraft.replace('Конкретна правна преценка по тестовите материали.',legalText),legalSources:[{...legalSource,revisionVerified:false,projectRevisionAccepted:false}]};
 const unapprovedBlob=await w.V26ExpertWord.make(unapprovedAct,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const unapprovedText=paragraphTexts(new TextDecoder().decode(fflate.unzipSync(new Uint8Array(await unapprovedBlob.arrayBuffer()))['word/document.xml'])).join(' ');
 assert(!unapprovedText.includes(legalText),'Unapproved legal source must not authorize a DOCX citation');

 // Package 2: project-accepted archive citations remain usable without being
 // mislabeled as independently revision-verified.
 const acceptedSource={...legalSource,revisionVerified:false,projectRevisionAccepted:true};
 const acceptedModel=w.V26ExpertDraft.build({results:[{input:'36676.129.457'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{},aiDraft:aiDraft.replace('Конкретна правна преценка по тестовите материали.',legalText),legalSources:[acceptedSource]});
 assert.equal(acceptedModel.legalSources.length,1,'Project-accepted legal source lost during draft building');
 assert.equal(acceptedModel.legalSources[0].projectRevisionAccepted,true,'Project acceptance provenance lost');
 assert.equal(acceptedModel.legalSources[0].revisionVerified,false,'Project acceptance falsely marked independently verified');
 const acceptedBlob=await w.V26ExpertWord.make(acceptedModel,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const acceptedText=paragraphTexts(new TextDecoder().decode(fflate.unzipSync(new Uint8Array(await acceptedBlob.arrayBuffer()))['word/document.xml'])).join(' ');
 assert(acceptedText.includes(legalText),'Project-accepted act and article incorrectly rejected from DOCX');


 // KT24.3 E22-E23: vague instructions must not be presented as an actionable authority conclusion.
 const vagueAiDraft=aiDraft.replace('За тестовия склад не са представени проверени правни основания за окончателно процедурно произнасяне.','Възложителят следва да предприеме необходимите действия.');
 const vagueDraft=w.V26ExpertDraft.build({results:[{input:'36676.129.457'}],roles:{'36676.129.457':'leading'},determination:{scenario,zones:scenario==='Б'?['BG0000001']:[]},metadata,paragraphs,evidence:{},aiDraft:vagueAiDraft});
 const vagueBlob=await w.V26ExpertWord.make(vagueDraft,{mapPngBytes:new Uint8Array(mapPngBytes)});
 const vagueZip=fflate.unzipSync(new Uint8Array(await vagueBlob.arrayBuffer()));
 const vagueText=paragraphTexts(new TextDecoder().decode(vagueZip['word/document.xml'])).join(' ');
 assert(!vagueText.includes('Възложителят следва да предприеме необходимите действия.'),'Generic investor instructions leaked into authority Word');
 assert(vagueText.includes('Окончателният процедурен извод'),'Vague AI conclusion must use evidence-limited fallback');

 // Passive-voice generic instructions must be rejected by the same safeguard.
 const passiveAiDraft=aiDraft.replace('За тестовия склад не са представени проверени правни основания за окончателно процедурно произнасяне.','За възложителя следва да бъдат предприети необходимите действия.');
 const passiveBlob=await w.V26ExpertWord.make({...enriched,aiDraft:passiveAiDraft},{mapPngBytes:new Uint8Array(mapPngBytes)});
 const passiveZip=fflate.unzipSync(new Uint8Array(await passiveBlob.arrayBuffer()));
 const passiveText=paragraphTexts(new TextDecoder().decode(passiveZip['word/document.xml'])).join(' ');
 assert(!passiveText.includes('За възложителя следва да бъдат предприети необходимите действия.'),'Passive-voice generic instructions leaked into authority Word');
 assert(passiveText.includes('Окончателният процедурен извод'),'Passive-voice instruction must trigger evidence-limited fallback');

 console.log('Expert + classic DOCX scenario '+scenario+': PASS');
}
(async()=>{await run('А');await run('Б')})().catch(e=>{console.error(e);process.exitCode=1});
