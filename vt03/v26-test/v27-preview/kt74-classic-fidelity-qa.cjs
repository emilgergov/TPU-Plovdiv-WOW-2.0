'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const demo=new DOMParser().parseFromString('<r><x/><y/></r>','text/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const base='v26-test/v27-preview';
const fetchData=async name=>{const b=fs.readFileSync(path.join('v26-test',String(name)));return {ok:true,blob:async()=>new Blob([b]),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
const ctx={fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,console,fetch:fetchData,
 V26TemplateWord:{make:async()=>{throw Error('base writer missing')}},
 V26ExpertWord:{make:async()=>{throw Error('expert stub')}}};
vm.createContext(ctx);
for(const name of ['v27-kt50-original-kt42.js','kt69-classic-b-etalon-restore.js']){
 vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),ctx,{filename:name});
}
const pre74=ctx.V26TemplateWord.make,expert=ctx.V26ExpertWord;
vm.runInContext(fs.readFileSync(path.join(base,'kt74-classic-fidelity.js'),'utf8'),ctx,{filename:'kt74-classic-fidelity.js'});
ctx.window=ctx;
vm.runInContext(fs.readFileSync(path.join(base,'kt66-locked-content-qa.js'),'utf8'),ctx);
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const pars=blob=>blob.arrayBuffer().then(buf=>{
 const z=fflate.unzipSync(new Uint8Array(buf)),xml=new DOMParser().parseFromString(new TextDecoder().decode(z['word/document.xml']),'text/xml');
 const ps=Array.from(xml.getElementsByTagNameNS(NS,'body')[0].children).filter(p=>p.localName==='p');
 return {z,ps,txt:ps.map(p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent).join(''))};
});
const meta={subject:'Изграждане на малък обслужващ обект',parcelIds:'36676.129.457',
 location:'с. Катуница, местност „Попското“, община Садово, област Пловдив',
 incomingReference:'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',recipient:'Възложителя: ХХХХХХХХХХХХХ',
 address:'Адрес: ХХХХХХХХХХХХХХ',nearestZone:'НЯМА ДАННИ',
 legalParagraphs:['Предназначението и начинът на трайно ползване на имота се проверяват по КККР.',
 'Допустимостта се преценява спрямо режимите на засегнатата защитена зона.',
 'Приложения № 1 и № 2 по ЗООС се анализират според обхвата на ИП.',
 'Възможните въздействия се проверяват спрямо установеното пространствено пресичане.'],
 impactFindings:['Потенциално засягане на местообитания подлежи на преценка.','Възможно безпокойство на видове се преценява.',
 'Целостта на зоната се разглежда по дейности.','Кохерентността между зони се съобразява.',
 'Съвкупните въздействия подлежат на проверка.'],
 procedureFinding:'Окончателен процедурен извод не е установен без пълната преписка.'};
const char=['Предвижда се обслужващ обект в конкретния имот.','Електроснабдяването се уточнява.',
 'Водоснабдяването се уточнява.','Отпадъчните води подлежат на уточняване.'];
const test=async()=>{
 for(const [scenario,metadata,zones] of [
 ['Б',meta,['BG0000194']],
 ['А',{...meta,parcelIds:'56784.13.102, 56784.13.105, 56784.13.106',location:'гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив'},[]]
 ]){
  const context={determination:{scenario,zones}};
  const before=await pars(await pre74(scenario,char,metadata,context));
  const result=await ctx.V26TemplateWord.make(scenario,char,metadata,context);
  const after=await pars(result);
  assert.equal(after.ps.length,scenario==='А'?41:43);
  assert.match(after.txt[16],/чл\. 6а, т\. 2 от Наредбата за условията и реда за извършване на оценка за съвместимостта/);
  assert.match(after.txt[16],/ДВ, бр\. 73 от 11\.09\.2007 г\., изм\. и доп\./);
  const rs=Array.from(after.ps[16].children).filter(r=>r.localName==='r');
  const italics=rs.filter(r=>r.getElementsByTagNameNS(NS,'i').length>0);
  assert.equal(italics.length,1,'exactly one italic citation in intro '+scenario);
  assert.match(italics[0].textContent,/Наредбата за ОС, обн\./);
  assert.match(after.txt[16],/Вх\. № ОВОС-ХХХХ\/ХХ\.ХХ\.ХХХХ г\./);
  assert.deepEqual(Object.keys(after.z).sort(),Object.keys(before.z).sort());
  for(const k of Object.keys(before.z))if(k!=='word/document.xml')assert.deepEqual(Buffer.from(after.z[k]),Buffer.from(before.z[k]),'Non-Word-body file changed '+scenario+' '+k);
  for(let i=0;i<after.ps.length;i++)if(![16,...(scenario==='Б'?[10,28,29]:[])].includes(i))assert.equal(after.txt[i],before.txt[i],scenario+' unexpected body text '+i);
  if(scenario==='Б'){
   assert.match(after.txt[10],/в поземлен имот с идентификатор 36676\.129\.457/);
   for(const i of [28,29])assert.match(after.txt[i],/засегнатата защитена зона/);
   for(const i of [28,29])assert.doesNotMatch(after.txt[i],/близко разполож/);
  }
  const packageBlob=new Blob([fflate.zipSync({
   '01_Proekt_na_stanovishte_Klasicheski.docx':new Uint8Array(await result.arrayBuffer()),
   '02_Proekt_na_stanovishte_Eksperten.docx':new Uint8Array(fs.readFileSync(path.join(base,'etalon','V27-R02.docx')))
  })]);
  const verified=await ctx.KT66ContentQA.verify(packageBlob,scenario);
  assert.equal(verified.classic.paragraphs,scenario==='А'?41:43);
  console.log('KT74 '+scenario+' PASS: intro full/italics, original assets, exact mutable ranges, KT66 ZIP verification');
 }
 assert.equal(ctx.V26ExpertWord,expert,'Expert generator must not change');
 console.log('KT74 COMPLETE PASS: A and B, Expert untouched');
};
test().catch(e=>{console.error(e);process.exitCode=1});
