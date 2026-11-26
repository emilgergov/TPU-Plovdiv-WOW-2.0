/**
 * KT134 automatic draft coordinator. ISOLATED LIBRARY ONLY; no public route.
 * All adapters are supplied by a future authenticated KT125 server host.
 * Never treats an AI output as an administrative decision.
 */
import {prepareProtectedAutomaticCase,assertSameCaseRevision,assertDraftNotApproval} from './kt134-protected-case-gate.mjs';
const error=(code)=>{const e=new Error(code);e.code=code;throw e;};
const has=(x)=>typeof x==='string'&&x.trim().length>0;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function requireAction(adapters,key){if(typeof adapters?.[key]!=='function')error('MISSING_PROTECTED_ADAPTER_'+key);}
function requireProposal(output,code) {
 if(!output||typeof output!=='object'||!Number.isInteger(output.panelId)||output.panelId<1||output.panelId>22||
    !has(output.reasoning)||!has(output.content)||!has(output.documentTitle)||
    output.status!=='draft'||output.expertApproved!==false||own(output,'finalDecision'))error(code);
 return output;
}
function receiptRefsMatch(preflight,ids) {
 const expected=preflight.evidence.map(x=>x.type+':'+x.digest).sort();
 if(!Array.isArray(ids)||ids.length!==expected.length||
   ids.some(x=>typeof x!=='string')||JSON.stringify([...ids].sort())!==JSON.stringify(expected))
   error('EVIDENCE_MANIFEST_MISMATCH');
}
export function createProtectedAutomaticCoordinator(adapters) {
 for(const name of ['loadProtectedContext','loadEvidenceBundle','invokeAuthor','invokeReviewer','generateStage5Draft','buildDraftWord'])
   requireAction(adapters,name);
 return Object.freeze({
  async prepareDraft({authenticatedSession,caseId}={}) {
   if(!authenticatedSession||!has(caseId))error('MISSING_KT125_CONTEXT');
   // Server-only adapter is responsible for session validation, policy and ownership.
   const ctx=await adapters.loadProtectedContext({authenticatedSession,caseId});
   if(ctx?.caseRecord?.id!==caseId)error('CASE_CONTEXT_MISMATCH');
   const preflight=prepareProtectedAutomaticCase(ctx);
   const bundle=await adapters.loadEvidenceBundle({preflight,authenticatedSession});
   if(bundle?.caseId!==caseId||bundle?.revision!==preflight.case.revision||
      !bundle?.serverVerified||!bundle?.caseIsolated)error('INVALID_CASE_EVIDENCE_BUNDLE');
   receiptRefsMatch(preflight,bundle.receiptRefs);
   // Only verified server-side milestones are reported; no timer-based %
   // and no premature completion or fabricated confirmation.
   adapters.onProgress?.({stage:2,percent:40,label:'Предметът и обхватът са проверени'});
   adapters.onProgress?.({stage:3,percent:60,label:'Пространствените доказателства са обработени'});
   // Only evidence in this isolated bundle is supplied to the author and reviewer.
   const author=requireProposal(await adapters.invokeAuthor({
     caseId,revision:preflight.case.revision,subject:preflight.subject,
     evidence:bundle,mode:'draft_only'
   }),'INVALID_AUTHOR_PROPOSAL');
   if(author.caseId!==caseId||author.revision!==preflight.case.revision)
      error('AUTHOR_CASE_MISMATCH');
   // KT134: reviewer is the intermediate expert for the automatic path.
   // Its decision authorizes Stage 5 preparation, NOT a final administrative act.
   // The author proposal is retained independently for comparison.
   let review,intermediate;
   try {
     const value=await adapters.invokeReviewer({
       caseId,revision:preflight.case.revision,subject:preflight.subject,
       evidence:bundle,authorProposal:author,mode:'intermediate_confirmation'
     });
     if(value?.caseId!==caseId||value?.revision!==preflight.case.revision||
       !has(value.reasoning)||!['agree','disagree','qualified'].includes(value.verdict))
       throw new Error('REVIEWER_INVALID');
     const decision=value.intermediateDecision;
     if(decision?.confirmed!==true||!Number.isInteger(decision.panelId)||
       decision.panelId<1||decision.panelId>22||!has(decision.reasoning))
       throw new Error('REVIEWER_INTERMEDIATE_INCOMPLETE');
     if(decision.panelId!==author.panelId&&
       (!has(decision.correctedProposal)||!has(decision.reasoning)))
       throw new Error('REVIEWER_CORRECTION_REQUIRED');
     intermediate=Object.freeze({
       actor:'EG_REVIEWER',confirmed:true,caseId,revision:preflight.case.revision,
       panelId:decision.panelId,reasoning:decision.reasoning,
       sourceText:has(decision.correctedProposal)?decision.correctedProposal:author.content,
       finalExpertApproval:false
     });
     review=Object.freeze({status:'confirmed_intermediate',verdict:value.verdict,
       reasoning:value.reasoning,
       suggestions:Array.isArray(value.suggestions)?value.suggestions.filter(has):[]});
   } catch(e) {
     // Never silently impersonate the reviewer or request an intermediate user click.
     // Keep the author proposal available, with explicit unfinished status.
     if(e?.message==='REVIEWER_INTERMEDIATE_INCOMPLETE'||
        e?.message==='REVIEWER_CORRECTION_REQUIRED')
       error(e.message);
     return Object.freeze({
       status:'intermediate_review_unavailable',caseId,
       author:Object.freeze({panelId:author.panelId,reasoning:author.reasoning,
         content:author.content,documentTitle:author.documentTitle}),
       reviewer:Object.freeze({status:'unavailable',reason:'Рецензентът не приключи междинната преценка.'}),
       docx:null,expertApproved:false,requiresExpertConfirmation:true
     });
   }
   adapters.onProgress?.({stage:4,percent:80,label:'EG Авторът и рецензентът приключиха междинната преценка'});
   // Automatic Stage 5 text is generated AFTER reviewer intermediate confirmation.
   // Existing manually approved KT133 workflow remains unchanged.
   const stage5=await adapters.generateStage5Draft({
     caseId,revision:preflight.case.revision,subject:preflight.subject,
     registryNumber:preflight.case.registryNumber,evidence:bundle,
     authorProposal:author,reviewerDecision:intermediate,mode:'automatic_draft_only'
   });
   if(stage5?.caseId!==caseId||stage5?.revision!==preflight.case.revision||
      stage5?.status!=='draft'||stage5?.expertApproved!==false||
      stage5?.panelId!==intermediate.panelId||
      !has(stage5.content)||!has(stage5.documentTitle)||
      own(stage5,'finalDecision'))
      error('INVALID_STAGE5_AUTOMATIC_DRAFT');
   // Optimistic revision control and live authorization immediately before Word.
   const fresh=await adapters.loadProtectedContext({authenticatedSession,caseId});
   if(fresh?.caseRecord?.id!==caseId)error('CASE_CONTEXT_MISMATCH');
   prepareProtectedAutomaticCase(fresh);
   assertSameCaseRevision(preflight,fresh.caseRecord);
   // Version equality alone does not prove a stable snapshot: some archives
   // and case metadata may change without incrementing the dossier revision.
   // Reject the draft unless the renewed trusted server manifest matches.
   const currentEvidence=[
     fresh.evidence?.dossier,
     fresh.evidence?.normativeMaster,
     fresh.evidence?.piMaster,
     ...(fresh.caseRecord.gisMode==='required'?[fresh.evidence?.gisPdf1]:[])
   ];
   const baseline=preflight.evidence.map(x=>x.type+':'+x.sourceId+':'+x.digest).sort();
   const latest=currentEvidence.map(x=>x?.type+':'+x?.sourceId+':'+String(x?.digest||'').toLowerCase()).sort();
   if(JSON.stringify(baseline)!==JSON.stringify(latest)||
      fresh.caseRecord.subject!==preflight.subject||
      fresh.caseRecord.registryNumber!==preflight.case.registryNumber||
      fresh.principal.userId!==preflight.principalId||
      fresh.caseRecord.gisMode!==preflight.gis.mode)
     error('CASE_SNAPSHOT_CHANGED');
   const draft=assertDraftNotApproval({
     status:'draft',expertApproved:false,caseId,revision:preflight.case.revision,
     panelId:stage5.panelId,documentTitle:stage5.documentTitle,content:stage5.content
   });
   const word=await adapters.buildDraftWord(draft);
   if(!(word instanceof Uint8Array)||word.length<100)error('INVALID_DRAFT_WORD');
   adapters.onProgress?.({stage:5,percent:100,label:'Документът Word е генериран и проверен'});
   return Object.freeze({status:'draft_ready',caseId,revision:preflight.case.revision,
     registryNumber:preflight.case.registryNumber,subject:preflight.subject,
     author:Object.freeze({panelId:author.panelId,reasoning:author.reasoning,
       content:author.content,documentTitle:author.documentTitle}),
     reviewer:review,intermediateDecision:intermediate,
     stage5:Object.freeze({panelId:stage5.panelId,documentTitle:stage5.documentTitle,
       content:stage5.content}),docx:word,expertApproved:false,
     requiresExpertConfirmation:true,finalDecision:null});
  }
 });
}
