/* KT42: test real approved Word files, not just source-code flags. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const crypto=require('node:crypto');
const fflate=require('fflate');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const base='v26-test/v27-preview';
const sourceBytes=fs.readFileSync(path.join(base,'v27-kt50-original-kt42.js'));
const historicalBlobSha=crypto.createHash('sha1').update('blob '+sourceBytes.length+String.fromCharCode(0)).update(sourceBytes).digest('hex');
assert.equal(historicalBlobSha,'2c879e0f743f9863051f4126769977e8f1dcf842','KT50 must be the exact original Git blob');
for(const [n,expected] of Object.entries({'KT35-A.docx':'1a495fc2d6047a6377e48dfb963a737502404087','KT39-B.docx':'508402ce5a631617bdc0da4ca9d9cd535b6b3b7c','V27-R02.docx':'335634ab930253671dc090391ed366867ca7e438'})){
 const bytes=fs.readFileSync(path.join(base,'etalon',n));
 const blob=Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0]),bytes]);
 assert.equal(crypto.createHash('sha1').update(blob).digest('hex'),expected,'Approved DOCX changed: '+n);
}
console.log('KT50 HISTORICAL SOURCE AND THREE EXACT APPROVED DOCX HASHES PASS');
const demo=new DOMParser().parseFromString('<r><x/><y/></r>','application/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const sandbox={fflate,DOMParser,XMLSerializer,Blob,TextDecoder,TextEncoder,console,document:{},V26TemplateWord:{make(){throw Error('should not call old generator');},templatePaths:{A:'',B:''}},V26ExpertWord:{make(){throw Error('should not call old generator');}}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
sandbox.fetch=async url=>{
 const filepath=path.join('v26-test',url);
 const buffer=fs.readFileSync(filepath);
 return {ok:true,arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)};
};
vm.runInNewContext(fs.readFileSync(path.join(base,'v27-kt51-admin-only.js'),'utf8'),sandbox,{filename:'v27-kt51-admin-only.js'});
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
 await test('KT35-A',await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}}),[0,1,6,7,10,16]);
 await test('KT39-B',await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}}),[6,7,10,16]);
 await test('V27-R02',await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:meta,aiDraft:'',parcels:[]},{requireAiAuthor:true}),[6,7,10,17]);
 const approvedA=pList(await (await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}})).arrayBuffer());
 const approvedB=pList(await (await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}})).arrayBuffer());
 for(let i=0;i<2;i++){
  const pPr=p=>Array.from(p.children).find(x=>x.localName==='pPr');
  assert.equal(approvedA.serial.serializeToString(pPr(approvedA.p[i])),approvedB.serial.serializeToString(pPr(approvedB.p[i])),'KT51 A and B confidentiality geometry must be exact');
  assert.equal(phrase(approvedA.p[i]),phrase(approvedB.p[i]),'KT51 confidentiality wording untouched');
 }
 const novel={...meta,parcelIds:'36676.129.457',subject:'Учебен обект с инженерни връзки в ПИ с идентификатор 36676.129.457, с. Катуница',location:'с. Катуница',settlement:'с. Катуница',municipality:'Садово',region:'Пловдив',recipient:'Възложителя: Тестови възложител',address:'Адрес: с. Катуница',legalParagraphs:Array.from({length:4},(_,i)=>'Проверено правно основание '+(i+1)),impactFindings:Array.from({length:5},(_,i)=>'Проверена характеристика на въздействието '+(i+1)),procedureFinding:'Доказателствено обоснован проект на процедурна преценка за експертна проверка'};
 const novelB=await sandbox.V26TemplateWord.make('Б',verified,novel,{determination:{scenario:'Б',zones:['BG0000194']}});
 const caseB=pList(await novelB.arrayBuffer()),heading=phrase(caseB.p[10]);
 assert.equal((heading.match(/36676\.129\.457/g)||[]).length,1,'KT51 cadastral ID repeated in heading');
 assert.ok(heading.includes('Катуница')&&heading.includes('община Садово')&&heading.includes('област Пловдив'),'KT51 verified locality omitted');
 assert.ok(phrase(caseB.p[33]).includes('Доказателствено обоснован'),'KT51 evidence-supplied procedure omitted');
 const etalonB=pList(fs.readFileSync(path.join(base,'etalon','KT39-B.docx')));
 for(const i of [0,1,2,3,4,5,8,9,11,12,13,14,15,17,34,35,36,37,38,39,40,41,42]){
  assert.equal(caseB.serial.serializeToString(caseB.p[i]),etalonB.serial.serializeToString(etalonB.p[i]),'KT51 B locked paragraph changed '+i);
 }
 for(const key of Object.keys(etalonB.z).filter(k=>/^(?:word\/(?:footer|header|media))/.test(k))){
  assert.deepEqual(Buffer.from(caseB.z[key]),Buffer.from(etalonB.z[key]),'KT51 B footer/media changed '+key);
 }
 const novelExpert={schema:'KT13_EXPERT_DRAFT_V1',scenario:'Б',metadata:novel,parcels:[],zones:['BG0000194'],characterization:verified,aiDraft:'[[CHARACTERIZATION]]\n\nПроверена характеристика\n\nДопълнително описание\n\n[[LEGAL]]\n\nПравен режим\n\nПравно основание\n\n[[PROCEDURE]]\n\nВъзможни процедури след експертна проверка\n\n[[IMPACTS]]\n\nНаправление на въздействие\n\nНаправление 2'};
 const expertB=await sandbox.V26ExpertWord.make(novelExpert,{requireAiAuthor:true});
 assert.equal(pList(await expertB.arrayBuffer()).p.length,49,'KT51 sourced expert B document failed');
 const unsupported={...novel,procedureFinding:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — приложима процедура]'};
 await assert.rejects(async()=>sandbox.V26TemplateWord.make('Б',verified,unsupported,{determination:{scenario:'Б',zones:['BG0000194']}}),/липсва потвърден процедурен извод/);
 console.log('KT51 A/B ADMIN PASS: A matches B confidentiality exactly, protected content unchanged, footers intact, verified new-case B works, unsupported procedure still rejected.');
 const differing={...meta,parcelIds:'12345.1.1',subject:'Различно предложение'};
 await assert.rejects(async()=>sandbox.V26TemplateWord.make('А',verified,differing,{determination:{scenario:'А',zones:[]}}),/липсват доказани правни основания/);
 console.log('KT51 REGRESSION PASS: original KT42 exact source still locked, approved DOCX untouched, only administrative changes; novel B requires verified legal, impact and procedure facts.');
})().catch(e=>{console.error(e);process.exitCode=1});
