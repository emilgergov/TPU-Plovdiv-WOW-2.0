/* KT83 P3: The ONLY normative source is the existing, locked V11 MASTER.
   Adapter to the already accepted independent stage-4 and stage-5 engines.
   No second archive, no file upload, no route-catalog rule derivation. */
import {assessStage4,CANONICAL_ARCHIVE,ARCHIVE_SHA256} from './stage4-independent-legal-engine.mjs';
import {proposeStage5} from './stage5-independent-proposal.mjs';
import {assertVerifiedReference} from './v11-trusted-source-registry.mjs';

const t=x=>String(x??'').trim();
const equal=(a,b)=>a.caseId===b.caseId&&a.generation===b.generation&&a.evidenceRevision===b.evidenceRevision;
const json=x=>JSON.stringify(x);
export function createMasterV11Bridge(provider){
 function compute(context){
  if(!provider||typeof provider.getCaseReview!=='function'||
     typeof provider.verifyCaseReview!=='function')return null;
  if(!t(context?.caseId)||!Number.isInteger(context.generation)||
     !Number.isInteger(context.evidenceRevision)||!t(context.subject)||!t(context.scope))return null;
  let r;
  try{r=provider.getCaseReview(context)}catch(_){return null}
  if(!r||!equal(r,context)||t(r.subject)!==t(context.subject)||
     t(r.scope)!==t(context.scope)||r.expertConfirmed!==true||
     !Array.isArray(r.legalFacts)||!Array.isArray(r.rules)||!r.rules.length||
     typeof r.confirmedCompetence!=='string'||!r.confirmedCompetence.trim()||
     !Array.isArray(r.competenceEvidence)||!r.competenceEvidence.length)return null;
  try{if(provider.verifyCaseReview(r,context)!==true)return null}catch(_){return null}
  try{
   const stage4=assessStage4({
    confirmedSubject:context.subject,scopeConfirmed:true,
    evidence:r.legalFacts,rules:r.rules
   });
   // A juridical conclusion is possible only with grounded, supported V11 rules.
   const stage5=proposeStage5({stage4,confirmedCompetence:r.confirmedCompetence,
    competenceEvidence:r.competenceEvidence});
   if(stage4.sourceArchive!==CANONICAL_ARCHIVE||
      !stage4.readyForStage5Draft||!stage5.readyForFormalDraft||
      stage5.administrativeActIssued!==false||stage5.requiresExpertAuthorization!==true)return null;
   const supported=stage4.legalFindings.filter(f=>f.state==='supported');
   if(!supported.length)return null;
   const provisions=supported.map(f=>{
    const record=assertVerifiedReference(f.basis);
    return Object.freeze({documentId:record.id,articleRef:record.article,
     archiveSource:record.archivePath,applicabilityReason:f.proposedAction,
     articleSha256:record.articleSha256,documentSha256:record.documentSha256,
     archiveSha256:ARCHIVE_SHA256});
   });
   if(!provisions.every(p=>t(p.documentId)&&t(p.articleRef)&&
       t(p.archiveSource)&&t(p.applicabilityReason)))return null;
   return {review:r,stage4,stage5,candidate:Object.freeze({
    caseId:context.caseId,generation:context.generation,evidenceRevision:context.evidenceRevision,
    archiveVersion:'V11',status:'VERIFIED',
    applicabilityVerified:true,competenceVerified:true,
    reasonedAssessment:stage5.independentText,
    proposedAction:stage5.independentText,
    provisions:Object.freeze(provisions)
   })};
  }catch(_){return null}
 }
 function evaluateCase(context){return compute(context)?.candidate||null;}
 function verifyProvenance(candidate,context){
  const fresh=compute(context);
  if(!fresh||!candidate||!equal(candidate,context))return false;
  return json(candidate)===json(fresh.candidate);
 }
 return Object.freeze({archive:CANONICAL_ARCHIVE,archiveSha256:ARCHIVE_SHA256,
  evaluateCase,verifyProvenance,available:!!provider&&
   typeof provider.getCaseReview==='function'&&typeof provider.verifyCaseReview==='function'});
}
// Explicit provider contract is case-specific. It never selects a procedure by
// GIS coordinates, dossier type or the Classic A/B document template.
export function connectMasterV11(root=window){
 const bridge=createMasterV11Bridge(root.KT83V11CaseEvidenceProvider);
 root.KT83NormativeArchiveV11=bridge.available?bridge:null;
 return bridge.available;
}
if(typeof window!=='undefined'){
 window.KT83NativeV11MasterBridge=Object.freeze({connect:()=>connectMasterV11(window)});
 connectMasterV11(window);
}
