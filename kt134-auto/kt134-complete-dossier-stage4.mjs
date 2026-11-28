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
    landUse:safeText(x.landUse,250),sourceId:safeText(x.sourceId,140),
    evidenceStatus:safeText(x.evidenceStatus,100)}));
 const spatial=plain(bundle.gis)?bundle.gis:null;
 const mode=bundle.gisMode;
 if(!['required','contextual_skip','spatial_review','contextual_review'].includes(mode))
   error('KT134_GIS_MODE_MISSING');
 if(mode==='required'&&(!spatial||!nonempty(spatial.sourceId)||!nonempty(spatial.pdf1Ref)))
   error('KT134_GIS_PDF1_MISSING');
 if(mode==='contextual_skip'&&!nonempty(bundle.gisSkipReason))
   error('KT134_GIS_CONTEXT_REASON_MISSING');
 if(['spatial_review','contextual_review'].includes(mode)&&
    (!spatial||!nonempty(bundle.gisReviewReason)||
     !many(bundle.gisEvidenceIssues).length))
   error('KT134_GIS_REVIEW_EVIDENCE_MISSING');
 const spatialRows=['required','spatial_review'].includes(mode)?[
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
      status:mode==='required'?'established':'uncertain',sourceId:x.sourceId,
      sourceLocation:mode==='required'?'ГИС/ПДФ1':'ГИС слой — PDF1 не е потвърден',
      description:'Пространствен анализ: '+x.kind};
  });
 // Prefer an explicitly identified leading document; never silently assume that
 // the first file in a ZIP establishes the purpose of the dossier.
 const lead=plain(bundle.leadingDocument)?bundle.leadingDocument:{};
 const selectedId=safeText(lead.sourceId||lead.source_id,180);
 const selectedName=safeText(lead.fileName||lead.filename,180);
 const matchedLeading=documents.find(d=>(selectedId&&d.source===selectedId)||
   (selectedName&&d.fileName===selectedName));
 const leadSource=matchedLeading?.source||'KT125_NATIVE_KT126_STATE';
 const leadingRecord=matchedLeading?{
  sourceId:matchedLeading.source,fileName:matchedLeading.fileName,
  status:'selected_from_dossier',
  rationale:safeText(lead.reasoning||lead.reason,1400)
 }:{
  sourceId:null,fileName:null,status:'requires_automatic_author_reviewer_selection',
  rationale:'EG Авторът и рецензентът определят водещия документ по актуалното сезиране, хронологията и процесуалната роля на всички документи. Няма междинно експертно потвърждение.'
 };
 const caseFacts=[
  ...(['spatial_review','contextual_review'].includes(mode)?[{
    factId:'GIS_E3_LIMITATION',
    value:safeText(bundle.gisReviewReason,1000)+' Налични ограничения: '+
      many(bundle.gisEvidenceIssues).map(v=>safeText(v,100)).join(', '),
    status:'uncertain',sourceId:spatial.sourceId,
    sourceLocation:'Етап 3 — ГИС, неподтвърден PDF1',
    description:'Не се допуска пространствен или окончателен правен извод без допълнителна проверка.'
  }]:[]),
  ...(bundle.dossierReview?.required===true?[{
   factId:'DOSSIER_QUALITY_REVIEW',value:'Проверка на входните документи: необходима е междинна рецензия по маркер от Етап 1. Рецензентът следва да посочи корекции и несигурности; не се допуска мълчаливо потвърждение.',
   status:'uncertain',sourceId:'KT80DossierAudit',sourceLocation:'Етап 1',
   description:'Междинна проверка за качество на преписката'}]:[]),
  {factId:'CASE_SUBJECT',value:subject,status:'established',sourceId:leadSource,sourceLocation:'Етап 2 — състояние КТ126',description:'Предмет на преписката'},
  {factId:'CASE_SCOPE',value:scope,status:'established',sourceId:leadSource,sourceLocation:'Етап 2 — състояние КТ126',description:'Обхват на ИП'},
  ...parcels.filter(p=>p.sourceId&&!p.evidenceStatus.endsWith('_NOT_EXPERT_CONFIRMED')).map((p,i)=>({factId:'PARCEL_'+(i+1),
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
 }:mode==='contextual_skip'?{
  analysisMode:'contextual_skip',reason:safeText(bundle.gisSkipReason,300)
 }:{
  sourceId:spatial.sourceId,
  analysisMode:mode==='spatial_review'?
    'verified_intersections_pending_pdf1':'contextual_unverified',
  pdf1Verified:false,pdf1Ref:null,reason:safeText(bundle.gisReviewReason,1000),
  evidenceIssues:many(bundle.gisEvidenceIssues).map(x=>safeText(x,100)),
  verifiedParcelIds:many(spatial.verifiedParcelIds),
  candidateParcelIds:many(spatial.candidateParcelIds),
  protectedZones:many(spatial.protectedZones),protectedAreas:many(spatial.protectedAreas),
  outsideZones:many(spatial.outsideZones),
  limitations:many(spatial.limitations),
  stage3Status:safeText(spatial.stage3Status,120)
 };
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
   // Preserve KT80 intermediate quality flags. The independent reviewer
   // must propose corrections; flags are not a reason to fabricate evidence.
   dossierReview:plain(bundle.dossierReview)?{
    required:bundle.dossierReview.required===true,
    source:'KT80DossierAudit',
    status:safeText(bundle.dossierReview.status,100),
    filesNeedReview:Number.isSafeInteger(bundle.dossierReview.filesNeedReview)?
      bundle.dossierReview.filesNeedReview:null,
    requiresExpertReview:bundle.dossierReview.requiresExpertReview===true
   }:null,
   leadingDocument:leadingRecord,
   leadingDocumentRule:'Определете водещия документ по актуалното сезиране, съдържанието, хронологията и процесуалната роля на ВСИЧКИ документи, не по ред/име. EG Авторът предлага, рецензентът коригира; обичайни колебания не прекъсват обработката. Мотивирана несигурност — само при критична обективна невъзможност. Процедурата се квалифицира самостоятелно по нормативния MASTER.',
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
