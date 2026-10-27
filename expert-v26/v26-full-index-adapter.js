/* WOW 3.4.1 full V26 cadastral lookup adapter. Activate only after all shard files are deployed. */
(function(global){
'use strict';
const base='gis-v26/';
const cache=new Map();
const parcel=id=>String(id||'').trim().split('.').slice(0,3).join('.');
async function shard(kind,prefix){
 const key=kind+'_'+prefix;
 if(cache.has(key))return cache.get(key);
 const promise=(async()=>{
  const url=base+key+'.json.gz';
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error('Липсва ГИС сегмент '+url+' ('+response.status+')');
  if(!global.DecompressionStream)throw new Error('Браузърът не поддържа декомпресия; необходим е резервен JSON формат.');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  const rows=JSON.parse(await new Response(stream).text());
  return new Map(rows.map(row=>[row[0],kind==='overlays'?(null):row]));
 })();
 cache.set(key,promise);
 try{return await promise}catch(e){cache.delete(key);throw e}
}
async function lookup(ids){
 const unique=[...new Set(ids.map(parcel).filter(x=>/^\\d{5}\\.\\d+\\.\\d+$/.test(x)))];
 const prefixes=[...new Set(unique.map(x=>x.slice(0,2)))];
 const results={};
 for(const prefix of prefixes){
  const [p,o]=await Promise.all([shard('parcels',prefix),fetch(base+'overlays_'+prefix+'.json.gz').then(async r=>{
   if(r.status===404)return [];
   if(!r.ok)throw Error('ГИС пресичания: HTTP '+r.status);
   return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text());
  })]);
  const grouped=new Map();
  for(const row of o){if(!grouped.has(row[0]))grouped.set(row[0],[]);grouped.get(row[0]).push(row)}
  for(const id of unique.filter(x=>x.startsWith(prefix))){
   const row=p.get(id);
   results[id]=row?{cadnum:id,place:row[1],locality:row[2],area_m2:row[3],overlays:(grouped.get(id)||[]).map(z=>({sitecode:z[1],name_bg:z[2],order_no:z[3],dv:z[4],area_ha_source:z[5]})),geometry_status:'GEOMETRY_PENDING'}:{cadnum:id,status:'NOT_IN_APPROVED_INDEX'};
  }
 }
 return results;
}
global.V26FullIndex={lookup,normalize:parcel};
})(window);
