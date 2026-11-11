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
 style.textContent='.kt80-map-zone{stroke:#176f95;stroke-width:2;fill:#8bc4d1;fill-opacity:.13;stroke-dasharray:5 4}.kt80-map-parcel{stroke:#116347;stroke-width:3;fill:#79c4a0;fill-opacity:.6}.kt80-map-selected{stroke:#07583b;stroke-width:4}.kt80-map-overlap{fill:#efb66a;fill-opacity:.45;stroke:#bb7527;stroke-width:2}.kt80-map-label{font:700 13px Arial;fill:#123b2b;stroke:white;stroke-width:3;paint-order:stroke}.kt80-map-zone-label{font:700 12px Arial;fill:#165779;stroke:white;stroke-width:2;paint-order:stroke}.kt80-parcel-locator-label{font:bold 21px Arial;fill:#bd1327;stroke:#fff;stroke-width:5;paint-order:stroke}';
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
// Multi-parcel PDF1: independent, geographically fitted parcel map for each input parcel.
// The underlying geometry and source measurements remain unchanged.
function separateMap(parcel,zones){
 const parcelFeatures=geom(parcel),id=String(parcel.input||parcel.cadnum||'');
 const coords=g=>{const out=[];function walk(v){if(!Array.isArray(v))return;if(typeof v[0]==='number'&&typeof v[1]==='number'){if(Number.isFinite(v[0])&&Number.isFinite(v[1]))out.push(v);return}v.forEach(walk)}walk(g?.coordinates);return out};
 const all=parcelFeatures.flatMap(f=>coords(f.geometry));if(!all.length)throw Error('Липсва геометрия за индивидуалната карта на '+id);
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const b={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
 const lat=(b.minY+b.maxY)/2*Math.PI/180,cos=Math.max(.3,Math.cos(lat));
 const ww=Math.max((b.maxX-b.minX)*1.9,.0003),hh=Math.max((b.maxY-b.minY)*1.9,.0002);
 const ratio=1000/650;let w=ww,h=hh;
 if(w*cos/h>ratio)h=w*cos/ratio;else w=h*ratio/cos;
 const midX=(b.minX+b.maxX)/2,midY=(b.minY+b.maxY)/2;
 const project=p=>[500+(p[0]-midX)/w*1000,325-(p[1]-midY)/h*650];
 const path=g=>{const parts=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];return parts.map(poly=>poly.map(ring=>ring.map((p,i)=>(i?'L':'M')+project(p).map(n=>n.toFixed(2)).join(' ')).join(' ')+'Z').join(' ')).join(' ')};
 const inView=p=>p[0]>=midX-w/2&&p[0]<=midX+w/2&&p[1]>=midY-h/2&&p[1]<=midY+h/2;
 const elements=['<rect width="1000" height="650" fill="#e9f2ed"/>'];
 for(const z of zones){if(!['Polygon','MultiPolygon'].includes(z.geometry?.type))continue;
  const zz=coords(z.geometry);if(!zz.length)continue;
  const minX=Math.min(...zz.map(p=>p[0])),maxX=Math.max(...zz.map(p=>p[0]));
  const minY=Math.min(...zz.map(p=>p[1])),maxY=Math.max(...zz.map(p=>p[1]));
  if(maxX<midX-w/2||minX>midX+w/2||maxY<midY-h/2||minY>midY+h/2)continue;
  const d=path(z.geometry);if(d)elements.push('<path d="'+d+'" fill="#b0d6e1" fill-opacity=".13" stroke="#247fa5" stroke-width="2" stroke-dasharray="5 4"/>');
 }
 for(const f of parcelFeatures){const d=path(f.geometry);if(d)elements.push('<path d="'+d+'" fill="#a6d9be" stroke="#0c6440" stroke-width="4"/>')}
 const center=project([midX,midY]);
 elements.push('<circle cx="'+center[0]+'" cy="'+center[1]+'" r="8" fill="#df1e30" stroke="white" stroke-width="3"/>');
 elements.push('<text x="'+(center[0]+16)+'" y="'+(center[1]-15)+'" font-family="Arial" font-size="24" font-weight="bold" fill="#b70f28" stroke="white" stroke-width="5" paint-order="stroke">'+id+'</text>');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="650" viewBox="0 0 1000 650">'+elements.join('')+'</svg>';
}
function bodyContent(checked,profiles,zones){
 const count=checked.length,date=new Date().toLocaleDateString('bg-BG');
 // One full-size contextual map only. Retain the detailed Natura 2000/parcel view.
 const mapSvg=svgFromMap();
 const list=checked.map((r,i)=>{const p=profiles[i],id=String(r.input||r.cadnum);
  return 'ПИ '+id+' (ЕКАТТЕ '+root.KT80Display.ekatte(id,p)+') по КККР на '+clean(keys(p,'settlement','settlement_name'))+', местност „'+root.KT80Display.locality(keys(p,'locality','mestnost'))+'“, община '+clean(keys(p,'municipality','obshtina'))+', област '+clean(keys(p,'province','region','oblast'))+'. Площ на имота: '+root.KT80Display.area(keys(p,'area_m2','area_m2_source','parcel_area_m2','area'))+' кв. м.'});
 const content=[
  {text:'Източник на пространствените данни: ГИС база на РИОСВ – Пловдив. Дата на изготвяне: '+date+' г.'},
  {text:'Пространствено положение на имотите спрямо защитените зони и защитените територии',style:'sub'},
  {svg:mapSvg,width:950,maxHeight:710},
  {text:'Картата представя имотите и наличните архивни граници от мрежата „Натура 2000“. Пространствените пресичания се определят чрез отделния геометричен контрол; отобразяването на граница не доказва пресичане.',fontSize:9},
 ];
 if(count>1){
  content.push({text:'Индивидуални карти на поземлените имоти',style:'sub',pageBreak:'before'});
  content.push({parcelGrid:checked.map((r,i)=>({
   id:String(r.input||r.cadnum),
   svg:separateMap(r,zones),
   caption:'Площ: '+root.KT80Display.area(keys(profiles[i],'area_m2','area_m2_source','parcel_area_m2','area'))+' кв. м · '+clean(keys(profiles[i],'settlement','settlement_name'))
  }))});
 }
 content.push({text:'Административна принадлежност на поземлените имоти',style:'sub'},...list.map(x=>({text:x})));
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
     ?root.KT80Display.percent(100*Number(preciseArea)/landArea)
     :root.KT80Display.percent(keys(record,'percent_parcel','pct_parcel','percent'));
   zzBody.push([String(r.input||r.cadnum),code+' — '+clean(keys(measure,'name_bg','name')??keys(record,'name_bg','name')??keys(geoName,'NAME_BG','name_bg','name')),
    root.KT80Display.area(preciseArea),ratio]);
  }
 }
 content.push({table:{body:zzBody}});
 content.push({text:'Б. Защитени територии (ЗЗТ)',style:'sub'});
 const ztBody=[['Поземлен имот','Категория и наименование на ЗТ','Пресичане (кв. м)','Дял от имота']];
 for(let i=0;i<count;i++){
  const r=checked[i],p=profiles[i],zt=Array.isArray(p.zt)?p.zt:[];
  if(!zt.length){ztBody.push([String(r.input||r.cadnum),'Няма архивен запис за пресичане със ЗТ','—','—']);continue}
  for(const z of zt)ztBody.push([String(r.input||r.cadnum),clean(keys(z,'category','category_bg'))+' '+clean(keys(z,'name_bg','name')),
   root.KT80Display.area(keys(z,'intersect_m2','area_m2')),root.KT80Display.percent(keys(z,'percent_parcel','pct_parcel','percent'))]);
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
  if(typeof root.V26KT12Overlay?.verify!=='function'||typeof root.KT80V22PDF?.generate!=='function')throw Error('Липсват ГИС проверката или PDF модулът.');
  const checked=live.results.map(r=>({...r}));await root.V26KT12Overlay.verify(checked);
  if(gen!==epoch||root.KT80FreeGISResults!==live)return;
  verified(checked);
  const content=bodyContent(checked,profiles,zoneFeatures);
  // The source PDF template is the V27.35 two-part structure rendered with the KT80 green/gold UI identity.
  const blob=await root.KT80V22PDF.generate({content});
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