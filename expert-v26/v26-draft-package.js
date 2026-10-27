/* Browser-only optional draft package: DOCX and two real PDFs. No official legal findings. */
(()=>{'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(url){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>no(Error('Не може да се зареди необходимата библиотека: '+url));document.head.append(s)})}
/* Minimal browser-only ZIP writer: STORE, CRC32, UTF-8, no CDN dependency. */
function zipWriter(){
 const entries=[],enc=new TextEncoder();
 const crcTable=new Uint32Array(256);
 for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0}
 function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
 function u16(a,o,v){a[o]=v&255;a[o+1]=(v>>>8)&255}
 function u32(a,o,v){u16(a,o,v&65535);u16(a,o+2,Math.floor(v/65536))}
 const api={
  file(name,data){entries.push({name:String(name),data});return api},
  folder(prefix){return {file(name,data){api.file(prefix+'/'+name,data);return this}}},
  async generateAsync(){
   const chunks=[],central=[];let offset=0;
   for(const e of entries){
    const name=enc.encode(e.name);
    let payload=e.data;
    if(payload instanceof Blob)payload=new Uint8Array(await payload.arrayBuffer());
    else if(typeof payload==='string')payload=enc.encode(payload);
    else if(payload instanceof ArrayBuffer)payload=new Uint8Array(payload);
    else if(!(payload instanceof Uint8Array))throw Error('Неподдържан ZIP запис: '+e.name);
    if(name.length>65535||payload.length>0xffffffff)throw Error('ZIP записът е твърде голям.');
    const crc=crc32(payload),local=new Uint8Array(30+name.length);
    u32(local,0,0x04034b50);u16(local,4,20);u16(local,6,2048);u16(local,8,0);
    u32(local,14,crc);u32(local,18,payload.length);u32(local,22,payload.length);u16(local,26,name.length);local.set(name,30);
    const cd=new Uint8Array(46+name.length);
    u32(cd,0,0x02014b50);u16(cd,4,20);u16(cd,6,20);u16(cd,8,2048);u16(cd,10,0);
    u32(cd,16,crc);u32(cd,20,payload.length);u32(cd,24,payload.length);u16(cd,28,name.length);u32(cd,42,offset);cd.set(name,46);
    chunks.push(local,payload);central.push(cd);offset+=local.length+payload.length;
   }
   if(entries.length>65535)throw Error('Твърде много ZIP файлове.');
   const centralOffset=offset,centralSize=central.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22);
   u32(end,0,0x06054b50);u16(end,8,entries.length);u16(end,10,entries.length);u32(end,12,centralSize);u32(end,16,centralOffset);
   return new Blob([...chunks,...central,end],{type:'application/zip'});
  }
 };
 return api;
}
function docx(zip,ids,roles){
 const d=zipWriter();
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
 const content=[{text:'Източник: RIOSV_PLOVDIV_KAIS_CADASTRE_REGIONAL_02_10_2026.gdb (архивна регионална геобаза).',margin:[0,0,0,8]}];
 const features=[],points=[];
 function visit(coords){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){if(Number.isFinite(coords[0])&&Number.isFinite(coords[1]))points.push(coords)}else if(Array.isArray(coords))coords.forEach(visit)}
 results.forEach((r,i)=>{const fs=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));for(const f of fs){features.push({f,i});visit(f.geometry.coordinates)}});
 if(points.length){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(600/Math.max(maxX-minX,1e-9),330/Math.max(maxY-minY,1e-9));
  const shapes=[];
  for(const {f,i} of features){const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
   for(const poly of polys)for(const ring of poly){const pts=ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));if(pts.length<3)continue;
    shapes.push('<polygon points="'+pts.map(p=>(35+(p[0]-minX)*scale).toFixed(2)+','+(365-(p[1]-minY)*scale).toFixed(2)).join(' ')+'" fill="#b5d8c8" fill-opacity=".65" stroke="#176749" stroke-width="1.6"/>');
   }
   const pp=[];visitForLabel(g.coordinates,pp);
   if(pp.length){const x=pp.reduce((n,p)=>n+p[0],0)/pp.length,y=pp.reduce((n,p)=>n+p[1],0)/pp.length;
    shapes.push('<text x="'+(35+(x-minX)*scale).toFixed(2)+'" y="'+(365-(y-minY)*scale).toFixed(2)+'" font-size="13" text-anchor="middle" fill="#123e2b">'+E(String(results[i].input||results[i].cadnum))+'</text>')}
  }
  const drawing='<svg xmlns="http://www.w3.org/2000/svg" width="700" height="410" viewBox="0 0 700 410">'+shapes.join('')+'</svg>';
  content.push({text:'Картографски материал — архивни имотни контури (общ изглед)',style:'sub'});
  content.push({svg:drawing,width:480,margin:[0,4,0,8]});
 }else content.push({text:'Картографски материал: ПРЕДСТОИ — няма налична имотна геометрия.',bold:true});
 content.push({text:'ГИС данни по имоти — обща таблица',style:'sub'});
 content.push({table:{headerRows:1,widths:[112,72,82,82,'*'],body:[
  ['Кадастрален №','Площ, кв.м','Зона','Пресичане','Статус'],
  ...results.map(r=>{const id=String(r.input||r.cadnum||'');const has=!!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));const area=Number(r.area_m2_source);const zones=[...new Set((r.archived_overlay_records||[]).map(z=>String(z.sitecode||'').trim()).filter(z=>/^BG\\d{7}$/.test(z)))];return [id,Number.isFinite(area)&&area>0?area.toLocaleString('bg-BG',{maximumFractionDigits:2})+' (арх.)':'ПРЕДСТОИ',zones.length?zones.join(', ')+' (арх.)':'ПРЕДСТОИ',zones.length?'Архивен запис; актуално: ПРЕДСТОИ':'ПРЕДСТОИ',has?'Архивна':'ПРЕДСТОИ']})
 ]},layout:'lightHorizontalLines'});
 content.push({text:'Актуални площи и пресичания със защитени зони се попълват само след потвърждение от официален източник. Таблицата продължава на следваща страница само при необходимост.',margin:[0,10,0,0]});
 return pdfDef('Приложение №1 — ГИС анализ',content);
}
function visitForLabel(coords,out){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){if(Number.isFinite(coords[0])&&Number.isFinite(coords[1]))out.push(coords)}else if(Array.isArray(coords))coords.forEach(x=>visitForLabel(x,out))}
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
 const z=zipWriter(),ids=results.map(r=>r.input),normalized=Object.fromEntries(results.map(r=>[r.input,roles[r.input]||roles[r.cadnum]]));
 const word=await docx(z,ids,normalized);if(word.size<100||new TextDecoder().decode(await word.slice(0,2).arrayBuffer())!=='PK')throw Error('DOCX не е валиден ZIP контейнер.');z.file('01_Predlozhenie_RABOTEN_PROEKT.docx',word);
 await ensurePDF();
 const pdf1=await pdfBlob(gisPdf(results));if(pdf1.size<100||await pdf1.slice(0,4).text()!=='%PDF')throw Error('Приложение №1 не е валиден PDF.');z.file('02_Prilozhenie_1_GIS.pdf',pdf1);
 const pdf2=await pdfBlob(normativePdf(results,register));if(pdf2.size<100||await pdf2.slice(0,4).text()!=='%PDF')throw Error('Приложение №2 не е валиден PDF.');z.file('03_Prilozhenie_2_Normativno.pdf',pdf2);
 z.file('README_BG.txt','РАБОТЕН ПАКЕТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.\\nСъдържа DOCX проект и две PDF приложения, генерирани локално в браузъра.\\nАктуални зонови граници и правна преценка: ПРЕДСТОИ.\\n');
 const packageBlob=await z.generateAsync({type:'blob'});if(packageBlob.size<300||new TextDecoder().decode(await packageBlob.slice(0,2).arrayBuffer())!=='PK')throw Error('Неуспешно пакетиране в ZIP.');return packageBlob;
}
async function standalonePDF(results,kind,register){if(!results?.length)throw Error('Първо изпълнете ГИС справката.');if(kind!==2&&!results.some(r=>r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва имотна геометрия за PDF №1. Заредете архивната геометрия и изпълнете справката отново.');await ensurePDF();return pdfBlob(kind===2?normativePdf(results,register):gisPdf(results))}
window.V26DraftPackage=Object.freeze({make,standalonePDF});
})();