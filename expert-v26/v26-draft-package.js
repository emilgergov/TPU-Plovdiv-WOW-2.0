/* Browser-only optional draft package: DOCX and two real PDFs. No official legal findings. */
(()=>{'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(url){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>no(Error('Не може да се зареди ZIP библиотеката'));document.head.append(s)})}
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
function svg(r){const points=[];function walk(x){if(Array.isArray(x)&&typeof x[0]==='number'&&typeof x[1]==='number')points.push(x);else if(Array.isArray(x))x.forEach(walk)}for(const f of r.geojson?.features||[])walk(f.geometry?.coordinates);if(!points.length)return '';const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(600/Math.max(x1-x0,1e-9),340/Math.max(y1-y0,1e-9));const polys=[];for(const f of r.geojson.features){const g=f.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))continue;const rings=g.type==='Polygon'?g.coordinates:g.coordinates.flat(1);for(const ring of rings)polys.push('<polygon points="'+ring.map(p=>(35+(p[0]-x0)*scale).toFixed(2)+','+(370-(p[1]-y0)*scale).toFixed(2)).join(' ')+'" fill="#b5d8c8" stroke="#176749" stroke-width="1.5"/>')}return '<svg viewBox="0 0 700 410" xmlns="http://www.w3.org/2000/svg">'+polys.join('')+'</svg>'}
async function ensurePDF(){
 if(!window.pdfMake?.createPdf){
  await script('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.20/pdfmake.min.js');
  await script('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.20/vfs_fonts.js');
 }
 if(!window.pdfMake?.createPdf)throw Error('PDF библиотеката не е заредена.');
}
function pdfBlob(def){return new Promise((resolve,reject)=>{try{window.pdfMake.createPdf(def).getBlob(resolve)}catch(e){reject(e)}})}
function pdfDef(title,content){
 return {pageSize:'A4',pageMargins:[42,50,42,50],defaultStyle:{font:'Roboto',fontSize:10},styles:{heading:{fontSize:16,bold:true,margin:[0,0,0,14]},sub:{fontSize:12,bold:true,margin:[0,12,0,6]}},content:[{text:'ТПУ Пловдив — '+title,style:'heading'},{text:'РАБОТЕН СПРАВОЧЕН ДОКУМЕНТ. Не удостоверява актуални граници, режими или правни заключения.',bold:true,margin:[0,0,0,14]},...content]};
}
function gisPdf(results){
 const content=[{text:'Източник: RIOSV_PLOVDIV_KAIS_CADASTRE_REGIONAL_02_10_2026.gdb (архивна регионална геобаза).',margin:[0,0,0,12]}];
 for(const r of results){
  content.push({text:'Имот: '+String(r.input||r.cadnum),style:'sub'});
  const has=r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
  content.push({text:'Имотна геометрия: '+(has?'архивна':'ПРЕДСТОИ')+'. Актуално зонално пресичане: ПРЕДСТОИ.'});
  if(has){const drawing=svg(r);if(drawing)content.push({svg:drawing,width:480,margin:[0,10,0,8]});if(r.area_m2_geometry!=null)content.push({text:'Площ по геометрия: '+r.area_m2_geometry+' кв. м'});}
 }
 return pdfDef('Приложение №1 — ГИС анализ',content);
}
function normativePdf(results,register){
 const content=[{text:'Имотни идентификатори: '+results.map(r=>r.input).join(', '),margin:[0,0,0,12]},{text:'Актуални нормативни изводи и зонални пресичания: ПРЕДСТОИ.',margin:[0,0,0,12]}];
 for(const r of register?.records||[])content.push({text:String(r.id||'')+' — '+String(r.title||'')+' — '+(r.verified===true?'Потвърден':'ПРЕДСТОИ'),margin:[0,3,0,3]});
 if(!(register?.records||[]).length)content.push({text:'Нормативни записи: ПРЕДСТОИ.'});
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
window.V26DraftPackage=Object.freeze({make});
})();