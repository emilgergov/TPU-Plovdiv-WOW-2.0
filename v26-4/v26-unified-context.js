/* V26.4 unified browser context; additive, no GIS changes. */
(function(root){
'use strict';
function build(intake,roles,gis){
 if(!intake||!Array.isArray(intake.files))throw Error('Липсва обработена ZIP преписка.');
 const docs=intake.dossier_documents||[];
 const analysis=intake.dossier_analysis||null;
 const draft=intake.dossier_draft||null;
 const parcels=intake.all_parcels||[];
 return Object.freeze({
  version:'V26.4-working',archive:intake.archive_name,
  documents:docs,parcels,roles:roles||null,gis:gis||null,
  evidence:analysis,characterization:draft,
  references:docs.flatMap(d=>(d.references||[]).map(r=>({...r,file:d.file}))),
  readiness:{
   zip:true,roles:!!roles,gis:!!gis,
   appendix1:!!gis&&!!gis.pdf1_confirmed,
   appendix2:!!gis&&!!gis.pdf1_confirmed,
   word:!!gis&&!!gis.pdf1_confirmed&&!!roles
  },
  caveats:['Документалните откъси изискват смислова проверка.','Непотвърдените нормативни основания се означават с конкретната причина за непотвърждаването.']
 });
}
function toAnnex2(context){
 return {archive:context.archive,documents:context.documents.map(d=>({file:d.file,type:d.type,readable:d.readable,references:d.references||[]})),facts:context.evidence?.findings||[],warnings:context.evidence?.warnings||[]};
}
function toWord(context){
 return {archive:context.archive,parcels:context.parcels,roles:context.roles,characterization:context.characterization,requiresReview:true};
}
root.V26UnifiedContext=Object.freeze({build,toAnnex2,toWord});
})(typeof window!=='undefined'?window:globalThis);
