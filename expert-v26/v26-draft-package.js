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
function docx(zip,ids,roles,results,includeAnnex2){
 const zones=[...new Set(results.flatMap(r=>(r.archived_overlay_records||[]).map(z=>String(z.sitecode||z.code||'')).filter(z=>/^BG\d{7}$/.test(z))))];
 const scenario=zones.length?'Б':'А';
 const subject=window.V26SubjectContext;
 const lines=['ТПУ Пловдив — РАБОТЕН ПРОЕКТ на предложение за становище','Сценарий '+scenario+' — '+(zones.length?'установено пресичане с зона в работния ГИС набор':'не е отчетено пресичане в работния ГИС набор'),'Не е издадено становище. Не представлява правно заключение.','Предмет на ИП: '+(subject?.confirmed?subject.title:'ПРЕДСТОИ потвърждение'),'Дейности: '+(subject?.confirmed?(subject.activities.join('; ')||'ПРЕДСТОИ уточнение'):'ПРЕДСТОИ уточнение'),'Имотни идентификатори: '+ids.join(', '),'Експертно потвърдени роли: '+ids.map(id=>id+' — '+(roles[id]==='leading'?'водещ':'съпътстващ')).join('; '),'ГИС резултат — зони: '+(zones.join(', ')||'няма отчетени в работния набор'),'Източник на пространствените данни: работен архивен ГИС набор. Актуална правна проверка: ПРЕДСТОИ.','Нормативна преценка: ПРЕДСТОИ проверка на точните режими и приложимостта им към дейностите.','Приложение №1: ГИС анализ (PDF) — задължително.',includeAnnex2?'Приложение №2: нормативни референции (PDF) — приложено по избор.':'Приложение №2: не е заявено (незадължително).'];

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
function gisPdf(results,options={}){
 const content=[{text:'Източник: RIOSV_PLOVDIV_KAIS_CADASTRE_REGIONAL_02_10_2026.gdb (архивна регионална геобаза).',margin:[0,0,0,8]}];
 if(options.mapSvg&&String(options.mapSvg).includes('<svg')){
  const clean=options.mapSvg;
  const contentMap={svg:clean,width:510,margin:[0,5,0,10]};
  content.push({text:'Картографски материал — одобрена ГИС карта (избран мащаб и изглед)',style:'sub'});
  content.push(contentMap);
  content.push({text:'Картата възпроизвежда видимите слоеве в браузъра: имот, граници на зони, архивни пресичания и етикети. Източник на границите: работен набор на ТПУ; актуална правна проверка: ПРЕДСТОИ.',fontSize:9,margin:[0,0,0,10]});
 }
 const features=[],points=[];
 function visit(coords){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){if(Number.isFinite(coords[0])&&Number.isFinite(coords[1]))points.push(coords)}else if(Array.isArray(coords))coords.forEach(visit)}
 results.forEach((r,i)=>{const fs=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));for(const f of fs){features.push({f,i});visit(f.geometry.coordinates)}});
 if(points.length&&!options.mapSvg){
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
 }else if(!options.mapSvg)content.push({text:'Картографски материал: ПРЕДСТОИ — няма налична имотна геометрия.',bold:true});
 content.push({text:'ГИС данни по имоти — обща таблица',style:'sub'});
 content.push({table:{headerRows:1,widths:[112,72,82,82,'*'],body:[
  ['Кадастрален №','Площ, кв.м','Зона','Пресичане','Статус'],
  ...results.map(r=>{
   const id=String(r.input||r.cadnum||'');
   const has=!!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
   const area=Number(r.area_m2_source);
   const overlays=[...(r.archived_overlay_records||[]),...(r.archived_zones||[])];
   const zones=[...new Set(overlays.map(z=>typeof z==='string'?z.trim():String(z.sitecode||z.code||'').trim()).filter(z=>/^BG\d{7}$/.test(z)))];
   const names=[...new Set(overlays.map(z=>String(z.name_bg||z.name||'').trim()).filter(Boolean))];
   const zoneText=zones.length?zones.join(', ')+(names.length?' · '+names.join('; '):''):'Не е отчетена зона в имотния резултат';
   const intersection=zones.length?'АРХИВНО ПРЕСИЧАНЕ (ГИС справка)':has?'Не е отчетено пресичане в имотния резултат':'Няма геометрия';
   return [id,Number.isFinite(area)&&area>0?area.toLocaleString('bg-BG',{maximumFractionDigits:2})+' (арх.)':'Не е налична',zoneText,intersection,has?'ГИС геометрия налична':'Липсва геометрия'];
  })
 ]},layout:'lightHorizontalLines'});
 content.push({text:'Таблицата възпроизвежда резултата от извършения ГИС анализ на работния набор; не изисква повторна проверка на пресичането. Произходът на геометрията и правната актуалност на режимите са отделни въпроси.',margin:[0,10,0,0]});
 return pdfDef('Приложение №1 — ГИС анализ',content);
}
function visitForLabel(coords,out){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){if(Number.isFinite(coords[0])&&Number.isFinite(coords[1]))out.push(coords)}else if(Array.isArray(coords))coords.forEach(x=>visitForLabel(x,out))}
function normativePdf(results,register){
 const ids=results.map(r=>String(r.input||r.cadnum||'')).filter(Boolean);
 const zoneMap=new Map();
 for(const r of results){
  for(const z of [...(r.archived_overlay_records||[]),...(r.archived_zones||[])]){
   const code=String(z.sitecode||z.code||'');
   if(!/^BG\d{7}$/.test(code))continue;
   if(!zoneMap.has(code))zoneMap.set(code,{code,name:z.name_bg||z.name||'',order:z.order_no||''});
  }
 }
 for(const z of register?.gisSummary?.archived_zones||[]){
  const code=String(z.sitecode||z.code||'');
  if(/^BG\d{7}$/.test(code)&&!zoneMap.has(code))zoneMap.set(code,{code,name:z.name_bg||'',order:z.order_no||''});
 }
 const zones=[...zoneMap.values()].sort((a,b)=>a.code.localeCompare(b.code));
 const records=register?.records||[];
 const subject=window.V26SubjectContext;
 const content=[
  {text:'I. Предмет и установени факти',style:'sub'},
  {text:'Предмет на ИП: '+(subject?.confirmed?subject.title:'НЕ Е УСТАНОВЕН / НЕ Е ПОТВЪРДЕН'),bold:true},
  {text:'Източник на предмета: '+(subject?.confirmed?subject.source:'ПРЕДСТОИ')},
  {text:'Дейности от ИП: '+(subject?.confirmed?(subject.activities.join('; ')||'НЕ СА УТОЧНЕНИ'):'ПРЕДСТОИ')},
  {text:'Статус на анализа на дейностите: '+(subject?.confirmed&&subject.activities.length?'Предметът е експертно потвърден; съпоставката с конкретните режими ПРЕДСТОИ.':'ПРЕДВАРИТЕЛНА НОРМАТИВНА СПРАВКА — липсва потвърден предмет и/или дейности.'),bold:true},
  {text:'Имотни идентификатори: '+ids.join(', ')},
  {text:'Пространствена основа: резултатът от ГИС анализ / Приложение №1 е приет за настоящата справка. Пресичането НЕ се проверява повторно в Приложение №2.',bold:true},
  {text:'Установени от ГИС справката зони: '+(zones.length?zones.map(z=>z.code+(z.name?' „'+z.name+'“':'')).join('; '):'Няма предадени кодове на зони в резултата.')},
  {text:'II. Заповеди за обявяване, изменения и режими',style:'sub'}
 ];
 if(!zones.length)content.push({text:'Няма предаден код на защитена зона. Не се извеждат зонално специфични режими.',bold:true});
 for(const z of zones){
  content.push({text:z.code+(z.name?' — '+z.name:''),style:'sub'});
  const order=z.order|| (z.code==='BG0000194'?'РД-688/25.08.2020 г.':'ПРЕДСТОИ');
  content.push({text:'Заповед за обявяване: '+order+(z.code==='BG0000194'?' (ДВ, бр. 80/11.09.2020 г.)':'')});
  if(z.code==='BG0000194'){
   content.push({text:'Източник за обявяването: МОСВ — официален документ за специфичните цели на зоната',link:'https://www.moew.government.bg/static/media/ups/articles/attachments/BG0000194_Reka_Chaya_specifichni_tseli_zap12a55845b82036a39b7ee327cf53070a5cb.pdf',color:'#165c86',decoration:'underline'});
   content.push({text:'Специфични цели: Заповед № РД-507/12.06.2024 г. (чл. 12а ЗБР). Това е акт за цели, а не замества заповедта за режимите.'});
  }
  content.push({text:'Изменения и допълнения на заповедта: ПРЕДСТОИ документална проверка.'});
  content.push({text:'Конкретни забрани, ограничения и изключения: ПРЕДСТОИ извличане на точните точки от действащата заповед. Не се допуска предположение за забрана.',bold:true});
  content.push({text:'Доказателствена връзка: '+ids.join(', ')+' → ГИС Приложение №1 → '+z.code+' → заповед → конкретна точка от режим: ПРЕДСТОИ.'});
 }
 content.push({text:'III. Нормативни основания и проследимост',style:'sub'});
 const selected=records.filter(r=>{
  const code=String(r.zone_code||'')||(String(r.title||'').match(/BG\d{7}/)||[])[0];
  return code?zoneMap.has(code):r.verified===true;
 });
 if(!selected.length)content.push({text:'Няма потвърдени общи нормативни разпоредби или зонално специфични записи за избраните зони. ПРЕДСТОИ.',bold:true});
 for(const r of selected){
  content.push({text:String(r.id||'')+' — '+String(r.title||''),style:'sub'});
  content.push({text:'Източник: '+String(r.source||'ПРЕДСТОИ'),link:/^https:\/\//.test(String(r.source||''))?String(r.source):undefined,color:'#165c86'});
  content.push({text:'Документ / редакция: '+String(r.date||'ПРЕДСТОИ')+' · Страница / точка: '+String(r.page||'ПРЕДСТОИ')});
  content.push({text:'Проверка на точната приложима разпоредба: '+(r.verified===true?'Потвърдена според регистъра':'ПРЕДСТОИ'),bold:true});
 }
 content.push({text:'IV. Мотивиран експертен извод',style:'sub'});
 content.push({text:'ГИС фактът за установените зони се приема от Приложение №1 и не се поставя на повторно потвърждаване. Наличните данни позволяват идентифициране на зоните и проследяване на част от административните актове. Не позволяват окончателна преценка за допустимост, докато не бъдат извлечени точните действащи режими и не бъде съпоставена конкретната дейност с всяка приложима забрана, ограничение и изключение.',bold:true});
 content.push({text:'Статус: МОТИВИРАН РАБОТЕН ДОКЛАД. Не представлява издадено становище или окончателна правна преценка.'});
 return pdfDef('Приложение №2 — нормативен и документален анализ',content);
}

async function make(results,roles,register){
 if(!results.length||results.some(r=>!['leading','ancillary'].includes(roles[r.input]||roles[r.cadnum])))throw Error('Потвърдете ролите за всички имоти.');
 if(!results.some(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Няма действителна имотна геометрия за Приложение №1.');
 const z=zipWriter(),ids=results.map(r=>r.input),normalized=Object.fromEntries(results.map(r=>[r.input,roles[r.input]||roles[r.cadnum]]));
 const includeAnnex2=register?.includeAnnex2===true;const word=await docx(z,ids,normalized,results,includeAnnex2);if(word.size<100||new TextDecoder().decode(await word.slice(0,2).arrayBuffer())!=='PK')throw Error('DOCX не е валиден ZIP контейнер.');z.file('01_Predlozhenie_RABOTEN_PROEKT.docx',word);
 await ensurePDF();
 const pdf1=await pdfBlob(gisPdf(results,register));if(pdf1.size<100||await pdf1.slice(0,4).text()!=='%PDF')throw Error('Приложение №1 не е валиден PDF.');z.file('02_Prilozhenie_1_GIS.pdf',pdf1);
 if(includeAnnex2){const pdf2=await pdfBlob(normativePdf(results,register));if(pdf2.size<100||await pdf2.slice(0,4).text()!=='%PDF')throw Error('Приложение №2 не е валиден PDF.');z.file('03_Prilozhenie_2_Normativno.pdf',pdf2);}
 z.file('README_BG.txt','РАБОТЕН ПАКЕТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.\\nСъдържа DOCX проект и задължителното PDF приложение №1; приложение №2 се включва само по избор.\\nАктуални зонови граници и правна преценка: ПРЕДСТОИ.\\n');
 const packageBlob=await z.generateAsync({type:'blob'});if(packageBlob.size<300||new TextDecoder().decode(await packageBlob.slice(0,2).arrayBuffer())!=='PK')throw Error('Неуспешно пакетиране в ZIP.');return packageBlob;
}
async function standalonePDF(results,kind,register){if(!results?.length)throw Error('Първо изпълнете ГИС справката.');if(kind!==2&&!results.some(r=>r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва имотна геометрия за PDF №1. Заредете архивната геометрия и изпълнете справката отново.');await ensurePDF();return pdfBlob(kind===2?normativePdf(results,register):gisPdf(results,register))}
window.V26DraftPackage=Object.freeze({make,standalonePDF});
})();