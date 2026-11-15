/* KT83 P5 — documentary case provenance for OS Art 6a competence.
 * Uses ONLY files already read in the current local dossier, plus locked V11.
 * Never uploads originals, creates a new normative corpus or infers missing facts.
 */
import {auditNaturaOsCompetence} from './kt83-p5-competence-audit.mjs';
const clean=x=>String(x??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
const current=()=>{
 const s=window.KT80WorkflowState||{};
 return {caseId:s.caseCycleId,generation:s.generation,
  evidenceRevision:window.KT82EvidenceInvalidation?.getRevision?.()??null,
  subject:s.subjectConfirmed?.text,scope:s.subjectConfirmed?.scope};
};
const same=(a,b)=>a?.caseId===b?.caseId&&a?.generation===b?.generation&&
 a?.evidenceRevision===b?.evidenceRevision&&a?.subject===b?.subject&&a?.scope===b?.scope;
function verifyPageExcerpt(f,ctx){
 if(!same(ctx,current()))return false;
 const page=String(f.sourceLocation||'').match(/(?:стр(?:аница)?\.?|page)\s*(\d{1,4})/iu);
 const quote=clean(f.sourceQuote);
 if(!page||quote.length<15||!String(f.sourceId||'').trim())return false;
 const entries=window.KT80WorkflowState?.intake?.page_text_index;
 if(!Array.isArray(entries))return false;
 return entries.some(p=>p.file===f.sourceId&&Number(p.page)===Number(page[1])&&
  clean(p.text).includes(quote));
}
const api=Object.freeze({
 verify({context,competence,archived,packet}={}){
  if(!same(context,current()))
   return Object.freeze({verified:false,code:'CASE_CHANGED',
    nextAction:'Предложение: проверете текущата преписка и ревизия.'});
  const records=window.KT80DossierAudit?.records;
  const result=auditNaturaOsCompetence({
   context,competence,archived,packet,caseDocuments:records,
   verifySource:verifyPageExcerpt
  });
  if(!result.verified)return result;
  if(!same(context,current()))return Object.freeze({verified:false,code:'CASE_CHANGED'});
  return result;
 }
});
window.KT83IndependentCompetenceAudit=api;
