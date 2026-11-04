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
 const differing={...meta,parcelIds:'12345.1.1',subject:'Различно предложение'};
 await assert.rejects(async()=>sandbox.V26TemplateWord.make('А',verified,differing,{determination:{scenario:'А',zones:[]}}),/липсват доказани правни основания/);
 console.log('KT42 regression PASS: approved content protected; other case fails safely');
})().catch(e=>{console.error(e);process.exitCode=1});
