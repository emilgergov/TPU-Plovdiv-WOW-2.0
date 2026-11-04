/* KT42: test real approved Word files, not just source-code flags. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const crypto=require('crypto');
const fflate=require('fflate');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const base='v26-test/v27-preview';
const approvedSha={
 'KT35-A.docx':'1a495fc2d6047a6377e48dfb963a737502404087',
 'KT39-B.docx':'508402ce5a631617bdc0da4ca9d9cd535b6b3b7c',
 'V27-R02.docx':'335634ab930253671dc090391ed366867ca7e438'
};
for(const [name,expected] of Object.entries(approvedSha)){
 const bytes=fs.readFileSync(path.join(base,'etalon',name));
 const header=Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0])]);
 const actual=crypto.createHash('sha1').update(header).update(bytes).digest('hex');
 assert.equal(actual,expected,'LOCKED USER-APPROVED DOCX CHANGED: '+name);
}
console.log('KT47 USER APPROVED ETALON LOCK PASS: exact 3 original binary Word documents');

const demo=new DOMParser().parseFromString('<r><x/><y/></r>','application/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const sandbox={fflate,DOMParser,XMLSerializer,Blob,TextDecoder,TextEncoder,console,document:{},V26TemplateWord:{make(){throw Error('should not call old generator');},templatePaths:{A:'',B:''}},V26ExpertWord:{make(){throw Error('should not call old generator');}}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
sandbox.fetch=async url=>{
 const filepath=path.join('v26-test',url);
 const buffer=fs.readFileSync(filepath);
 return {ok:true,arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)};
};
const bridgeName=process.env.V27_WORD_BRIDGE||'v27-kt41-etalon-bridge.js';
vm.runInNewContext(fs.readFileSync(path.join(base,bridgeName),'utf8'),sandbox,{filename:bridgeName});
assert.equal(sandbox.V26TemplateWord.layout,'KT41_EXACT_KT35_KT39');
assert.equal(sandbox.V26ExpertWord.layout,'KT41_EXACT_V27_R02');
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const pList=buffer=>{
 const z=fflate.unzipSync(new Uint8Array(buffer));
 const dom=new DOMParser().parseFromString(new TextDecoder().decode(z['word/document.xml']),'application/xml');
 const p=Array.from(dom.getElementsByTagNameNS(NS,'body')[0].children).filter(n=>n.localName==='p');
 return {z,p,serial:new XMLSerializer()};
};
const phrase=p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent).join('');
const meta={parcelIds:'56784.13.102, 56784.13.105, 56784.13.106',subject:'Складове за промишлени стоки и офиси',recipient:'Възложителя: контролна преписка',address:'Адрес: контролен',incomingReference:'Вх. № ОВОС-9999 / ДАТА-99.99.9999 г.',location:'гр. Пловдив, местност Рогошко шосе',approvedSpecimen:true};
const verified=['С реализацията на инвестиционното предложение се предвижда складов обект','Електрозахранване','Водоснабдяване','Отпадъчни води'];
function assertKT46ClassicalLayout(doc,which){
 const actual=pList(doc),reference=pList(fs.readFileSync(path.join(base,'etalon','KT39-B.docx')));
 const jc=p=>Array.from(p.getElementsByTagNameNS(NS,'jc')).find(n=>n.parentNode?.localName==='pPr')?.getAttributeNS(NS,'val');
 // Confidentiality AND TLP label must use B's right alignment in A and B.
 for(let i=0;i<2;i++){
  assert.equal(jc(actual.p[i]),'right',which+' confidentiality paragraph '+i);
  assert.equal(jc(actual.p[i]),jc(reference.p[i]),which+' must match KT39-B');
  // Verify full positioning, not only right alignment: indentation, spacing,
  // paragraph style, keepNext and all other property nodes.
  const props=p=>Array.from(p.children).find(x=>x.localName==='pPr');
  const normalized=n=>n ? [n.localName,Array.from(n.attributes||[]).map(a=>[a.namespaceURI,a.localName,a.value]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),Array.from(n.children||[]).map(normalized)] : null;
  assert.deepEqual(normalized(props(actual.p[i])),normalized(props(reference.p[i])),which+' confidentiality complete paragraph geometry '+i);
 }
 // All other body paragraphs retain justified alignment; no full-body restyling.
 for(let i=2;i<actual.p.length;i++){
  // Empty layout-only paragraphs can legitimately omit w:jc in the approved originals.
  const meaningful=phrase(actual.p[i]).trim();
  if(meaningful)assert.equal(jc(actual.p[i]),'both',which+' nonempty body paragraph '+i+' must remain justified');
 }
 const z=actual.z,ref=reference.z;
 for(const name of Object.keys(ref).filter(n=>/^word\/(?:footer\d+\.xml|header\d+\.xml|media\/)/.test(n))){
  assert.deepEqual(Buffer.from(z[name]||[]),Buffer.from(ref[name]),which+' footer/GREEN asset drift: '+name);
 }
 console.log('KT46 '+which+' PASS: confidentiality right; body justified; GREEN/header/footer match B');
}
function checkHeadingEtalonRuns(doc,which){
 const output=pList(doc),original=pList(fs.readFileSync(path.join(base,'etalon',(which==='A'?'KT35-A':which==='B'?'KT39-B':'V27-R02')+'.docx')));
 const xml=output.serial;
 const runText=paragraph=>Array.from(paragraph.getElementsByTagNameNS(NS,'r')).map(r=>({
   run:r,text:Array.from(r.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent).join(''),
   style:Array.from(r.getElementsByTagNameNS(NS,'rPr')).map(v=>xml.serializeToString(v)).join('')
 })).filter(x=>x.text.length);
 const curr=runText(output.p[10]),baseRuns=runText(original.p[10]);
 assert.equal(curr.length,4,which+' must preserve four styled heading runs');
 assert.equal(baseRuns.length,4,which+' original expected four styled heading runs');
 for(let i=0;i<4;i++)assert.equal(curr[i].style,baseRuns[i].style,which+' run '+(i+1)+' formatting changed');
 assert.equal(curr[0].text,'Относно',which+' first run');
 assert.equal(curr[1].text,': Уведомление за инвестиционно предложение (ИП): ',which+' intro run');
 assert.ok(/^„[^“]+“$/.test(curr[2].text),which+' title run');
 assert.ok(curr[3].text.includes('поземлен'),which+' location run');
 assert.match(curr[3].text,/община /,which+' municipality must occur in styled heading');
 assert.match(curr[3].text,/област /,which+' region must occur in styled heading');
 assert.match(curr[3].text,/(?:гр\.|с\.|ЗА ЕКСПЕРТНА ПРОВЕРКА — населено място)/,which+' settlement must occur or be explicitly marked missing');

 const oldRuns=Array.from(original.p[10].getElementsByTagNameNS(NS,'r')),newRuns=Array.from(output.p[10].getElementsByTagNameNS(NS,'r'));
 assert.equal(newRuns.length,oldRuns.length,which+' original XML run count');
 console.log('KT44 HEADING STYLE PASS: '+which+' original four Word formatting segments retained');
}
function checkAdministrative(doc,which,subject,ids){
 checkHeadingEtalonRuns(doc,which);
 const p=pList(doc).p,headline=phrase(p[10]),intro=phrase(p[which==='E'?17:16]);
 // Both the subject and verified locality can be independently quoted.
 const quotedSubject=headline.match(/Относно:[\s\S]*?„([^“]+)“/);
 assert.ok(quotedSubject&&quotedSubject[1].includes(subject),which+' subject must be quoted exactly once');
 assert.equal((headline.match(/„/g)||[]).length,(headline.match(/“/g)||[]).length,which+' balanced quotation marks');
 assert.equal((headline.match(new RegExp(ids.replace(/\./g,'\\.'),'g'))||[]).length,1,which+' duplicate parcel');
 assert.ok(headline.includes(subject),which+' missing subject');
 assert.match(intro,/Наредба за условията и реда за извършване на оценка за съвместимостта/,which+' shortened ordinance');
 assert.doesNotMatch(phrase(p[6]),/^ДО ВЪЗЛОЖИТЕЛЯ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ$/,which+' generic recipient');
 assert.match(phrase(p[6]),/^Възложителя: /,which+' exact original recipient label');
 assert.match(phrase(p[7]),/^Адрес: /,which+' exact original address label');
 assert.doesNotMatch(phrase(p[6])+' '+phrase(p[7]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/,which+' technical diagnostic in admin header');
 assert.doesNotMatch(headline,/ЗА ЕКСПЕРТНА ПРОВЕРКА/,which+' technical diagnostic in subject heading');
 assert.match(headline,/по КККР на /,which+' original cadastral heading phrase');
 assert.doesNotMatch(phrase(p[6])+' '+phrase(p[7]),/НЯМА ДАННИ|името на възложителя не е установено|не е посочен адрес за кореспонденция/,which+' verbose or non-etalon administrative placeholders');
 return p;
}

async function test(name,blob,variable){
 const got=pList(await blob.arrayBuffer()),original=pList(fs.readFileSync(path.join(base,'etalon',name+'.docx')));
 assert.equal(got.p.length,original.p.length,name+' paragraph count');
 let compared=0;
 for(let i=0;i<got.p.length;i++){
  if(variable.includes(i))continue;
  assert.equal(got.serial.serializeToString(got.p[i]),original.serial.serializeToString(original.p[i]),name+' paragraph '+i+' changed');
  compared++;
 }
 for(const x of Object.keys(original.z).filter(k=>k.startsWith('word/media/')||k.startsWith('word/header')||k.startsWith('word/footer'))){
  assert.deepEqual(Buffer.from(got.z[x]),Buffer.from(original.z[x]),name+' modified '+x);
 }
 console.log(name, 'PASS',got.p.length,'paragraphs',compared,'unchanged paragraphs');
}
// KT47: check the actual production EKATTE mapping in the package source
// rather than a test-only copy of its code.
const packageSource=fs.readFileSync(path.join(base,'v26-draft-package.js'),'utf8');
const kt47Start=packageSource.indexOf('const KT47_EKATTE=');
const kt47End=packageSource.indexOf('async function make(results,roles,register)',kt47Start);
assert(kt47Start>=0&&kt47End>kt47Start,'KT47 EKATTE helper missing');
const ekatteSandbox={};
vm.runInNewContext(packageSource.slice(kt47Start,kt47End)+ '\nthis.verify=kt47VerifiedAdministration;',ekatteSandbox);
for(const fixture of [
 {id:'56784.13.102',settlement:'гр. Пловдив',municipality:'Пловдив',region:'Пловдив'},
 {id:'36676.129.457',settlement:'с. Катуница',municipality:'Садово',region:'Пловдив'}
]){
 const m={settlement:fixture.settlement};
 ekatteSandbox.verify([{input:fixture.id}],m);
 assert.equal(m.municipality,fixture.municipality,'KT47 municipality for '+fixture.id);
 assert.equal(m.region,fixture.region,'KT47 region for '+fixture.id);
 assert.match(m.kt47EkatteSource,/nsi\.bg/,'KT47 official evidence link');
}
const contradictory={settlement:'с. Катуница',municipality:'Пловдив'};
ekatteSandbox.verify([{input:'36676.129.457'}],contradictory);
assert.equal(contradictory.municipality,'Пловдив','KT47 must not overwrite conflicting confirmed administration');
assert.equal(contradictory.region,undefined,'KT47 must not supply data for contradictory cases');
const mixed={};
ekatteSandbox.verify([{input:'56784.13.102'},{input:'36676.129.457'}],mixed);
assert.equal(mixed.municipality,undefined,'KT47 mixed settlements cannot borrow one municipality');
console.log('KT47 EKATTE PASS: two official cadastral mappings; contradictory and mixed cases safely rejected');
(async()=>{
 await test('KT35-A',await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}}),[0,1,6,7,10,16,17,23]);
 const approvedA=await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}});
 checkHeadingEtalonRuns(await approvedA.arrayBuffer(),'A');
 assertKT46ClassicalLayout(await approvedA.arrayBuffer(),'A');
 await test('KT39-B',await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}}),[6,7,10,16,17]);
 const approvedB=await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}});
 checkHeadingEtalonRuns(await approvedB.arrayBuffer(),'B');
 assertKT46ClassicalLayout(await approvedB.arrayBuffer(),'B');
 await test('V27-R02',await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:meta,aiDraft:'',parcels:[]},{requireAiAuthor:true}),[6,7,10,17,18,24]);
 const approvedE=await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:meta,aiDraft:'',parcels:[]},{requireAiAuthor:true});
 checkHeadingEtalonRuns(await approvedE.arrayBuffer(),'E');
 const aWithDuplicatedSubject={...meta,
  subject:'„Складове за промишлени стоки и офиси“ в ПИ с идентификатор 56784.13.102, населено място гр. Пловдив, местност Рогошко шосе - север',
  location:'населено място гр. Пловдив, местност Рогошко шосе - север',
  recipient:'ДО ВЪЗЛОЖИТЕЛЯ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ',
  address:'Адрес за кореспонденция: [ЗА ПОПЪЛВАНЕ]'};
 const caseA=await sandbox.V26TemplateWord.make('А',verified,aWithDuplicatedSubject,{determination:{scenario:'А',zones:[]}});
 const resultA=checkAdministrative(await caseA.arrayBuffer(),'A','Складове за промишлени стоки и офиси','56784.13.102');
 assertKT46ClassicalLayout(await caseA.arrayBuffer(),'A');
 assert.doesNotMatch(phrase(resultA[17]),/попада в обхвата на чл\. 2, ал\. 2/, 'A must not inherit procedural determination');
 assert.match(phrase(resultA[23]),/НЯМА ДАННИ/, 'A nearest zone must use GIS verified data, not sample BG0000578');
 assert.doesNotMatch(phrase(resultA[23]),/BG0000578/, 'A specimen nearest zone must not leak');
 assert.equal(phrase(resultA[6]),'Възложителя: ХХХХХХХХХХХХ','A recipient approved placeholder');
 assert.equal(phrase(resultA[7]),'Адрес: ХХХХХХХХХХХХ','A address approved placeholder');
 assert.doesNotMatch(phrase(resultA[10]),/север“ в поземлени/,'A trailing quote regression');
 const expertA=await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:aWithDuplicatedSubject,aiDraft:'',parcels:[]},{requireAiAuthor:true});
 const expertAp=checkAdministrative(await expertA.arrayBuffer(),'E','Складове за промишлени стоки и офиси','56784.13.102');
 assert.equal(phrase(expertAp[7]),'Адрес: ХХХХХХХХХХХХ','expert A approved address placeholder');
 console.log('KT44 A ADMINISTRATION PASS: subject de-duplication, address/recipient, complete legal introduction');
 const realApprovedLike={...meta,approvedSpecimen:false};
 const realA=await sandbox.V26TemplateWord.make('А',[
  '[ЗА ЕКСПЕРТНА ПРОВЕРКА — предмет]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — ток]',
  '[ЗА ЕКСПЕРТНА ПРОВЕРКА — вода]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — отпадъчни води]'
 ],realApprovedLike,{determination:{scenario:'А',zones:[]}});
 const realAp=pList(await realA.arrayBuffer()).p;
 assert.doesNotMatch(phrase(realAp[18]),/се предвижда складов обект/,'Real dossier cannot inherit specimen warehouse description');
 assert.match(phrase(realAp[18]),/подлежат на уточняване/,'Real dossier must retain evidence uncertainty');
 assert.doesNotMatch(phrase(realAp[17]),/попада в обхвата на чл\. 2, ал\. 2/,'Real dossier cannot inherit specimen procedure');
 assert.match(phrase(realAp[23]),/НЯМА ДАННИ/,'Real dossier cannot inherit specimen nearest zone');
 console.log('KT47 REAL-DOSSIER GUARD PASS: matching IDs do not authorize copying exemplar legal/factual sections');
 const differing={...meta,parcelIds:'36676.129.457',subject:'Учебен казус — изпитване на сценарий с пресичане',location:'местност Попското',locality:'Попското',settlement:'с. Катуница',municipality:'Садово',region:'Пловдив',procedureFinding:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — приложима процедура]'};
 const syntheticB=await sandbox.V26TemplateWord.make('Б',verified,differing,{determination:{scenario:'Б',zones:['BG0000194']}});
 const caseB=checkAdministrative(await syntheticB.arrayBuffer(),'B','Учебен казус','36676.129.457')&&pList(await syntheticB.arrayBuffer());
 assertKT46ClassicalLayout(await syntheticB.arrayBuffer(),'B');
 assert.doesNotMatch(phrase(caseB.p[17]),/попада в обхвата на чл\. 2, ал\. 2/, 'B must not inherit sample procedural assertion');
 assert.equal(caseB.p.length,43);
 assert.match(phrase(caseB.p[23]),/36676\.129\.457/);
 assert.match(phrase(caseB.p[10]),/по КККР на с\. Катуница, местност „Попското“, община Садово, област Пловдив/,'case B full place name');
 assert.match(phrase(caseB.p[23]),/BG0000194.*Река Чая/,'classic B zone name');
 assert.match(phrase(caseB.p[24]),/BG0000194.*Река Чая/,'classic B missing zone in legal paragraph');
 assert.doesNotMatch(phrase(caseB.p[24]),/зони:\s*\./,'no empty zones');

 // KT48: five approved bullet directions must survive intact in both A/B.
 for(const [name,actual,first,original] of [
  ['A',realAp,26,pList(fs.readFileSync(path.join(base,'etalon','KT35-A.docx'))).p],
  ['B',caseB.p,28,pList(fs.readFileSync(path.join(base,'etalon','KT39-B.docx'))).p]
 ]){
  for(let i=0;i<5;i++)
   assert.equal(phrase(actual[first+i]),phrase(original[first+i]),'KT48 '+name+' approved impact direction '+(i+1)+' was rewritten');
 }
 assert.doesNotMatch(phrase(realAp[24])+phrase(realAp[25]),/удостоверява пространствено пресичане|самото пресичане|ГИС анализът установява.*пресичане/i,'KT48 A cannot invent intersection');
 assert.match(phrase(realAp[24]),/приложения № 1 и № 2|Приложения № 1 и № 2/,'KT48 A preserve ZOOS legal subject');
 assert.match(phrase(caseB.p[25]),/Допустимостта/,'KT48 B preserve admissibility subject');
 assert.match(phrase(caseB.p[33]),/Окончателен процедурен извод не е установен/,'KT48 unknown procedure is not an invented ruling');
 assert.doesNotMatch(phrase(caseB.p[24]),/BG0000578|Река Марица|РД-728/,'KT48 B cannot inherit original specimen zone order');
 console.log('KT48 A/B PASS: original 10 classical impact bullet directions immutable; factual and legal scenarios separated');
 const ai='[[CHARACTERIZATION]]\nУчебно описание на ИП.\n[[LEGAL]]\nОтносимите режими подлежат на проверка.\n[[PROCEDURE]]\nПриложимата процедура се преценява от компетентния орган.\n[[IMPACTS]]\nВъздействията се преценяват след преглед на пълната преписка.';
 const draft={schema:'KT13_EXPERT_DRAFT_V1',scenario:'Б',metadata:differing,aiDraft:ai,parcels:[{id:'36676.129.457'}],characterization:verified,zones:['BG0000194']};
 const incomplete=['[ЗА ЕКСПЕРТНА ПРОВЕРКА — характер на дейности]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — електрозахранване]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — водоснабдяване]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — отпадъчни води]'];
 const incompleteBlob=await sandbox.V26TemplateWord.make('Б',incomplete,differing,{determination:{scenario:'Б',zones:['BG0000194']}});
 const incompleteB=pList(await incompleteBlob.arrayBuffer());
 assert.match(phrase(incompleteB.p[18]),/проектът|Предметът/,'review must be substantive');
 assert.match(phrase(incompleteB.p[29]),/Видове|видове|местообитания/,'review must identify specific impact pathways');

 assert.equal(incompleteB.p.length,43);
 for(let i=18;i<=21;i++){
  assert.doesNotMatch(phrase(incompleteB.p[i]),/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|непотвърдени параметри и източници/, 'no internal QA markers in classical characteristics '+i);
  assert.match(phrase(incompleteB.p[i]),/подлежат на (?:уточняване|потвърждение)/, 'evidence uncertainty must remain explicit '+i);
 }
 assert.doesNotMatch(phrase(incompleteB.p[18]),/складов обект/i);
 console.log('KT46 INCOMPLETE DOSSIER PASS: four administrative characteristics contain explicit evidence reservations without internal QA markers');
 const expertB=await sandbox.V26ExpertWord.make(draft,{requireAiAuthor:true});
 checkAdministrative(await expertB.arrayBuffer(),'E','Учебен казус','36676.129.457');
 const resultE=pList(await expertB.arrayBuffer());
 assert.equal(resultE.p.length,49);
 assert.doesNotMatch(phrase(resultE.p[18]),/попада в обхвата на чл\. 2, ал\. 2/, 'expert must not copy sample decision');
 assert.match(phrase(resultE.p[25]),/Относимите режими подлежат на проверка/, 'safe AI legal content must actually enter expert Word');
 assert.match(phrase(resultE.p[39]),/окончателен процедурен извод не е установен/);
 assert.match(phrase(resultE.p[23]),/36676\.129\.457/);
 assert.match(phrase(resultE.p[10]),/по КККР на с\. Катуница, местност „Попското“, община Садово, област Пловдив/,'expert B full place');
 assert.match(phrase(resultE.p[24]),/BG0000194.*Река Чая/,'expert B zone');
 assert.ok((phrase(resultE.p[21]).match(/ЗА ЕКСПЕРТНА ПРОВЕРКА/g)||[]).length<=1,'AI characterization repeated review markers');
 assert.match(phrase(resultE.p[26]),/чл\. 2, ал\. 1, т\. 2/,'KT48 expert B approved R02 procedural hypothesis');

 // KT48: the non-intersection Expert R02 must not recycle the B scenario.
 const actualExpertA=await sandbox.V26ExpertWord.make({...draft,scenario:'А',metadata:{...realApprovedLike,parcelIds:'56784.13.102, 56784.13.105, 56784.13.106'},zones:[]},{requireAiAuthor:true});
 const expAp=pList(await actualExpertA.arrayBuffer()).p;
 for(const i of [23,25,26,27,28,39])
  assert.doesNotMatch(phrase(expAp[i]),/удостоверява пространствено пресичане|установено пространствено пресичане|Наличието на пресичане/i,'KT48 Expert A GI contradiction in paragraph '+i);
 assert.match(phrase(expAp[26]),/чл\. 2, ал\. 1, т\. 2/,'KT48 Expert A retains approved R02 legal anchor');
 assert.match(phrase(expAp[27]),/чл\. 2, ал\. 2/,'KT48 Expert A retains approved R02 paragraph 27');
 assert.match(phrase(expAp[28]),/ЗООС/,'KT48 Expert A retains R02 ZOOS reasoning');
 assert.match(phrase(resultE.p[26]),/чл\. 2, ал\. 1, т\. 2/,'KT48 Expert B retains approved R02 statutory analysis');
 const approvedR02=pList(fs.readFileSync(path.join(base,'etalon','V27-R02.docx'))).p;
 for(const [which,actual] of [['A',expAp],['B',resultE.p]]){
  for(let j=0;j<5;j++){
   const title=phrase(approvedR02[32+j]).split(/\.\s/)[0].trim();
   assert.ok(phrase(actual[32+j]).startsWith(title+'.'),'KT48 Expert '+which+' impact direction '+j+' must retain R02 heading');
   assert.doesNotMatch(phrase(actual[32+j]),/\[ЗА ЕКСПЕРТНА ПРОВЕРКА/,'KT48 Expert '+which+' impact direction '+j+' unfinished marker');
  }
 }
 console.log('KT48 EXPERT IMPACT PASS: five R02 headings in A and B');
 if(process.env.V27_WORD_BRIDGE){
  // Explicit KT42 evidence gate: fluent wording without a traceable reference
  // must not be inserted as a verified legal conclusion.
  const unverifiedMeta={...differing,legalParagraphs:[
   'НЕПОТВЪРДЕН ПРАВЕН ИЗВОД: допустимостта е установена.',
   'НЕПОТВЪРДЕН ПРАВЕН ИЗВОД: режимът позволява инвестицията.',
   'НЕПОТВЪРДЕН ПРАВЕН ИЗВОД: приложимостта е изключена.',
   'НЕПОТВЪРДЕН ПРАВЕН ИЗВОД: въздействия няма.'
  ],legalFindingSources:[]};
  const noSource=await sandbox.V26TemplateWord.make('Б',verified,unverifiedMeta,{determination:{scenario:'Б',zones:['BG0000194']}});
  const noSourcePs=pList(await noSource.arrayBuffer()).p;
  for(const i of [22,25,26,27])assert.doesNotMatch(phrase(noSourcePs[i]),/НЕПОТВЪРДЕН ПРАВЕН ИЗВОД/,'KT49 source provenance required in Classic B paragraph '+i);
  const sourcedMeta={...unverifiedMeta,legalParagraphs:['','Документално проверено съответствие — тестов факт.','',''],legalFindingSources:['','Дело А, стр. 5','','']};
  const withSource=await sandbox.V26TemplateWord.make('Б',verified,sourcedMeta,{determination:{scenario:'Б',zones:['BG0000194']}});
  assert.equal(phrase(pList(await withSource.arrayBuffer()).p[25]),'Документално проверено съответствие — тестов факт.','KT49 sourced legal paragraph must still be used');
  const sixImpacts=['Обобщение на проверените направления.','Факт за възможното пряко засягане.','Факт за видовете и местообитанията.','Факт за безпокойството.','Факт за екологичните връзки.','Факт за съвкупните въздействия.'];
  const specialAI=ai.slice(0,ai.indexOf('[[IMPACTS]]'))+'[[IMPACTS]]'+String.fromCharCode(10,10)+sixImpacts.join(String.fromCharCode(10,10));
 const parsedLabels=[...specialAI.matchAll(/^\\s*\\[\\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\\]\\]\\s*$/gm)].map(x=>x[1]);
  assert.deepEqual(parsedLabels,['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'],'KT49 AI fixture must contain four sections');
  const specialDraft={...draft,aiDraft:specialAI};
  const sixDoc=await sandbox.V26ExpertWord.make(specialDraft,{requireAiAuthor:true});
  const sixPs=pList(await sixDoc.arrayBuffer()).p;
  for(let i=0;i<5;i++){
   const title=phrase(approvedR02[32+i]).split(/\.\s/)[0].trim();
   assert.ok(phrase(sixPs[32+i]).startsWith(title+'.'),'KT49 AI must retain approved impact heading '+i);
   assert.match(phrase(sixPs[32+i]),/Факт за/,'KT49 AI evidence detail must be included under original heading '+i);
  }
  console.log('KT49 KT42 SOURCE GATE PASS: 4 unverified legal conclusions rejected; sourced legal text accepted; 5 expert R02 impact headings preserved with AI details');
 }

 console.log('KT48 Expert R02 PASS: original legal architecture, A/B scenario safeguards and no unsupported final outcome');
 console.log('KT43 regression PASS: scenario B creates both reviewed DOCX drafts without unverified legal or procedure conclusions');
})().catch(e=>{console.error(e);process.exitCode=1});
