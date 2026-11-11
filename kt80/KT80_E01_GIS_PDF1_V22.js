/* KT80 V22 — PDF1 from validated GIS + PI MASTER, two-part content based on V27.35.
  Uses original V26OfflinePDF renderer. No procedure, Word or invented spatial facts. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let epoch=0,busy=false;
const clean=v=>v===undefined||v===null||v===''?'НЯМА ДАННИ':String(v);
const keys=(r,...ks)=>{for(const k of ks)if(r?.[k]!==undefined&&r[k]!==null&&r[k]!=='')return r[k];return null};
const geom=r=>(r?.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
const codes=r=>(r?.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')).filter(Boolean);
const zzCode=f=>String(f?.properties?.SITECODE||f?.properties?.sitecode||'');
function sourceRows(live){
 const data=root.KT80PIMaster?.getResult?.();
 if(!data||data.ids.length!==live.ids.length||live.ids.some((id,i)=>data.ids[i]!==id))throw Error('ПИ MASTER не е потвърден за същите имоти. Натиснете „Намери имотите“ отново.');
 return data.items.map((item,i)=>{if(item?.status!=='FOUND'||!item.profile)throw Error('Няма проверен ПИ MASTER профил за '+live.ids[i]);return item.profile});
}
function verified(checked){
 for(const r of checked)if(!Array.isArray(r.verified_zone_intersections)||typeof r.intersection_verified_outside!=='boolean')
  throw Error('Няма пълен ГИС контрол за '+(r.cadnum||r.input));
}
function svgFromMap(){
 const source=$('kt80GISMap');if(!source||!$('kt80GISMapEmpty')?.hidden||!$('kt80GISParcels')?.querySelector('path.kt80-map-parcel'))
  throw Error('Картата не е готова. Натиснете „Намери имотите“.');
 const svg=source.cloneNode(true);
 svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1000');svg.setAttribute('height','650');
 svg.setAttribute('viewBox','0 0 1000 650');
 const style=document.createElementNS('http://www.w3.org/2000/svg','style');
 style.textContent='.kt80-map-zone{stroke:#176f95;stroke-width:2;fill:#8bc4d1;fill-opacity:.13;stroke-dasharray:5 4}.kt80-map-parcel{stroke:#116347;stroke-width:3;fill:#79c4a0;fill-opacity:.6}.kt80-map-selected{stroke:#07583b;stroke-width:4}.kt80-map-overlap{fill:#efb66a;fill-opacity:.45;stroke:#bb7527;stroke-width:2}.kt80-map-label{font:700 13px Arial;fill:#123b2b;stroke:white;stroke-width:3;paint-order:stroke}.kt80-map-zone-label{font:700 12px Arial;fill:#165779;stroke:white;stroke-width:2;paint-order:stroke}';
 svg.insertBefore(style,svg.firstChild);
 return new XMLSerializer().serializeToString(svg);
}
function pointFeatures(g){const all=[];function visit(c){if(!Array.isArray(c))return;if(typeof c[0]==='number'&&typeof c[1]==='number'){if(Number.isFinite(c[0])&&Number.isFinite(c[1]))all.push(c);return}c.forEach(visit)}visit(g?.coordinates);return all}
function nearestZone(parcel,zones){
 const vertices=geom(parcel).flatMap(f=>pointFeatures(f.geometry));if(!vertices.length||!zones.length)return null;
 const y0=vertices.reduce((a,p)=>a+p[1],0)/vertices.length*Math.PI/180,sx=111320*Math.cos(y0),sy=111195;
 function squared(a,b){return ((a[0]-b[0])*sx)**2+((a[1]-b[1])*sy)**2}
 function segdist(p,a,b){let dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy,l=dx*dx+dy*dy;if(!l)return squared(p,a);
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*sx*dx+(p[1]-a[1])*sy*dy)/l));
  return ((p[0]-a[0])*sx-dx*t)**2+((p[1]-a[1])*sy-dy*t)**2}
 let best=null;
 for(const z of zones){if(!['Polygon','MultiPolygon'].includes(z.geometry?.type))continue;
  const rings=z.geometry.type==='Polygon'?z.geometry.coordinates:z.geometry.coordinates.flatMap(poly=>poly);
  let dist=Infinity;
  for(const ring of rings){if(!Array.isArray(ring)||ring.length<3)continue;
   for(const pt of vertices){for(let i=0;i<ring.length;i++)dist=Math.min(dist,segdist(pt,ring[i],ring[(i+1)%ring.length]))}
  }
  if(Number.isFinite(dist)&&(!best||dist<best.dist))best={dist,code:zzCode(z),name:clean(keys(z.properties,'NAME_BG','name_bg','NAME','name'))};
 }
 return best?{...best,meters:Math.sqrt(best.dist)}:null;
}
function makeContext(checked,zoneFeatures){
 if(root.KT77044AutoContext?.buildSVG){const s=root.KT77044AutoContext.buildSVG(checked,zoneFeatures);if(s)return s}
 // Fail closed: the approved context builder must be available for the PDF1 overview.
 throw Error('Контекстната карта от еталона V27.35 не е заредена.');
}
function bodyContent(checked,profiles,zones){
 const count=checked.length,date=new Date().toLocaleDateString('bg-BG');
 const overview=makeContext(checked,zones);
 const mapSvg=svgFromMap();
 const list=checked.map((r,i)=>{const p=profiles[i],id=String(r.input||r.cadnum);
  return 'ПИ '+id+' (ЕКАТТЕ '+id.split('.')[0]+') по КККР на '+clean(keys(p,'settlement','settlement_name'))+', местност „'+clean(keys(p,'locality','mestnost'))+'“, община '+clean(keys(p,'municipality','obshtina'))+', област '+clean(keys(p,'province','region','oblast'))+'. Площ на имота: '+clean(keys(p,'area_m2','parcel_area_m2','area'))+' кв. м.'});
 const content=[
  {text:'Източник на пространствените данни: ГИС база на РИОСВ – Пловдив. Дата на изготвяне: '+date+' г.'},
  {text:'Общ пространствен контекст на анализираните поземлени имоти',style:'sub'},
  {svg:overview,width:950},
  {text:'Червена точка — имот · Зелен контур — ЗЗ · Етикет ЗТ — само ГИС констатация.',fontSize:9},
  {text:'Пространствено положение на поземлените имоти спрямо защитените зони и защитените територии',style:'sub'},
  {svg:mapSvg,width:950},
  {text:'Картата представя имотите и наличните архивни граници от мрежата „Натура 2000“. Пространствените пресичания се определят чрез отделния геометричен контрол; отобразяването на граница не доказва пресичане.',fontSize:9},
  {text:'Административна принадлежност на поземлените имоти',style:'sub',pageBreak:'before'},
  ...list.map(x=>({text:x})),
 ];
 for(let i=0;i<checked.length;i++){
  const n=checked[i].intersection_verified_outside===true?nearestZone(checked[i],zones):null;
  if(n)content.push({text:'Най-близка защитена зона до ПИ '+String(checked[i].input||checked[i].cadnum)+': '+n.code+' — '+n.name+' ('+n.meters.toLocaleString('bg-BG',{maximumFractionDigits:2})+' м).'});
 }
 content.push({text:'А. Защитени зони от мрежата „Натура 2000“ (ЗБР)',style:'sub'});
 const zzBody=[['Поземлен имот','Код и наименование на ЗЗ','Пресичане (кв. м)','Дял от имота']];
 for(let i=0;i<count;i++){
  const r=checked[i],p=profiles[i],z=Array.isArray(p.zz)?p.zz:[];
  const verifiedSet=new Set(codes(r));
  if(!verifiedSet.size){zzBody.push([String(r.input||r.cadnum),r.intersection_verified_outside===true?'Не е установено пресичане със ЗЗ':'НЯМА ДАННИ','—','—']);continue}
  for(const code of verifiedSet){
   const record=z.find(a=>String(keys(a,'sitecode','code'))===code);
   const measure=(r.verified_zone_intersections||[]).find(a=>String(keys(a,'sitecode','code'))===code);
   const geoName=zones.find(a=>zzCode(a)===code)?.properties;
   const preciseArea=keys(measure,'area_m2')??keys(record,'intersect_m2','area_m2');
   const landArea=Number(keys(p,'area_m2','parcel_area_m2','area')??r.area_m2_source);
   const ratio=Number.isFinite(Number(preciseArea))&&Number.isFinite(landArea)&&landArea>0
     ?(100*Number(preciseArea)/landArea).toLocaleString('bg-BG',{maximumFractionDigits:3})+' %'
     :clean(keys(record,'percent_parcel','pct_parcel','percent'));
   zzBody.push([String(r.input||r.cadnum),code+' — '+clean(keys(measure,'name_bg','name')??keys(record,'name_bg','name')??keys(geoName,'NAME_BG','name_bg','name')),
    clean(preciseArea),ratio]);
  }
 }
 content.push({table:{body:zzBody}});
 content.push({text:'Б. Защитени територии (ЗЗТ)',style:'sub'});
 const ztBody=[['Поземлен имот','Категория и наименование на ЗТ','Пресичане (кв. м)','Дял от имота']];
 for(let i=0;i<count;i++){
  const r=checked[i],p=profiles[i],zt=Array.isArray(p.zt)?p.zt:[];
  if(!zt.length){ztBody.push([String(r.input||r.cadnum),'Няма архивен запис за пресичане със ЗТ','—','—']);continue}
  for(const z of zt)ztBody.push([String(r.input||r.cadnum),clean(keys(z,'category','category_bg'))+' '+clean(keys(z,'name_bg','name')),
   clean(keys(z,'intersect_m2','area_m2')),clean(keys(z,'percent_parcel','pct_parcel','percent'))]);
 }
 content.push({table:{body:ztBody}});
 content.push({text:'Забележка: Посочените площи и пространствени пресичания са определени въз основа на ГИС базата на РИОСВ – Пловдив и валидирания архив на ПИ MASTER. Резултатите имат пространствено-информационен характер и не представляват самостоятелна правна преценка.'});
 return content;
}
async function generate(){
 if(busy)return;const live=root.KT80FreeGISResults;if(!live?.results?.length)return message('Първо натиснете „Намери имотите“.');
 const gen=epoch,editor=root.V26ParcelEditor?.normalize($('kt80ParcelInput')?.value||'');
 if(!editor||editor.invalid?.length||editor.uncertain?.length||editor.ids.length!==live.ids.length||editor.ids.some((v,i)=>v!==live.ids[i]))
  return message('Проверете имотните идентификатори и повторете справката.');
 if(live.results.some((r,i)=>r.status!=='Намерен'||r.input!==live.ids[i]||!geom(r).length))
  return message('Липсва проверена геометрия за един или повече имоти.');
 busy=true;$('kt80PDF1').disabled=true;message('Изготвяме пространствените карти, таблиците за ЗЗ/ЗТ и PDF1…');
 try{
  const profiles=sourceRows(live);
  const zoneFeatures=root.KT80FreeGIS?.getMap?.().zones||[];
  if(zoneFeatures.length!==32)throw Error('Заредени са непълни граници на ЗЗ. PDF1 не е изготвен.');
  if(typeof root.V26KT12Overlay?.verify!=='function'||typeof root.V26OfflinePDF?.generate!=='function')throw Error('Липсват ГИС проверката или PDF модулът.');
  const checked=live.results.map(r=>({...r}));await root.V26KT12Overlay.verify(checked);
  if(gen!==epoch||root.KT80FreeGISResults!==live)return;
  verified(checked);
  const content=bodyContent(checked,profiles,zoneFeatures);
  // The source PDF template is the V27.35 two-part structure rendered with the KT80 green/gold UI identity.
  const blob=await root.V26OfflinePDF.generate({content});
  if(gen!==epoch||root.KT80FreeGISResults!==live)return;
  if(!(blob instanceof Blob)||blob.size<100||await blob.slice(0,4).text()!=='%PDF')throw Error('PDF1 не е генериран успешно.');
  if(gen!==epoch||root.KT80FreeGISResults!==live)return;
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TPU_Plovdiv_KT80_GIS_analiz_PDF1.pdf';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  message('Готово! PDF1 е изготвен с карти, административни данни и таблици за ЗЗ и ЗТ. Проверете го като експерт.');
 }catch(e){if(gen===epoch)message('Не успяхме да изготвим PDF1: '+String(e?.message||e))}
 finally{if(gen===epoch){busy=false;$('kt80PDF1').disabled=false}}
}
function message(s){if($('kt80PDF1Status'))$('kt80PDF1Status').textContent=s}
function reset(){epoch++;busy=false;if($('kt80PDF1'))$('kt80PDF1').disabled=false;message('Първо натиснете „Намери имотите“ и прегледайте картата.')}
function init(){
 if(!$('kt80PDF1'))return;
 $('kt80PDF1').addEventListener('click',generate);
 $('kt80FindParcels')?.addEventListener('click',reset);
 $('kt80ParcelInput')?.addEventListener('input',reset);
 document.addEventListener('kt80:case-reset',reset);
 root.KT80PDF1Bridge=Object.freeze({makePDF:generate,invalidate:reset});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);