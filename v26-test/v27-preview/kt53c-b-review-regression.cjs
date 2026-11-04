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
vm.runInNewContext(fs.readFileSync(path.join(base,'kt53c-b-review-word.js'),'utf8'),sandbox,{filename:'kt53c-b-review-word.js'});
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
 await test('KT35-A',await sandbox.V26TemplateWord.make('А',verified,meta,{determination:{scenario:'А',zones:[]}}),[6,7,10,16]);
 await test('KT39-B',await sandbox.V26TemplateWord.make('Б',verified,meta,{determination:{scenario:'Б',zones:['BG0000578']}}),[6,7,10,16]);
 await test('V27-R02',await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',metadata:meta,aiDraft:'',parcels:[]},{requireAiAuthor:true}),[6,7,10,17]);

 // KT53-C B-only missing-evidence route: generate a review draft rather than inventing a legal result.
 const bmeta={...meta,parcelIds:'36676.129.457',subject:'Инвестиционно предложение за експертна проверка',
  legalParagraphs:[],impactFindings:[],procedureFinding:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — приложима процедура]'};
 const bd={scenario:'Б',zones:['BG0000194']};
 const bClassic=await sandbox.V26TemplateWord.make('Б',verified,bmeta,{determination:bd});
 const bxml=pList(await bClassic.arrayBuffer());
 assert.equal(bxml.p.length,43,'B classic paragraph count');
 assert(phrase(bxml.p[23]).includes('36676.129.457'),'B actual parcel number');
 assert(phrase(bxml.p[23]).includes('BG0000194'),'B verified spatial zone');
 assert(phrase(bxml.p[33]).includes('подлежат на експертно произнасяне'),'B non-conclusive draft');
 for(const i of [22,25,26,27,28,29,30,31,32])assert(!phrase(bxml.p[i]).includes('56784.13.'),'no old case parcel in B variable content');
 const fakeAi='[[CHARACTERIZATION]]\nПроверена характеристика\n\nИнженерни дейности\n[[LEGAL]]\nПриложими нормативни рамки\n\nОбхват на проверка\n[[PROCEDURE]]\nПроцедурна преценка за експертна проверка\n[[IMPACTS]]\nОбобщена преценка\n\nВъздействие 1\n\nВъздействие 2\n\nВъздействие 3\n\nВъздействие 4\n\nВъздействие 5';
 const bExpert=await sandbox.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'Б',zones:['BG0000194'],metadata:bmeta,aiDraft:fakeAi,characterization:verified,parcels:[]},{requireAiAuthor:true});
 const exml=pList(await bExpert.arrayBuffer());
 assert.equal(exml.p.length,49,'B expert paragraph count');
 assert(phrase(exml.p[39]).includes('подлежи на експертна проверка'),'B expert review-only conclusion');
 assert(phrase(exml.p[23]).includes('BG0000194'),'B expert case-specific geometry');
 console.log('KT53-C B review-only classic and expert generation PASS');

 const differing={...meta,parcelIds:'12345.1.1',subject:'Различно предложение'};
 await assert.rejects(async()=>sandbox.V26TemplateWord.make('А',verified,differing,{determination:{scenario:'А',zones:[]}}),/липсват доказани правни основания/);
 console.log('KT50 PRE-KT43 regression PASS: exact approved source, 3 DOCX content checks, unrelated case rejected. This is NOT proof of general case drafting.');
})().catch(e=>{console.error(e);process.exitCode=1});
