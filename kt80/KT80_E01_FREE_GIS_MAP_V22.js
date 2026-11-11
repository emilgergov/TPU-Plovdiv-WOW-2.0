/* KT80 V22 — V27.35 functional GIS map parity in KT80 styling.
   Independent from route/Word. Geometry and overlays come exclusively from the active GIS lookup.
   Displayed zones are in VIEW; they are not automatically verified intersections. */
(function(root){'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const S={epoch:0,results:[],zones:null,loading:null,chosen:null,view:null,base:null,showOverlaps:true,labels:'auto',pointer:null,dragged:false};
const W=1000,H=650;
const featuresOf=r=>(r?.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
const overlaysOf=r=>(r?.overlap_geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
function points(g){
 const all=[];function walk(a){if(!Array.isArray(a))return;if(typeof a[0]==='number'&&typeof a[1]==='number'){if(Number.isFinite(a[0])&&Number.isFinite(a[1]))all.push(a);return}for(const v of a)walk(v)}
 walk(g?.coordinates);return all;
}
function bbox(features){const pts=features.flatMap(f=>points(f.geometry));if(!pts.length)return null;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}
}
function intersect(a,b){return a&&b&&a.maxX>=b.minX&&a.minX<=b.maxX&&a.maxY>=b.minY&&a.minY<=b.maxY}
function shape(t,a={}){const n=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,String(v)));return n}
function path(g,project){const poly=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
 return poly.map(part=>part.map(ring=>ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))
   .map((p,i)=>(i?'L':'M')+project(p).map(v=>v.toFixed(2)).join(' ')).join(' ')+' Z').join(' ')).join(' ');
}
function selected(){return S.chosen?S.results.find(r=>(r.input||r.cadnum)===S.chosen):null}
function fitView(bound,pad=0.18){if(!bound)return;const x=(bound.minX+bound.maxX)/2,y=(bound.minY+bound.maxY)/2;
 const w=Math.max((bound.maxX-bound.minX)*(1+pad*2),.00004),h=Math.max((bound.maxY-bound.minY)*(1+pad*2),.00004);
 const worldRatio=W/H;
 const projectedRatio=w/(h*Math.cos(y*Math.PI/180)||h);
 const dx=projectedRatio>worldRatio?w:w*worldRatio/Math.max(projectedRatio,.000001);
 const dy=projectedRatio>worldRatio?h*projectedRatio/worldRatio:h;
 S.view={x,y,w:Math.max(dx,.00004),h:Math.max(dy,.00004)};
 render();
}
function viewLimits(){if(!S.view)return null;const v=S.view;return {minX:v.x-v.w/2,maxX:v.x+v.w/2,minY:v.y-v.h/2,maxY:v.y+v.h/2}}
function proj(p){const v=S.view;return [W/2+(p[0]-v.x)/v.w*W,H/2-(p[1]-v.y)/v.h*H]}
function draw(g,f,cls,extra={}){const p=path(f.geometry,proj);if(!p.trim())return null;const n=shape('path',{d:p,class:cls,'vector-effect':'non-scaling-stroke',...extra});g.append(n);return n}
function verified(r){return new Set((r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')).filter(Boolean))}
function zoneCode(f){return String(f.properties?.SITECODE||f.properties?.sitecode||f.properties?.code||'')}
function zoneName(f){return String(f.properties?.NAME_BG||f.properties?.name_bg||f.properties?.name||'')}
function render(){
 const layer=$('kt80GISZones'), parcels=$('kt80GISParcels'), overlaps=$('kt80GISOverlaps'), labels=$('kt80GISLabels');
 if(!layer||!parcels||!overlaps||!labels)return;
 for(const e of [layer,parcels,overlaps,labels])e.replaceChildren();
 const bb=viewLimits(), svg=$('kt80GISMap');
 if(!bb){$('kt80GISMapEmpty').hidden=false;return}
 $('kt80GISMapEmpty').hidden=true;
 let zonesInView=0,overlayCount=0;
 for(const z of S.zones?.features||[]){
  const b=bbox([z]);if(!intersect(bb,b))continue;
  const el=draw(layer,z,'kt80-map-zone');if(el)zonesInView++;
  if(el&&S.labels!=='none'&&S.labels!=='minimal'){
   const xy=proj([(b.minX+b.maxX)/2,(b.minY+b.maxY)/2]);
   if(xy[0]>10&&xy[0]<W-10&&xy[1]>14&&xy[1]<H-10){
    const t=shape('text',{x:xy[0],y:xy[1],class:'kt80-map-zone-label','text-anchor':'middle'});
    t.textContent=[zoneCode(z),zoneName(z)].filter(Boolean).join(' · ');labels.append(t);
   }
  }
 }
 for(const r of S.results){
  const id=String(r.cadnum||r.input||'');
  for(const f of featuresOf(r)){const n=draw(parcels,f,'kt80-map-parcel'+(S.chosen===id?' kt80-map-selected':''),
   {'data-parcel':id,tabindex:'0',role:'button','aria-label':'Избери имот '+id});
   if(n){n.addEventListener('click',()=>choose(id));n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(id)}})}}
  if(S.showOverlaps)for(const f of overlaysOf(r)){if(draw(overlaps,f,'kt80-map-overlap'))overlayCount++}
  const b=bbox(featuresOf(r));if(!b||S.labels==='none')continue;
  if(S.labels==='auto'&&S.results.length>12&&S.chosen!==id)continue;
  const xy=proj([(b.minX+b.maxX)/2,(b.minY+b.maxY)/2]);
  if(xy[0]>-30&&xy[0]<W+30&&xy[1]>-30&&xy[1]<H+30){
   const t=shape('text',{x:xy[0],y:xy[1],class:'kt80-map-label','text-anchor':'middle'});
   t.textContent=id;labels.append(t);
  }
 }
 // Highly visible parcel locator in wide context views: red point + contrasting identifier.
 // This is a cartographic marker only, never an intersection determination.
 const parcelBounds=bbox(S.results.flatMap(featuresOf));
 const wideContext=parcelBounds&&S.view&&S.view.w>Math.max(parcelBounds.maxX-parcelBounds.minX,.00001)*5;
 if(wideContext)for(const r of S.results){
  const id=String(r.cadnum||r.input||'');
  const b=bbox(featuresOf(r));if(!b)continue;
  const xy=proj([(b.minX+b.maxX)/2,(b.minY+b.maxY)/2]);
  if(!Number.isFinite(xy[0])||!Number.isFinite(xy[1]))continue;
  const dot=shape('circle',{cx:xy[0],cy:xy[1],r:8,fill:'#e3262e',stroke:'#ffffff','stroke-width':3,class:'kt80-parcel-locator'});
  labels.append(dot);
  const label=shape('text',{x:xy[0]+12,y:xy[1]-12,class:'kt80-parcel-locator-label','text-anchor':'start'});
  label.textContent=id;labels.append(label);
 }
 $('kt80GISMapCaption').textContent='Имотни геометрии: '+S.results.filter(r=>featuresOf(r).length).length+
  ' · ЗЗ в картографския обхват: '+zonesInView+' · Щриховани архивни пресичания: '+overlayCount+
  ' · Самото изобразяване НЕ удостоверява пресичане или правен режим.';
 $('kt80GISOverlapToggle').textContent='Пресичания: '+(S.showOverlaps?'ВКЛ.':'ИЗКЛ.');
 $('kt80GISOverlapToggle').setAttribute('aria-pressed',String(S.showOverlaps));
 svg.setAttribute('viewBox','0 0 '+W+' '+H);
 details();
}
function details(){
 const host=$('kt80GISDetail');if(!host)return;host.replaceChildren();
 const item=selected()||S.results[0];
 if(!item){host.textContent='Няма избран имот.';return}
 const head=document.createElement('p');head.textContent='Имот: '+String(item.cadnum||item.input);host.append(head);
 const div=document.createElement('p');div.textContent='ГИС площ по източник: '+root.KT80Display.area(item.area_m2_source)+' кв. м';host.append(div);
 const zs=verified(item);const z=document.createElement('p');
 z.textContent=Array.isArray(item.verified_zone_intersections)?(zs.size?'Геометрично проверени ЗЗ: '+[...zs].join(', '):item.intersection_verified_outside===true?'Проверено отсъствие на пресичане с архивните ЗЗ':'НЯМА ДАННИ за потвърдени пресичания'):'Пресичанията не са проверени; визуализацията сама не е достатъчна.';
 host.append(z);
 const ov=document.createElement('p');ov.textContent='Архивни пресичащи полигони: '+overlaysOf(item).length;host.append(ov);
 const info=document.createElement('p');info.textContent='Пространствените проценти, ЗТ и административните реквизити се сверяват чрез ПИ MASTER и отделната проверка.';host.append(info);
}
function choose(id){S.chosen=id;render();document.dispatchEvent(new CustomEvent('kt80:parcel-selected',{detail:{id}}))}
function zoom(k){if(!S.view)return;S.view.w*=k;S.view.h*=k;render()}
function fit(){fitView(bbox(S.results.flatMap(featuresOf)))}
function showSelected(){const r=selected()||S.results[0];fitView(bbox(featuresOf(r)))}
function context(){const parcels=bbox(S.results.flatMap(featuresOf));if(!parcels)return;
 const found=(S.zones?.features||[]).filter(f=>intersect(bbox([f]),parcels));if(!found.length){fitView(parcels,0.65);return}
 fitView(bbox([...S.results.flatMap(featuresOf),...found]),0.12);
}
function fullScreen(){const wrap=$('kt80GISMapWrap');if(!wrap)return;
 if(document.fullscreenElement){void document.exitFullscreen?.();return}
 void wrap.requestFullscreen?.().catch?.(()=>{});
}
function clear(){
 S.epoch++;S.results=[];S.chosen=null;S.view=null;S.showOverlaps=true;S.labels='auto';
 ['kt80GISZones','kt80GISParcels','kt80GISOverlaps','kt80GISLabels','kt80GISResults'].forEach(id=>$(id)?.replaceChildren());
 if($('kt80GISMapEmpty'))$('kt80GISMapEmpty').hidden=false;
 if($('kt80GISMapCaption'))$('kt80GISMapCaption').textContent='Карта: няма извършена справка.';
 if($('kt80GISDetail'))$('kt80GISDetail').textContent='Няма избран имот.';
 if($('kt80FindParcels'))$('kt80FindParcels').disabled=false;
 root.KT80FreeGISResults=null;status('Въведете имотите и натиснете „Намери имотите“.');
}
function status(t){const e=$('kt80GISStatus');if(e)e.textContent=t}
function rows(){const el=$('kt80GISResults');if(!el)return;el.replaceChildren();
 for(const r of S.results){const row=document.createElement('button');row.type='button';row.className='kt80-gis-row';
 const id=String(r.cadnum||r.input);const strong=document.createElement('strong');strong.textContent=id;
 const span=document.createElement('span');span.textContent=featuresOf(r).length?'Имотна геометрия · '+root.KT80Display.area(r.area_m2_source)+' кв. м':'Няма потвърдена геометрия';
 row.append(strong,span);row.addEventListener('click',()=>{choose(id);showSelected()});el.append(row)}
}
async function loadZones(epoch){
 if(S.zones){render();return}
 try{if(!S.loading)S.loading=fetch('../v26-test/TPU_Plovdiv_N2000_32_zones_full.geojson',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{if(!Array.isArray(d.features)||d.features.length!==32)throw Error('Непълни данни за ЗЗ');S.zones=d;return d}).finally(()=>{S.loading=null});
  await S.loading;if(epoch===S.epoch)render();
 }catch(e){if(epoch===S.epoch)status('Имотите са намерени, но границите на ЗЗ не са заредени. Няма основание за извод по пресичания.')}
}
async function verifyIntersections(run){
 if(typeof root.V26KT12Overlay?.verify!=='function')return;
 try{
  const snapshot=S.results.map(r=>({...r}));
  await root.V26KT12Overlay.verify(snapshot);
  if(run!==S.epoch||snapshot.length!==S.results.length)return;
  for(let i=0;i<snapshot.length;i++){
   const v=snapshot[i],current=S.results[i];
   if(String(v.input||v.cadnum)!==String(current.input||current.cadnum))return;
   if(Array.isArray(v.verified_zone_intersections)&&typeof v.intersection_verified_outside==='boolean'){
    current.verified_zone_intersections=v.verified_zone_intersections;
    current.intersection_verified_outside=v.intersection_verified_outside;
   }
  }
  render();
  const count=S.results.reduce((n,r)=>n+(r.verified_zone_intersections?.length||0),0);
  const checked=S.results.filter(r=>Array.isArray(r.verified_zone_intersections)&&typeof r.intersection_verified_outside==='boolean').length;
  status('Имотни геометрии: '+S.results.filter(r=>featuresOf(r).length).length+' · ГИС проверка: '+checked+' от '+S.results.length+' имота · Доказани пресичания със ЗЗ: '+count+'.');
 }catch(e){
  if(run===S.epoch)status('Имотите са намерени, но проверката на пресичанията не е завършена: '+String(e?.message||e));
 }
}
async function find(){
 const norm=root.V26ParcelEditor?.normalize($('kt80ParcelInput')?.value||'');
 if(!norm||norm.invalid?.length||norm.uncertain?.length||!norm.ids?.length||norm.ids.length>100)
  return status('Проверете кадастралните идентификатори (от 1 до 100 имота).');
 const gen=++S.epoch;
 $('kt80FindParcels').disabled=true;status('Зареждаме пълната ГИС база, имотите и картата…');
 S.results=[];S.view=null;root.KT80FreeGISResults=null;
 try{const answer=await root.V26BrowserGIS.lookup(norm.ids);
  if(gen!==S.epoch)return;
  S.results=Array.isArray(answer.results)?answer.results:[];
  if(S.results.length!==norm.ids.length)throw Error('ГИС отговорът не включва всички имоти');
  root.KT80FreeGISResults=Object.freeze({ids:[...norm.ids],results:S.results,source:'FULL_GIS_MASTER',verified:false,procedureId:null});
  S.chosen=String(S.results[0]?.cadnum||S.results[0]?.input||'');
  rows();fit();
  status('Геометрия за '+S.results.filter(r=>featuresOf(r).length).length+' от '+norm.ids.length+' имота. Картата е обновена.');
  void loadZones(gen);
  void verifyIntersections(gen);
 }catch(e){if(gen!==S.epoch)return;status('Не успяхме да заредим ГИС данните: '+String(e?.message||e))}
 finally{if(gen===S.epoch)$('kt80FindParcels').disabled=false}
}
function resetPending(){if(S.results.length)clear();else S.epoch++}
function init(){
 if(!$('kt80FindParcels'))return;
 $('kt80FindParcels').addEventListener('click',find);
 $('kt80ParcelInput')?.addEventListener('input',clear);
 document.addEventListener('kt80:case-reset',clear);
 const controls={kt80GISZoomIn:()=>zoom(.75),kt80GISZoomOut:()=>zoom(1.33),kt80GISFit:fit,kt80GISContext:context,
  kt80GISAll:fit,kt80GISSelected:showSelected,kt80GISOverlapToggle:()=>{S.showOverlaps=!S.showOverlaps;render()},
  kt80GISFullscreen:fullScreen};
 for(const [id,fn] of Object.entries(controls))$(id)?.addEventListener('click',fn);
 $('kt80GISLabelsMode')?.addEventListener('change',e=>{S.labels=e.target.value;render()});
 const map=$('kt80GISMap');
 map?.addEventListener('wheel',e=>{if(!S.view)return;e.preventDefault();zoom(e.deltaY<0?.85:1.15)},{passive:false});
 map?.addEventListener('pointerdown',e=>{if(!S.view||e.button!==0)return;S.pointer=[e.clientX,e.clientY,S.view.x,S.view.y];map.setPointerCapture?.(e.pointerId)});
 map?.addEventListener('pointermove',e=>{if(!S.pointer||!S.view)return;
  const rect=map.getBoundingClientRect(),sx=rect.width||W,sy=rect.height||H;
  S.view.x=S.pointer[2]-(e.clientX-S.pointer[0])/sx*S.view.w;
  S.view.y=S.pointer[3]+(e.clientY-S.pointer[1])/sy*S.view.h;render()});
 map?.addEventListener('pointerup',()=>{S.pointer=null});map?.addEventListener('pointercancel',()=>{S.pointer=null});
 root.KT80FreeGIS=Object.freeze({find,clear,selectParcel:id=>{if(S.results.some(r=>String(r.cadnum||r.input)===String(id)))choose(String(id))},getResults:()=>[...S.results],getMap:()=>({
  zones:(S.zones?.features||[]),results:[...S.results],selected:S.chosen,labels:S.labels,
  boundingBox:viewLimits(),verifiedZones:S.results.flatMap(r=>[...verified(r)])})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);