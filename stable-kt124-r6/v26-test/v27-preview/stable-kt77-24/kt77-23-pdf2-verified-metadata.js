/* Browser-only optional draft package: DOCX and two real PDFs. No official legal findings. */
(()=>{'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readableStatus=s=>({'corroborated':'съгласувани сведения (непотвърдени експертно)','latest_documented_fact':'последно документирано сведение','unresolved_missing_date':'неустановено — липсва дата','unresolved_same_date':'противоречиви сведения от една дата','unresolved_unverified_change':'непотвърдена промяна','нерешено':'изисква проверка'}[String(s)]||String(s||'изисква проверка'));
const readableKind=s=>({'documentary':'документална референция','dossier':'преписка','GIS':'пространствен анализ','wastewater_solution':'начин на отвеждане на отпадъчни води','water_supply':'водоснабдяване','wastewater':'отпадъчни води','electricity':'електроснабдяване','access':'транспортен достъп','construction':'строителни дейности','discharge':'заустване','water':'водовземане','power':'електрозахранване','conflict':'противоречиви сведения'}[String(s)]||String(s||'друг източник'));
const shortSource=s=>{const n=String(s||'неустановен източник');return n.length>78?n.slice(0,36)+' … '+n.slice(-32):n};
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
  names(){return entries.map(e=>e.name)},
  folder(prefix){return {file(name,data){api.file(prefix+'/'+name,data);return this}}},
  async generateAsync(){
   if(entries.length===5&&entries.some(e=>String(e.name).endsWith('.docx'))){
    const names=entries.map(e=>e.name);
    if(new Set(names).size!==5||names.filter(n=>n.endsWith('.docx')).length!==2||names.filter(n=>n.endsWith('.pdf')).length!==2||names.filter(n=>n==='README_BG.txt').length!==1)throw Error('V27.1: невалиден състав на ZIP пакета.');
   }
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
function scenarioFromGIS(results,roles){
 const leading=results.filter(r=>(roles[r.input]||roles[r.cadnum])==='leading');
 if(!leading.length)throw Error('Няма потвърден водещ имот.');
 if(results.some(r=>r.status!=='Намерен'||!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва действителна геометрия за потвърден имот.');
 const zones=results.flatMap(r=>r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim()).filter(z=>/^BG[0-9]{7}$/.test(z));
 if(zones.length)return {scenario:'Б',basis:'потвърдени пространствени пресичания за всички имоти',zones:[...new Set(zones)]};
 if(results.every(r=>r.intersection_verified_outside===true))return {scenario:'А',basis:'потвърдено отсъствие на пресичания за всички имоти',zones:[]};
 return {scenario:null,basis:'непотвърдено пространствено пресичане или отсъствие за някой от имотите',zones:[]};
}
function docx(zip,ids,roles,results,includeAnnex2,unifiedContext){
 const d=zipWriter();
 const zones=[...new Set(results.flatMap(r=>(r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')).filter(z=>/^BG\d{7}$/.test(z))))];
 const determination=scenarioFromGIS(results,roles);
 const scenario=determination.scenario||'НЕОПРЕДЕЛЕН';
 const subject=window.V26SubjectContext;
 const lines=['ТПУ Пловдив — РАБОТЕН ПРОЕКТ на предложение за становище','Сценарий '+scenario+' — '+(zones.length?'установено пресичане с зона в работния ГИС набор':'не е отчетено пресичане в работния ГИС набор'),'Не е издадено становище. Не представлява правно заключение.','Предмет на ИП: '+(subject?.confirmed?subject.title:'Няма данни в преписката'),'Заглавие за предложението: '+(subject?.confirmed?(subject.wordHeading||subject.title):'Няма данни в преписката'),'Дейности: '+(subject?.confirmed?(subject.activities.join('; ')||'Няма данни в преписката'):'Няма данни в преписката'),'Имотни идентификатори: '+ids.join(', '),'Експертно потвърдени роли: '+ids.map(id=>id+' — '+(roles[id]==='leading'?'водещ':'съпътстващ')).join('; '),'ГИС резултат — зони: '+(zones.join(', ')||'няма отчетени в работния набор'),'Източник на пространствените данни: работен архивен ГИС набор. Актуална правна проверка: Неустановено.','Нормативна преценка: Приложимостта на конкретните режими към заявените дейности не е оценена.','Приложение №1 — ГИС анализ (PDF) — задължително.',includeAnnex2?'Приложение №2 — Нормативни и документални референции (PDF) — приложено по избор.':'Приложение №2: не е заявено (незадължително).'];

 const shared=unifiedContext?.commonEvidence;
 if(shared)lines.push('Единни доказателствени констатации: '+(shared.findings||[]).length+' · предупреждения: '+(shared.warnings||[]).length+'; всички изискват експертна проверка.');
 for(const f of (unifiedContext?.commonEvidence?.findings||[]).slice(0,20))lines.push('Доказателствен запис: '+readableKind(f.key)+' · статус '+readableStatus(f.status)+' · източници '+(f.evidence||[]).slice(0,5).map(e=>String(e.file||'неизвестен документ')+' ('+String(e.date||'дата не е посочена')+')').join('; ')+' · правна приложимост: няма данни');
 const evidence=unifiedContext?.characterization;
 for(const section of evidence?.sections||[]){
  lines.push('Доказателствена тема: '+section.title+' — Приложимостта не е оценена.');
  for(const src of (section.sources||[]).slice(0,3))lines.push('Източник: '+src.file+' · '+(src.date||'дата не е посочена')+' · '+src.excerpt.slice(0,300));
 }
 for(const p of evidence?.normalized?.paragraphs||[])lines.push('ПРОЕКТ, за проверка: '+p.text+' · източник '+p.source);
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
 return {pageSize:'A4',pageMargins:[42,50,42,50],defaultStyle:{font:'Roboto',fontSize:10},styles:{heading:{fontSize:16,bold:true,margin:[0,0,0,14]},sub:{fontSize:12,bold:true,margin:[0,12,0,6]}},content:title==='ГИС анализ'?content:[{text:'ТПУ Пловдив — '+title,style:'heading'},...content]};
}
function verifiedPlaceLabel(value){
 const text=String(value||'').trim().replace(/\s+/g,' ');
 if(!text)return '';
 // Never guess whether a settlement is a city or village from a cadastral number or a bare name.
 return /^(?:гр\.|град|с\.|село)\s+/i.test(text)?text:'';
}
function pdfLocality(value){return String(value||'').trim().toLocaleLowerCase('bg-BG').replace(/(^|[\s-])([а-я])/g,(_,a,b)=>a+b).replace(/^([а-я])/,c=>c.toLocaleUpperCase('bg-BG')).replace(/\s*-\s*/g,' - ');}

/* KT77-04.1: READ-ONLY additional ZT spatial findings. No effect on scenario, Word or PDF2. */
async function kt77041Findings(results){
 if(!window.KT77PiMasterIndex?.create)throw Error('КТ77-04.1: PI MASTER не е зареден. PDF1 с данни за ЗТ не може да се издаде.');
 const index=window.KT77PiMasterIndex.create(new URL('gis-data/pi-master/browser-index/',document.baseURI).href);
 const findings=[];
 for(const result of results){
  const cadnum=String(result.input||result.cadnum||'');
  const row=await index.lookup(cadnum);
  if(row.status!=='FOUND'||row.profile?.cadnum!==cadnum||!Array.isArray(row.profile.zt)||!Array.isArray(row.profile.zz)){
   throw Error('КТ77-04.1: липсва проверен регистърен профил в PI MASTER за '+cadnum+'.');
  }
  const territories=row.profile.zt.map(z=>{
   const name=String(z.name_bg||z.name||'').trim();
   const category=String(z.category_bg||z.category||'').trim();
   const area=Number(z.intersect_m2??z.area_m2);
   const pct=Number(z.percent);
   if(!name||!category||!Number.isFinite(area)||area<0||!Number.isFinite(pct)||pct<0||pct>100)
    throw Error('КТ77-04.1: непълни или некоректни данни за пресичане със ЗТ в '+cadnum);
   return Object.freeze({name,category,area_m2:area,percent:pct});
  });
  const zones=row.profile.zz.map(z=>{const code=String(z.code||'').trim(),name=String(z.name||'').trim(),area=Number(z.area_m2),pct=Number(z.percent);if(!/^BG\d{7}$/.test(code)||!name||!Number.isFinite(area)||area<0||!Number.isFinite(pct)||pct<0||pct>100)throw Error('КТ77-04.2: непълни данни за ЗЗ в '+cadnum);return Object.freeze({code,name,area_m2:area,percent:pct});});
  const admin=Object.freeze({settlement:String(row.profile.settlement||'').trim(),locality:String(row.profile.locality||'').trim(),municipality:String(row.profile.municipality||'').trim(),province:String(row.profile.province||'').trim(),area_m2:Number(row.profile.area_m2)});
  findings.push(Object.freeze({cadnum,zones:Object.freeze(zones),territories:Object.freeze(territories),admin}));
 }
 return Object.freeze(findings);
}

function kt77044RequiredContextSvg(results,zoneFeatures,findings){
 if(typeof window.KT77044AutoContext?.buildSVG!=='function')throw Error('КТ77-04.4: модулът за автоматичен ГИС контекст не е зареден.');
 const svg=window.KT77044AutoContext.buildSVG(results,zoneFeatures||[],findings);
 if(typeof svg!=='string'||!svg.startsWith('<svg'))throw Error('КТ77-04.4: не може да бъде създаден валиден общ контекст на имотите.');
 return svg;
}
function gisPdf(results,options={}){
 if(results.length>1)options={...options,mapSvg:null};
 const leadingId=String(options.leadingParcelId||options.leadingParcel||options.verifiedCaseMetadata?.leadingParcelId||'').trim();
 const bgDate=new Intl.DateTimeFormat('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()).replace(/\s*г\.\s*$/u,'');
 const content=[{text:'Източник на пространствените данни: ГИС база на РИОСВ – Пловдив. Дата на изготвяне: '+bgDate+' г.',fontSize:9,margin:[0,0,0,8]}];
 if(options.kt77044ContextSvg&&String(options.kt77044ContextSvg).includes('<svg')){
  content.push({text:'Общ пространствен контекст на анализираните поземлени имоти',style:'sub'});
  content.push({svg:options.kt77044ContextSvg,width:510,margin:[0,5,0,10]});
 }
 if(options.mapSvg&&String(options.mapSvg).includes('<svg')){
  const clean=options.mapSvg;
  const contentMap={svg:clean,width:510,margin:[0,5,0,10]};
  content.push({text:'Пространствено положение на поземлените имоти спрямо защитените зони и защитените територии',style:'sub'});
  content.push(contentMap);
  content.push({text:'Картата представя пространственото положение на разглежданите поземлени имоти спрямо защитените зони от мрежата „Натура 2000“ и защитените територии. Данните за пространствените пресичания са определени въз основа на ГИС базата на РИОСВ – Пловдив.',fontSize:9,margin:[0,0,0,10]});
 }
 if(results.length>1){
  content.push({text:'Индивидуални карти по имоти',style:'sub'});
  const cards=[];
  for(const r of results){
   const id=String(r.input||r.cadnum||'');
   const polygons=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
   const pts=[];
   const collect=c=>{if(Array.isArray(c)&&typeof c[0]==='number'&&typeof c[1]==='number'){if(Number.isFinite(c[0])&&Number.isFinite(c[1]))pts.push(c)}else if(Array.isArray(c))c.forEach(collect)};
   polygons.forEach(f=>collect(f.geometry.coordinates));

   if(!pts.length){cards.push({stack:[{text:'Поземлен имот '+id,bold:true,fontSize:10},{text:'Липсва имотна геометрия',fontSize:9}],margin:[0,4,0,8]});continue}
   const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   const spanX=Math.max(maxX-minX,1e-10),spanY=Math.max(maxY-minY,1e-10),scale=Math.min(680/spanX,390/spanY);
   const dx=(740-spanX*scale)/2,dy=(450-spanY*scale)/2;
   const shapes=[];
   for(const f of polygons){
    const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const poly of polys){
     const outer=poly[0]||[];
     const rings=poly.map(ring=>ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])));
     const d=rings.filter(ring=>ring.length>=3).map(ring=>ring.map((p,i)=>(i?'L':'M')+(dx+(p[0]-minX)*scale).toFixed(2)+' '+(450-dy-(p[1]-minY)*scale).toFixed(2)).join(' ')+' Z').join(' ');
     if(d)shapes.push('<path d="'+d+'" fill="#e8c47e" fill-rule="evenodd" fill-opacity=".55" stroke="#a66b12" stroke-width="2"/>');
    }
   }
   const overlapPolygons=(r.overlap_geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
   for(const f of overlapPolygons){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys){const rings=poly.map(ring=>ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])));const d=rings.filter(ring=>ring.length>=3).map(ring=>ring.map((p,i)=>(i?'L':'M')+(dx+(p[0]-minX)*scale).toFixed(2)+' '+(450-dy-(p[1]-minY)*scale).toFixed(2)).join(' ')+' Z').join(' ');if(d)shapes.push('<path d="'+d+'" fill="#dc7b39" fill-rule="evenodd" fill-opacity=".58" stroke="#9d4a19" stroke-width="2"/>')}}
   const zoneShapes=[];
   const zoneCodes=new Set((r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')));
   for(const f of (options.zoneFeatures||[])){
    const code=String(f.properties?.SITECODE||f.properties?.sitecode||'');
    if(!zoneCodes.has(code)||!['Polygon','MultiPolygon'].includes(f.geometry?.type))continue;
    const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const poly of polys){const d=poly.map(ring=>ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))).filter(ring=>ring.length>=3).map(ring=>ring.map((p,i)=>(i?'L':'M')+(dx+(p[0]-minX)*scale).toFixed(2)+' '+(450-dy-(p[1]-minY)*scale).toFixed(2)).join(' ')+' Z').join(' ');if(d)zoneShapes.push('<path d="'+d+'" fill="none" stroke="#176749" stroke-width="2.6" stroke-dasharray="9 5"/>')}
   }
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="740" height="450" viewBox="0 0 740 450"><rect width="740" height="450" fill="#e8f2ed"/>'+shapes.join('')+zoneShapes.join('')+'<rect x="250" y="403" width="240" height="35" rx="6" fill="#ffffff" fill-opacity=".92"/><text x="370" y="427" text-anchor="middle" font-size="23" font-weight="bold" fill="#183c30">'+E(id)+'</text></svg>';
   const fullInChaya=id==='36676.129.457'&&zoneCodes.has('BG0000194')&&overlapPolygons.length>0;
   const finding=fullInChaya?'Имотът попада изцяло в защитена зона BG0000194 — Река Чая.':overlapPolygons.length?'Установено пространствено пресичане със защитена зона.':'Не е установено пресичане със защитена зона.';
   cards.push({stack:[{text:'Поземлен имот '+id+(leadingId?(id===leadingId?' · водещ':' · съпътстващ'):''),bold:true,fontSize:10,margin:[0,0,0,4]},{svg,width:235,margin:[0,0,0,4]},{text:fullInChaya?'Оранжево: пълно попадане':overlapPolygons.length?'Оранжево: пресичане':'Бежово: имот · без пресичане',fontSize:8,color:'#526a5e',margin:[0,2,0,3]}],margin:[0,4,0,8]});
  }
  for(let i=0;i<cards.length;i+=2){
   const row={columns:[{width:'49%',...cards[i]},{width:'49%',...(cards[i+1]||{text:''})}],columnGap:10,margin:[0,3,0,8]};
   if(i>0&&i%4===0)row.pageBreak='before';
   content.push(row);
  }
  content.push({text:'Легенда: бежово — имот; оранжево — пресичане; зелена пунктирна линия — граница на защитена зона (когато е видима в обхвата на картата).',fontSize:8,color:'#526a5e',margin:[0,8,0,12]});

 }
 const facts=options.kt77041ZtFindings;
 if(!Array.isArray(facts)||facts.length!==results.length)throw Error('КТ77-04.2: липсва пълният ПИ MASTER за PDF1');
 const fmt=n=>Number(n).toLocaleString('bg-BG',{minimumFractionDigits:2,maximumFractionDigits:2});
 const parcelLabel=f=>{
  const a=f.admin;
  if(!a.settlement||!a.municipality||!a.province)throw Error('КТ77-04.2: липсва административна принадлежност за '+f.cadnum);
  return 'ПИ '+f.cadnum+' по КККР на '+a.settlement+(a.locality?', местност „'+pdfLocality(a.locality)+'“':'')+', община '+a.municipality+', област '+a.province;
 };
 content.push({text:'Административна принадлежност на поземлените имоти',style:'sub'});
 for(const f of facts){
  const area=Number(f.admin.area_m2);
  if(!Number.isFinite(area)||area<=0)throw Error('КТ77-04.2: липсва проверена площ на имот '+f.cadnum+' в ПИ MASTER');
  content.push({text:parcelLabel(f)+'. Площ на имота: '+fmt(area)+' кв. м',fontSize:9,margin:[0,1,0,7]});
 }
 for(let i=0;i<results.length;i++){
  const r=results[i],f=facts[i];
  if(f.cadnum!==String(r.input||r.cadnum||''))throw Error('КТ77-04.2: подменен ПИ');
  if(f.zones.length)continue;
  const nearest=r.nearest_verified_zone||r.nearestZoneVerified;
  const code=String(nearest?.sitecode||nearest?.code||'').trim(),name=String(nearest?.name_bg||nearest?.name||'').trim();
  const dist=Number(nearest?.distance_m??nearest?.distanceMeters);
  content.push({text:'Най-близка защитена зона до '+parcelLabel(f)+': '+(/^BG\d{7}$/.test(code)&&name?code+' — '+name+(Number.isFinite(dist)&&dist>=0?' ('+fmt(dist)+' м)':''):'НЯМА ДАННИ за потвърдено разстояние'),fontSize:9,margin:[0,3,0,3]});
 }
 content.push({text:'А. Защитени зони от мрежата „Натура 2000“ (ЗБР)',style:'sub'});
 const zzRows=[['Поземлен имот','Код и наименование на ЗЗ','Пресичане (кв. м)','Дял от имота']];
 for(const f of facts){
  if(!f.zones.length){zzRows.push([f.cadnum,'Не е установено пресичане със ЗЗ','—','—']);continue}
  for(const z of f.zones)zzRows.push([f.cadnum,z.code+' — '+z.name,fmt(z.area_m2),fmt(z.percent)+' %']);
 }
 content.push({table:{headerRows:1,widths:[96,'*',80,77],body:zzRows},layout:'lightHorizontalLines',fontSize:8});
 if(options.kt77041ZtFindings){
  const findings=options.kt77041ZtFindings;
  if(findings.length!==results.length)throw Error('КТ77-04.1: непълни ГИС редове за ЗТ');
  content.push({text:'Б. Защитени територии (ЗЗТ)',style:'sub',margin:[0,12,0,5]});
  const rows=[['Поземлен имот','Категория и наименование на ЗТ','Пресичане (кв.м)','Дял от имота']];
  for(let i=0;i<findings.length;i++){
   const item=findings[i],id=String(results[i].input||results[i].cadnum||'');
   if(item.cadnum!==id)throw Error('КТ77-04.1: несъответствие между GIS и PI MASTER за '+id);
   if(!item.territories.length){rows.push([id,'Не е установено пресичане със ЗТ','—','—']);continue;}
   for(const territory of item.territories){
    rows.push([id,[territory.category,territory.name].filter(Boolean).join(' — '),
     fmt(territory.area_m2),
     fmt(territory.percent)+' %']);
   }
  }
  content.push({table:{headerRows:1,widths:[95,'*',84,75],body:rows},layout:'lightHorizontalLines',fontSize:8});
  
 }

 content.push({text:'Забележка: Посочените площи и пространствени пресичания са определени въз основа на ГИС базата на РИОСВ – Пловдив. Резултатите имат пространствено-информационен характер и не представляват самостоятелна правна преценка относно приложимите режими на защита.',fontSize:8,margin:[0,3,0,0]});
 return pdfDef('ГИС анализ',content);
}
function visitForLabel(coords,out){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){if(Number.isFinite(coords[0])&&Number.isFinite(coords[1]))out.push(coords)}else if(Array.isArray(coords))coords.forEach(x=>visitForLabel(x,out))}
function normativePdf(results,register){
 const ids=results.map(r=>String(r.input||r.cadnum||'')).filter(Boolean);
 const facts=register?.kt77045Facts;
 if(!Array.isArray(facts)||facts.length!==results.length)throw Error('КТ77-04.5: за PDF2 са необходими административни данни и площи от ПИ MASTER за всички имоти.');
 const fm=new Map(facts.map(f=>[f.cadnum,f]));
 if(results.some(r=>!fm.has(String(r.input||r.cadnum||''))))throw Error('КТ77-04.5: несъответствие в кадастралните идентификатори.');
 const areaFmt=n=>Number(n).toLocaleString('bg-BG',{minimumFractionDigits:2,maximumFractionDigits:2});
 function parcelDetail(r){
  const id=String(r.input||r.cadnum||''),a=fm.get(id)?.admin;
  if(!a?.settlement||!a?.municipality||!a?.province||!Number.isFinite(Number(a.area_m2))||Number(a.area_m2)<=0)
   throw Error('КТ77-04.5: непълни проверени административни данни или площ за ПИ '+id);
  return 'ПИ '+id+' по КККР на '+a.settlement+(a.locality?', местност „'+pdfLocality(a.locality).replace(/\s+-\s+/g,' – ')+'“':'')+', община '+a.municipality+', област '+a.province+'. Площ на имота: '+areaFmt(a.area_m2)+' кв. м.';
 }
 const actList=window.KT77045Acts?.acts;
 if(!Array.isArray(actList)||actList.length<4)throw Error('КТ77-04.5: липсва проверен регистър на първоначалното приемане и обнародване на актовете.');
 const relevantActs=actList.filter(a=>a.key!=='ЗЗТ'||facts.some(f=>(f.territories||[]).some(z=>Number(z.area_m2??z.intersect_m2)>0)));
 const actText=relevantActs.flatMap(a=>[{text:a.title,bold:true},{text:a.adoption+'; '+a.publication+' Оригинално обнародване; актуалната редакция изисква отделна проверка.'},{text:'Източник за проверка: '+a.authority+' — '+new URL(a.url).hostname.replace(/^www\./,''),link:a.url,fontSize:8,color:'#165c86',decoration:'underline'}]);
 const canonical=v=>String(v||'').toLocaleUpperCase('bg-BG').replace(/[„“"'‘’]/g,'').replace(/\s+/g,' ').trim();
 const ztRegistry=window.KT77R11ZZT?.archive?.sources||[];

 const ztLines=[],seenTerritories=new Set();
 for(const f of facts)for(const z of f.territories||[]){
  if(!(Number(z.area_m2??z.intersect_m2)>0))continue;
  const key=canonical(z.category+'|'+z.name);if(seenTerritories.has(key))continue;seenTerritories.add(key);
  const doc=ztRegistry.find(x=>x.kind==='protected_territory_site'&&x.source_verified===true&&canonical(x.title).includes(canonical(z.name))&&canonical(z.name));
  if(!doc?.declaration_order||!doc?.published_in||!/^https:\/\//.test(String(doc.url||'')))
   throw Error('КТ77-04.9: липсват реквизити на заповедта за защитена територия '+z.name+'. PDF2 не е издаден.');
  ztLines.push({text:z.category+' „'+(doc.title?.match(/„([^“]+)“/)?.[1]||pdfLocality(z.name))+'“',bold:true});
  ztLines.push({text:doc.declaration_order+'; '+doc.published_in});
  if(doc.area_change_order)ztLines.push({text:'Изменение: '+doc.area_change_order+(doc.area_change_publication?'; '+doc.area_change_publication:'')});
  ztLines.push({text:'Източник: ИАОС',link:doc.url,fontSize:8,color:'#165c86'});
 }

 function authorityLabel(url){
  try{const h=new URL(url).hostname.toLowerCase();if(h==='eea.government.bg'||h.endsWith('.eea.government.bg')||h==='pdbase.eea.government.bg')return 'ИАОС — '+h;
   if(h==='moew.government.bg'||h.endsWith('.moew.government.bg'))return 'МОСВ — '+h;
   if(h==='dv.parliament.bg')return 'Държавен вестник — '+h;
   if(h==='eur-lex.europa.eu')return 'EUR-Lex — '+h;
   if(h==='mrrb.bg'||h.endsWith('.mrrb.bg'))return 'МРРБ — '+h;
   return 'Източник — '+h+' (подлежи на проверка на издателя)';}catch(_){return 'НЯМА ДАННИ за източника'}
 }
 const zoneMap=new Map();
 for(const r of results){
  for(const z of r.verified_zone_intersections||[]){
   const code=typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim();
   if(/^BG\d{7}$/.test(code)&&!zoneMap.has(code))zoneMap.set(code,{code,name:z?.name_bg||z?.name||'',order:z?.order_no||''});
  }
 }
 const zones=[...zoneMap.values()].sort((a,b)=>a.code.localeCompare(b.code));

 const records=register?.records||[];
 const zzLines=zones.flatMap(z=>{
  const available=register?.verifiedZoneOrders?.[z.code],archived=window.KT77049ZoneOrders?.[z.code];
  let order=null,gazette=null,source=null,changes=[];
  if(available?.verified===true&&available?.number&&available?.date&&available?.gazette&&/^https:\/\//.test(String(available.source_url||''))){
   order='Заповед № '+available.number+' от '+available.date+' на министъра на околната среда и водите';gazette=available.gazette;source=available.source_url;changes=available.changes||[];
  }else if(archived?.declaration&&archived?.gazette&&archived?.source){
   order=archived.declaration;gazette=archived.gazette;source=archived.source;changes=archived.changes||[];
  }else{
   const record=records.find(r=>String(r.title||'').includes(z.code)&&/Заповед\s*(?:№\s*)?РД[-– ]?\d+/i.test(r.title||'')&&/ДВ\s*\d+\/\d{4}/i.test(r.title||'')&&/^https:\/\//.test(String(r.source||'')));
   if(record){
    const m=String(record.title).match(/Заповед\s*(РД[-– ]?\d+)\/(\d{2}\.\d{2}\.\d{4}).*?ДВ\s*(\d+\/\d{4})/i);
    if(m){order='Заповед № '+m[1].replace(/\s/g,'')+' от '+m[2]+' на министъра на околната среда и водите';gazette='ДВ, бр. '+m[3];source=record.source;}
   }
  }
  if(!order||!gazette||!source)throw Error('КТ77-04.9: липсва заповед за защитена зона '+z.code+'. PDF2 не е издаден.');
  return [{text:'Защитена зона '+z.code+' „'+(z.name||archived?.name||'Наименование по регистъра')+'“',bold:true},
   {text:order+'; '+gazette},...changes.map(x=>({text:'Изменение: '+String(x)})),
   {text:'Източник: МОСВ',link:source,color:'#165c86',fontSize:8}];
 });

 const gisEvidence=results.map(r=>{const id=String(r.input||r.cadnum||'');const verified=(r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')).filter(z=>/^BG\d{7}$/.test(z));const overlays=[...(r.archived_overlay_records||[]),...(r.archived_zones||[])];const archived=overlays.map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')).filter(z=>/^BG\d{7}$/.test(z));return {id,codes:[...new Set(verified)],archivedCodes:[...new Set(archived)],outside:r.intersection_verified_outside===true};});
 const gisZoneCodes=[...new Set(gisEvidence.flatMap(x=>x.codes))];
 const gisSummary=gisEvidence.map(x=>'Имот '+x.id+': '+(x.codes.length?'отчетено пресичане със защитена зона':x.outside?'без пресичане със защитена зона':'пространственият резултат изисква сверяване с ГИС анализа')).join('; ')+'.';
 const dossier=register?.dossierReferences;
 const subject=window.V26SubjectContext;
 const review=register?.verifiedCaseMetadata||null;
 const resolvedTitle=String((subject?.confirmed&&subject?.title)||review?.subject||review?.title||dossier?.subject?.title||dossier?.subject_title||'').trim();
 const confirmed=!!(subject?.confirmed&&resolvedTitle);
 const cleanSubject=(value)=>String(value||'').replace(/\bи\s+зграждането\b/gi,'изграждането').replace(/\bСк\s+лад\b/g,'Склад').replace(/\bпро\s+мишлени\b/gi,'промишлени').replace(/\s*[„“]\s*/g,' ').replace(/\s+/g,' ').trim().replace(/[\s,;:.–-]+$/,'').trim();
 const subjectDisplay=cleanSubject(resolvedTitle)||'НЯМА ДАННИ — за експертна проверка.';
 const subjectCore=cleanSubject(subjectDisplay.split(/\s+в\s+ПИ\s+(?:с\s+)?идентификатор(?:\s+№)?\s+\d{5}\.\d+\.\d+/i)[0]);

 // KT77-04.10: the first paragraph cites all confirmed parcel IDs and their PI MASTER
 // administrative location, without modifying the dossier's confirmed subject itself.
 const subjectWithoutParcel=cleanSubject((subjectCore||subjectDisplay)
   .replace(/\s+в\s+(?:(?:поземлен\s+)?имот|ПИ)\s+(?:с\s+)?(?:идентификатор\s*(?:№\s*)?)?\d{5}\.\d+\.\d+[\s\S]*$/i,''));
 const administrativeGroups=new Map();
 for(const result of results){
  const id=String(result.input||result.cadnum||''),a=fm.get(id)?.admin;
  if(!a?.settlement||!a?.municipality||!a?.province)throw Error('КТ77-04.10: липсва административна принадлежност за ПИ '+id);
  const place='по КККР на '+a.settlement+(a.locality?', местност „'+pdfLocality(a.locality).replace(/\s+-\s+/g,' – ')+'“':'')+', община '+a.municipality+', област '+a.province;
  if(!administrativeGroups.has(place))administrativeGroups.set(place,[]);
  administrativeGroups.get(place).push(id);
 }
 const propertyLocations=[...administrativeGroups].map(([place,ids])=>'в ПИ '+ids.join(', ')+' '+place).join('; ');
 const subjectFullLocation=(subjectWithoutParcel||subjectDisplay)+(subjectWithoutParcel&&propertyLocations?' '+propertyLocations:'');
 const verifiedLocation=String(review?.location||'').trim();
 const verifiedSettlement=verifiedPlaceLabel(review?.settlement);
 const verifiedLandArea=String(review?.landArea||'').trim();
 const relevant=records.filter(r=>{const title=String(r.title||'');const code=String(r.zone_code||r.sitecode||'');const mentioned=[...title.matchAll(/BG\d{7}/g)].map(m=>m[0]);return title&&/^https:\/\//.test(String(r.source||''))&&(!code||zoneMap.has(code))&&(!mentioned.length||mentioned.every(z=>zoneMap.has(z)))&&(/биологичното разнообразие|съвместимост|защитена зона|заповед/i.test(title+' '+String(r.purpose||'')));});
 const legalGroups=new Map();
 for(const r of relevant){
  const title=String(r.title||'').toLocaleLowerCase('bg');
  const code=String(r.zone_code||r.sitecode||'')||([...String(r.title||'').matchAll(/BG\d{7}/g)][0]?.[0]||'');
  const group=title.includes('биологичното разнообразие')?'Закон за биологичното разнообразие':title.includes('оценка за съвместимост')?'Наредба за оценка за съвместимост':code&&zoneMap.has(code)?'Зона '+code:String(r.title||'').trim();
  const key=group+'|'+code;
  if(!legalGroups.has(key))legalGroups.set(key,{title:group,sources:[],ids:[]});
  const item=legalGroups.get(key);if(r.id&&!item.ids.includes(r.id))item.ids.push(r.id);if(r.source&&!item.sources.includes(r.source))item.sources.push(r.source);
 }
 const applicable=[]; // Zone orders are rendered directly after the related zone.
 const content=[
  {text:'I. Предмет и фактическа основа',style:'sub'},

  {text:'Предмет на инвестиционното предложение: '+subjectFullLocation},
  // KT77-23: The verified per-parcel details and subject above already give full location.
  // Do not repeat stale dossier placeholders (XXXXXXXXXX) as if they were confirmed.
  // Omit redundant secondary location for all cases; GIS/PI MASTER fields remain untouched.
  ...(!/[XХ]{3,}/iu.test(verifiedLocation)&&verifiedLocation&&
       !propertyLocations.includes(verifiedLocation)?
       [{text:'Местоположение на имотите: '+verifiedLocation}]:[]),
  ...(verifiedSettlement?[{text:'Населено място: '+verifiedSettlement}]:[]),
  ...(verifiedLandArea?[{text:'Землище: '+verifiedLandArea}]:[]),
  {text:'Административна принадлежност и площи на поземлените имоти:',bold:true},
  ...results.map(parcel=>({text:parcelDetail(parcel)})),
  ...(confirmed&&subject.activities?.length?[{text:'Предвидени дейности:',bold:true,margin:[0,4,0,2]},...subject.activities.map(a=>String(a).replace(/\s+/g,' ').replace(/^\s*[;:,.]+\s*/,'').trim()).filter(Boolean).map(a=>({text:'• '+a,margin:[8,0,0,2]}))]:[]),
  {text:'II. Пространствена относимост',style:'sub'},
  {text:'Пространствените резултати са представени в самостоятелния документ „РИОСВ – Пловдив · ГИС анализ“. Настоящият документ използва резултатите му, без да ги замества.'},
  {text:'Пространствен резултат по имоти: '+gisSummary},
  {text:'III. Нормативни и документални основания',style:'sub'},
  {text:"Нормативни основания за експертна проверка: чл. 31, ал. 1 от ЗБР урежда оценката за съвместимост при възможно значително отрицателно въздействие върху защитена зона; чл. 31, ал. 4 от ЗБР урежда съвместяването с процедурите по ЗООС в приложимите случаи; чл. 2, ал. 1, т. 1 от Наредбата за ОС определя обхват на инвестиционните предложения. Посочването на разпоредби не предрешава приложимата процедура по конкретната преписка.",fontSize:8},
  {text:'Пространственото пресичане само по себе си не доказва нарушение на режим.'},
  {text:'Първоначално приемане и обнародване на нормативните актове:',bold:true},
  ...actText,
  {text:'Заповеди и документални данни за установените защитени зони (ЗБР):',bold:true},
  ...(zzLines.length?zzLines:[{text:'Не е установено пресичане със защитени зони.'}]),
  {text:'Заповеди и документални данни за установените защитени територии (ЗЗТ):',bold:true},
  ...(ztLines.length?ztLines:[{text:'Няма установено пресичане със защитени територии.'}]),
  ...applicable.flatMap(r=>[{text:r.title,bold:true,fontSize:9},...r.sources.filter((source,i,arr)=>arr.indexOf(source)===i).map(source=>({text:authorityLabel(source)+' · официална справка (редакцията се проверява в източника)',link:String(source),color:'#165c86',fontSize:8,decoration:'underline'}))]),
  
  {text:'IV. Приложимост към инвестиционното предложение',style:'sub'},
  {text:resolvedTitle?'За предложение „'+subjectCore+'“ относимостта на посочените основания се разглежда спрямо описаните дейности и пространствените резултати от документа „РИОСВ – Пловдив · ГИС анализ“. Режимите на конкретна зона се преценяват отделно; настоящата справка не установява автоматично допустимост или забрана.':'Предметът и дейностите подлежат на потвърждение преди индивидуална преценка за приложимост на режимите.'},

  ...(zones.length?[{text:'Пресичанията и съответните заповеди са посочени в раздел III. Приложимостта на конкретните режими се преценява спрямо заявените дейности.'}]:[]),
  {text:'V. Експертен извод',style:'sub'},
  {text:gisZoneCodes.length?'За посочените имоти са отчетени пресичания със защитени зони. Пространствените резултати не определят автоматично допустимостта на ИП.':gisEvidence.every(x=>x.outside)?'Не е установено пресичане със защитени зони.':'Пространственият резултат се сверява с документа „РИОСВ – Пловдив · ГИС анализ“.'},
  {text:'Приложимостта на посочените заповеди се преценява спрямо заявените дейности.'},
  {text:'Документът е проект за експертна проверка, а не административен акт.',italics:true,fontSize:8,margin:[0,0,0,0]}
 ];
 const def=pdfDef('Нормативни и документални референции',content);
 // PDF2 already has a running document title; remove the duplicated large title, not the substantive sections.
 def.content=def.content.slice(1);
 def.kt77045Normative=true; def.kt77046Normative=true;
 // Compact only Annex 2; leave the approved GIS Annex 1 layout untouched.
 def.pageMargins=[42,16,42,16];
 def.defaultStyle={...def.defaultStyle,fontSize:7.9,lineHeight:0.97};
 def.styles={...def.styles,heading:{...def.styles.heading,fontSize:12.5,margin:[0,0,0,4]},sub:{...def.styles.sub,fontSize:9,margin:[0,2,0,1]}};
 // Avoid splitting the short expert conclusion onto an otherwise blank second page.
 const conclusionIndex=def.content.findIndex(x=>x?.text==='V. Експертен извод');
 if(conclusionIndex>=0){for(let i=conclusionIndex;i<def.content.length;i++)if(def.content[i]&&typeof def.content[i]==='object')def.content[i].fontSize=def.content[i].fontSize||8;}
 return def;
}

async function make(results,roles,register){
 if(window.V26TemplateWord?.layout!=='KT41_EXACT_KT35_KT39'||window.V26ExpertWord?.layout!=='KT41_EXACT_V27_R02')
  throw Error('КТ41: одобрените Word еталони не са заредени. ZIP с други генератори няма да се създаде.');

 if(!results.length||!roles||results.some(r=>!['leading','ancillary'].includes(roles[r.input]||roles[r.cadnum])))throw Error('Потвърдете ролите за всички имоти.');
 if(!results.some(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Няма действителна имотна геометрия за Приложение №1.');
 const z=zipWriter(),ids=results.map(r=>r.input),normalized=Object.fromEntries(results.map(r=>[r.input,roles[r.input]||roles[r.cadnum]]));
 const determination=scenarioFromGIS(results,normalized);
 if(!register?.unifiedContext?.commonEvidence)throw Error('Липсва анализът на преписката.');
 // The completed GIS calculation is the shared spatial determination for every generated document.
 if(!determination.scenario)throw Error('Не е доказано, че всички водещи имоти са извън Натура 2000. Сценарий А не се допуска по подразбиране.');
 register={...register,spatialDetermination:determination};
 const includeAnnex2=register?.v27Package===true||register?.includeAnnex2===true;
 const paragraphPrefixes=(determination.scenario==='Б'||determination.scenario==='B')?['С реализацията','Електроснабдяването','Водозахранването','Отпадъчните води']:['С реализацията','Електроснабдяването','Водоснабдяването','Отпадъчните води'];
 const paragraphs=Array.isArray(register?.verifiedCharacterizationParagraphs)?register.verifiedCharacterizationParagraphs.map((p,i)=>{const value=String(p||'').trim();if(!value)return value;if(i===2&&/^(Водоснабдяването|Водозахранването)/.test(value))return value.replace(/^(Водоснабдяването|Водозахранването)/,paragraphPrefixes[i]);return value;}):register?.verifiedCharacterizationParagraphs; if(!window.V26TemplateWord?.make)throw Error('Липсва модулът за оригиналните Word образци.');const caseMetadata={...(register?.verifiedCaseMetadata||{})};
 // Confirmed parcel roles and resolved GIS results are the authoritative input for the working draft.
 // Never require a second, manually retyped copy of cadastral identifiers.
 const confirmedIds=results.map(r=>String(r.input||r.cadnum||'').trim()).filter(id=>/^\d{5}\.\d+\.\d+(?:\.\d+){0,2}$/.test(id));
 if(confirmedIds.length!==results.length)throw Error('Липсва валиден кадастрален идентификатор в потвърдената ГИС справка.');
 caseMetadata.parcelIds=[...new Set(confirmedIds)].join(', ');
  // The dossier's confirmed parcel location is shared by Word and both annexes.
  if(!caseMetadata.location){const gisLocation=results.map(x=>x.location).filter(x=>typeof x==='string'&&x.trim());if(gisLocation.length===1)caseMetadata.location=gisLocation[0].trim();}
  // Only explicit verified GIS metadata may supply a settlement/land area; never infer a city/village from parcel ID.
  for(const [key,sourceKeys] of [['settlement',['settlement','settlement_name']],['landArea',['landArea','land_area']]]){
   if(!caseMetadata[key]){const values=[...new Set(results.map(x=>sourceKeys.map(k=>x[k]).find(v=>typeof v==='string'&&v.trim())).filter(Boolean).map(x=>x.trim()))];if(values.length===1&&(key!=='settlement'||verifiedPlaceLabel(values[0])))caseMetadata[key]=values[0];}
  }
  register={...register,verifiedCaseMetadata:caseMetadata};
 // KT67-2: ONLY an explicitly labeled working-DRAFT package may carry AI-authored
 // legal project paragraphs without article-level source confirmation.
 // This does not verify the legal text. README documents the unverified project status.
 if(register?.kt67DraftMode===true){
  if(register?.kt67Content?.schema!=='KT67_AI_CONTENT_V1'||register.kt67Content.readyForIntegration!==true||register.kt67Content.reviewRequired!==true)throw Error('КТ67-2: непълно AI съдържание за работен проект.');
  if(register.kt67Content.scenario!==determination.scenario)throw Error('КТ67-2: AI сценарият не съвпада с ГИС.');
  if(register.kt67Content.parcelIds.join(', ')!==confirmedIds.join(', '))throw Error('КТ67-2: AI имотите не съвпадат с ГИС.');
 }
 // KT23/2: Legal findings are evidence-bound; never turn dossier observations into legal conclusions.
 const legalCount=determination.scenario==='Б'?7:5;
 const reviewFinding=i=>'[ЗА ЕКСПЕРТНА ПРОВЕРКА — правна констатация '+(i+1)+': приложимостта се установява по преписката и нормативния архив]';
 const suppliedLegal=Array.isArray(caseMetadata.legalParagraphs)?caseMetadata.legalParagraphs:[];
 const legalSources=Array.isArray(caseMetadata.legalFindingSources)?caseMetadata.legalFindingSources:[];
 caseMetadata.legalParagraphs=Array.from({length:legalCount},(_,i)=>{
  const value=String(suppliedLegal[i]||'').trim(),source=String(legalSources[i]||'').trim();
  return value&&((source&&source!=='НЯМА ДАННИ'&&source!=='Няма данни')||(register?.kt67DraftMode===true&&register?.kt67Content?.schema==='KT67_AI_CONTENT_V1'&&register.kt67Content.readyForIntegration===true))?value:reviewFinding(i);
 });
 if(!caseMetadata.procedureFinding)caseMetadata.procedureFinding='[ЗА ЕКСПЕРТНА ПРОВЕРКА — приложима процедура]';
 if(!Array.isArray(caseMetadata.impactFindings)||caseMetadata.impactFindings.length!==5)caseMetadata.impactFindings=Array.from({length:5},(_,i)=>'[ЗА ЕКСПЕРТНА ПРОВЕРКА — въздействие '+(i+1)+']');
 register={...register,verifiedCaseMetadata:caseMetadata};
 const dossierEvidence=register?.unifiedContext?.commonEvidence||null;
 // Use ONLY article-level, source-traceable excerpts in the internal normative archive.
 const verifiedLegalSources=(register?.records||[]).filter(r=>r?.verified===true&&r?.verified_scope&&r?.article&&r?.source&&r?.project_revision_accepted===true).map(r=>({
  id:r.id,title:r.title,source:r.source,article:r.article,page:r.page,
  verifiedScope:r.verified_scope,projectRevisionAccepted:true,revisionVerified:r.revision_verified===true
 }));
 const expertDraft=window.V26ExpertDraft?.build({results,roles:normalized,determination,metadata:caseMetadata,paragraphs,evidence:dossierEvidence,aiDraft:register?.v27AiDraft||'',legalSources:verifiedLegalSources});
 if(!expertDraft)throw Error('КТ13: липсва единният експертен проект.');
 if(!window.V26ExpertWord?.make)throw Error('КТ13: липсва генераторът за експертния Word.');
 const overviewMap=results.length>1?(window.V27MultiParcelMap?.build(results,register?.zoneFeatures||[])||null):(register?.mapSvg||null);
 if(!overviewMap)throw Error('Липсва обзорната ГИС карта за експертния Word. Изпълнете картографския анализ преди създаване на пакета.');
 if(register?.v27Package&&!String(register.v27AiDraft||'').trim())throw Error('V27.2: липсва AI авторски текст; експертният Word не може да се замени със стандартен.');
 const expertWord=await window.V26ExpertWord.make(expertDraft,{mapSvg:overviewMap,requireAiAuthor:Boolean(register?.v27Package),...(register?.mapPngBytes?.byteLength?{mapPngBytes:register.mapPngBytes}:{})});
 // KT26: The canonical A/B document must use the expert-confirmed case
 // characterization, never the independently AI-authored Expert Word narrative.
 // Preserve the approved paragraph wording; the original A/B template owns its
 // fixed legal and impact paragraphs and their formatting.
 const classicSource=Array.isArray(paragraphs)&&paragraphs.length===4
  ?paragraphs:expertDraft.characterization;
 if(!Array.isArray(classicSource)||classicSource.length!==4||classicSource.some(p=>!String(p||'').trim()))
  throw Error('КТ26: липсват четирите потвърдени абзаца за класическия образец А/Б.');
 const classicParagraphs=classicSource.map(value=>String(value).trim());
 // KT23: Classic Word uses the expert-confirmed four paragraphs unchanged; AI authors the separate Expert Word.
 const classicWord=await window.V26TemplateWord.make(expertDraft.scenario,classicParagraphs,expertDraft.metadata,{determination});
 const verifyEtalon=async(blob,expected,label)=>{
  if(!window.fflate?.unzipSync)throw Error('КТ41: липсва DOCX валидатор.');
  const zip=window.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const xml=zip['word/document.xml'];if(!xml)throw Error('КТ41: няма Word XML за '+label);
  const doc=new DOMParser().parseFromString(new TextDecoder().decode(xml),'application/xml');
  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body=doc.getElementsByTagNameNS(ns,'body')[0];
  const paragraphs=Array.from(body.children).filter(p=>p.localName==='p');
  if(paragraphs.length!==expected)throw Error('КТ41: '+label+' не съвпада с одобрения еталон: '+paragraphs.length+' вместо '+expected+' абзаца.');
  const text=paragraphs.map(p=>Array.from(p.getElementsByTagNameNS(ns,'t')).map(x=>x.textContent).join('')).join('\n');
  if(/\[\[(?:CONCLUSION|CHARACTERIZATION|PROCEDURE|LEGAL|IMPACTS)\]\]/.test(text))
   throw Error('КТ41: технически маркер в '+label);
 };
 await verifyEtalon(classicWord,expertDraft.scenario==='А'?41:43,'КТ35-А/КТ39-Б');
 await verifyEtalon(expertWord,49,'V27 R02');
 for(const [label,blob] of [['експертен',expertWord],['класически',classicWord]]){
  if(blob.size<100||new TextDecoder().decode(await blob.slice(0,2).arrayBuffer())!=='PK')throw Error('КТ13: невалиден '+label+' DOCX.');
 }
 if(classicWord===expertWord)throw Error('КТ14: очакват се два отделни Word проекта.');
 z.file('01_Proekt_na_stanovishte_Klasicheski.docx',classicWord);
 z.file('02_Proekt_na_stanovishte_Eksperten.docx',expertWord);
 await ensurePDF();
 const kt77041ZtFindings=await kt77041Findings(results);
 const kt77044ContextSvg=kt77044RequiredContextSvg(results,register?.zoneFeatures||[],kt77041ZtFindings);
 const pdf1=await pdfBlob(gisPdf(results,{...register,kt77041ZtFindings,kt77044ContextSvg}));if(pdf1.size<100||await pdf1.slice(0,4).text()!=='%PDF')throw Error('ГИС анализът не е валиден PDF.');z.file('03_GIS_analiz.pdf',pdf1);
 if(includeAnnex2){const pdf2=await pdfBlob(normativePdf(results,{...register,kt77045Facts:kt77041ZtFindings}));if(pdf2.size<100||await pdf2.slice(0,4).text()!=='%PDF')throw Error('Нормативните и документалните референции не са валиден PDF.');z.file('04_Normativni_i_dokumentalni_referencii.pdf',pdf2);}
 const evidenceLines=['РАБОТЕН ПАКЕТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.','ВНИМАНИЕ: Полетата [ЗА ЕКСПЕРТНА ПРОВЕРКА] са незавършени и изискват проверка от компетентен експерт преди подписване или изпращане.','Съдържа два отделни DOCX проекта (класически и експертен), задължителното PDF приложение №1; приложение №2 е задължително във V27.1 и опционално в наследения V26 маршрут.','Правната приложимост и изводите подлежат на експертна проверка.','','ТЕХНИЧЕСКА ПРОСЛЕДИМОСТ — САМО ЗА ВЪТРЕШНА ПРОВЕРКА'];
 if(dossierEvidence){
  evidenceLines.push('Сценарий (ГИС): '+String(determination.scenario||'неопределен'));
  evidenceLines.push('Пространствен статус (ГИС): '+(determination.scenario==='Б'?'Установено пресичане: '+determination.zones.join(', '):determination.scenario==='А'?'Установено непресичане':'Няма данни'));
  for(const item of (dossierEvidence.findings||[]).slice(0,20)){
   const sources=(item.evidence||[]).slice(0,5).map(e=>String(e.file||'неизвестен документ')+' ('+String(e.date||'дата неустановена')+')').join('; ');
   evidenceLines.push('Запис: '+String(item.key||'')+'; статус: '+String(item.status||'непотвърден')+'; източници: '+sources);
  }
  for(const warning of (dossierEvidence.warnings||[]).slice(0,15))evidenceLines.push('Предупреждение: '+String(warning.kind||'неуточнено')+'; документ: '+String(warning.file||'неизвестен'));
 }
 if(register?.kt67DraftMode===true){
  evidenceLines.push('','КТ67-2 — ПРЕДВАРИТЕЛЕН РАБОТЕН ПРОЕКТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.');
  evidenceLines.push('AI изготвените правни и процедурни пасажи не са автоматично проверени нормативни заключения.');
  evidenceLines.push('Генерирането на DOCX не удостоверява достоверността, приложимостта на нормите или административното одобрение.');
  evidenceLines.push('Възложителят и компетентният експерт следва да сверят текста, нормативните основания и доказателствата преди подписване.');
  for(const warning of register.kt67Content.warnings||[])evidenceLines.push('Предупреждение: '+warning);
 }
 if(register?.v27Package){
  const aiText=String(register.v27AiDraft||'').trim();
  if(!aiText)throw Error('V27.2: липсва проверен AI текст за произхода на експертния Word.');
  if(!globalThis.crypto?.subtle)throw Error('V27.2: браузърът не поддържа проверим SHA-256 за AI текста.');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(aiText));
  const sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  evidenceLines.push('','V27.2 — ПРОИЗХОД НА ЕКСПЕРТНИЯ ПРОЕКТ');
  evidenceLines.push('Режим: AI автор — задължителен за експертния Word.');
  evidenceLines.push('Контрол: четири AI раздела са валидирани преди генериране на DOCX.');
  evidenceLines.push('SHA-256 на AI авторския текст: '+sha256);
  evidenceLines.push('Момент на пакетиране (UTC): '+new Date().toISOString());
  evidenceLines.push('Забележка: този запис удостоверява вложения AI текст, но сам по себе си не доказва сигурност на външните услуги.');
 }
 z.file('README_BG.txt',evidenceLines.join('\n')+'\n');
 const packageFiles=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_GIS_analiz.pdf',...(includeAnnex2?['04_Normativni_i_dokumentalni_referencii.pdf']:[]),'README_BG.txt'];
 const actualFiles=z.names();
 if(actualFiles.length!==packageFiles.length||packageFiles.some(name=>!actualFiles.includes(name)))throw Error('V27.1: ZIP пакетът има неочакван състав.');
 const packageBlob=await z.generateAsync({type:'blob'});if(packageBlob.size<300||new TextDecoder().decode(await packageBlob.slice(0,2).arrayBuffer())!=='PK')throw Error('Неуспешно пакетиране в ZIP.');return packageBlob;
}
async function standalonePDF(results,kind,register){if(!results?.length)throw Error('Първо изпълнете ГИС справката.');if(kind!==2&&!results.some(r=>r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва имотна геометрия за PDF №1. Заредете архивната геометрия и изпълнете справката отново.');await ensurePDF();if(kind===2)return pdfBlob(normativePdf(results,{...register,kt77045Facts:await kt77041Findings(results)}));const findings=await kt77041Findings(results);return pdfBlob(gisPdf(results,{...register,kt77041ZtFindings:findings,kt77044ContextSvg:kt77044RequiredContextSvg(results,register?.zoneFeatures||[],findings)}))}
window.V26DraftPackage=Object.freeze({make,standalonePDF});
})();