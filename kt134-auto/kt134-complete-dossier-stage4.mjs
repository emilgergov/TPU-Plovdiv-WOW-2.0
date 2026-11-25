/**
 * KT134 — direct E1/E2/E3 dossier → existing EG Stage4 contract.
 * No artificial case facts, spatial results or normative classifications.
 * A protected KT125 host must populate bundle exclusively from the current case.
 */
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const clean=x=>String(x??'').trim();
const error=x=>{throw new Error(x);};
const many=x=>Array.isArray(x)?x:[];
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const safeText=(v,n=10000)=>clean(v).slice(0,n);
const parcelKey=x=>safeText(x?.identifier||x?.cadastralId||x?.id,70);
export function buildKt134CompleteStage4Request({caseId,revision,bundle,requestId}={}){
 if(!nonempty(caseId)||!nonempty(String(revision??''))||!plain(bundle)||bundle.caseId!==caseId)
   error('KT134_CASE_CONTEXT_MISSING');
 const subject=safeText(bundle.subject?.text||bundle.subject,1000);
 const scope=safeText(bundle.scope?.text||bundle.scope,5000);
 if(!subject||!scope)error('KT134_SUBJECT_OR_SCOPE_MISSING');
 const documents=many(bundle.documents).filter(d=>plain(d)&&nonempty(d.sourceId)&&nonempty(d.text))
   .map(d=>({source:d.sourceId,text:safeText(d.text,12000),
    totalChars:clean(d.text).length,truncated:clean(d.text).length>12000,
    fileName:safeText(d.fileName,180),type:safeText(d.type,100),date:safeText(d.date,50)})).slice(0,60);
 if(!documents.length)error('KT134_DOSSIER_DOCUMENTS_MISSING');
 const parcels=many(bundle.parcels).filter(x=>plain(x)&&parcelKey(x))
   .map(x=>({identifier:parcelKey(x),settlement:safeText(x.settlement,120),
    municipality:safeText(x.municipality,120),landAreaSqm:Number.isFinite(x.areaSqm)?x.areaSqm:null,
    landUse:safeText(x.landUse,250),sourceId:safeText(x.sourceId,140)}));
 const spatial=plain(bundle.gis)?bundle.gis:null;
 const mode=bundle.gisMode;
 if(mode!=='required'&&mode!=='contextual_skip')error('KT134_GIS_MODE_MISSING');
 if(mode==='required'&&(!spatial||!nonempty(spatial.sourceId)||!nonempty(spatial.pdf1Ref)))
   error('KT134_GIS_PDF1_MISSING');
 if(mode==='contextual_skip'&&!nonempty(bundle.gisSkipReason))
   error('KT134_GIS_CONTEXT_REASON_MISSING');
 const spatialRows=mode==='required'?[
  ...many(spatial.protectedZones).map(x=>({...x,kind:'ЗЗ'})),
  ...many(spatial.protectedAreas).map(x=>({...x,kind:'ЗТ'}))
 ]:[];
 const spatialFacts=spatialRows.filter(x=>plain(x)&&nonempty(x.name)&&nonempty(x.sourceId))
  .map((x,i)=>{
    const intersect=x.intersects===true?'установено пресичане':x.intersects===false?'установено непресичане':'пресичане непотвърдено';
    const distance=Number.isFinite(x.distanceMeters)?'; отстояние '+x.distanceMeters+' m':'';
    const area=Number.isFinite(x.intersectionAreaSqm)?'; площ на пресичане '+x.intersectionAreaSqm+' кв. м':'';
    return {factId:'GIS_'+(i+1),value:x.kind+' '+x.name+': '+intersect+distance+area+
      (nonempty(x.order)?'; заповед '+safeText(x.order,160):''),
      status:'established',sourceId:x.sourceId,sourceLocation:'ГИС/ПДФ1',description:'Пространствен анализ: '+x.kind};
  });
 const caseFacts=[
  {factId:'CASE_SUBJECT',value:subject,status:'established',sourceId:documents[0].source,sourceLocation:'Етап 2',description:'Предмет на преписката'},
  {factId:'CASE_SCOPE',value:scope,status:'established',sourceId:documents[0].source,sourceLocation:'Етап 2',description:'Обхват на ИП'},
  ...parcels.filter(p=>p.sourceId).map((p,i)=>({factId:'PARCEL_'+(i+1),
   value:'Имот '+p.identifier+(p.settlement?'; населено място '+p.settlement:'')+
     (p.municipality?'; община '+p.municipality:'')+
     (Number.isFinite(p.landAreaSqm)?'; площ '+p.landAreaSqm+' кв. м':'')+
     (p.landUse?'; НТП '+p.landUse:''),
   status:'established',sourceId:p.sourceId,sourceLocation:'ПИ MASTER/Етап 3',
   description:'Кадастрален и административен контекст'})),
  ...spatialFacts
 ];
 const supplied=many(bundle.facts).filter(x=>plain(x)&&nonempty(x.sourceId)&&nonempty(x.value))
   .map((x,i)=>({factId:'FACT_'+(i+1),value:safeText(x.value,1200),
    status:x.confirmed===true?'established':'uncertain',sourceId:x.sourceId,
    sourceLocation:safeText(x.sourceLocation,160),description:safeText(x.description,160)}));
 const gisDescription=mode==='required'?{
  sourceId:spatial.sourceId,pdf1Ref:spatial.pdf1Ref,analysisMode:'spatial',
  protectedZones:many(spatial.protectedZones),protectedAreas:many(spatial.protectedAreas),
  projection:safeText(spatial.projection,100),notes:safeText(spatial.notes,1600)
 }:{analysisMode:'contextual_skip',reason:safeText(bundle.gisSkipReason,300)};
 const archive=plain(bundle.normativeArchive)?bundle.normativeArchive:{};
 if(!nonempty(archive.name)||!Array.isArray(archive.verifiedReferences))
   error('KT134_NORMATIVE_MASTER_MISSING');
 return {
  task:'draft_normative_proposal',kt134AutomaticInterim:true,
  documentType:'PROJECT_NOT_ACT',caseId,requestId:nonempty(requestId)?requestId:'KT134-'+caseId+'-'+revision,
  evidenceRevision:revision,subject,scope,
  parcelIds:parcels.map(x=>x.identifier).slice(0,100),
  evidence:[...caseFacts,...supplied].slice(0,100),
  archive:{name:archive.name,sha256:safeText(archive.sha256,128),
    verifiedReferences:archive.verifiedReferences},
  constraints:{expertApprovalRequired:true,neverIssueAct:true},
  incomingReference:safeText(bundle.registryNumber,110),
  completeCaseEvidence:{
   archiveName:'Преписка '+caseId,sourceTextCount:documents.length,sourceTexts:documents,
   documentRecords:documents.map(x=>({sourceId:x.source,fileName:x.fileName,type:x.type,date:x.date})),
   documents:documents.map(x=>({sourceId:x.source,name:x.fileName})),
   parcels,gis:gisDescription,subjectCandidates:[subject],gisContextMode:mode,
   // Evidence of prior procedural steps is case-specific, never inferred from
   // a selected panel or generic statutory wording.
   procedureEvidence:many(bundle.procedureEvidence)
    .filter(x=>plain(x)&&x.verified===true&&nonempty(x.sourceId)&&nonempty(x.kind))
    .map(x=>({kind:safeText(x.kind,100),sourceId:safeText(x.sourceId,180),
      verified:true,description:safeText(x.description,550),
      institution:safeText(x.institution,200),date:safeText(x.date,50)})).slice(0,40),
   piMaster:plain(bundle.piMaster)?bundle.piMaster:null,
   pdf1Ref:mode==='required'?spatial.pdf1Ref:null,
   pdf2Ref:safeText(bundle.pdf2Ref,250),
   registryNumber:safeText(bundle.registryNumber,110),
   evidenceProvenance:'CASE_SPECIFIC_NO_SYNTHETIC_SOURCE'
  }
 };
}
