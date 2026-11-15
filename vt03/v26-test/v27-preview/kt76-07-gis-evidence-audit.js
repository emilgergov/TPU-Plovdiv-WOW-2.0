/* KT76-07 — independent pre-download GIS evidence audit for A/B.
 * Read-only: no changes to original SNAP_BG, PDF1, Word content or geometry.
 * Calculate spatial intersection from independently supplied parcel/overlap
 * polygons, not boolean intersects. Keep A's full 32-zone proof and nearest
 * zone provenance separate from B's overlap-area ratio.
 */
(function(root){'use strict';
const PARCEL='36676.129.457',ZONE='BG0000194';
const ensure=(ok,msg)=>{if(!ok)throw Error('КТ76-07 ГИС: '+msg)};
function areas(shape){
 if(!shape||!['Polygon','MultiPolygon'].includes(shape.type))return NaN;
 const polygons=shape.type==='Polygon'?[shape.coordinates]:shape.coordinates;
 let total=0;
 for(const rings of polygons){
  let value=0;
  for(let k=0;k<rings.length;k++){
   const ring=rings[k];if(!Array.isArray(ring)||ring.length<4)return NaN;
   let twice=0;
   for(let j=0;j<ring.length;j++){
    const a=ring[j],b=ring[(j+1)%ring.length];
    if(!Array.isArray(a)||!Array.isArray(b)||!a.slice(0,2).every(Number.isFinite)||!b.slice(0,2).every(Number.isFinite))return NaN;
    twice+=a[0]*b[1]-b[0]*a[1];
   }
   value+=(k===0?1:-1)*Math.abs(twice)/2;
  }
  if(value<0)return NaN;total+=value;
 }
 return total;
}
function sumFeatures(obj){
 const features=obj?.features;
 if(!Array.isArray(features)||features.length===0)return NaN;
 let s=0;
 for(const f of features){
  const area=areas(f?.geometry);if(!Number.isFinite(area))return NaN;
  s+=area;
 }
 return s;
}
function audit({scenario,results=[],zoneFeatures=[],parcelIds=[],gisClass=null}={}){
 const mode=scenario==='A'?'А':scenario==='B'?'Б':scenario;
 ensure(['А','Б'].includes(mode),'непознат сценарий');
 ensure(Array.isArray(results)&&results.length>0&&Array.isArray(parcelIds)&&parcelIds.length===results.length,'несъвпадащ брой имоти');
 const ids=results.map(r=>String(r.input||r.cadnum||''));
 ensure(ids.every((id,i)=>id===String(parcelIds[i])),'ГИС имотите се различават от потвърдените');
 if(mode==='А'){
  ensure(results.every(r=>r.intersection_verified_outside===true&&(!r.verified_zone_intersections||r.verified_zone_intersections.length===0)),'има непотвърдено или положително пресичане');
  const zones=new Set(zoneFeatures.map(f=>String(f?.properties?.SITECODE||f?.properties?.sitecode||f?.properties?.code||f?.sitecode||'')));
  ensure(zoneFeatures.length===32&&zones.size===32&&zoneFeatures.every(f=>f?.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type)),'липсва пълният набор 32 зони');
  for(const r of results)ensure(Number.isFinite(sumFeatures(r.geojson))&&sumFeatures(r.geojson)>0,'липсва геометрия на имот А');
  return Object.freeze({scenario:'А',parcels:ids,checkedZones:32,classification:'извън защитените зони',areaRatio:null,verdict:'PASS',evidence:'потвърден outside флаг + 32 геометрии SNAP_BG; разстоянието до най-близка зона се проверява отделно'});
 }
 ensure(results.length===1&&ids[0]===PARCEL,'геометричният тест Б е валидиран за единствения одобрен примерен имот');
 const r=results[0];
 const codes=(r.verified_zone_intersections||[]).map(v=>typeof v==='string'?v:String(v.sitecode||v.code||''));
 ensure(codes.length===1&&codes[0]===ZONE,'непотвърдена защитена зона BG0000194');
 const whole=sumFeatures(r.geojson),overlay=sumFeatures(r.overlap_geojson);
 ensure(Number.isFinite(whole)&&whole>0&&Number.isFinite(overlay)&&overlay>0,'липсва пълна геометрия или геометрия на пресичане');
 for(const f of r.overlap_geojson.features){
  const code=f.properties?.SITECODE||f.properties?.sitecode||f.properties?.code;
  ensure(!code||code===ZONE,'пресичане с друга защитена зона');
 }
 let ratio=overlay/whole;
 ensure(Number.isFinite(ratio)&&ratio>0&&ratio<=1.001,'геометрично невъзможно отношение на площите');
 const conclusion=ratio>=0.99999?'попада':'попада частично';
 ensure(gisClass===conclusion,'различен ГИС извод между независимия контрол и Classic/Expert');
 return Object.freeze({scenario:'Б',parcels:ids,zone:ZONE,classification:conclusion,areaRatio:ratio,areaSharePercent:Math.round(ratio*1000000)/10000,verdict:'PASS',evidence:'геометрично изчислен дял от площите в единната координатна система; не е отделно геодезическо удостоверяване'});
}
root.KT7607GISEvidence=Object.freeze({audit});
})(typeof window!=='undefined'?window:globalThis);
