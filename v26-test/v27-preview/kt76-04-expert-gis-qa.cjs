'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom'),fflate=require('fflate');
const base='v26-test/v27-preview/';
const code=fs.readFileSync(base+'kt76-04-expert-gis.js','utf8');
const html=fs.readFileSync(base+'KT76_04_EXPERT_GIS_TEST.html','utf8');
const old=fs.readFileSync(base+'KT76_03_CLASSIC_B_TEST.html','utf8');
assert(html.includes('KT7604ExpertGIS.fix(kt7603.blob'));
assert(html.includes('kt76-04-expert-gis.js?v=kt76-04-1'));
assert(!old.includes('KT7604ExpertGIS'));
for(const [i,m] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())if(m[1].trim())new vm.Script(m[1],{filename:'inline'+i});
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const ctx={window:{fflate,KT7603ClassicB:{spatialRelation(results){
 const r=results[0];if(!r||!r.overlap_geojson?.features?.length)throw Error('недоказуем GIS');
 const poly=r.overlap_geojson.features[0].geometry.coordinates[0];
 return {word:poly[1][0]===1?'попада':'попада частично'};
}}},DOMParser,XMLSerializer,TextDecoder,TextEncoder,Blob,console,Error,fflate};
vm.createContext(ctx);vm.runInContext(code,ctx);
function docx(){
 const paras=Array.from({length:49},(_,i)=>{
  const n=i+1,t=n===24?'Поземленият имот с идентификатор 36676.129.457 попада изцяло или частично в границите на защитена зона BG0000194. Конкретното пространствено положение и площта на попадане са отразени в самостоятелния ГИС анализ.'
  :n===25?'Защитени зони, в чиито граници попада имотът или попадат разглежданите имоти: BG0000194. Конкретните режими и приложимите заповеди подлежат на експертна проверка по нормативния архив.'
  :'Expert original paragraph '+n;
  return '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Verdana"/></w:rPr><w:t xml:space="preserve">'+t+'</w:t></w:r></w:p>';
 }).join('');
 const xml='<w:document xmlns:w="'+NS+'"><w:body>'+paras+'</w:body></w:document>';
 return fflate.zipSync({'word/document.xml':new TextEncoder().encode(xml),'word/styles.xml':new TextEncoder().encode('STYLES'),'word/header1.xml':new TextEncoder().encode('HEADER'),'word/footer1.xml':new TextEncoder().encode('FOOTER')});
}
const expert=docx(),other=new TextEncoder().encode('UNTOUCHED');
const outer=fflate.zipSync({'02_Proekt_na_stanovishte_Eksperten.docx':expert,'01_Proekt_na_stanovishte_Klasicheski.docx':other,'03_GIS_analiz.pdf':other,'04_Normativni_i_dokumentalni_referencii.pdf':other});
function inspect(raw){const inner=fflate.unzipSync(raw),xml=new DOMParser().parseFromString(new TextDecoder().decode(inner['word/document.xml']),'text/xml');const ps=Array.from(xml.getElementsByTagNameNS(NS,'body')[0].childNodes).filter(x=>x.nodeType===1&&x.localName==='p');return {inner,ps:ps.map(p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent||'').join(''))};}
const geom=partial=>[{input:'36676.129.457',verified_zone_intersections:['BG0000194'],overlap_geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[0,0],[partial?.5:1,0],[partial?.5:1,1],[0,1],[0,0]]]}}]}}];
const args=partial=>({scenario:'Б',parcelIds:['36676.129.457'],zoneCodes:['BG0000194'],gisResults:geom(partial)});
(async()=>{
 for(const partial of [false,true]){
  const r=await ctx.window.KT7604ExpertGIS.fix(new Blob([outer]),args(partial));
  assert(r.applied);assert.equal(r.relation,partial?'попада частично':'попада');
  const pkg=fflate.unzipSync(new Uint8Array(await r.blob.arrayBuffer())),before=inspect(expert),after=inspect(pkg['02_Proekt_na_stanovishte_Eksperten.docx']);
  assert.equal(after.ps.length,49);
  for(let i=0;i<49;i++)if(i!==23&&i!==24)assert.equal(after.ps[i],before.ps[i],'unrelated paragraph '+(i+1));
  assert(after.ps[23].includes(partial?'попада частично':'попада изцяло'));
  assert(after.ps[24].includes(partial?'попада частично':'попада изцяло'));
  assert(!after.ps.join(' ').includes('попада изцяло или частично'));
  for(const name of ['01_Proekt_na_stanovishte_Klasicheski.docx','03_GIS_analiz.pdf','04_Normativni_i_dokumentalni_referencii.pdf'])assert.deepEqual(Buffer.from(pkg[name]),Buffer.from(other));
  for(const name of ['word/styles.xml','word/header1.xml','word/footer1.xml'])assert.deepEqual(Buffer.from(after.inner[name]),Buffer.from(before.inner[name]));
  console.log('KT76-04 Expert GIS '+(partial?'PARTIAL':'FULL')+' PASS; 49 paras + other ZIP bytes intact');
 }
 const notSupported=await ctx.window.KT7604ExpertGIS.fix(new Blob([outer]),{...args(false),scenario:'А'});
 assert(!notSupported.applied);assert.equal(notSupported.blob.size,outer.length);
 await assert.rejects(()=>ctx.window.KT7604ExpertGIS.fix(new Blob([outer]),{...args(false),gisResults:[]}),/недоказуем GIS/);
 console.log('KT76-04 COMPLETE PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
