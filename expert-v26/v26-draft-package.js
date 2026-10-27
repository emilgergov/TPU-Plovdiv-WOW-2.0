/* Browser-only optional draft package: DOCX and two real PDFs. No official legal findings. */
(()=>{'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(url){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>no(Error('Не може да се зареди необходимата библиотека: '+url));document.head.append(s)})}
function docx(zip,ids,roles){
 const d=new JSZip();
 const lines=['ТПУ Пловдив — РАБОТЕН ПРОЕКТ на предложение за становище','Не е издадено становище. Не представлява правно заключение.','Имотни идентификатори: '+ids.join(', '),'Експертно потвърдени роли: '+ids.map(id=>id+' — '+(roles[id]==='leading'?'водещ':'съпътстващ')).join('; '),'Актуално пространствено пресичане със защитени зони: ПРЕДСТОИ.','Нормативна преценка: ПРЕДСТОИ.','Приложение №1: справочен ГИС анализ (PDF).','Приложение №2: справочен нормативен регистър (PDF).'];
 const paragraphs=lines.map(t=>'<w:p><w:r><w:t xml:space="preserve">'+X(t)+'</w:t></w:r></w:p>').join('');
 d.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 d.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 d.folder('word').file('document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paragraphs+'<w:sectPr/></w:body></w:document>');
 return d.generateAsync({type:'blob'});
}
function annex(title,rows){return '<!doctype html><html lang="bg"><meta charset="utf-8"><title>'+E(title)+'</title><style>body{font:12px Arial;margin:20mm}h1{font-size:19px}section{break-inside:avoid;margin:20px 0}svg{width:100%;max-height:370px}@page{size:A4;margin:18mm}</style><h1>'+E(title)+'</h1><p>Работен справочен документ. Не удостоверява актуални граници, режими или правни заключения.</p>'+rows+'</html>'}
function svg(r){
 const features=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,count=0;
 function visit(coords){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){const x=coords[0],y=coords[1];if(!Number.isFinite(x)||!Number.isFinite(y))return;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}else if(Array.isArray(coords))for(const p of coords)visit(p)}
 for(const f of features)visit(f.geometry.coordinates);
 if(!count)return '';
 const scale=Math.min(600/Math.max(maxX-minX,1e-9),340/Math.max(maxY-minY,1e-9));
 const paths=[];
 for(const f of features){
  const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  for(const poly of polys)for(const ring of poly){
   const pts=ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
   if(pts.length<3)continue;
   paths.push('<polygon points="'+pts.map(p=>(35+(p[0]-minX)*scale).toFixed(2)+','+(370-(p[1]-minY)*scale).toFixed(2)).join(' ')+'" fill="#b5d8c8" stroke="#176749" stroke-width="1.5"/>');
  }
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="410" viewBox="0 0 700 410">'+paths.join('')+'</svg>';
}
async function loadAny(urls,check){
 if(check())return;
 const failures=[];
 for(const url of urls){
  try{await script(url);if(check())return}catch(e){failures.push(url)}
 }
 throw Error('Неуспешно зареждане на PDF библиотеката от резервните източници. Проверете достъпа до CDN или използвайте локална версия.');
}
async function ensurePDF(){
 if(window.V26OfflinePDF?.generate)return;
 try{
  await loadAny([
   './vendor/pdfmake.min.js',
   'https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js',
   'https://unpkg.com/pdfmake@0.2.20/build/pdfmake.min.js',
   'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.20/pdfmake.min.js'
  ],()=>!!window.pdfMake?.createPdf);
  await loadAny([
   './vendor/vfs_fonts.js',
   'https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js',
   'https://unpkg.com/pdfmake@0.2.20/build/vfs_fonts.js',
   'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.20/vfs_fonts.js'
  ],()=>!!window.pdfMake?.vfs);
 }catch(e){if(!window.V26OfflinePDF?.generate)throw e}
}
function pdfBlob(def){if(window.V26OfflinePDF?.generate)return window.V26OfflinePDF.generate(def);return new Promise((resolve,reject)=>{try{window.pdfMake.createPdf(def).getBlob(b=>{if(!b||b.size<100)reject(Error('PDF файлът е празен или невалиден.'));else resolve(b)})}catch(e){reject(e)}})}
function pdfDef(title,content){
 return {pageSize:'A4',pageMargins:[42,50,42,50],defaultStyle:{font:'Roboto',fontSize:10},styles:{heading:{fontSize:16,bold:true,margin:[0,0,0,14]},sub:{fontSize:12,bold:true,margin:[0,12,0,6]}},content:[{text:'ТПУ Пловдив — '+title,style:'heading'},{text:'РАБОТЕН СПРАВОЧЕН ДОКУМЕНТ. Не удостоверява актуални граници, режими или правни заключения.',bold:true,margin:[0,0,0,14]},...content]};
}
function gisPdf(results){
 const content=[{text:'Източник: RIOSV_PLOVDIV_KAIS_CADASTRE_REGIONAL_02_10_2026.gdb (архивна регионална геобаза).',margin:[0,0,0,12]}];
 for(const r of results){
  content.push({text:'Имот: '+String(r.input||r.cadnum),style:'sub'});
  const has=!!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
  content.push({text:'Имотна геометрия: '+(has?'архивна':'ПРЕДСТОИ')+'. Актуално зонално пресичане: ПРЕДСТОИ.'});
  if(has){const drawing=svg(r);if(!drawing)throw Error('Геометрията на имот '+String(r.input||r.cadnum)+' не може да се изчертае.');content.push({svg:drawing,width:480,margin:[0,10,0,8]});if(r.area_m2_geometry!=null)content.push({text:'Площ по геометрия: '+r.area_m2_geometry+' кв. м'});}
 }
 return pdfDef('Приложение №1 — ГИС анализ',content);
}
function normativePdf(results,register){
 const ids=results.map(r=>String(r.input||r.cadnum||'')).filter(Boolean);
 const codes=new Set();
 for(const r of results)for(const o of r.archived_overlay_records||[])if(/^BG\\d{7}$/.test(String(o.sitecode||'')))codes.add(String(o.sitecode));
 const records=register?.records||[];
 const content=[
  {text:'Имотни идентификатори: '+ids.join(', '),margin:[0,0,0,10]},
  {text:'Статус: СПРАВОЧЕН ПРОЕКТ. Актуалното пресичане със защитени зони, приложимите режими и правните изводи: ПРЕДСТОИ.',bold:true,margin:[0,0,0,10]},
  {text:'Източници: архивен работен регистър на нормативни препратки. Посочените интернет адреси НЕ означават потвърдено съдържание или действаща редакция.',margin:[0,0,0,12]},
  {text:'Архивни кодове на зони от справката: '+(codes.size?[...codes].sort().join(', '):'ПРЕДСТОИ')+'. Това не е актуално пространствено пресичане.',margin:[0,0,0,12]}
 ];
 const archive=register?.archive;
 if(archive?.files?.length){
  content.push({text:'Локална преписка — опис на ZIP архива',style:'sub'});
  content.push({text:'Архив: '+String(archive.archive||'')+' · Файлове: '+archive.entries+' · Общо байтове: '+archive.archive_bytes});
  content.push({text:'Това е автоматичен опис на файлови имена, а не проверка на съдържание, автентичност или нормативна приложимост.',bold:true});
  const candidates=archive.files.filter(f=>f.gis_candidate);
  content.push({text:'Възможни ГИС източници: '+candidates.length+' (непроверени)'});
  for(const f of archive.files.slice(0,80))content.push({text:'• '+String(f.path||'')+' ('+Number(f.size_bytes||0)+' байта)'+(f.gis_candidate?' [ГИС кандидат]':'')});
  if(archive.files.length>80)content.push({text:'Още '+(archive.files.length-80)+' файла не са изписани в PDF. Пълният опис остава в локалната браузърна справка.'});
 }else content.push({text:'Преписка ZIP: не е приложен проверен локален опис.'});
 const preview=register?.preview;
 if(preview?.files?.length){
  content.push({text:'Локално прочетени текстови документи от преписката',style:'sub'});
  const identifiers=ids.map(id=>id.split('.').slice(0,3).join('.'));
  for(const file of preview.files.slice(0,20)){
   const matches=identifiers.filter(id=>String(file.path||'').includes(id)||String(file.text||'').includes(id));
   content.push({text:'Файл: '+String(file.path||'')+' · '+(file.error?'Не е прочетен: '+file.error:'Прочетен локално')+' · Връзка с имот: '+(matches.length?matches.join(', '):'не е установена')});
   if(file.truncated)content.push({text:'Текстът е съкратен за предварителен преглед.'});
  }
  content.push({text:'Съвпадението на кадастрален идентификатор е текстово, не доказва принадлежност на документа към имота. Нормативна и експертна проверка: ПРЕДСТОИ.',bold:true});
 }
 let shown=0;
 for(const r of records){
  const title=String(r.title||''),code=(title.match(/BG\\d{7}/)||[])[0];
  if(code&&!codes.has(code))continue;
  shown++;
  content.push({text:String(r.id||'')+' — '+title,style:'sub'});
  content.push({text:'Предназначение на препратката: '+String(r.purpose||'ПРЕДСТОИ')});
  content.push({text:'Адрес на източника: '+String(r.source||'ПРЕДСТОИ')});
  content.push({text:'Състояние на източника: '+String(r.source_status||'ПРЕДСТОИ')});
  content.push({text:'Страница/точка: '+String(r.page||'ПРЕДСТОИ')+' · Дата/редакция: '+String(r.date||'ПРЕДСТОИ')});
  content.push({text:'Проверка на съдържание и приложимост: ПРЕДСТОИ.',bold:true});
 }
 if(!shown)content.push({text:'Нормативни записи за тази справка: ПРЕДСТОИ.'});
 content.push({text:'Заключение: настоящото приложение е опис на източници, а не удостоверяване на режими, забрани или становище.',bold:true});
 return pdfDef('Приложение №2 — нормативни основания',content);
}

async function make(results,roles,register){
 if(!results.length||results.some(r=>!['leading','ancillary'].includes(roles[r.input]||roles[r.cadnum])))throw Error('Потвърдете ролите за всички имоти.');
 if(!results.some(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Няма действителна имотна геометрия за Приложение №1.');
 if(!window.JSZip)await script('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
 const z=new JSZip(),ids=results.map(r=>r.input),normalized=Object.fromEntries(results.map(r=>[r.input,roles[r.input]||roles[r.cadnum]]));
 z.file('01_Predlozhenie_RABOTEN_PROEKT.docx',await docx(z,ids,normalized));
 await ensurePDF();
 z.file('02_Prilozhenie_1_GIS.pdf',await pdfBlob(gisPdf(results)));
 z.file('03_Prilozhenie_2_Normativno.pdf',await pdfBlob(normativePdf(results,register)));
 z.file('README_BG.txt','РАБОТЕН ПАКЕТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.\\nСъдържа DOCX проект и две PDF приложения, генерирани локално в браузъра.\\nАктуални зонови граници и правна преценка: ПРЕДСТОИ.\\n');
 return z.generateAsync({type:'blob',compression:'DEFLATE'});
}
async function standalonePDF(results,kind,register){if(!results?.length)throw Error('Първо изпълнете ГИС справката.');if(kind!==2&&!results.some(r=>r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва имотна геометрия за PDF №1. Заредете архивната геометрия и изпълнете справката отново.');await ensurePDF();return pdfBlob(kind===2?normativePdf(results,register):gisPdf(results))}
window.V26DraftPackage=Object.freeze({make,standalonePDF});
})();