/* KT83 P3 — case-bound expert-evidence contract for the ONE locked V11 MASTER.
 * No law catalogue, no inferred premises and no automatic approval.
 * The expert UI (P5) submits reviewed source-backed conditions via submit().
 */
import {assertVerifiedReference} from './v11-trusted-source-registry.mjs';
const clean=x=>String(x??'').trim();
const canon=x=>JSON.stringify(x);
const same=(a,b)=>a?.caseId===b?.caseId&&a?.generation===b?.generation&&
  a?.evidenceRevision===b?.evidenceRevision&&clean(a?.subject)===clean(b?.subject)&&
  clean(a?.scope)===clean(b?.scope);
const deepCopy=x=>JSON.parse(JSON.stringify(x));
const freezeDeep=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freezeDeep);Object.freeze(x);
 }return x;
};
export function createCaseReviewStore(current){
 if(typeof current!=='function')throw new TypeError('Необходимо е текущо състояние на преписката.');
 let approved=null,signature='';
 function clear(){approved=null;signature='';}
 function valid(review,context){
  if(!same(review,context)||review.expertConfirmed!==true||
     !clean(review.confirmedCompetence)||!Array.isArray(review.competenceEvidence)||
     !review.competenceEvidence.length||!review.competenceEvidence.every(f=>
       clean(f.sourceId)&&clean(f.factId)&&clean(f.archiveOrDossierOrigin))||
     !Array.isArray(review.legalFacts)||!review.legalFacts.length||
     !review.legalFacts.every(f=>clean(f.factId)&&clean(f.sourceId)&&clean(f.sourceType)&&
      ['true','false','unknown','conflict'].includes(f.value))||
     !Array.isArray(review.rules)||!review.rules.length)return false;
  try{
   for(const rule of review.rules){
    if(!clean(rule.id)||!clean(rule.title)||!clean(rule.missingFactProposal)||
       !rule.condition||typeof rule.condition!=='object')return false;
    assertVerifiedReference(rule.legalBasis);
   }
  }catch(_){return false}
  return true;
 }
 function submit(raw){
  if(!raw||typeof raw!=='object')return {ok:false,reason:'Липсва експертна преценка.'};
  const context=current(),review=deepCopy(raw);
  if(!valid(review,context))return {ok:false,reason:'Липсват експертно удостоверени факти, компетентност или основания от MASTER V11.'};
  approved=freezeDeep(review);signature=canon(approved);
  return {ok:true,caseId:approved.caseId,evidenceRevision:approved.evidenceRevision};
 }
 function getCaseReview(context){
  if(!approved||!same(approved,context)||!same(approved,current()))return null;
  return approved;
 }
 function verifyCaseReview(review,context){
  return !!approved&&review===approved&&same(approved,context)&&same(approved,current())&&
    canon(approved)===signature&&valid(approved,context);
 }
 return Object.freeze({submit,clear,getCaseReview,verifyCaseReview});
}
export function connectCaseReviewToMaster(root=window){
 const current=()=>{
  const s=root.KT80WorkflowState||{};
  return {caseId:s.caseCycleId,generation:s.generation,
   evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??0,
   subject:s.subjectConfirmed?.text,scope:s.subjectConfirmed?.scope};
 };
 const provider=createCaseReviewStore(current);
 root.KT83V11CaseEvidenceProvider=provider;
 root.KT83NativeV11MasterBridge?.connect?.();
 const invalidate=()=>{provider.clear();root.KT83NativeV11MasterBridge?.connect?.();};
 root.document?.addEventListener?.('kt80:case-reset',invalidate);
 root.document?.addEventListener?.('kt80:case-change',invalidate);
 root.document?.addEventListener?.('kt82:evidence-invalidated',invalidate);
 root.document?.getElementById?.('kt80SubjectText')?.addEventListener?.('input',invalidate);
 root.document?.getElementById?.('kt80ScopeText')?.addEventListener?.('input',invalidate);
 return provider;
}
if(typeof window!=='undefined')connectCaseReviewToMaster(window);
