/**
 * KT134 — protected HTTP entry point for the existing automatic coordinator.
 * This module is intentionally host-neutral: the KT125 server supplies
 * authenticated identity, verified case/evidence loaders and protected secrets.
 * Never mount it without the KT125 adapters.
 */
import {createProtectedAutomaticCoordinator} from './kt134-protected-auto-coordinator.mjs';
import {createKt134EgStage45Bridge} from './kt134-eg-stage45-live-bridge.mjs';
import {encodeKt134Docx} from './kt134-docx-transport.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff'}
});
const required=(name,value)=>{if(typeof value!=='function')throw Error('KT134_HOST_MISSING_'+name)};
export function createKt134ProtectedHttpHandler({
  resolveKt125Session,loadProtectedContext,loadEvidenceBundle,buildDraftWord,
  egWorkerBase,egAccessToken,fetchImpl=fetch
}={}) {
  for(const [n,v] of Object.entries({resolveKt125Session,loadProtectedContext,
    loadEvidenceBundle,buildDraftWord})) required(n,v);
  if(!/^https:\/\//.test(egWorkerBase||'')||!egAccessToken)
    throw Error('KT134_PROTECTED_EG_NOT_CONFIGURED');
  return async function handle(request) {
    const url=new URL(request.url);
    if(url.pathname!=='/kt134/automatic/draft')return null;
    if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')
      return json({error:'JSON_REQUIRED'},415);
    const origin=request.headers.get('origin');
    if(origin&&origin!==url.origin)return json({error:'ORIGIN_REJECTED'},403);
    const session=await resolveKt125Session(request);
    if(!session||session.authenticated!==true||!session.sessionId)
      return json({error:'KT125_AUTH_REQUIRED'},401);
    let input;
    try{input=await request.json()}catch{return json({error:'INVALID_JSON'},400)}
    if(!input||typeof input!=='object'||Array.isArray(input)||
       Object.keys(input).some(k=>k!=='caseId')||
       typeof input.caseId!=='string'||!/^[-A-Za-z0-9_]{4,100}$/.test(input.caseId))
      return json({error:'CASE_ID_REQUIRED'},400);
    try{
      // All records/evidence are loaded server-side, never accepted from the browser.
      const eg=createKt134EgStage45Bridge({
        workerBase:egWorkerBase,accessToken:egAccessToken,fetchImpl
      });
      const coordinator=createProtectedAutomaticCoordinator({
        loadProtectedContext:({authenticatedSession,caseId})=>
          loadProtectedContext({authenticatedSession,caseId,session}),
        loadEvidenceBundle:({preflight,authenticatedSession})=>
          loadEvidenceBundle({preflight,authenticatedSession,session}),
        ...eg,buildDraftWord
      });
      const output=await coordinator.prepareDraft({
        authenticatedSession:session.sessionId,caseId:input.caseId
      });
      if(output.status!=='draft_ready')
        return json({status:output.status,caseId:input.caseId,
          author:output.author||null,reviewer:output.reviewer||null,
          expertApproved:false,requiresExpertConfirmation:true},422);
      return json({status:'draft_ready',caseId:output.caseId,
        revision:output.revision,registryNumber:output.registryNumber,
        subject:output.subject,author:output.author,reviewer:output.reviewer,
        intermediateDecision:output.intermediateDecision,stage5:output.stage5,
        docxBase64:encodeKt134Docx(output.docx),
        expertApproved:false,requiresExpertConfirmation:true,finalDecision:null});
    }catch(err){
      // Do not echo full evidence, source texts, credentials or arbitrary errors.
      const code=typeof err?.code==='string'&&/^[A-Z0-9_]+$/.test(err.code)?
        err.code:'KT134_DRAFT_FAILED';
      return json({error:code,caseId:input.caseId},422);
    }
  };
}
