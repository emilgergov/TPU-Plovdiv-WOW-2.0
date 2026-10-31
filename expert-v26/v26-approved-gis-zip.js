/* V26 approved GIS: read complete deployment ZIP locally; never upload parcel data. */
(function(global){'use strict';
let entries=null,reader=null,archiveName='',cache=new Map(),hostedRoot=null,hostedManifest=null;
const normalize=id=>String(id||'').trim().split('.').slice(0,3).join('.');
async function openArchive(file){
 if(!file||!(/\.zip$/i.test(file.name)))throw Error('Изберете пълния V26 ГИС ZIP пакет.');
 if(!global.zip?.ZipReader){
  await new Promise((ok,fail)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.57/dist/zip.min.js';s.onload=ok;s.onerror=()=>fail(Error('Липсва ZIP библиотеката'));document.head.appendChild(s)});
 }
 const next=new global.zip.ZipReader(new global.zip.BlobReader(file));
 let list;try{list=await next.getEntries()}catch(e){await next.close();throw e}
 const m=new Map(list.filter(x=>!x.directory).map(x=>[x.filename.split('/').pop(),x]));
 for(const key of ['parcels_04.json.gz','parcelgeom_04.json.gz','overlays_04.json.gz'])if(!m.has(key)){await next.close();throw Error('Непълен ГИС пакет: '+key)}
 if(reader)await reader.close();
 reader=next;entries=m;hostedRoot=null;hostedManifest=null;cache.clear();archiveName=file.name;
 return {name:archiveName,files:m.size};
}
/* Python geometry export may contain non-standard NaN numeric literals. Normalize only tokens outside JSON strings. */
function normalizeNonFiniteJson(source){
 let changes=0;
 const text=source.replace(/"(?:\\.|[^"\\])*"|\b(?:NaN|Infinity)\b|-Infinity\b/g,token=>{
  if(token[0]==='"')return token;
  changes++;return 'null';
 });
 return {text,changes};
}
async function rows(kind,prefix){
 const name=kind+'_'+prefix+'.json.gz',key=name;
 if(cache.has(key))return cache.get(key);
 const entry=entries?.get(name);
 let compressed;
 if(hostedRoot){const response=await fetch(hostedRoot+'/'+name);if(!response.ok)throw Error('ГИС сегмент '+name+': HTTP '+response.status);compressed=new Uint8Array(await response.arrayBuffer());}
 else {if(!entry)return [];compressed=await entry.getData(new global.zip.Uint8ArrayWriter());}
 if(!global.DecompressionStream)throw Error('Този браузър не поддържа gzip разархивиране.');
 const bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 let result;try{result=JSON.parse(bytes)}catch(e){const fixed=normalizeNonFiniteJson(bytes);if(!fixed.changes)throw Error('Невалиден JSON в '+name+': '+e.message);try{result=JSON.parse(fixed.text)}catch(second){throw Error('Сегмент '+name+': '+second.message)}console.info('V26 GIS: normalized '+fixed.changes+' non-finite values in '+name)}if(!Array.isArray(result))throw Error('Невалиден формат на сегмент: '+name);cache.set(key,result);return result;
}
async function openHosted(base){
 const root=String(base||'').replace(/\/$/,'');
 const response=await fetch(root+'/manifest.json',{cache:'no-store'});
 if(!response.ok)throw Error('ГИС сегментите още не са публикувани ('+response.status+').');
 const manifest=await response.json();
 if(manifest.status!=='PASS_COUNT_BY_PREFIX'||manifest.parcel_geometry!==917418||manifest.overlap_records_expected!==181154||manifest.shards!==258)throw Error('Непотвърден ГИС манифест.');
 const probe=await fetch(root+'/parcelgeom_36.json.gz',{method:'HEAD',cache:'no-store'});if(!probe.ok)throw Error('Пълният ГИС пакет не е публикуван: липсва parcelgeom_36.json.gz.');hostedRoot=root;hostedManifest=manifest;cache.clear();return manifest;
}
async function lookup(ids){
 if(!entries&&!hostedRoot)throw Error('ГИС базата не е заредена.');
 if(!Array.isArray(ids)||ids.length<1||ids.length>100)throw Error('Допустими са 1–100 имота.');
 const wanted=ids.map(input=>({input:String(input),cadnum:normalize(input)}));
 const prefixes=[...new Set(wanted.map(x=>x.cadnum.slice(0,2)))];
 const maps=new Map();
 for(const prefix of prefixes){
  const [parcels,geoms,overlays,intersections]=await Promise.all(['parcels','parcelgeom','overlays','overlapgeom'].map(k=>rows(k,prefix)));
  const byId=arr=>{const m=new Map();for(const r of arr){if(!m.has(r[0]))m.set(r[0],[]);m.get(r[0]).push(r)}return m};
  maps.set(prefix,{parcels:byId(parcels),geoms:byId(geoms),overlays:byId(overlays),intersections:byId(intersections)});
 }
 const results=wanted.map(({input,cadnum})=>{
  const d=maps.get(cadnum.slice(0,2)),p=d.parcels.get(cadnum)?.[0],g=d.geoms.get(cadnum)||[],o=d.overlays.get(cadnum)||[],inter=d.intersections.get(cadnum)||[];
  const features=g.filter(r=>r[1]?.type).map((r,i)=>({type:'Feature',properties:{cadnum,source:'V26_APPROVED',part:i},geometry:r[1]}));
  const overlapFeatures=inter.filter(r=>r[2]?.type).map((r,i)=>({type:'Feature',properties:{cadnum,sitecode:r[1],part:i},geometry:r[2]}));
  return {input,cadnum,status:features.length?'Намерен':p?'Геометрия липсва':'Не е намерен',settlement:p?.[1]||'',locality:p?.[2]||'',area_m2_source:p?.[3]||0,geojson:{type:'FeatureCollection',features},overlap_geojson:{type:'FeatureCollection',features:overlapFeatures},archived_overlay_records:o.map(r=>({sitecode:r[1],name_bg:r[2],order_no:r[3],dv:r[4],area_ha_source:r[5]})),intersection_verified_outside:!!features.length&&!o.length&&!inter.length&&((!!hostedManifest&&hostedManifest.shards===258)||(!hostedRoot&&!!entries&&['parcels','parcelgeom','overlays','overlapgeom'].every(kind=>entries.has(kind+'_'+cadnum.slice(0,2)+'.json.gz')))),spatial_check_basis:hostedManifest?'Пълен публикуван ГИС набор (258 сегмента), проверени пресичания за кадастралния идентификатор':(!hostedRoot&&entries?'Локален ГИС ZIP — четирите пространствени сегмента за кадастралния префикс':'ГИС покритието не е потвърдено'),source:'Одобрена работна ГИС база V26'};
 });
 return {results,summary:{found_count:results.filter(r=>r.status==='Намерен').length,requested_count:results.length,geometry_area_sum_m2:results.reduce((s,r)=>s+r.area_m2_source,0),archived_zones:[],note:'Работна ГИС база V26: '+archiveName},geometry_qa:[]};
}
global.V26ApprovedGIS=Object.freeze({openArchive,openHosted,lookup,isLoaded:()=>!!entries||!!hostedRoot});
})(window);
