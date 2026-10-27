/* V26 approved GIS: read complete deployment ZIP locally; never upload parcel data. */
(function(global){'use strict';
let entries=null,reader=null,archiveName='',cache=new Map();
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
 reader=next;entries=m;cache.clear();archiveName=file.name;
 return {name:archiveName,files:m.size};
}
/* Python geometry export may contain non-standard NaN numeric literals. Normalize only tokens outside JSON strings. */
function normalizeNonFiniteJson(source){
 let out='',quoted=false,escaped=false,changes=0;
 for(let i=0;i<source.length;){
  const c=source[i];
  if(quoted){out+=c;i++;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;out+=c;i++;continue;}
  const match=/^(?:-Infinity|Infinity|NaN)\b/.exec(source.slice(i,i+10));
  if(match && (i===0||/[\s,:[\]]/.test(source[i-1])) && (i+match[0].length===source.length||/[\s,}\]]/.test(source[i+match[0].length]))){
   out+='null';i+=match[0].length;changes++;continue;
  }
  out+=c;i++;
 }
 return {text:out,changes};
}
async function rows(kind,prefix){
 const name=kind+'_'+prefix+'.json.gz',key=name;
 if(cache.has(key))return cache.get(key);
 const entry=entries?.get(name);
 if(!entry)return [];
 const compressed=await entry.getData(new global.zip.Uint8ArrayWriter());
 if(!global.DecompressionStream)throw Error('Този браузър не поддържа gzip разархивиране.');
 const bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 let result;try{result=JSON.parse(bytes)}catch(e){const fixed=normalizeNonFiniteJson(bytes);if(!fixed.changes)throw Error('Невалиден JSON в '+name+': '+e.message);result=JSON.parse(fixed.text);console.info('V26 GIS: normalized '+fixed.changes+' non-finite values in '+name)}if(!Array.isArray(result))throw Error('Невалиден формат на сегмент: '+name);cache.set(key,result);return result;
}
async function lookup(ids){
 if(!entries)throw Error('Първо заредете одобрения пълен ГИС пакет.');
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
  return {input,cadnum,status:features.length?'Намерен':p?'Геометрия липсва':'Не е намерен',settlement:p?.[1]||'',locality:p?.[2]||'',area_m2_source:p?.[3]||0,geojson:{type:'FeatureCollection',features},overlap_geojson:{type:'FeatureCollection',features:overlapFeatures},archived_overlay_records:o.map(r=>({sitecode:r[1],name_bg:r[2],order_no:r[3],dv:r[4],area_ha_source:r[5]})),source:'Одобрена работна ГИС база V26'};
 });
 return {results,summary:{found_count:results.filter(r=>r.status==='Намерен').length,requested_count:results.length,geometry_area_sum_m2:results.reduce((s,r)=>s+r.area_m2_source,0),archived_zones:[],note:'Работна ГИС база V26: '+archiveName},geometry_qa:[]};
}
global.V26ApprovedGIS=Object.freeze({openArchive,lookup,isLoaded:()=>!!entries});
})(window);
