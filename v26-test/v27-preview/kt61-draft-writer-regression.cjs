const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom'),fflate=require('fflate');
const dir=path.resolve(__dirname),f=p=>path.join(dir,p);
const docxml='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const parse=buf=>new DOMParser().parseFromString(buf.toString('utf8'),'application/xml');
const proto=Object.getPrototypeOf(parse(Buffer.from('<a/>')).documentElement);
if(!Object.getOwnPropertyDescriptor(proto,'children'))Object.defineProperty(proto,'children',{get(){return [...this.childNodes].filter(x=>x.nodeType===1)}});
const names=['KT35-A','KT39-B','V27-R02'],fixtures=Object.fromEntries(names.map(n=>[n,fs.readFileSync(f('etalon/'+n+'.docx'))]));
const approved=Object.fromEntries(names.map(n=>[n,fixtures[n].toString('base64')]));
const source={
 make:async()=>{throw Error('Approved-source writer should be called for approved case only');},
 templatePaths:{}
};
const win={fflate,V26TemplateWord:source,V26ExpertWord:source,KT61CurrentAiDraft:[
'[[CHARACTERIZATION]]','С инвестиционното предложение се предвижда изграждане на нов обект с площ около 400 кв. м.','',
'Електрозахранване от съществуваща мрежа. Водоснабдяване от съществуващ водопровод. Отпадъчните води ще се отвеждат съгласно заявеното техническо решение.','',
'[[LEGAL]]','Преценката е по приложимите разпоредби на Закона за биологичното разнообразие.','',
'Прилага се относимата наредба за оценка за съвместимост. Данните подлежат на проверка за конкретната преписка.','',
'[[PROCEDURE]]','Проектната процедурна преценка се извършва след съобразяване на устройственото и функционалното предназначение, както и ГИС пресичането.','',
'[[IMPACTS]]','Възможните преки въздействия се преценяват с оглед реализирането и използването на обекта.','',
'Косвените, кумулативните и временните въздействия се разглеждат съобразно доказаните характеристики на предложението.'
].join('\n')};
const mockFetch=async(url)=>{const file=String(url).split('/').pop();const bytes=fixtures[file.replace('.docx','')];if(!bytes)return {ok:false};return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}};
const ctx={window:win,DOMParser,XMLSerializer,TextDecoder,TextEncoder,Blob,fetch:mockFetch,console};
vm.runInNewContext(fs.readFileSync(f('kt61-draft-writer.js'),'utf8'),ctx,{filename:'kt61-draft-writer.js'});
const p=(binary)=>{const zip=fflate.unzipSync(new Uint8Array(binary));const doc=parse(Buffer.from(zip['word/document.xml']));const paras=[...doc.getElementsByTagNameNS(docxml,'body')[0].childNodes].filter(x=>x.localName==='p');const text=paras.map(x=>[...x.getElementsByTagNameNS(docxml,'t')].map(t=>t.textContent).join(''));return {zip,paras,text};};
(async()=>{
 const restore=win.KT61DraftWord.install();
 const m={subject:'Изграждане на нов обект в имот 36676.129.457',parcelIds:'36676.129.457',location:'с. Катуница, община Садово',recipient:'Тестов възложител',address:'Тестов адрес',incomingReference:'Вх. № ОВОС-XXXX'};
 const B=await win.V26TemplateWord.make('Б',['Описание на инвестиционното предложение с технически данни.','','',''],m,{determination:{scenario:'Б',zones:['BG0000194']}});
 const E=await win.V26ExpertWord.make({schema:'KT13_EXPERT_DRAFT_V1',scenario:'Б',zones:['BG0000194'],metadata:m,aiDraft:win.KT61CurrentAiDraft},{requireAiAuthor:true});
 const b=p(await B.arrayBuffer()),e=p(await E.arrayBuffer());
 assert.equal(b.paras.length,43);
 assert.equal(e.paras.length,49);
 for(const [name,d] of [['classic B',b],['expert R02',e]]){
  const markers=d.text.flatMap((value,i)=>/\[\[(?:CONCLUSION|CHARACTERIZATION|PROCEDURE|LEGAL|IMPACTS)\]\]/.test(value)?[{index:i,text:value.slice(0,180)}]:[]);
  console.log('KT61 remaining markers '+name,JSON.stringify(markers));
  assert.equal(markers.length,0,'KT61 must eliminate all original template control markers from '+name);
 }
 for(const d of [b,e]){
  assert(d.text.join('\n').includes('36676.129.457'));
  assert(!/56784\.13\.(?:102|105|106)|BG0000578|Рогошко шосе/.test(d.text.join('\n')));
  assert(!/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|\[ОТКЪС ОТ ПРЕПИСКАТА/.test(d.text.join('\n')));
  assert(Object.keys(d.zip).includes('word/styles.xml'));
 }
 assert(b.text[33].includes('Проектната процедурна преценка'));
 assert(e.text[39].includes('Проектната процедурна преценка'));
 restore();
 assert.equal(win.V26TemplateWord,source);assert.equal(win.V26ExpertWord,source);
 names.forEach(n=>assert.equal(fixtures[n].toString('base64'),approved[n]));
 console.log('KT61 Word B classic 43, expert 49: PASS');
 console.log('KT61 no copied case identifiers, no unknown placeholders, original word styles and approved fixtures unmodified: PASS');
 console.log('KT61 classic nonempty:',b.text.map((t,i)=>t?i:null).filter(x=>x!==null).join(','));
 console.log('KT61 expert nonempty:',e.text.map((t,i)=>t?i:null).filter(x=>x!==null).join(','));
})().catch(e=>{console.error(e);process.exitCode=1});
