/* V27.1 P5/P6: deterministic, fail-closed GIS and legal evidence adapter. */
(function(root){'use strict';
const str=x=>String(x==null?'':x).trim();
function gis(results,roles){
 if(!Array.isArray(results)||!results.length)throw Error('НЯМА ДАННИ: липсва ГИС резултат');
 const parcels=results.map(r=>{
  const id=str(r.input||r.cadnum),role=roles?.[id];
  if(!/^\d{5}\.\d+\.\d+$/.test(id)||!['leading','ancillary'].includes(role))throw Error('Непотвърден имот или роля');
  const intersects=Array.isArray(r.verified_zone_intersections)?r.verified_zone_intersections.map(z=>typeof z==='string'?z:str(z.sitecode||z.code)).filter(Boolean):[];
  const outside=r.intersection_verified_outside===true;
  const geometry=!!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
  const verified=geometry&&r.status==='Намерен'&&(intersects.length>0||outside);
  return {id,role,location:str(r.location)||'НЯМА ДАННИ',zones:intersects,verified,classification:!verified?'unverified':intersects.length?'intersects':'outside'};
 });
 if(!parcels.some(p=>p.role==='leading'))throw Error('Липсва водещ имот');
 const allVerified=parcels.every(p=>p.verified);
 const scenario=!allVerified?'REVIEW':parcels.some(p=>p.classification==='intersects')?'B':'A';
 return {schema:'V27_GIS_EVIDENCE_V1',parcels,scenario,allVerified,reviewRequired:!allVerified};
}
function legal(register){
 const records=Array.isArray(register?.records)?register.records:[];
 return {schema:'V27_LEGAL_EVIDENCE_V1',sources:records.filter(r=>r?.title&&r?.source).map(r=>{
  const provision=str(r.provisionText||r.articleText);
  const version=str(r.version||r.effectiveDate);
  const official=!!r.officialVerified;
  return {id:str(r.id),title:str(r.title),source:str(r.source),version:version||null,provisionText:official&&version&&provision?provision:null,verification:official&&version&&provision?'article_verified':'catalog_only'};
 }),rule:'Catalog title and URL alone are not article-level legal proof',reviewRequired:true};
}
root.V27VerifiedContext=Object.freeze({gis,legal});
})(typeof window!=='undefined'?window:globalThis);
