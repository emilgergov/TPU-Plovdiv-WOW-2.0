/* KT42: test real approved Word files, not just source-code flags. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const fflate=require('fflate');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const base='v26-test/v27-preview';
const demo=new DOMParser().parseFromString('<r><x/><y/></r>','application/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const sandbox={fflate,DOMParser,XMLSerializer,Blob,TextDecoder,TextEncoder,console,document:{},V26TemplateWord:{make(){throw Error('should not call old generator');},templatePaths:{A:'',B:''}},V26ExpertWord:{make(){throw Error('should not call old generator');}}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
sandbox.fetch=async url=>{
 const filepath=path.join('v26-test',url);
 const buffer=fs.readFileSync(filepath);
 return {ok:true,arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)};
};
vm.runInNewContext(fs.readFileSync(path.join(base,'v27-kt41-etalon-bridge.js'),'utf8'),sandbox,{filename:'v27-kt41-etalon-bridge.js'});
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
const meta={parcelIds:'56784.13.102, 56784.13.105, 56784.13.106',subject:'Складове за промишлени стоки и офиси',recipient:'Възложителя: контролна преписка',address:'Адрес: контролен',incomingReference:'Вх. № ОВОС-9999 / ДАТА-99.99.9999 г.',location:'гр. Пловдив, местност Рогошко шосе'};
const verified=['С реализацията на инвестиционното предложение се предвижда складов обект','Електрозахранване','Водоснабдяване','Отпадъчни води'];
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
 assert.equal((headline.match(/„/g)||[]).length,1,which+' opening quotes');
 assert.equal((headline.match(/“/g)||[]).length,1,which+' closing quotes');
 assert.equal((headline.match(new RegExp(ids.replace(/\./g,'\\.'),'g'))||[]).length,1,which+' duplicate parcel');
 assert.ok(headline.includes(subject),which+' missing subject');
 assert.match(intro,/Наредба за условията и реда за извършване на оценка за съвместимостта/,which+' shortened ordinance');
 assert.doesNotMatch(phrase(p[6]),/^ДО ВЪЗЛОЖИТЕЛЯ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ$/,which+' generic recipient');
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
(async()=>{
 await test('KT35-A',await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}}),[6,7,10,16]);
 const approvedA=await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}});
 checkHeadingEtalonRuns(await approvedA.arrayBuffer(),'A');
 await test('KT39-B',await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}}),[6,7,10,16]);
 const approvedB=await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}});
 checkHeadingEtalonRuns(await approvedB.arrayBuffer(),'B');
 await test('V27-R02',await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:meta,aiDraft:'',parcels:[]},{requireAiAuthor:true}),[6,7,10,17]);
 const approvedE=await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:meta,aiDraft:'',parcels:[]},{requireAiAuthor:true});
 checkHeadingEtalonRuns(await approvedE.arrayBuffer(),'E');
 const aWithDuplicatedSubject={...meta,
  subject:'„Складове за промишлени стоки и офиси“ в ПИ с идентификатор 56784.13.102, населено място гр. Пловдив, местност Рогошко шосе - север',
  location:'населено място гр. Пловдив, местност Рогошко шосе - север',
  recipient:'ДО ВЪЗЛОЖИТЕЛЯ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ',
  address:'Адрес за кореспонденция: [ЗА ПОПЪЛВАНЕ]'};
 const caseA=await sandbox.V26TemplateWord.make('А',verified,aWithDuplicatedSubject,{determination:{scenario:'А',zones:[]}});
 const resultA=checkAdministrative(await caseA.arrayBuffer(),'A','Складове за промишлени стоки и офиси','56784.13.102');
 assert.match(phrase(resultA[6]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/,'A recipient missing flag');
 assert.match(phrase(resultA[7]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/,'A address missing flag');
 assert.doesNotMatch(phrase(resultA[10]),/север“ в поземлени/,'A trailing quote regression');
 const expertA=await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:aWithDuplicatedSubject,aiDraft:'',parcels:[]},{requireAiAuthor:true});
 const expertAp=checkAdministrative(await expertA.arrayBuffer(),'E','Складове за промишлени стоки и офиси','56784.13.102');
 assert.match(phrase(expertAp[7]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/);
 console.log('KT44 A ADMINISTRATION PASS: subject de-duplication, address/recipient, complete legal introduction');
 const differing={...meta,parcelIds:'36676.129.457',subject:'Учебен казус — изпитване на сценарий с пресичане',location:'местност Попското',settlement:'с. Катуница',municipality:'Садово',region:'Пловдив',procedureFinding:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — приложима процедура]'};
 const syntheticB=await sandbox.V26TemplateWord.make('Б',verified,differing,{determination:{scenario:'Б',zones:['BG0000194']}});
 const caseB=checkAdministrative(await syntheticB.arrayBuffer(),'B','Учебен казус','36676.129.457')&&pList(await syntheticB.arrayBuffer());
 assert.equal(caseB.p.length,43);
 assert.match(phrase(caseB.p[23]),/36676\.129\.457/);
 assert.match(phrase(caseB.p[10]),/с\. Катуница, местност Попското, община Садово, област Пловдив/,'case B full place name');
 assert.match(phrase(caseB.p[23]),/BG0000194.*Река Чая/,'classic B zone name');
 assert.match(phrase(caseB.p[24]),/BG0000194.*Река Чая/,'classic B missing zone in legal paragraph');
 assert.doesNotMatch(phrase(caseB.p[24]),/зони:\s*\./,'no empty zones');

 assert.match(phrase(caseB.p[33]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/);
 assert.match(phrase(caseB.p[25]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/);
 const ai='[[CHARACTERIZATION]]\nУчебно описание на ИП.\n[[LEGAL]]\nОтносимите режими подлежат на проверка.\n[[PROCEDURE]]\nПриложимата процедура се преценява от компетентния орган.\n[[IMPACTS]]\nВъздействията се преценяват след преглед на пълната преписка.';
 const draft={schema:'KT13_EXPERT_DRAFT_V1',scenario:'Б',metadata:differing,aiDraft:ai,parcels:[{id:'36676.129.457'}],characterization:verified,zones:['BG0000194']};
 const incomplete=['[ЗА ЕКСПЕРТНА ПРОВЕРКА — характер на дейности]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — електрозахранване]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — водоснабдяване]','[ЗА ЕКСПЕРТНА ПРОВЕРКА — отпадъчни води]'];
 const incompleteBlob=await sandbox.V26TemplateWord.make('Б',incomplete,differing,{determination:{scenario:'Б',zones:['BG0000194']}});
 const incompleteB=pList(await incompleteBlob.arrayBuffer());
 assert.match(phrase(incompleteB.p[18]),/проектът|Предметът/,'review must be substantive');
 assert.match(phrase(incompleteB.p[29]),/Видове|видове|местообитания/,'review must identify specific impact pathways');

 assert.equal(incompleteB.p.length,43);
 for(let i=18;i<=21;i++)assert.match(phrase(incompleteB.p[i]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/);
 assert.doesNotMatch(phrase(incompleteB.p[18]),/складов обект/i);
 console.log('KT43 INCOMPLETE DOSSIER PASS: four characteristics are review fields, not copied conclusions');
 const expertB=await sandbox.V26ExpertWord.make(draft,{requireAiAuthor:true});
 checkAdministrative(await expertB.arrayBuffer(),'E','Учебен казус','36676.129.457');
 const resultE=pList(await expertB.arrayBuffer());
 assert.equal(resultE.p.length,49);
 assert.match(phrase(resultE.p[39]),/ЗА ЕКСПЕРТНА ПРОВЕРКА/);
 assert.match(phrase(resultE.p[23]),/36676\.129\.457/);
 assert.match(phrase(resultE.p[10]),/с\. Катуница, местност Попското, община Садово, област Пловдив/,'expert B full place');
 assert.match(phrase(resultE.p[24]),/BG0000194.*Река Чая/,'expert B zone');
 assert.ok((phrase(resultE.p[21]).match(/ЗА ЕКСПЕРТНА ПРОВЕРКА/g)||[]).length<=1,'AI characterization repeated review markers');
 assert.match(phrase(resultE.p[26]),/чл\. 31|зона|режим/,'expert B legal references');

 console.log('KT43 regression PASS: scenario B creates both reviewed DOCX drafts without unverified legal or procedure conclusions');
})().catch(e=>{console.error(e);process.exitCode=1});
