'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const newHtml=fs.readFileSync('v26-test/v27-preview/KT76_02_EXPERT_B_TEST.html','utf8');
const kt75=fs.readFileSync('v26-test/v27-preview/V27_25_KT75_STABLE.html','utf8');
const oldA=fs.readFileSync('v26-test/v27-preview/KT76_01_NEAREST_A_TEST.html','utf8');
const moduleCode=fs.readFileSync('v26-test/v27-preview/kt76-02-expert-b-content.js','utf8');
assert.match(newHtml,/<h1>РИОСВ Пловдив - Тест EG<\/h1>/);
assert.match(newHtml,/<button id="extract">Обработи преписката<\/button>/);
assert.match(newHtml,/#extract\{background:#196849;color:#fff/);
assert(!newHtml.includes('<h1>ТПУ Пловдив · ИМОТИ</h1>'));
assert.match(newHtml,/kt76-02-expert-b-content\.js/);
assert.match(newHtml,/KT7602ExpertB\.fix\(kt76FinalBlob/);
assert(!kt75.includes('KT7602ExpertB'),'KT75 must remain immutable');
assert(!oldA.includes('KT7602ExpertB'),'KT76-01 approved A route must remain immutable');
for(const [i,m] of [...newHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())
 if(m[1].trim())new vm.Script(m[1],{filename:'KT76-02-inline-'+i+'.js'});
new vm.Script(moduleCode,{filename:'kt76-02-expert-b-content.js'});
const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const demo=new DOMParser().parseFromString('<r><x/></r>','text/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const ctx={window:{fflate},fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,Error,console};
vm.createContext(ctx);vm.runInContext(moduleCode,ctx);
function docx(count,expert){
 const text=i=>i===10?'Относно: проект в поземлен имот 36676.129.457':i===17?'Във връзка с преписката, на основание чл. 6а от Наредбата за ОС е изготвен експертен проект.':i===23?'Поземленият имот попада изцяло или частично в BG0000194.':i===26?'С оглед GIS данните ... BG0000194 „Река Чая“.':i===38?'При определяне на процедурния ред в BG0000194 „Река Чая“ ...':'Еталонен абзац '+i;
 const ps=Array.from({length:count},(_,i)=>'<w:p><w:r><w:t xml:space="preserve">'+text(i)+'</w:t></w:r></w:p>').join('');
 const xml='<w:document xmlns:w="'+ns+'"><w:body>'+ps+'</w:body></w:document>';
 return fflate.zipSync({'word/document.xml':new TextEncoder().encode(xml),'word/styles.xml':new TextEncoder().encode('SAVED-STYLES'),'word/header1.xml':new TextEncoder().encode('SAVED-HEADER'),'word/footer1.xml':new TextEncoder().encode('SAVED-FOOTER'),'word/media/logo.txt':new TextEncoder().encode('SAVED-LOGO')});
}
const classic=docx(43,false),expert=docx(49,true);
const pdf=new TextEncoder().encode('%PDF-1.7 KEPT');
const entries={'01_Proekt_na_stanovishte_Klasicheski.docx':classic,'02_Proekt_na_stanovishte_Eksperten.docx':expert,'03_GIS_analiz.pdf':pdf,'04_Normativni_i_dokumentalni_referencii.pdf':pdf,'README_BG.txt':new TextEncoder().encode('BEFORE')};
const original=new Blob([fflate.zipSync(entries)]);
const paragraphs=bytes=>{
 const xml=fflate.unzipSync(bytes)['word/document.xml'];
 const d=new DOMParser().parseFromString(new TextDecoder().decode(xml),'application/xml');
 return Array.from(d.getElementsByTagNameNS(ns,'body')[0].children).filter(n=>n.localName==='p').map(p=>Array.from(p.getElementsByTagNameNS(ns,'t')).map(x=>x.textContent||'').join(''));
};
(async()=>{
 const r=await ctx.window.KT7602ExpertB.fix(original,{scenario:'Б',parcelIds:['36676.129.457'],zoneCodes:['BG0000194']});
 assert(r.applied,'B fixture must be revised');
 assert.equal(r.positions.length,12);
 const out=fflate.unzipSync(new Uint8Array(await r.blob.arrayBuffer()));
 for(const [name,raw] of Object.entries(entries)){
  if(name==='02_Proekt_na_stanovishte_Eksperten.docx')continue;
  assert.deepEqual(Buffer.from(out[name]),Buffer.from(raw),'unrelated ZIP file changed: '+name);
 }
 const originalExpert=fflate.unzipSync(expert),revisedExpert=fflate.unzipSync(out['02_Proekt_na_stanovishte_Eksperten.docx']);
 for(const [name,raw] of Object.entries(originalExpert)){
  if(name==='word/document.xml')continue;
  assert.deepEqual(Buffer.from(revisedExpert[name]),Buffer.from(raw),'Expert asset changed: '+name);
 }
 const before=paragraphs(expert),after=paragraphs(out['02_Proekt_na_stanovishte_Eksperten.docx']);
 assert.equal(after.length,49);
 const changed=after.flatMap((v,i)=>v!==before[i]?[i+1]:[]);
 assert.deepEqual(changed,r.positions);
 assert.equal(after[17],before[17]); // KT75 normative introduction
 assert.equal(after[23],before[23]); // GIS case fact
 assert.equal(after[24],before[24]); // zone reference
 assert(after[26].includes('ЗООС'));
 assert(after[34].includes('целостта'));
 assert(!/Несъстоятелно е|Задължителна оценка по екологичния режим|персонализирани популации|консервационни цели|природозащитна интегритетност/iu.test(after.join('\n')));
 const skipped=await ctx.window.KT7602ExpertB.fix(original,{scenario:'А',parcelIds:['56784.13.102'],zoneCodes:[]});
 assert(!skipped.applied);assert.equal(skipped.blob,original);
 const otherB=await ctx.window.KT7602ExpertB.fix(original,{scenario:'Б',parcelIds:['99999.1.1'],zoneCodes:['BG0000194']});
 assert(!otherB.applied);assert.equal(otherB.blob,original);
 console.log('KT76-02 PASS: exact RIOSV title, dark intake button, Expert B 12 scoped paragraphs, approved introduction intact, Classic+PDF+DOCX assets unchanged, other cases unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
