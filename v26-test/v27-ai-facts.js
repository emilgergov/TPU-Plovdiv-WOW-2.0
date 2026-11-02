/* V27: deterministic adapter from existing confirmed case and GIS output.
   No API keys, tokens or outbound requests in the public WOW application. */
(function(root){'use strict';
const str=(x,n=1500)=>typeof x==='string'?x.trim().slice(0,n):'';
function build({results,roles,workingDraft,subject,procedure,archivePreview,normativeRegister,workingContext}={}){
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
 const preview=archivePreview?.files||[];
 const dossier=preview.filter(f=>!f.error&&typeof f.text==='string').slice(0,25).map(f=>({file:str(f.path,180),excerpt:str(f.text,1400)}));
 const dossierDocuments=(workingContext?.documents||[]).slice(0,18).map(d=>({file:str(d.file,180),type:str(d.type,80),references:(d.references||[]).slice(0,5).map(x=>str(typeof x==='string'?x:JSON.stringify(x),220))}));
 const legal=(normativeRegister?.records||[]).filter(r=>r?.title&&r?.source&&r.verified===true&&r.revision_verified===true&&str(r.article)&&str(r.verified_scope)).slice(0,12).map(r=>({title:str(r.title,180),source:str(r.source,200),id:str(r.id,80),article:str(r.article,100),verifiedScope:str(r.verified_scope,500),page:str(r.page,80),revisionVerified:true}));
 const gis=parcels.map(p=>{const r=results.find(x=>(x.input||x.cadnum)===p.id)||{};return p.id+' ('+p.role+'), '+p.location+': '+(p.zones.length?'потвърдено пресичане със защитени зони '+p.zones.join(', '):r.intersection_verified_outside===true?'потвърдено отсъствие на пресичане със защитени зони':'пространственият резултат не е потвърден');}).join('; ');
 return {mode:'expert',facts:{subject:title,parcelIds:parcels.map(p=>p.id),location:str(meta.location,500)||'НЯМА ДАННИ',investor:str(meta.investor||meta.applicant,250)||'НЯМА ДАННИ',procedure:str(procedure||meta.procedure,100)||'НЯМА ДАННИ',gisFindings:gis.slice(0,3000),legalReferences:legal.length?legal.map(x=>x.title+' ('+x.source+')').join('; ').slice(0,2800):'НЯМА ДАННИ — изисква се проверена нормативна справка',evidenceNotes:'ГИС данните са извлечени от текущата справка. Отсъствие на код на зона само по себе си не доказва отсъствие на пресичане. Изготвя се работен проект.',registration:str(meta.registration||meta.incomingNumber,150)||'НЯМА ДАННИ',dossierExcerpts:dossier,dossierDocuments,legalSources:legal}};
}
root.V27AIFacts=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
