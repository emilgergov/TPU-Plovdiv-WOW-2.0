/* KT12: full-zone spatial overlay. Working SNAP_BG geometries are not certified legal boundaries. */
(()=>{'use strict';
let zonesPromise=null,turfPromise=null;
const polygon=f=>f?.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type);
function zones(){return zonesPromise||(zonesPromise=fetch('./TPU_Plovdiv_N2000_32_zones_full.geojson',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Natura 2000 GeoJSON HTTP '+r.status);return r.json()}).then(d=>{if(!Array.isArray(d.features)||d.features.length!==32||!d.features.every(polygon))throw Error('Непълен слой от 32 защитени зони');return d.features}).catch(e=>{zonesPromise=null;throw e}))}
function turf(){if(window.turf?.intersect&&window.turf?.area)return Promise.resolve(window.turf);return turfPromise||(turfPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js';s.onload=()=>window.turf?.intersect?resolve(window.turf):reject(Error('Липсва Turf GIS'));s.onerror=()=>reject(Error('Неуспешно зареждане на ГИС библиотека'));document.head.appendChild(s)}).catch(e=>{turfPromise=null;throw e}))}
function code(z){const p=z.properties||{};return String(p.sitecode||p.SITECODE||p.code||p.CODE||p.site_code||'').trim()}
async function verify(results){
 if(!Array.isArray(results)||!results.length)throw Error('Липсват имоти за overlay');
 const [layer,t]=await Promise.all([zones(),turf()]);
 for(const r of results){delete r.verified_zone_intersections;delete r.intersection_verified_outside;delete r.kt12_overlay_status;
  const parcels=(r.geojson?.features||[]).filter(polygon);
  if(!parcels.length){r.kt12_overlay_status='Няма имотна геометрия';continue}
  const matches=[];
  for(const z of layer){let area=0;
   for(const p of parcels){try{const intersection=t.intersect(p,z);if(intersection)area+=t.area(intersection)}catch(e){throw Error('ГИС пресичане '+(r.cadnum||r.input)+' / '+(code(z)||'зона')+': '+e.message)}}
   if(area>0.000001)matches.push({sitecode:code(z),name_bg:String(z.properties?.name_bg||z.properties?.NAME_BG||z.properties?.name||''),area_m2:Math.round(area*1000)/1000,source:'SNAP_BG working layer'});
  }
  r.verified_zone_intersections=matches;r.intersection_verified_outside=matches.length===0;
  r.kt12_overlay_status=matches.length?'Геометрично пресичане в работния слой':'Без геометрично пресичане в работния слой';
 }
 return results;
}
window.V26KT12Overlay=Object.freeze({verify});
})();