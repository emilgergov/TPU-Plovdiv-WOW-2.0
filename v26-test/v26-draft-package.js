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
function scenarioFromGIS(results,roles){
 const leading=results.filter(r=>(roles[r.input]||roles[r.cadnum])==='leading');
 if(!leading.length)throw Error('Няма потвърден водещ имот.');
 if(leading.some(r=>r.status!=='Намерен'||!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва действителна геометрия за водещ имот.');
 const zones=leading.flatMap(r=>r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim()).filter(z=>/^BG[0-9]{7}$/.test(z));
 if(zones.length)return {scenario:'Б',basis:'потвърдени пространствени пресичания',zones:[...new Set(zones)]};
 if(leading.every(r=>r.intersection_verified_outside===true))return {scenario:'А',basis:'потвърдено отсъствие на пресичания',zones:[]};
 return {scenario:null,basis:'непотвърдено пространствено пресичане или отсъствие',zones:[]};
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
 return {pageSize:'A4',pageMargins:[42,50,42,50],defaultStyle:{font:'Roboto',fontSize:10},styles:{heading:{fontSize:16,bold:true,margin:[0,0,0,14]},sub:{fontSize:12,bold:true,margin:[0,12,0,6]}},content:[{text:'ТПУ Пловдив — '+title,style:'heading'},{text:'РАБОТЕН СПРАВОЧЕН ДОКУМЕНТ. Не удостоверява актуални граници, режими или правни заключения.',bold:true,margin:[0,0,0,14]},...content]};
}
function verifiedPlaceLabel(value){
 const text=String(value||'').trim().replace(/\s+/g,' ');
 if(!text)return '';
 // Never guess whether a settlement is a city or village from a cadastral number or a bare name.
 return /^(?:гр\.|град|с\.|село)\s+/i.test(text)?text:'';
}
function gisPdf(results,options={}){
 const content=[{text:'Източник: архивна регионална кадастрална геобаза на РИОСВ – Пловдив (02.10.2026 г.). Технически идентификатор: RIOSV_PLOVDIV_KAIS_CADASTRE_REGIONAL_02_10_2026.gdb.',margin:[0,0,0,8]}];
 if(options.mapSvg&&String(options.mapSvg).includes('<svg')){
  const clean=options.mapSvg;
  const contentMap={svg:clean,width:510,margin:[0,5,0,10]};
  content.push({text:'Картографски материал — одобрена ГИС карта (избран мащаб и изглед)',style:'sub'});
  content.push(contentMap);
  content.push({text:'Картата възпроизвежда видимите слоеве в браузъра: имот, граници на защитени зони и етикети. Пространственото заключение и площите на пресичане са изчислени по интегрирания ГИС архив на ТПУ; правният режим се разглежда отделно.',fontSize:9,margin:[0,0,0,10]});
 }
 if(results.length>1){
  content.push({text:'Индивидуални картни изгледи по имоти · до 4 карти на страница',style:'sub',pageBreak:'before'});
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
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="740" height="450" viewBox="0 0 740 450"><rect width="740" height="450" fill="#e8f2ed"/>'+shapes.join('')+'<text x="370" y="430" text-anchor="middle" font-size="17" fill="#183c30">'+E(id)+'</text></svg>';
   cards.push({stack:[{text:'Поземлен имот '+id,bold:true,fontSize:10,margin:[0,0,0,4]},{svg,width:235,margin:[0,0,0,4]},{text:'Имотна геометрия от интегрирания ГИС архив',fontSize:8,color:'#526a5e'}],margin:[0,4,0,8]});
  }
  for(let i=0;i<cards.length;i+=2){
   const row={columns:[{width:'49%',...cards[i]},{width:'49%',...(cards[i+1]||{text:''})}],columnGap:10,margin:[0,3,0,8]};
   if(i>0&&i%4===0)row.pageBreak='before';
   content.push(row);
  }
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
 }else if(!options.mapSvg)content.push({text:'Картографски материал: Недостатъчни данни за заключение — няма налична имотна геометрия.',bold:true});
 const verifiedLocation=String(options.verifiedCaseMetadata?.location||'').trim();
 const verifiedSettlement=verifiedPlaceLabel(options.verifiedCaseMetadata?.settlement);
 const verifiedLandArea=String(options.verifiedCaseMetadata?.landArea||'').trim();
 if(verifiedLocation)content.push({text:'Местоположение на имотите: '+verifiedLocation,margin:[0,5,0,7]});
 if(verifiedSettlement)content.push({text:'Населено място: '+verifiedSettlement});
 if(verifiedLandArea)content.push({text:'Землище: '+verifiedLandArea});
 content.push({text:'ГИС данни по имоти — обща таблица',style:'sub'});
 content.push({table:{headerRows:1,widths:[112,72,82,82,'*'],body:[
  ['Кадастрален №','Площ, кв.м','Зона','Пресичане','Статус'],
  ...results.map(r=>{
   const id=String(r.input||r.cadnum||'');
   const has=!!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
   const area=Number(r.area_m2_source);
   const overlays=[...(r.archived_overlay_records||[]),...(r.archived_zones||[])];
   const zones=[...new Set(overlays.map(z=>typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim()).filter(z=>/^BG\d{7}$/.test(z)))];
   const names=[...new Set(overlays.map(z=>String(z.name_bg||z.name||'').trim()).filter(Boolean))];
   const verifiedCodes=(r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim()).filter(z=>/^BG\d{7}$/.test(z));
    const zoneText=verifiedCodes.length?verifiedCodes.join(', '):r.intersection_verified_outside===true?'Няма пресечена защитена зона':zones.length?'Архивни сведения (непотвърдено пресичане): '+zones.join(', '):'Няма потвърдени данни';
   const verifiedZones=(r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim()).filter(z=>/^BG\d{7}$/.test(z));
    const intersection=verifiedZones.length?'УСТАНОВЕНО ПРЕСИЧАНЕ':r.intersection_verified_outside===true?'НЯМА ПРЕСИЧАНЕ':has?'Няма данни':'Няма данни';
   return [id,'Не е удостоверена по актуални кадастрални данни',zoneText,intersection,has?'ГИС геометрия налична':'Липсва геометрия'];
  })
 ]},layout:'lightHorizontalLines'});
 content.push({text:'Само изрично потвърдените пространствени пресичания са обозначени като установени. Архивните сведения не са доказателство за актуално пресичане.',margin:[0,10,0,0]});
 return pdfDef('Приложение №1 — ГИС анализ',content);
}
function visitForLabel(coords,out){if(Array.isArray(coords)&&typeof coords[0]==='number'&&typeof coords[1]==='number'){if(Number.isFinite(coords[0])&&Number.isFinite(coords[1]))out.push(coords)}else if(Array.isArray(coords))coords.forEach(x=>visitForLabel(x,out))}
function normativePdf(results,register){
 const ids=results.map(r=>String(r.input||r.cadnum||'')).filter(Boolean);
 const zoneMap=new Map();
 for(const r of results){
  for(const z of r.verified_zone_intersections||[]){
   const code=typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim();
   if(/^BG\d{7}$/.test(code)&&!zoneMap.has(code))zoneMap.set(code,{code,name:z?.name_bg||z?.name||'',order:z?.order_no||''});
  }
 }
 const zones=[...zoneMap.values()].sort((a,b)=>a.code.localeCompare(b.code));
 const records=register?.records||[];
 const dossier=register?.dossierReferences;
 const subject=window.V26SubjectContext;
 const review=register?.verifiedCaseMetadata||null;
 const resolvedTitle=String(subject?.title||review?.subject||review?.title||dossier?.subject?.title||dossier?.subject_title||'').trim();
 const confirmed=!!(subject?.confirmed&&resolvedTitle);
 const subjectDisplay=(resolvedTitle||'Не е установен в обработените материали — за експертна проверка.').replace(/\bи\s+зграждането\b/gi,'изграждането').replace(/\bСк\s+лад\b/g,'Склад').replace(/\bпро\s+мишлени\b/gi,'промишлени').replace(/\s*[„“]\s*/g,' ').replace(/\s+/g,' ').trim();
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
 const applicable=[...legalGroups.values()]; // Do not silently omit applicable archival references.
 const content=[
  {text:'I. Предмет и фактическа основа',style:'sub'},
  {text:'Предмет на инвестиционното предложение: '+(subjectDisplay)},
  ...(verifiedLocation?[{text:'Местоположение на имотите: '+verifiedLocation}]:[]),
  ...(verifiedSettlement?[{text:'Населено място: '+verifiedSettlement}]:[]),
  ...(verifiedLandArea?[{text:'Землище: '+verifiedLandArea}]:[]),
  {text:'Обхват по кадастрални идентификатори: '+(ids.join(', ')||'Не е установен.')},
  ...(confirmed&&subject.activities?.length?[{text:'Предвидени дейности (обобщение): '+subject.activities.slice(0,4).map(a=>String(a).replace(/\s+/g,' ').trim()).join('; ').slice(0,320)+(subject.activities.join('; ').length>320?'…':'')}]:[]),
  {text:'II. Пространствена относимост',style:'sub'},
  {text:'Пространствените резултати са представени в самостоятелното Приложение №1 (ГИС анализ). Настоящият документ използва резултатите му, без да ги замества.'},
  {text:zones.length?'Отчетени защитени зони: '+zones.map(z=>z.code+(z.name?' — '+z.name:'')).join('; '):results.every(r=>r.intersection_verified_outside===true)?'ГИС анализът установява отсъствие на пресичане със защитени зони.':'Няма данни за пространствен извод.'},
  {text:'III. Нормативни и документални основания',style:'sub'},
  {text:'При оценката на инвестиционното предложение се съобразяват относимите нормативни основания от интегрирания архив. По чл. 31, ал. 1 от Закона за биологичното разнообразие се разглежда съвместимостта с предмета и целите на опазване на защитените зони, когато нормата е приложима към конкретния случай. Пространственото пресичане само по себе си не доказва нарушение на режим.'},
  ...applicable.flatMap(r=>[{text:r.title+(r.ids.length?' — архив '+r.ids.join(', '):''),bold:true,fontSize:9},...r.sources.map(source=>({text:source,link:String(source),color:'#165c86',fontSize:8}))]),
  ...(applicable.length?[]:[{text:'В интегрирания нормативен архив няма относима референция за този обхват.'}]),
  {text:'IV. Приложимост към инвестиционното предложение',style:'sub'},
  {text:resolvedTitle?'За предложение „'+resolvedTitle+'“ относимостта на посочените основания се разглежда спрямо описаните дейности и пространствените резултати от Приложение №1. Режимите на конкретна зона се преценяват отделно; настоящата справка не установява автоматично допустимост или забрана.':'Предметът и дейностите подлежат на потвърждение преди индивидуална преценка за приложимост на режимите.'},

  ...zones.map(z=>({text:'Защитена зона '+z.code+(z.name?' „'+z.name+'“':'')+': пространственото пресичане е установено в Приложение №1. Приложимостта на конкретните режими се преценява спрямо заявените дейности.'})),
  {text:'V. Експертен извод',style:'sub'},
  {text:zones.length?'ГИС анализът установява пресичане с изброените защитени зони. Самото пресичане не определя автоматично допустимостта на инвестиционното предложение.':results.every(r=>r.intersection_verified_outside===true)?'ГИС анализът установява отсъствие на пресичане със защитени зони.':'Няма данни за пространствен извод.'},
  {text:applicable.length?'Посочените архивни нормативни референции подлежат на експертна съпоставка с конкретните дейности.':'Не се формулира окончателен правен извод без проверени приложими режимни разпоредби.'},
  {text:'Документът е проект за експертна проверка, а не административен акт.',italics:true,fontSize:9}
 ];
 const def=pdfDef('Приложение №2 — Нормативни и документални референции',content);
 // Compact only Annex 2; leave the approved GIS Annex 1 layout untouched.
 def.pageMargins=[42,24,42,24];
 def.defaultStyle={...def.defaultStyle,fontSize:8.5,lineHeight:1.0};
 def.styles={...def.styles,heading:{...def.styles.heading,fontSize:13,margin:[0,0,0,5]},sub:{...def.styles.sub,fontSize:9.5,margin:[0,5,0,2]}};
 return def;
}

async function make(results,roles,register){
 if(!results.length||!roles||results.some(r=>!['leading','ancillary'].includes(roles[r.input]||roles[r.cadnum])))throw Error('Потвърдете ролите за всички имоти.');
 if(!results.some(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Няма действителна имотна геометрия за Приложение №1.');
 const z=zipWriter(),ids=results.map(r=>r.input),normalized=Object.fromEntries(results.map(r=>[r.input,roles[r.input]||roles[r.cadnum]]));
 const determination=scenarioFromGIS(results,normalized);
 if(!register?.unifiedContext?.commonEvidence)throw Error('Липсва анализът на преписката.');
 // The completed GIS calculation is the shared spatial determination for every generated document.
 if(!determination.scenario)throw Error('Не е доказано, че всички водещи имоти са извън Натура 2000. Сценарий А не се допуска по подразбиране.');
 register={...register,spatialDetermination:determination};
 const includeAnnex2=register?.includeAnnex2===true;
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
 const dossierEvidence=register?.unifiedContext?.commonEvidence||null;
 const expertDraft=window.V26ExpertDraft?.build({results,roles:normalized,determination,metadata:caseMetadata,paragraphs,evidence:dossierEvidence});
 if(!expertDraft)throw Error('КТ13: липсва единният експертен проект.');
 if(!window.V26ExpertWord?.make)throw Error('КТ13: липсва генераторът за експертния Word.');
 const expertWord=await window.V26ExpertWord.make(expertDraft);
 const classicWord=await window.V26TemplateWord.make(expertDraft.scenario,expertDraft.characterization,expertDraft.metadata);
 for(const [label,blob] of [['експертен',expertWord],['класически',classicWord]]){
  if(blob.size<100||new TextDecoder().decode(await blob.slice(0,2).arrayBuffer())!=='PK')throw Error('КТ13: невалиден '+label+' DOCX.');
 }
 if(classicWord===expertWord)throw Error('КТ14: очакват се два отделни Word проекта.');
 z.file('01_Proekt_na_stanovishte_Klasicheski.docx',classicWord);
 z.file('02_Proekt_na_stanovishte_Eksperten.docx',expertWord);
 await ensurePDF();
 const pdf1=await pdfBlob(gisPdf(results,register));if(pdf1.size<100||await pdf1.slice(0,4).text()!=='%PDF')throw Error('Приложение №1 не е валиден PDF.');z.file('03_Prilozhenie_1_GIS_analiz.pdf',pdf1);
 if(includeAnnex2){const pdf2=await pdfBlob(normativePdf(results,register));if(pdf2.size<100||await pdf2.slice(0,4).text()!=='%PDF')throw Error('Приложение №2 не е валиден PDF.');z.file('04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf',pdf2);}
 const evidenceLines=['РАБОТЕН ПАКЕТ — НЕ Е ОФИЦИАЛНО СТАНОВИЩЕ.','ВНИМАНИЕ: Полетата [ЗА ЕКСПЕРТНА ПРОВЕРКА] са незавършени и изискват проверка от компетентен експерт преди подписване или изпращане.','Съдържа два отделни DOCX проекта (класически и експертен), задължителното PDF приложение №1; приложение №2 се включва само по избор.','Правната приложимост и изводите подлежат на експертна проверка.','','ТЕХНИЧЕСКА ПРОСЛЕДИМОСТ — САМО ЗА ВЪТРЕШНА ПРОВЕРКА'];
 if(dossierEvidence){
  evidenceLines.push('Сценарий (ГИС): '+String(determination.scenario||'неопределен'));
  evidenceLines.push('Пространствен статус (ГИС): '+(determination.scenario==='Б'?'Установено пресичане: '+determination.zones.join(', '):determination.scenario==='А'?'Установено непресичане':'Няма данни'));
  for(const item of (dossierEvidence.findings||[]).slice(0,20)){
   const sources=(item.evidence||[]).slice(0,5).map(e=>String(e.file||'неизвестен документ')+' ('+String(e.date||'дата неустановена')+')').join('; ');
   evidenceLines.push('Запис: '+String(item.key||'')+'; статус: '+String(item.status||'непотвърден')+'; източници: '+sources);
  }
  for(const warning of (dossierEvidence.warnings||[]).slice(0,15))evidenceLines.push('Предупреждение: '+String(warning.kind||'неуточнено')+'; документ: '+String(warning.file||'неизвестен'));
 }
 z.file('README_BG.txt',evidenceLines.join('\n')+'\n');
 const packageBlob=await z.generateAsync({type:'blob'});if(packageBlob.size<300||new TextDecoder().decode(await packageBlob.slice(0,2).arrayBuffer())!=='PK')throw Error('Неуспешно пакетиране в ZIP.');return packageBlob;
}
async function standalonePDF(results,kind,register){if(!results?.length)throw Error('Първо изпълнете ГИС справката.');if(kind!==2&&!results.some(r=>r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))))throw Error('Липсва имотна геометрия за PDF №1. Заредете архивната геометрия и изпълнете справката отново.');await ensurePDF();return pdfBlob(kind===2?normativePdf(results,register):gisPdf(results,register))}
window.V26DraftPackage=Object.freeze({make,standalonePDF});
})();