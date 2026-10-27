/* Browser-only optional draft package: DOCX plus print-ready annex HTML.
   No official legal findings; PDF conversion remains manual. */
(()=>{'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(url){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>no(Error('Не може да се зареди ZIP библиотеката'));document.head.append(s)})}
function docx(zip,ids,roles){
 const d=new JSZip();
 const lines=['ТПУ Пловдив — РАБОТЕН ПРОЕКТ на предложение за становище','Не е издадено становище. Не представлява правно заключение.','Имотни идентификатори: '+ids.join(', '),'Експертно потвърдени роли: '+ids.map(id=>id+' — '+(roles[id]==='leading'?'водещ':'съпътстващ')).join('; '),'Актуално пространствено пресичане със защитени зони: ПРЕДСТОИ.','Нормативна преценка: ПРЕДСТОИ.','Приложение №1: справочен ГИС анализ (HTML за печат като PDF).','Приложение №2: справочен нормативен регистър (HTML за печат като PDF).'];
 const paragraphs=lines.map(t=>'<w:p><w:r><w:t xml:space="preserve">'+X(t)+'</w:t></w:r></w:p>').join('');
 d.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 d.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 d.folder('word').file('document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paragraphs+'<w:sectPr/></w:body></w:document>');
 return d.generateAsync({type:'blob'});
}
function annex(title,rows){return '<!doctype html><html lang="bg"><meta charset="utf-8"><title>'+E(title)+'</title><style>body{font:12px Arial;margin:20mm}h1{font-size:19px}section{break-inside:avoid;margin:20px 0}svg{width:100%;max-height:370px}@page{size:A4;margin:18mm}</style><h1>'+E(title)+'</h1><p>Работен справочен документ. Не удостоверява актуални граници, режими или правни заключения.</p>'+rows+'</html>'}
function svg(r){const points=[];function walk(x){if(Array.isArray(x)&&typeof x[0]==='number'&&typeof x[1]==='number')points.push(x);else if(Array.isArray(x))x.forEach(walk)}for(const f of r.geojson?.features||[])walk(f.geometry?.coordinates);if(!points.length)return '';const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(600/Math.max(x1-x0,1e-9),340/Math.max(y1-y0,1e-9));const polys=[];for(const f of r.geojson.features){const g=f.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))continue;const rings=g.type==='Polygon'?g.coordinates:g.coordinates.flat(1);for(const ring of rings)polys.push('<polygon points="'+ring.map(p=>(35+(p[0]-x0)*scale).toFixed(2)+','+(370-(p[1]-y0)*scale).toFixed(2)).join(' ')+'" fill="#b5d8c8" stroke="#176749" stroke-width="1.5"/>')}return '<svg viewBox="0 0 700 410" xmlns="http://www.w3.org/2000/svg">'+polys.join('')+'</svg>'}
async function make(results,roles,register){
 if(!results.length||results.some(r=>!['leading','ancillary'].includes(roles[r.input]||roles[r.cadnum])))throw Error('Потвърдете ролите за всички имоти.');
 if(!results.some(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Няма действителна имотна геометрия за Приложение №1.');
 if(!window.JSZip)await script('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
 const z=new JSZip(),ids=results.map(r=>r.input),normalized=Object.fromEntries(results.map(r=>[r.input,roles[r.input]||roles[r.cadnum]]));
 z.file('01_Predlozhenie_RABOTEN_PROEKT.docx',await docx(z,ids,normalized));
 z.file('02_Prilozhenie_1_GIS_ZA_PDF.html',annex('Приложение №1 — ГИС анализ',results.map(r=>'<section><h2>'+E(r.input)+'</h2>'+svg(r)+'<p>Имотна геометрия: '+E(r.geojson?.features?.length?'архивна':'ПРЕДСТОИ')+'. Актуално зонално пресичане: ПРЕДСТОИ.</p></section>').join('')));
 const normative=(register?.records||[]).map(r=>'<p>'+E(r.id)+' — '+E(r.title)+' — '+E(r.verified===true?'Потвърден':'ПРЕДСТОИ')+'</p>').join('');
 z.file('03_Prilozhenie_2_Normativno_ZA_PDF.html',annex('Приложение №2 — нормативни основания',normative||'<p>Нормативни записи: ПРЕДСТОИ.</p>'));
 z.file('README_BG.txt','РАБОТЕН ПАКЕТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.\nDOCX е редактируем проект. Двете HTML приложения се отварят в браузъра и се запазват като PDF чрез Печат. Готови PDF файлове НЕ са включени.\nАктуални зонови граници и правна преценка: ПРЕДСТОИ.\n');
 return z.generateAsync({type:'blob',compression:'DEFLATE'});
}
window.V26DraftPackage=Object.freeze({make});
})();