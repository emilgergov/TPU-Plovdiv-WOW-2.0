/**
 * KT134 complete E1 bridge for a NEW case, after native KT126 registration
 * and original upload. Writes no separate registry/number, uses native KT125
 * cookie and native case ACL on every read + write.
 */
const NATIVE='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const EG='https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sha=/^[a-f0-9]{64}$/i;
const fail=x=>{const e=new Error(x);e.code=x;throw e};
const str=(x,n=5000)=>typeof x==='string'?x.trim().slice(0,n):'';
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const txt=async(r,max=250000)=>{const s=await r.text();if(new TextEncoder().encode(s).length>max)fail('KT134_STAGE1_RESPONSE_TOO_LARGE');try{return JSON.parse(s)}catch{fail('KT134_STAGE1_BAD_JSON')}};
export function createKt134NativeStage1Completion({nativeFetch,egFetch,egAccessToken}={}){
 if(typeof nativeFetch!=='function'||typeof egFetch!=='function'||!str(egAccessToken))
   fail('KT134_E1_SERVICES_NOT_CONFIGURED');
 return async function complete({request}={}){
  if(!(request instanceof Request)||request.method!=='POST')
   fail('KT134_STAGE1_POST_REQUIRED');
  const origin=new URL(request.url).origin;
  if(request.headers.get('origin')!==origin||
    request.headers.get('sec-fetch-site')==='cross-site')
   fail('KT134_STAGE1_ORIGIN_REJECTED');
  const cookie=request.headers.get('cookie')||'';
  if(!cookie||cookie.length>8000)fail('KT125_LOGIN_REQUIRED');
  if(Number(request.headers.get('content-length')||0)>180000)
   fail('KT134_STAGE1_TOO_LARGE');
  let body;
  try{const raw=await request.text();if(new TextEncoder().encode(raw).length>180000)
   fail('KT134_STAGE1_TOO_LARGE');body=JSON.parse(raw)}catch(e){
   fail(e?.code||'KT134_STAGE1_INVALID_JSON');
  }
  const caseId=str(body?.caseId,80),digest=str(body?.sha256,64);
  if(!uuid.test(caseId)||!sha.test(digest))fail('KT134_STAGE1_CASE_ORIGINAL_INVALID');
  const intake=plain(body.intake);
  const rawDocs=Array.isArray(intake.document_texts)?intake.document_texts:[];
  if(!rawDocs.length||rawDocs.length>50)fail('KT134_STAGE1_DOCUMENTS_MISSING');
  const docs=[],names=new Set();
  for(const d of rawDocs){
   const name=str(d?.source,240),text=str(d?.text,8000);
   if(!name||!text||names.has(name))fail('KT134_STAGE1_DOCUMENT_INVALID');
   docs.push({id:name,fileName:name,text});names.add(name);
  }
  const target=NATIVE+'/kt126/registry/'+caseId;
  const read=await nativeFetch(new Request(target,{headers:{
    Accept:'application/json',Cookie:cookie},redirect:'manual'}));
  if([301,302,303,307,308,401,403].includes(read.status))
   fail('KT125_CASE_ACCESS_DENIED');
  if(!read.ok)fail('KT126_CASE_READ_FAILED');
  const snapshot=await txt(read,600000);
  if(snapshot.record?.case_id!==caseId||!Number.isInteger(Number(snapshot.record?.revision)))
   fail('KT126_CASE_RECEIPT_INVALID');
  // Verify the original was successfully stored, and its digest matches
  // the exact bytes selected for E1 by the browser.
  const source=await nativeFetch(new Request(target+'/source',{headers:{
    Accept:'application/json',Cookie:cookie},redirect:'manual'}));
  if(!source.ok)fail('KT126_ORIGINAL_READ_FAILED');
  const original=plain((await txt(source,16000)).file);
  if(original.complete!==true&&Number(original.complete)!==1)
   fail('KT126_ORIGINAL_NOT_FINISHED');
  if(str(original.sha256).toLowerCase()!==digest.toLowerCase())
   fail('KT134_STAGE1_ORIGINAL_DIGEST_MISMATCH');
  // Native KT126 may already have an E1 snapshot. Never overwrite a confirmed
  // classic case with a duplicate automatic E1.
  const prior=plain(snapshot.state);
  if(prior?.globals?.KT134AutomaticStage1?.completed===true)
   return {caseId,internalNumber:snapshot.record.internal_number,
    status:'stage1_already_completed',leadingDocument:prior.globals.KT134AutomaticStage1.leadingDocument,
    registeredIn:'KT126_NATIVE_REGISTRY'};
  const eg=await egFetch(EG+'/kt134/stage1-leading',{
    method:'POST',headers:{Authorization:'Bearer '+egAccessToken,'Content-Type':'application/json'},
    body:JSON.stringify({stage:1,projectOnly:true,caseId,documents:docs})
  });
  if(!eg.ok)fail('KT134_EG_STAGE1_ANALYSIS_FAILED');
  const answer=await txt(eg,22000);
  const selected=plain(answer.selected);
  const leader=str(selected.leadingDocumentId,240);
  if(answer.caseId!==caseId||answer.status!=='stage1_documentary_proposal'||
     !names.has(leader)||!str(selected.rationale)||!str(selected.subject)||!str(selected.scope))
   fail('KT134_STAGE1_LEADING_DOCUMENT_UNVERIFIED');
  const priorState=plain(prior.state),priorValues=plain(prior.values),
   priorGlobals=plain(prior.globals);
  const leading={caseId,sourceId:leader,fileName:leader,
    reasoning:str(selected.rationale,2400),currentRequest:str(selected.currentRequest,1200),
    selectedBy:'EG_AUTHOR_AND_REVIEWER',expertConfirmed:false};
  // Store in the exact native KT126 state, with V26's original intake shape
  // and the classic workflow keys. Do not forge subject/scope confirmations.
  const normalized={
   archive_name:str(intake.archive_name,240),
   files:Array.isArray(intake.files)?intake.files.slice(0,100):[],
   document_texts:rawDocs.map(d=>({source:str(d.source,240),text:str(d.text,120000)})),
   dossier_documents:Array.isArray(intake.dossier_documents)?intake.dossier_documents.slice(0,100):[],
   classification:plain(intake.classification),
   subject_candidates:Array.isArray(intake.subject_candidates)?intake.subject_candidates.slice(0,35):[],
   all_parcels:Array.isArray(intake.all_parcels)?intake.all_parcels.slice(0,100):[]
  };
  const state={
    ...prior,state:{...priorState,intake:normalized,leadingDocument:leading,
     subjectConfirmed:null,scopeConfirmed:null,
     mode:'KT134_AUTOMATIC_E1',stage:2},
    values:{...priorValues,kt80SubjectText:str(selected.subject,1200),
     kt80ScopeText:str(selected.scope,2500),
     kt80SubjectConfirmation:false,kt80ScopeConfirmation:false},
    globals:{...priorGlobals,
     KT80WorkflowState:{...plain(priorGlobals.KT80WorkflowState),intake:normalized,
       leadingDocument:leading,step:2},
     KT134AutomaticStage1:{completed:true,caseId,leadingDocument:leading,
       subject:str(selected.subject,1200),scope:str(selected.scope,2500),
       author:answer.author||null,reviewer:answer.reviewer||null,
       reviewerStatus:str(answer.reviewerStatus,80),
       evidenceSource:'KT126_VERIFIED_ORIGINAL_PLUS_V26_READER',
       sourceSha256:digest,expertApproved:false}}
  };
  const result=await nativeFetch(new Request(target+'/state',{
   method:'POST',redirect:'manual',headers:{Cookie:cookie,Origin:NATIVE,
    Referer:NATIVE+'/',Accept:'application/json','Content-Type':'application/json'},
   body:JSON.stringify({revision:snapshot.record.revision,state})
  }));
  if(result.status===409)fail('KT126_STAGE1_REVISION_CONFLICT');
  if([301,302,303,307,308,401,403].includes(result.status))
   fail('KT125_CASE_WRITE_DENIED');
  if(!result.ok)fail('KT126_STAGE1_SAVE_FAILED');
  const receipt=await txt(result,14000);
  if(receipt.record?.case_id!==caseId||
    !Number.isInteger(Number(receipt.record.revision)))
   fail('KT126_STAGE1_SAVE_RECEIPT_INVALID');
  return {caseId,internalNumber:receipt.record.internal_number,
   status:'stage1_completed',stage:2,leadingDocument:leading,
   subject:state.globals.KT134AutomaticStage1.subject,
   scope:state.globals.KT134AutomaticStage1.scope,
   reviewerStatus:answer.reviewerStatus,
   caseRevision:receipt.record.revision,
   registeredIn:'KT126_NATIVE_REGISTRY',
   expertApproved:false,additionalExpertConfirmation:false};
 };
}
