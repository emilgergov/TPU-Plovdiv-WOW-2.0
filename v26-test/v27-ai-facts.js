/* V27: deterministic adapter from existing confirmed case and GIS output.
   No API keys, tokens or outbound requests in the public WOW application. */
(function(root){'use strict';
const str=(x,n=1500)=>typeof x==='string'?x.trim().slice(0,n):'';
const clean=(x)=>str(x,45).replace(/\.\d+$/,'');
function build({results,roles,workingDraft,subject,procedure}={}){
 if(!Array.isArray(results)||!results.length)throw Error('V27: липсва завършен ГИС анализ.');
 if(!roles||typeof roles!=='object')throw Error('V27: липсват потвърдени роли.');
 const parcels=results.map(r=>{
  const id=str(r.input||r.cadnum,45);
  if(!/^\d{5}\.\d+\.\d+$/.test(id))throw Error('V27: невалиден идентификатор на имот.');
  const role=roles[id]||roles[r.cadnum];
  if(!['leading','ancillary'].includes(role))throw Error('V27: непотвърдена роля на имот.');
  if(r.status!=='Намерен'||!r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)))throw Error('V27: непотвърдена имотна геометрия.');
  return {id,role,location:str(r.location,250)||'НЯМА ДАННИ',zones:Array.isArray(r.verified_zone_intersections)?r.verified_zone_intersections.map(z=>typeof z==='string'?z:str(z.sitecode||z.code,60)).filter(Boolean):[]};
 });
 if(!parcels.some(p=>p.role==='leading'))throw Error('V27: липсва водещ имот.');
 const meta=workingDraft?.metadata||{};
 const title=str(subject||meta.subject||meta.title||meta.heading,1000);
 if(!title)throw Error('V27: липсва потвърден предмет на ИП.');
 const gis=parcels.map(p=>p.id+' ('+p.role+'), '+p.location+': '+(p.zones.length?'установени пресичания: '+p.zones.join(', '):'няма потвърдени кодове за пресичане')).join('; ');
 return {mode:'expert',facts:{subject:title,parcelIds:parcels.map(p=>p.id),location:str(meta.location,500)||'НЯМА ДАННИ',investor:str(meta.investor||meta.applicant,250)||'НЯМА ДАННИ',procedure:str(procedure||meta.procedure,100)||'НЯМА ДАННИ',gisFindings:gis.slice(0,3000),legalReferences:'НЯМА ДАННИ — изисква се проверена нормативна справка',evidenceNotes:'ГИС данните са извлечени от текущата потвърдена справка; всички изводи подлежат на експертна проверка.',registration:str(meta.registration||meta.incomingNumber,150)||'НЯМА ДАННИ'}};
}
root.V27AIFacts=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
