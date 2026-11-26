/**
 * KT134 — real native-KT125, case-bound, draft-only server coordinator.
 * This path has NO production D1, no browser-trusted evidence and no fake results.
 * Native KT125 must authenticate the cookie and enforce per-case ACL first.
 */
import {createKt134NativeCaseReader} from './kt134-native-case-http.mjs';
import {decodeKt126StoredSnapshot} from './kt134-kt126-snapshot-decoder.mjs';
import {createKt134NativeCaseAuthorization} from './kt134-native-case-authorization.mjs';
import {createProtectedAutomaticCoordinator} from './kt134-protected-auto-coordinator.mjs';
import {createKt134EgStage45Bridge} from './kt134-eg-stage45-live-bridge.mjs';
import {createKt134NormativeMasterLoader} from './kt134-normative-master-adapter.mjs';
import {createKt134OfficialWordBuilder} from './kt134-official-word-builder.mjs';
import {encodeKt134Docx} from './kt134-docx-transport.mjs';
const s=x=>typeof x==='string'?x.trim():'';
const o=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const arr=x=>Array.isArray(x)?x:[];
const err=code=>{const e=new Error(code);e.code=code;throw e};
const SHA=x=>/^[a-f0-9]{64}$/i.test(s(x));
const hash=async x=>{
 const b=new TextEncoder().encode(JSON.stringify(x));
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
 return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
};
const signed=(digest)=>typeof digest==='string'&&SHA(digest);
function selectPayload(api){
 // Native readState wrappers; never use any browser-provided facts.
 const root=o(api);
 const body=o(root.content||root.content_json||root.payload);
 // KT126 readState wraps the saved snapshot in root.state; the snapshot
 // itself contains {state,values,globals}. Never confuse wrapper with intake.
 const snapshot=o(root.state||body.state||body);
 const state=o(snapshot.state||snapshot);
 const values=o(root.values||body.values||snapshot.values||state.values);
 const globals=o(root.globals||body.globals||snapshot.globals||state.globals);
 const record=o(root.record||root.item||root.registry||root.case);
 return {root,body,state,values,globals,record};
}
function completeDocuments({root,body,state,globals}){
 const intake=o(state.intake);
 const docCollections=[root.document_texts,body.document_texts,
  intake.document_texts,intake.sourceTexts,intake.documents,
  body.documents,globals.KT80CH2Passport?.document_texts];
 const docs=docCollections.flatMap(arr).filter(v=>{
  const x=o(v);return s(x.text||x.extractedText||x.fullText)&&
   s(x.sourceId||x.source_id||x.source||x.fileId||x.fileName||x.filename);
 }).map(v=>({
  sourceId:s(v.sourceId||v.source_id||v.fileId||v.source||v.fileName||v.filename),
  fileName:s(v.fileName||v.filename||v.source),
  text:s(v.text||v.extractedText||v.fullText),
  type:s(v.type),date:s(v.date)
 }));
 return [...new Map(docs.map(d=>[d.sourceId,d])).values()];
}
function requirePrincipal({proof,record}){
 if(proof?.source!=='KT125_NATIVE_RPC'||proof?.verified!==true||
    proof?.action!=='case.edit'||!s(proof.actorId))
   err('KT125_PRINCIPAL_AND_CASE_PERMISSION_NOT_CONFIRMED');
 // KT125 itself checks actual session status, actor identity, role grants
 // and case.edit permission. Do not trust a principal inside KT126 state.
 const owner=s(record.owner_id||record.ownerUserId);
 return {userId:proof.actorId,delegated:!!owner&&owner!==proof.actorId};
}
function confirmedSources(d,ctx){
 const {root,body,state,values,globals,record}=d;
 const subject=s(values.kt80SubjectText||o(state.subjectConfirmed).text);
 const scope=s(values.kt80ScopeText||o(state.scopeConfirmed).text);
 if(!subject||!scope)err('KT134_CONFIRMED_SUBJECT_SCOPE_NOT_AVAILABLE');
 if(values.kt80SubjectConfirmation!==true||values.kt80ScopeConfirmation!==true)
   err('KT134_E2_CONFIRMATIONS_NOT_AVAILABLE');
 const external=s(record.external_number||root.externalNumber||o(root.number).external_number);
 const status=s(record.external_status||root.externalStatus);
 if(!external||!['confirmed','verified'].includes(status))
   err('KT126_EXTERNAL_NUMBER_UNCONFIRMED');
 const docs=completeDocuments(d);
 if(!docs.length)err('KT134_DOCUMENT_TEXTS_NOT_AVAILABLE');
 const audit=o(globals.KT80DossierAudit);
 // A review flag is an E1/E2 intermediate quality issue, not a missing
 // source. The native KT134 reviewer must assess it and suggest corrections.
 // Never silently treat an actually incomplete dossier as complete.
 if(audit.filesExpected&&audit.filesExpected!==audit.filesExtracted)
   err('KT134_DOSSIER_INCOMPLETE');
 const reviewNeeded=audit.filesNeedReview>0||audit.requiresExpertReview===true;
 const dossierReview=reviewNeeded?{
  required:true,source:'KT80DossierAudit',
  filesNeedReview:Number.isSafeInteger(audit.filesNeedReview)&&audit.filesNeedReview>0?
    audit.filesNeedReview:null,
  requiresExpertReview:audit.requiresExpertReview===true,
  status:'unresolved_intermediate_reviewer_assessment'
 }:{
  required:false,source:'KT80DossierAudit',status:'not_flagged'
 };
 const gis=o(globals.KT80FreeGISResults);
 const skip=state.gisSkipConfirmed===true&&s(state.gisSkipReason);
 const required=gis.verified===true&&arr(gis.results).length>0&&
  s(gis.pdf1Ref||state.pdf1Ref||body.pdf1Ref);
 if(!skip&&!required)err('KT134_GIS_OR_CONTEXT_CONFIRMED_REQUIRED');
 const parcels=arr(o(state.parcelsConfirmed).parcels||state.parcelsConfirmed)
   .filter(v=>s(o(v).identifier||o(v).cadastralId||o(v).id))
   .map(v=>({...v,identifier:s(v.identifier||v.cadastralId||v.id)}));
 const piMaster=o(globals.KT80IPMasterDraft);
 if(required&&!parcels.length)err('KT134_SPATIAL_PARCELS_NOT_CONFIRMED');
 if(required&&piMaster.spatialValidation!==true)
   err('KT134_PI_MASTER_NOT_VALIDATED');
 const spatial=required?{
  sourceId:s(gis.source||'KT80FreeGISResults'),
  pdf1Ref:s(gis.pdf1Ref||state.pdf1Ref||body.pdf1Ref),
  protectedZones:arr(gis.protectedZones),
  protectedAreas:arr(gis.protectedAreas),
  projection:s(gis.projection)
 }:null;
 const cId=s(root.caseId||root.case_id||record.case_id||record.caseId);
 const revision=String(record.revision??root.revision??'');
 if(!cId||!revision)err('KT134_NATIVE_CASE_REVISION_MISSING');
 return {caseId:cId,revision,subject,scope,external,docs,
   gisMode:required?'required':'contextual_skip',
   gis:spatial,gisSkipReason:skip?s(state.gisSkipReason):'',
   parcels,piMaster,dossierReview,record,root,body,state,values,globals};
}
function makeReceipt(caseId,type,sourceId,digest){
 if(!s(sourceId)||!signed(digest))err('KT134_UNVERIFIED_SOURCE');
 return {type,caseId,sourceId,digest,verifiedAt:'native-kt125-read'};
}
async function construct({response,normative,proof}){
 const original=o(response);
 const decoded=await decodeKt126StoredSnapshot(o(original.state));
 const d=selectPayload({...original,state:decoded});
 const principal=requirePrincipal({proof,record:d.record});
 const c=confirmedSources(d);
 const sourceDigest=await hash({caseId:c.caseId,revision:c.revision,
  docs:c.docs,record:c.record,subject:c.subject,scope:c.scope,
  dossierReview:c.dossierReview});
 const piDigest=await hash({caseId:c.caseId,piMaster:c.piMaster,parcels:c.parcels,
   skip:c.gisSkipReason});
 const evidence={
  dossier:makeReceipt(c.caseId,'dossier','KT125_NATIVE_KT126_STATE',sourceDigest),
  normativeMaster:makeReceipt(c.caseId,'normative_master',normative.name,normative.sha256),
  piMaster:makeReceipt(c.caseId,'pi_master','KT125_NATIVE_PI_MASTER',piDigest)
 };
 if(c.gisMode==='required')
  evidence.gisPdf1=makeReceipt(c.caseId,'gis_pdf1',c.gis.sourceId,await hash(c.gis));
 const caseRecord={
  id:c.caseId,revision:c.revision,subject:c.subject,registryNumber:c.external,
  registryConfirmed:true,status:'active',ownerUserId:principal.delegated?
    s(c.record.owner_id||c.record.ownerUserId):principal.userId,
  gisMode:c.gisMode,
  ...(c.gisMode==='contextual_skip'?{gisSkipConfirmed:true,gisSkipReason:c.gisSkipReason}:{})
 };
 const ctx={
  principal:{source:'KT125_SERVER',authenticated:true,status:'active',
    userId:principal.userId,roles:['case_editor_verified',
      ...(principal.delegated?['case_delegate']:[])],
    nativeAuthorization:proof},
  caseRecord,evidence,
  policy:{source:'KT125_SERVER',liveAutomaticEnabled:true}
 };
 const bundle={
  caseId:c.caseId,revision:c.revision,serverVerified:true,caseIsolated:true,
  receiptRefs:Object.values(evidence).map(x=>x.type+':'+x.digest),
  subject:c.subject,scope:c.scope,documents:c.docs,parcels:c.parcels,
  gis:c.gis,gisMode:c.gisMode,gisSkipReason:c.gisSkipReason,
  piMaster:c.piMaster,normativeArchive:normative,registryNumber:c.external,
  pdf2Ref:s(c.body.pdf2Ref||c.state.pdf2Ref),
  facts:[],procedureEvidence:[],dossierReview:c.dossierReview
 };
 return {ctx,bundle};
}
const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, private',
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export function createKt134NativeAutomaticHandler({
 nativeFetch,nativeRpc,egWorkerBase,egAccessToken,
 fetchImpl=fetch,
 wordBuilder=createKt134OfficialWordBuilder()
}={}){
 if(typeof nativeFetch!=='function'||!s(egAccessToken)||!s(egWorkerBase)||
    typeof fetchImpl!=='function'||typeof wordBuilder!=='function')
   err('KT134_NATIVE_AUTOMATIC_NOT_CONFIGURED');
 const read=createKt134NativeCaseReader({nativeFetch});
 const authorize=createKt134NativeCaseAuthorization({nativeRpc});
 const getNormative=createKt134NormativeMasterLoader({egWorkerBase,fetchImpl});
 return async function handle(request){
  const url=new URL(request.url);
  if(url.pathname!=='/kt134/automatic/draft')return null;
  if(request.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
  if(request.headers.get('origin')!==url.origin)return respond({error:'ORIGIN_REJECTED'},403);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))
   return respond({error:'JSON_REQUIRED'},415);
  let input;
  try{
   if(Number(request.headers.get('content-length')||0)>4096)
    return respond({error:'REQUEST_TOO_LARGE'},413);
   const raw=await request.text();
   if(raw.length>4096)return respond({error:'REQUEST_TOO_LARGE'},413);
   input=JSON.parse(raw);
  }catch{return respond({error:'INVALID_JSON'},400)}
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(x=>x!=='caseId')||
     !s(input.caseId))return respond({error:'CASE_ID_REQUIRED'},400);
  const caseId=input.caseId;
  const sessionToken=request.headers.get('cookie');
  if(!sessionToken)return respond({error:'KT125_LOGIN_REQUIRED'},401);
  try{
   const normative=await getNormative();
   const load=async()=>{
    const raw=await read({request,caseId});
    const response=raw.state;
    const record=o(response.record||response.item||response.registry||response.case);
    const revision=record.revision??response.revision;
    const proof=await authorize({request,caseId,revision});
    return construct({response,normative,proof});
   };
   const eg=createKt134EgStage45Bridge({
     workerBase:egWorkerBase,accessToken:egAccessToken,fetchImpl
   });
   const coordinator=createProtectedAutomaticCoordinator({
    loadProtectedContext:async()=> (await load()).ctx,
    loadEvidenceBundle:async({preflight})=>{
      const fresh=await load();
      if(fresh.ctx.caseRecord.id!==preflight.case.caseId||
       fresh.ctx.caseRecord.revision!==preflight.case.revision||
       fresh.ctx.principal.userId!==preflight.principalId)
       err('KT134_CASE_CHANGED');
      const expected=preflight.evidence.map(x=>x.type+':'+x.digest).sort();
      if(JSON.stringify(fresh.bundle.receiptRefs.slice().sort())!==JSON.stringify(expected))
       err('KT134_CASE_EVIDENCE_CHANGED');
      return fresh.bundle;
    },
    ...eg,buildDraftWord:wordBuilder
   });
   const output=await coordinator.prepareDraft({authenticatedSession:'NATIVE_KT125_ACL',
    caseId});
   if(output.status!=='draft_ready')return respond({
     status:output.status,caseId,author:output.author||null,
     reviewer:output.reviewer||null,expertApproved:false,
     requiresExpertConfirmation:true},422);
   return respond({status:'draft_ready',caseId:output.caseId,
    revision:output.revision,registryNumber:output.registryNumber,
    subject:output.subject,author:output.author,reviewer:output.reviewer,
    intermediateDecision:output.intermediateDecision,stage5:output.stage5,
    docxBase64:encodeKt134Docx(output.docx),
    expertApproved:false,requiresExpertConfirmation:true,finalDecision:null});
  }catch(error){
   return respond({error:/^[A-Z0-9_]{4,85}$/.test(error?.code||'')?
     error.code:'KT134_PROTECTED_DRAFT_UNAVAILABLE'},422);
  }
 };
}
