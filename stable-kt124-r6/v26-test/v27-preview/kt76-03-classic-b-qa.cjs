'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const path='v26-test/v27-preview/';
const moduleCode=fs.readFileSync(path+'kt76-03-classic-b-package.js','utf8');
const page=fs.readFileSync(path+'KT76_03_CLASSIC_B_TEST.html','utf8');
const previous=fs.readFileSync(path+'KT76_02_EXPERT_B_TEST.html','utf8');
assert(page.includes('KT7603ClassicB.fix(kt7602.blob'),'KT76-03 should run after Expert B');
assert(page.includes('kt76-03-classic-b-package.js'),'KT76-03 script missing');
assert(!previous.includes('KT7603ClassicB'),'KT76-02 preserved');
assert(!fs.readFileSync(path+'V27_25_KT75_STABLE.html','utf8').includes('KT7603ClassicB'),'KT75 must be immutable');
for(const [i,m] of [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())
 if(m[1].trim())new vm.Script(m[1],{filename:'inline-'+i+'.js'});
const ctx={window:{fflate},fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,Error,console};
vm.createContext(ctx);vm.runInContext(moduleCode,ctx);
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const poly=(left,right)=>({type:'Polygon',coordinates:[[[left,0],[right,0],[right,1],[left,1],[left,0]]]});
const result=(half=false)=>[{input:'36676.129.457',verified_zone_intersections:['BG0000194'],geojson:{features:[{geometry:poly(0,1)}]},overlap_geojson:{features:[{geometry:poly(0,half?.5:1),properties:{SITECODE:'BG0000194'}}]}}];
function docx(count){
 const ps=Array.from({length:count},(_,i)=>{
 const n=i+1;
 const txt=n===11?'Относно: Уведомление за инвестиционно предложение (ИП): „Изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване“ в поземлен имот с идентификатор 36676.129.457, населено място с. Катуница, община Садово, област Пловдив, местност ПОПСКОТО.'
  :n===17?'Във връзка с чл. 6а, т. 2 от Наредбата за ОС':n===24?'Поземленият имот с идентификатор 36676.129.457 попада изцяло или частично в границите на защитена зона BG0000194.':n===25?'Относима защитена зона BG0000194 „Река Чая“':n===41?'С уважение,':'Предишен текст №'+n;
 const bold=n===41?' <w:b/>':'';
 return '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Verdana"/>'+bold+'</w:rPr><w:t xml:space="preserve">'+txt+'</w:t></w:r></w:p>';
 }).join('');
 const xml='<w:document xmlns:w="'+NS+'"><w:body>'+ps+'</w:body></w:document>';
 return fflate.zipSync({'word/document.xml':new TextEncoder().encode(xml),'word/styles.xml':new TextEncoder().encode('STYLES'),'word/header1.xml':new TextEncoder().encode('HEADER'),'word/footer1.xml':new TextEncoder().encode('FOOTER')});
}
const classic=docx(43),expert=docx(49),pdf=new TextEncoder().encode('%PDF-1.7 identical');
const contents={'01_Proekt_na_stanovishte_Klasicheski.docx':classic,'02_Proekt_na_stanovishte_Eksperten.docx':expert,'03_GIS_analiz.pdf':pdf,'04_Normativni_i_dokumentalni_referencii.pdf':pdf,'README_BG.txt':new TextEncoder().encode('README preserved')};
const source=new Blob([fflate.zipSync(contents)]);
function inspect(bytes){
 const zip=fflate.unzipSync(bytes),xml=new DOMParser().parseFromString(new TextDecoder().decode(zip['word/document.xml']),'application/xml');
 const ps=Array.from(xml.getElementsByTagNameNS(NS,'body')[0].childNodes).filter(p=>p.nodeType===1&&p.localName==='p');
 const items=ps.map(p=>({text:Array.from(p.getElementsByTagNameNS(NS,'t')).map(x=>x.textContent).join(''),runs:Array.from(p.getElementsByTagNameNS(NS,'r')).map(r=>({text:Array.from(r.getElementsByTagNameNS(NS,'t')).map(x=>x.textContent).join(''),bold:Array.from(r.getElementsByTagNameNS(NS,'b')).some(b=>!['0','false'].includes(b.getAttributeNS(NS,'val')))}))}));
 return {zip,items};
}
const data=()=>({scenario:'Б',parcelIds:['36676.129.457'],zoneCodes:['BG0000194'],gisResults:result()});
(async()=>{
 for(const half of [false,true]){
  const r=await ctx.window.KT7603ClassicB.fix(source,{...data(),gisResults:result(half)});
  assert(r.applied,'expected B sample to apply');
  assert.equal(r.relation,half?'попада частично':'попада');
  const outer=fflate.unzipSync(new Uint8Array(await r.blob.arrayBuffer()));
  for(const [name,b] of Object.entries(contents))if(name!=='01_Proekt_na_stanovishte_Klasicheski.docx')assert.deepEqual(Buffer.from(outer[name]),Buffer.from(b),'outer ZIP member '+name);
  const before=inspect(classic),after=inspect(outer['01_Proekt_na_stanovishte_Klasicheski.docx']);
  assert.equal(after.items.length,43);
  for(const [name,b] of Object.entries(before.zip))if(name!=='word/document.xml')assert.deepEqual(Buffer.from(after.zip[name]),Buffer.from(b),'inner DOCX member '+name);
  const expected=new Set([11,...Array.from({length:19},(_,i)=>18+i)]);
  for(let i=0;i<43;i++)if(!expected.has(i+1))assert.equal(after.items[i].text,before.items[i].text,'untouched para '+(i+1));
  assert.match(after.items[10].text,/местност „Попското“/);
  assert.match(after.items[17].text,/чл\. 10, ал\. 1 от същата/);
  assert(!after.items[17].text.includes('ал. 1. от'));
  assert.match(after.items[22].text,/Инвестиционното предложение не е свързано/);
  assert(after.items[22].runs.every(x=>x.bold),'all para23 bold');
  const gis=after.items[23];assert(gis.runs.some(x=>x.bold&&x.text===(half?'попада частично':'попада')),'GIS bold');
  assert.match(after.items[24].text,/РД-688\/25\.08\.2020/);
  assert.match(after.items[24].text,/РД-648\/19\.07\.2024/);
  assert(after.items[25].runs.some(x=>x.bold&&x.text==='BG0000194 „Река Чая“'),'para26 zone bold');
  assert(after.items[26].runs.some(x=>x.bold&&x.text.startsWith('и не подлежат')),'para27 bold');
  const p34=after.items[33].runs.filter(x=>x.text);
  const ipTitle='„Изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване“';
  const conclusion34='не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.';
  assert.equal(p34.filter(x=>x.bold).length,2,'para34 must have exactly two bold runs');
  assert(p34.some(x=>x.bold&&x.text===ipTitle),'para34 full quoted investment title bold');
  assert(p34.some(x=>x.bold&&x.text===conclusion34),'para34 conclusion bold');
  assert(p34.some(x=>!x.bold&&x.text.includes('в поземлен имот с идентификатор 36676.129.457')),'para34 location unbolded');
  assert(p34.filter(x=>x.bold).every(x=>!x.text.includes('населено място')),'para34 locality must remain plain');
  assert(after.items[34].runs.some(x=>x.bold&&x.text==='Общ устройствен план.'),'para35 bold');
  assert(after.items[35].runs.some(x=>x.bold&&x.text==='настоящото писмо'),'para36 bold');
  assert(after.items[40].runs[0].bold,'para41 greeting must remain bold');
  assert(after.items[27].text.endsWith(':'));
  for(let i=28;i<=31;i++)assert(after.items[i].text.endsWith(';'));
  assert(after.items[32].text.endsWith('.'));
  console.log('KT76-03 Classic B '+(half?'PARTIAL':'FULL')+' PASS: 43 paragraphs, all bold runs, untouched A/Expert/PDF/assets');
 }
 for(const [bad,why] of [
  [{...data(),scenario:'А'},'scenario A'],
  [{...data(),parcelIds:['56784.13.102']},'other parcel'],
  [{...data(),zoneCodes:['BG0000578']},'other zone']
 ]){
  const r=await ctx.window.KT7603ClassicB.fix(source,bad);
  assert(!r.applied,why);assert.equal(r.blob,source,why+' must be byte-identical');
 }
 await assert.rejects(()=>ctx.window.KT7603ClassicB.fix(source,{...data(),gisResults:[]}),/един проверен имот/);
 await assert.rejects(()=>ctx.window.KT7603ClassicB.fix(source,{...data(),gisResults:[{...result()[0],overlap_geojson:{features:[]}}]}),/липсват проверени геометрии/);
 console.log('KT76-03 COMPLETE PASS — A unchanged, unknown GIS fails closed');
})().catch(e=>{console.error(e);process.exitCode=1});
