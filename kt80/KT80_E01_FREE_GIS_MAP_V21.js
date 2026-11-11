/* KT80 V21 corrected independent GIS + map companion.
   Does NOT select a legal procedure, confirm subject/roles or issue the approved PDF1.
   GIS geometry is archival unless a separately verified source certifies otherwise. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const state={epoch:0,results:[],zones:null,view:null};
function status(s){const e=$('kt80GISStatus');if(e)e.textContent=s}
function coordinatePairs(geometry){
 const all=[];
 function walk(v){if(!Array.isArray(v))return;if(typeof v[0]==='number'&&typeof v[1]==='number'){if(Number.isFinite(v[0])&&Number.isFinite(v[1]))all.push(v);return}for(const c of v)walk(c)}
 if(geometry?.coordinates)walk(geometry.coordinates);
 return all;
}
function bounds(features){
 const pts=features.flatMap(f=>coordinatePairs(f.geometry));if(!pts.length)return null;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return {xmin:Math.min(...xs),xmax:Math.max(...xs),ymin:Math.min(...ys),ymax:Math.max(...ys)};
}
function make(tag,attributes={}){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));return e}
function polygons(geometry){
 if(geometry?.type==='Polygon')return [geometry.coordinates];
 if(geometry?.type==='MultiPolygon')return geometry.coordinates;
 return [];
}
function drawFeature(group,f,project,klass){
 for(const rings of polygons(f.geometry)){
  const path=rings.map(ring=>ring.map((p,i)=>(i?'L':'M')+project(p).map(v=>v.toFixed(2)).join(',')).join(' ')+'Z').join(' ');
  if(path)group.append(make('path',{d:path,class:klass,'vector-effect':'non-scaling-stroke'}));
 }
}
function render(){
 const svg=$('kt80GISMap'),parcelLayer=$('kt80GISParcels'),zoneLayer=$('kt80GISZones');
 if(!svg||!parcelLayer||!zoneLayer)return;
 parcelLayer.replaceChildren();zoneLayer.replaceChildren();
 const spatial=state.results.flatMap(r=>(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)));
 const box=bounds(spatial);
 if(!box){$('kt80GISMapEmpty').hidden=false;return}
 $('kt80GISMapEmpty').hidden=true;
 const dx=Math.max(box.xmax-box.xmin,.001),dy=Math.max(box.ymax-box.ymin,.001),pad=.13;
 const minX=box.xmin-dx*pad,maxX=box.xmax+dx*pad,minY=box.ymin-dy*pad,maxY=box.ymax+dy*pad;
 const w=880,h=550;const px=x=>(x-minX)/(maxX-minX)*w,py=y=>h-(y-minY)/(maxY-minY)*h;const project=point=>[px(point[0]),py(point[1])];
 const zones=(state.zones?.features||[]).filter(f=>{
  const b=bounds([f]);return b&&b.xmax>=minX&&b.xmin<=maxX&&b.ymax>=minY&&b.ymin<=maxY;
 });
 zones.forEach(f=>drawFeature(zoneLayer,f,project,'kt80-map-zone'));
 spatial.forEach(f=>drawFeature(parcelLayer,f,project,'kt80-map-parcel'));
 const ids=[...new Set(state.results.filter(r=>r.status==='Намерен').map(r=>r.cadnum||r.input))];
 state.results.forEach(r=>{
  const feats=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
  const b=bounds(feats);if(!b)return;
  const label=make('text',{x:px((b.xmin+b.xmax)/2),y:py((b.ymin+b.ymax)/2),class:'kt80-map-label','text-anchor':'middle'});
  label.textContent=r.cadnum||r.input;parcelLayer.append(label);
 });
 $('kt80GISMapCaption').textContent='Имотна геометрия: '+ids.length+' · Отобразени защитени зони: '+zones.length+' · Работен архивен контекст. Няма автоматична правна преценка.';
}
async function zones(epoch){
 try{
  if(state.zones)return;
  const response=await fetch('../v26-test/TPU_Plovdiv_N2000_32_zones_full.geojson',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(epoch!==state.epoch)return;
  if(!Array.isArray(data.features)||data.features.length!==32)throw Error('Непълен архивен слой');
  state.zones=data;render();
 }catch(e){if(epoch===state.epoch) $('kt80GISMapCaption').textContent+=' · Границите на зоните не са заредени — не правете извод за пресичане.'}
}
function clear(){
 state.epoch++;state.results=[];state.view=null;
 $('kt80GISParcels')?.replaceChildren();$('kt80GISZones')?.replaceChildren();
 if($('kt80GISMapEmpty'))$('kt80GISMapEmpty').hidden=false;
 if($('kt80GISResults'))$('kt80GISResults').replaceChildren();
 if($('kt80GISMapCaption'))$('kt80GISMapCaption').textContent='Карта: няма извършена справка.';
 status('Въведете идентификатори и натиснете „Намери имотите“.');
 if($('kt80FindParcels'))$('kt80FindParcels').disabled=false;
 root.KT80FreeGISResults=null;
}
function renderRows(results){
 const host=$('kt80GISResults');host.replaceChildren();
 for(const r of results){
  const row=document.createElement('div');row.className='kt80-gis-row';
  const n=document.createElement('strong');n.textContent=r.input||r.cadnum;
  const t=document.createElement('span');t.textContent=(r.status==='Намерен'?'Намерена архивна геометрия':r.status==='Не е намерен'?'Няма запис в заредения индекс':'Геометрията не е потвърдена')+(r.area_m2_source?' · площ по източник '+r.area_m2_source+' кв. м':'');
  row.append(n,t);host.append(row);
 }
}
async function find(){
 const editor=root.V26ParcelEditor;
 if(!editor||typeof editor.normalize!=='function')return status('Имотният редактор не е зареден.');
 const parsed=editor.normalize($('kt80ParcelInput').value);
 if(parsed.invalid?.length||parsed.uncertain?.length)return status('Проверете кадастралните идентификатори преди ГИС анализа.');
 const ids=parsed.ids||[];if(!ids.length)return status('Въведете поне един кадастрален идентификатор.');
 if(ids.length>100)return status('Можете да проверите до 100 имота наведнъж.');
 const engine=root.V26BrowserGIS;
 if(!engine||typeof engine.lookup!=='function')return status('ГИС модулът не е зареден.');
 const epoch=++state.epoch;
 $('kt80FindParcels').disabled=true;status('Търсим имотите и подготвяме картата…');
 $('kt80GISResults').replaceChildren();$('kt80GISParcels').replaceChildren();$('kt80GISZones').replaceChildren();
 $('kt80GISMapEmpty').hidden=false;root.KT80FreeGISResults=null;state.results=[];
 try{
  const answer=await engine.lookup(ids);
  if(epoch!==state.epoch)return;
  state.results=Array.isArray(answer.results)?answer.results:[];
  root.KT80FreeGISResults=Object.freeze({ids:[...ids],results:state.results,source:'V26BrowserGIS',verified:false,procedureId:null});
  renderRows(state.results);render();
  const withGeometry=state.results.filter(r=>r.status==='Намерен'&&(r.geojson?.features||[]).some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))).length;
  status('Намерена геометрия за '+withGeometry+' от '+ids.length+' имота. Картата е обновена.');
  if(withGeometry)void zones(epoch);
 }catch(e){if(epoch!==state.epoch)return;status('Не успяхме да заредим ГИС данните: '+String(e?.message||e))}
 finally{if(epoch===state.epoch)$('kt80FindParcels').disabled=false}
}
function init(){
 if(!$('kt80FindParcels'))return;
 $('kt80FindParcels').addEventListener('click',find);
 $('kt80ParcelInput').addEventListener('input',clear);
 document.addEventListener('kt80:case-reset',clear);
 root.KT80FreeGIS=Object.freeze({find,clear,getResults:()=>[...state.results]});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
