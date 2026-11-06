/* KT69: actual DOCX output from immutable KT50 base + scoped B adapter. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const dir=__dirname,base='v26-test/v27-preview';
const demo=new DOMParser().parseFromString('<r><x/><y/></r>','text/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const response=(name)=>{const bytes=fs.readFileSync(path.join('v26-test',String(name)));return {ok:true,blob:async()=>new Blob([bytes]),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)}};
const root={fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,console,fetch:async url=>response(url),
 V26TemplateWord:{make:async()=>{throw Error('original writer not loaded')},templatePaths:{}},
 V26ExpertWord:{make:async()=>{throw Error('expert stub')}}};
vm.createContext(root);
vm.runInContext(fs.readFileSync(path.join(dir,'v27-kt50-original-kt42.js'),'utf8'),root);
const originalMake=root.V26TemplateWord.make,expertReference=root.V26ExpertWord;
vm.runInContext(fs.readFileSync(path.join(dir,'kt69-classic-b-etalon-restore.js'),'utf8'),root);
const reader=blob=>blob.arrayBuffer().then(buffer=>{
 const z=fflate.unzipSync(new Uint8Array(buffer));
 const d=new DOMParser().parseFromString(new TextDecoder().decode(z['word/document.xml']),'text/xml');
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const ps=Array.from(d.getElementsByTagNameNS(ns,'body')[0].children).filter(x=>x.localName==='p');
 return {zip:z,ps,text:ps.map(p=>Array.from(p.getElementsByTagNameNS(ns,'t')).map(t=>t.textContent||'').join(''))}
});
(async()=>{
 const m={parcelIds:'36676.129.457',subject:'Проверка на инвестиционно предложение',
  location:'по КККР на с. Катуница, община Садово, област Пловдив',
  recipient:'Възложител: ХХХХХХХХХХ',address:'Адрес: ХХХХХХХХХХ',
  incomingReference:'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',
  legalParagraphs:['Предназначението и начинът на трайно ползване подлежат на документална проверка.',
    'Допустимостта се съобразява с режимите на засегнатата защитена зона.',
    'Преценката по Закона за опазване на околната среда се прави след проверка на параметрите.',
    'Екологичните въздействия се оценяват по конкретните направления.'],
  impactFindings:['Въздействие 1.','Въздействие 2.','Въздействие 3.','Въздействие 4.','Въздействие 5.'],
  procedureFinding:'Окончателен процедурен извод не е установен без пълната преписка.'};
 const char=['С реализацията на инвестиционното предложение се предвижда изпълнение на заявената дейност.',
  'Електрозахранването е описано в преписката.','Водоснабдяването се уточнява.',
  'Предвижда се третиране на отпадъчните води.'];
 const ctx={determination:{scenario:'Б',zones:['BG0000194']}};
 const incomplete=['С реализацията на инвестиционното предложение се предвижда изпълнение на заявената дейност.','Електрозахранването е описано в преписката.','Водоснабдяването се уточнява.','[ЗА ЕКСПЕРТНА ПРОВЕРКА — отпадъчни води]'];
 await assert.rejects(originalMake('Б',incomplete,m,ctx),/непроверена характеристика 4/);
 const repairedMissing=await reader(await root.V26TemplateWord.make('Б',incomplete,m,ctx));
 assert.equal(repairedMissing.ps.length,43,'missing characteristic B must still create a DOCX');
 assert.match(repairedMissing.text[21],/Отпадъчните води.*експертна проверка/,'missing fourth characteristic must remain transparently unverified');
 assert.doesNotMatch(repairedMissing.text[21],/ще се заустват|изгребна яма/,'must never invent waste-water destination');
 const before=await reader(await originalMake('Б',char,m,ctx));
 const after=await reader(await root.V26TemplateWord.make('Б',char,m,ctx));
 const specimen=await reader(new Blob([fs.readFileSync(path.join(base,'etalon','KT39-B.docx'))]));
 assert.equal(before.ps.length,43);assert.equal(after.ps.length,43);assert.equal(specimen.ps.length,43);
 for(let i=28;i<33;i++)assert.equal(after.text[i],specimen.text[i],'B impact paragraph '+i+' must equal original etalon');
 for(let i=0;i<43;i++)if(![17,25,26,27,28,29,30,31,32,33].includes(i))
  assert.equal(after.text[i],before.text[i],'unexpected change to B paragraph '+i);
 assert(!after.text[17].includes('попада в обхвата'),'B must not inherit sample procedure');
 assert.match(after.text[23],/36676\.129\.457/);assert.match(after.text[23],/BG0000194/);
 assert.match(after.text[25],/чл\. 12, ал\. 2/);assert.match(after.text[26],/ЗООС/);
 assert.match(after.text[33],/36676\.129\.457/);assert(!after.text[33].includes('Река Марица'));
 for(const key of Object.keys(before.zip))if(key!=='word/document.xml')assert.deepEqual(Buffer.from(after.zip[key]),Buffer.from(before.zip[key]),'non-body DOCX asset altered: '+key);
 // Scenario A and Expert remain on exactly the same generator paths.
 assert.equal(root.V26ExpertWord,expertReference,'Expert Word must remain untouched');
 const am={...m,parcelIds:'56784.13.102, 56784.13.105, 56784.13.106'};
 const actx={determination:{scenario:'А',zones:[]}};
 const originalA=await reader(await originalMake('А',char,am,actx));
 const wrappedA=await reader(await root.V26TemplateWord.make('А',char,am,actx));
 assert.deepEqual(wrappedA.text,originalA.text,'Classic A paragraph content changed');
 for(const key of Object.keys(originalA.zip))assert.deepEqual(Buffer.from(wrappedA.zip[key]),Buffer.from(originalA.zip[key]),'Classic A ZIP entry changed '+key);
 console.log('KT69 PASS: B 43 paragraphs; 5/5 original impact bullets; A and Expert unchanged; legal guards; GIS parcel and zone preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
