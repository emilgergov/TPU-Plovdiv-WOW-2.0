/* KT51: content restoration integration test. Execute actual approved A/B and R02 adapters, not the discarded KT51 paragraph-writer. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const fflate=require('fflate');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const base='v26-test/v27-preview';
const read=f=>fs.readFileSync(path.join(base,f));
const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const demo=new DOMParser().parseFromString('<r><x/><y/></r>','application/xml').documentElement;
const proto=Object.getPrototypeOf(demo);
if(!Object.getOwnPropertyDescriptor(proto,'children'))Object.defineProperty(proto,'children',{get(){return Array.from(this.childNodes||[]).filter(x=>x.nodeType===1)},configurable:true});
if(!proto.append)proto.append=function(...nodes){for(const x of nodes)this.appendChild(x)};
if(!proto.replaceChildren)proto.replaceChildren=function(...nodes){while(this.firstChild)this.removeChild(this.firstChild);this.append(...nodes)};
const source=fflate.unzipSync(new Uint8Array(read('etalon/V27-R02.docx')));
function p(t){return '<w:p><w:r><w:t xml:space="preserve">'+t+'</w:t></w:r></w:p>'}
const sections=[
'III. ХАРАКТЕРИСТИКА НА ПРЕДЛОЖЕНИЕТО','AI автор: конкретна проверена характеристика на дейностите.',
'IV. ФАКТИЧЕСКИ И ПРАВНИ КОНСТАТАЦИИ','AI автор: специфичен правен аргумент за предмета на ИП. [[LEGAL]]',
'V. ПРОЦЕДУРНА ПРЕЦЕНКА','AI автор: необходима е комплексна експертна преценка.',
'VI. КОНСТАТАЦИИ ЗА ВЪЗДЕЙСТВИЯТА','AI автор: конкретна оценка на прякото и косвеното въздействие.',
'VII. СЪПЪТСТВАЩИ ДОКУМЕНТИ'];
const mockXml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="'+ns+'"><w:body>'+
sections.map(p).join('')+'<w:p><w:r><w:drawing/></w:r></w:p><w:sectPr/></w:body></w:document>';
source['word/document.xml']=new TextEncoder().encode(mockXml);
source['word/media/v27-gis-overview.png']=new Uint8Array([137,80,78,71,13,10,26,10,0]);
const expertReviewed=new Blob([fflate.zipSync(source)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
const sandbox={fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,console,document:{},
 V26TemplateWord:{templatePaths:{A:'v27-preview/etalon/KT35-A.docx',B:'v27-preview/etalon/KT39-B.docx'}},
 V26ExpertWord:{make:async()=>expertReviewed}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
sandbox.fetch=async url=>{const buf=fs.readFileSync(path.join('v26-test',url));
 return {ok:true,arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)}};
for(const file of ['v27-approved-classic-word-ab.js','v27-approved-expert-word-r02.js','v27-kt51-admin-only.js'])
 vm.runInNewContext(read(file).toString(),sandbox,{filename:file});
assert.equal(sandbox.V26TemplateWord.layout,'KT51_APPROVED_CLASSIC_RESTORED');
assert.equal(sandbox.V26ExpertWord.layout,'KT51_APPROVED_EXPERT_R02_RESTORED');
const m={parcelIds:'36676.129.457',subject:'Относно: Уведомление за инвестиционно предложение (ИП): „Учебен обект“ в ПИ с идентификатор 36676.129.457',
 location:'с. Катуница',recipient:'',address:'',incomingReference:'',salutation:'УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА,',
 legalParagraphs:[],impactFindings:[],procedureFinding:''};
const characterization=[
'С реализацията на инвестиционното предложение се предвижда конкретен учебен обект.',
'Електрозахранването се осъществява по съществуваща техническа схема.',
'Водоснабдяването е описано в документацията.',
'Отпадъчните води са предмет на конкретно техническо решение.'];
const paragraphText=async blob=>{
 const zip=fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const dom=new DOMParser().parseFromString(new TextDecoder().decode(zip['word/document.xml']),'application/xml');
 const lines=Array.from(dom.getElementsByTagNameNS(ns,'p')).map(p=>Array.from(p.getElementsByTagNameNS(ns,'t')).map(t=>t.textContent).join(''));
 return {lines,zip};
};
(async()=>{
 const {lines:a}=await paragraphText(await sandbox.V26TemplateWord.make('А',characterization,m,{determination:{scenario:'А',zones:[]}}));
 const {lines:b}=await paragraphText(await sandbox.V26TemplateWord.make('Б',characterization,m,{determination:{scenario:'Б',zones:['BG0000194']}}));
 for(const lines of [a,b]){
  assert.ok(lines.some(x=>x.includes('Възложител: '+'Х'.repeat(10))),'recipient 10 X missing');
  assert.ok(lines.some(x=>x.includes('Адрес: '+'Х'.repeat(15))),'address 15 X missing');
  assert.ok(lines.some(x=>x.includes('Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.')),'incoming ref missing');
  assert.ok(lines.some(x=>x.includes('С реализацията на инвестиционното предложение')),'approved characteristic lost');
  assert.ok(!lines.some(x=>x.includes('ЗА ЕКСПЕРТНА ПРОВЕРКА — характеристика 1')),'regressive KT51 prose returned');
  assert.ok(lines.some(x=>x.startsWith('Относно:')),'heading missing');
  assert.equal(lines.filter(x=>x.includes('Относно:')).length,1,'duplicate Относно');
 }
 assert.ok(b.some(x=>x.includes('BG0000194')),'scenario B GIS code lost');
 const draft={schema:'KT13_EXPERT_DRAFT_V1',metadata:m,scenario:'Б',parcels:[{id:'36676.129.457',role:'leading'}],zones:['BG0000194'],legalSources:[]};
 const {lines:e,zip}=await paragraphText(await sandbox.V26ExpertWord.make(draft,{requireAiAuthor:true}));
 for(const heading of ['1. ПРЕДМЕТ','2. ПРОСТРАНСТВЕНО','3. ПРЕЦЕНКА','4. ПРЕЦЕНКА'])
  assert.ok(e.some(x=>x.includes(heading)),'R02 section missing: '+heading);
 for(const phrase of ['конкретна проверена характеристика','специфичен правен аргумент','комплексна експертна преценка','конкретна оценка'])
  assert.ok(e.some(x=>x.includes(phrase)),'AI author paragraph lost: '+phrase);
 assert.ok(!e.some(x=>/\[\[(?:CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]/.test(x)),'KT51 technical AI section marker remained inside expert DOCX');
 assert.ok(zip['word/media/v27-gis-overview.png'],'R02 GIS image removed');
 assert.ok(e.some(x=>x.includes('Възложител: '+'Х'.repeat(10))),'R02 recipient missing');
 assert.ok(e.some(x=>x.includes('Адрес: '+'Х'.repeat(15))),'R02 address missing');
 await assert.rejects(()=>sandbox.V26TemplateWord.make('Б',['[ЗА ЕКСПЕРТНА ПРОВЕРКА — описание]',...characterization.slice(1)],m,{determination:{scenario:'Б',zones:['BG0000194']}}),/характеристиката на ИП е непълна/);
 // KT51 regression: execute the REAL underlying V26 expert content filter.
 // Previous tests mocked this engine, so a rejected IMPACTS section escaped CI.
 const core={fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,Uint8Array,console,document:{},
   V26TemplateWord:{templatePaths:{A:'v27-preview/etalon/KT35-A.docx',B:'v27-preview/etalon/KT39-B.docx'}},fetch:sandbox.fetch};
 core.window=core;core.globalThis=core;
 vm.runInNewContext(read('v26-expert-word.js').toString(),core,{filename:'v26-expert-word.js'});
 const expertMeta={...m,recipient:'Възложител: Тестови възложител',address:'Адрес: тестов адрес',incomingReference:'Вх. № ОВОС-1234/01.01.2026 г.',
   legalParagraphs:Array(7).fill('Проверен документален контекст за експертна преценка.'),
   impactFindings:Array(5).fill('Експертна проверка на конкретните въздействия.'),procedureFinding:'Необходима е преценка по пълната преписка.'};
 const realDraft={schema:'KT13_EXPERT_DRAFT_V1',metadata:expertMeta,scenario:'Б',
   parcels:[{id:'36676.129.457',role:'leading',location:'с. Катуница'}],zones:['BG0000194'],characterization,
   aiDraft:[
    '[[CHARACTERIZATION]]','Проверяват се заявените дейности и техническите решения на инвестиционното предложение.',
    '[[LEGAL]]','Относимите режими се преценяват въз основа на проверени документи от преписката.',
    '[[PROCEDURE]]','Процедурният извод изисква самостоятелна проверка на правните предпоставки.',
    '[[IMPACTS]]','Възможните косвени въздействия върху BG0000194 се разглеждат заедно с функциите на съседните защитени територии. Данните не позволяват категоричен извод за тяхната значимост.'
   ].join('\n\n')};
 const real=await core.V26ExpertWord.make(realDraft,{requireAiAuthor:true,mapPngBytes:new Uint8Array([137,80,78,71,13,10,26,10,0])});
 const {lines:realLines}=await paragraphText(real);
 assert.ok(realLines.some(t=>t.includes('Възможните косвени въздействия върху BG0000194')),'Valid AI IMPACTS with Natura code was deleted');
 assert.ok(realLines.some(t=>t.includes('съседните защитени територии')),'Valid protected-territory context was deleted');
 const bad={...realDraft,aiDraft:realDraft.aiDraft.replace(/Възможните косвени въздействия[\s\S]*$/, 'Не се очаква въздействие и не се изисква оценка.')};
 await assert.rejects(()=>core.V26ExpertWord.make(bad,{requireAiAuthor:true,mapPngBytes:new Uint8Array([137,80,78,71,13,10,26,10,0])}),/AI раздел без допустимо съдържание/);
 console.log('KT51 REAL EXPERT IMPACTS PASS: Natura zone and protected-area evidence preserved; unsupported no-impact conclusion rejected.');
 console.log('KT51 RESTORED CONTENT PASS: actual approved Classic A/B and Expert R02 adapters, original AI sections, map, admin fields, no fake characterization.');
})().catch(e=>{console.error(e);process.exitCode=1});
