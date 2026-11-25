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
 for(const name of ['loadProtectedContext','loadEvidenceBundle','invokeAuthor','invokeReviewer','buildDraftWord'])
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
   // Only evidence in this isolated bundle is supplied to the author and reviewer.
   const author=requireProposal(await adapters.invokeAuthor({
     caseId,revision:preflight.case.revision,subject:preflight.subject,
     evidence:bundle,mode:'draft_only'
   }),'INVALID_AUTHOR_PROPOSAL');
   if(author.caseId!==caseId||author.revision!==preflight.case.revision)
      error('AUTHOR_CASE_MISMATCH');
   // Reviewer's opinion is recorded, not used to silently rewrite the author.
   let review;
   try {
     const value=await adapters.invokeReviewer({
       caseId,revision:preflight.case.revision,subject:preflight.subject,
       evidence:bundle,authorProposal:author,mode:'advisory_only'
     });
     if(value?.caseId!==caseId||value?.revision!==preflight.case.revision||
        !has(value.reasoning)||!['agree','disagree','qualified'].includes(value.verdict))
          throw new Error('REVIEWER_INVALID');
     review=Object.freeze({status:'available',verdict:value.verdict,reasoning:value.reasoning,
       suggestions:Array.isArray(value.suggestions)?value.suggestions.filter(has):[]});
   } catch {
     review=Object.freeze({status:'unavailable',verdict:'not_checked',
       reasoning:'Няма проверено становище на рецензента.',suggestions:[]});
   }
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
     panelId:author.panelId,documentTitle:author.documentTitle,content:author.content
   });
   const word=await adapters.buildDraftWord(draft);
   if(!(word instanceof Uint8Array)||word.length<100)error('INVALID_DRAFT_WORD');
   return Object.freeze({status:'draft_ready',caseId,revision:preflight.case.revision,
     registryNumber:preflight.case.registryNumber,subject:preflight.subject,
     author:Object.freeze({panelId:author.panelId,reasoning:author.reasoning,
       content:author.content,documentTitle:author.documentTitle}),
     reviewer:review,docx:word,expertApproved:false,
     requiresExpertConfirmation:true,finalDecision:null});
  }
 });
}
