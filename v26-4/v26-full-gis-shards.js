/* V26 full cadastral shards: read-only, fail closed if full manifest/shards are absent. */
(()=>{'use strict';
const root='data/gis-full/';
let manifestPromise=null;
const cache=new Map();
async function manifest(){
 if(!manifestPromise)manifestPromise=(async()=>{
  const r=await fetch(root+'manifest.json',{cache:'no-store'});
  if(!r.ok)throw Error('Пълната ГИС основа не е публикувана (manifest HTTP '+r.status+').');
  const m=await r.json();
  if(m.status!=='PASS_COUNT_BY_PREFIX'||m.parcel_geometry!==917418||m.overlap_records_expected!==181154||m.shards!==258)
   throw Error('Невалиден или непълен манифест на ГИС основата.');
  return m;
 })();
 return manifestPromise;
}
async function shard(kind,prefix){
 const key=kind+'_'+prefix;
 if(cache.has(key))return cache.get(key);
 const promise=(async()=>{
  const r=await fetch(root+key+'.json.gz');
  if(!r.ok)throw Error('Липсва ГИС сегмент '+key+' (HTTP '+r.status+').');
  if(!('DecompressionStream' in window))throw Error('Браузърът не поддържа gzip DecompressionStream.');
  const stream=r.body.pipeThrough(new DecompressionStream('gzip'));
  const data=JSON.parse(await new Response(stream).text());
  if(!Array.isArray(data))throw Error('Невалиден ГИС сегмент: '+key);
  return data;
 })();
 cache.set(key,promise);
 try{return await promise}catch(e){cache.delete(key);throw e}
}
async function lookup(ids){
 await manifest();
 const result=[];
 for(const id of ids){
  const base=String(id).trim().split('.').slice(0,3).join('.');
  if(!/^\d{5}\.\d+\.\d+$/.test(base))throw Error('Невалиден кадастрален идентификатор: '+id);
  const prefix=base.slice(0,2);
  const [parcels,overlays,geoms,overlapgeoms]=await Promise.all(['parcels','overlays','parcelgeom','overlapgeom'].map(k=>shard(k,prefix)));
  const p=parcels.find(x=>x[0]===base),geom=geoms.find(x=>x[0]===base);
  if(!p||!geom)throw Error('Липсва пълна кадастрална геометрия за '+base+'; анализът е блокиран.');
  const intersections=overlapgeoms.filter(x=>x[0]===base);
  const features=[{type:'Feature',properties:{role:'parcel',cadnum:base},geometry:geom[1]},
    ...intersections.map(x=>({type:'Feature',properties:{role:'archived_intersection',cadnum:base,sitecode:x[1]},geometry:x[2]}))];
  result.push({input:id,cadnum:base,status:'Намерен',settlement:p[1],locality:p[2],
   area_m2_source:p[3],archived_overlay_records:overlays.filter(x=>x[0]===base),
   geojson:{type:'FeatureCollection',features},
   caveat:'Архивни пространствени пресичания; актуалност на зоновите граници подлежи на удостоверяване.'});
 }
 return {results:result,summary:{found_count:result.length,requested_count:ids.length,
  archived_zones:[],note:'Пълна архивна регионална ГИС основа; актуалните нормативни граници се проверяват отделно.'},geometry_qa:[]};
}
window.V26FullGIS=Object.freeze({lookup,manifest});
})();