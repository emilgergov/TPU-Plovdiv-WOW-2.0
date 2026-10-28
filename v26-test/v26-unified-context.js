/* V26.4 unified browser context; additive, no GIS changes. */
(function(root){
'use strict';
function sharedDiagnosis(intake,roles,gis){
 const results=gis?.results||[];
 const leading=results.filter(r=>(roles?.[r.input]||roles?.[r.cadnum])==='leading');
 const facts=[];
 for(const d of intake.dossier_documents||[]){
  for(const ref of d.references||[])facts.push({kind:'documentary',claim:ref,source:d.file,status:'нерешено'});
 }
 for(const f of intake.dossier_analysis?.findings||[])facts.push({kind:'dossier',claim:f,source:'ZIP преписка',status:'нерешено'});
 const complete=!!leading.length&&leading.every(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)));
 const code=z=>typeof z==='string'?z.trim():String(z?.sitecode||z?.code||'').trim();
 const valid=z=>/^BG[0-9]{7}$/.test(code(z));
 const current=leading.flatMap(r=>r.verified_zone_intersections||[]).filter(valid);
 const archived=leading.flatMap(r=>[...(r.archived_overlay_records||[]),...(r.archived_zones||[])]).filter(valid);
 const outside=complete&&leading.every(r=>r.intersection_verified_outside===true);
 let scenario=null,spatialStatus='нерешено';
 if(current.length){scenario='Б';spatialStatus='доказано'}
 else if(archived.length){scenario='Б';spatialStatus='установено архивно пресичане; актуалният правен статус не е потвърден'}
 else if(outside){scenario='А';spatialStatus='доказано'}
 facts.push({kind:'GIS',claim:scenario?'Сценарий '+scenario:'Сценарият не е установен',source:'ГИС анализ на водещите имоти',status:spatialStatus,verifiedOutside:outside,archivedIntersections:archived.length,currentIntersections:current.length});
 return Object.freeze({scenario,spatialStatus,leadingParcels:leading.map(r=>r.cadnum),facts,requiresExpertReview:true,legalStatusOfArchivedIntersections:'нерешено'});
}
function build(intake,roles,gis){
 if(!intake||!Array.isArray(intake.files))throw Error('Липсва обработена ZIP преписка.');
 const docs=intake.dossier_documents||[];
 const analysis=intake.dossier_analysis||null;
 const draft=intake.dossier_draft||null;
 const parcels=Object.keys(roles||{}).filter(id=>roles[id]==='leading'||roles[id]==='ancillary');
 const diagnosis=sharedDiagnosis(intake,roles,gis);
 return Object.freeze({
  version:'V26.5-working',archive:intake.archive_name,
  documents:docs,parcels,roles:roles||null,gis:gis||null,diagnosis,
  evidence:analysis,characterization:draft,
  references:docs.flatMap(d=>(d.references||[]).map(r=>({...r,file:d.file}))),
  readiness:{
   zip:true,roles:!!roles&&parcels.length>0&&parcels.every(id=>!!roles[id]),gis:!!gis,
   appendix1:!!gis&&!!gis.pdf1_confirmed,
   appendix2:!!gis&&!!gis.pdf1_confirmed,
   word:!!gis&&!!gis.pdf1_confirmed&&!!roles
  },
  caveats:['Документалните откъси изискват смислова проверка.','Непотвърдените нормативни основания се означават с конкретната причина за непотвърждаването.']
 });
}
function commonEvidence(context){return {diagnosis:context.diagnosis,ledger:context.diagnosis.facts,findings:context.evidence?.findings||[],warnings:context.evidence?.warnings||[],archive:context.archive,parcels:context.parcels,roles:context.roles,gis:context.gis,requiresReview:true};}
function toAnnex2(context){
 return {archive:context.archive,documents:context.documents.map(d=>({file:d.file,type:d.type,readable:d.readable,references:d.references||[]})),facts:context.diagnosis.facts,warnings:context.evidence?.warnings||[],commonEvidence:commonEvidence(context)};
}
function toWord(context){
 return {archive:context.archive,parcels:context.parcels,roles:context.roles,characterization:context.characterization,diagnosis:context.diagnosis,commonEvidence:commonEvidence(context),requiresReview:true};
}
root.V26UnifiedContext=Object.freeze({build,toAnnex2,toWord});
})(typeof window!=='undefined'?window:globalThis);
