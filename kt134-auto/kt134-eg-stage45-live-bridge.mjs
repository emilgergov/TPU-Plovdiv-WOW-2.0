/**
 * KT134 real EG endpoint bridge for one protected automatic case.
 * Uses EXISTING /stage4-proposal and /stage5-document endpoints in the
 * isolated EG Worker branch. KT125 server supplies the credential and
 * the complete preassembled case/source payload, never a public page.
 */
import {buildKt134CompleteStage4Request} from './kt134-complete-dossier-stage4.mjs';
import {composeKt134CaseAwareStage5Draft} from './kt134-case-aware-word-body.mjs';
import {limitKt134Stage4Payload} from './kt134-stage4-transport-budget.mjs';
const invalid=(code)=>{const e=new Error(code);e.code=code;throw e;};
const value=x=>typeof x==='string'?x.trim():'';
const chosen=text=>value(text).match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\s*[—–-]?\s*([^\n]*)/iu);
export function createKt134EgStage45Bridge({workerBase,accessToken,fetchImpl,
  stage4RequestFactory}={}){
 if(!/^https:\/\//u.test(workerBase||'')||!value(accessToken)||
    typeof fetchImpl!=='function'||(stage4RequestFactory!==undefined&&typeof stage4RequestFactory!=='function'))
   invalid('EG_BRIDGE_NOT_CONFIGURED');
 const base=workerBase.replace(/\/$/u,'');
 let active=null;
 const post=async(path,body)=>{
   const response=await fetchImpl(base+path,{
     method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
     body:JSON.stringify(body)
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok){
     // Report the upstream failure class without exposing private dossier text,
     // authorization headers, or the provider's error message to the browser.
     const stage=path==='/stage4-proposal'?'STAGE4':'STAGE5';
     const status=Number(response.status);
     const cls=status===413?'PAYLOAD_TOO_LARGE':
       status===400?'INVALID_CONTRACT':
       status===401||status===403?'CREDENTIAL_REJECTED':
       status===429?'RATE_LIMITED':
       status===503?'SERVICE_UNAVAILABLE':
       status===504?'UPSTREAM_TIMEOUT':
       status>=500?'UPSTREAM_FAILURE':'REJECTED';
     invalid('EG_'+stage+'_'+cls);
   }
   return data;
 };
 return Object.freeze({
  async invokeAuthor({caseId,revision,subject,evidence}){
    const stage4=stage4RequestFactory
      ?await stage4RequestFactory({caseId,revision,subject,evidence})
      :buildKt134CompleteStage4Request({caseId,revision,bundle:evidence});
    if(stage4?.task!=='draft_normative_proposal'||stage4?.caseId!==caseId||
       !value(stage4.subject)||!value(stage4.scope)||!Array.isArray(stage4.parcelIds)||
       !value(stage4.requestId))invalid('EG_STAGE4_PAYLOAD_MISSING');
    const transport=limitKt134Stage4Payload(stage4);
    // Only this truthful, bounded evidence set was seen by EG Author/Reviewer.
    // Use it also for Stage5 provenance; never imply dropped text was examined.
    const response=await post('/stage4-proposal',transport);
    if(response.caseId!==caseId||String(response.evidenceRevision)!==String(stage4.evidenceRevision)||
       !value(response.authorDraft))invalid('EG_STAGE4_RESULT_MISMATCH');
    const authorMatch=chosen(response.authorDraft);
    const reviewedMatch=chosen(response.draft);
    if(!authorMatch&&!reviewedMatch)invalid('EG_AUTHOR_NO_ROUTE');
    const panelId=Number(authorMatch?.[1]||reviewedMatch?.[1]);
    const documentTitle=value(authorMatch?.[2]||reviewedMatch?.[2])||'Проект на административен документ';
    active={caseId,revision,stage4:transport,response};
    return {caseId,revision,status:'draft',expertApproved:false,panelId,
       reasoning:response.authorDraft,content:response.authorDraft,documentTitle};
  },
  async invokeReviewer({caseId,revision,authorProposal}){
    const x=active;
    if(x?.caseId!==caseId||x.revision!==revision)invalid('EG_REVIEW_CASE_MISMATCH');
    const d=x.response.reviewerIntermediate;
    if(!d||!value(x.response.reviewerIntermediateProof)||d.intermediateConfirmed!==true)
      invalid('EG_REVIEWER_NOT_CONFIRMED');
    if(d.reviewedText!==x.response.draft||d.caseId!==caseId||
       Number(d.selectedPanelId)<1||Number(d.selectedPanelId)>22)
       invalid('EG_REVIEWER_WRONG_CASE_OR_ROUTE');
    const match=chosen(d.reviewedText);
    if(!match||Number(match[1])!==Number(d.selectedPanelId))
       invalid('EG_REVIEWER_ROUTE_MISMATCH');
    const raw=x.response.normativeAudit?.reviewVerdict;
    const verdict=raw==='pass'?'agree':raw==='revise'?'qualified':'disagree';
    return {caseId,revision,verdict,reasoning:d.reviewedText,
      suggestions:Array.isArray(x.response.normativeAudit?.findings)?
        x.response.normativeAudit.findings.filter(y=>typeof y==='string'):[],
      intermediateDecision:{
        confirmed:true,panelId:Number(d.selectedPanelId),
        reasoning:d.reviewedText,
        ...(Number(d.selectedPanelId)!==authorProposal.panelId?
          {correctedProposal:d.reviewedText}:{})
      }
    };
  },
  async generateStage5Draft({caseId,revision,reviewerDecision}){
    const x=active;
    if(x?.caseId!==caseId||x.revision!==revision||
       Number(x.response.reviewerIntermediate?.selectedPanelId)!==reviewerDecision.panelId)
       invalid('EG_STAGE5_REVIEW_HANDOFF_MISMATCH');
    const d=x.response.reviewerIntermediate;
    const match=chosen(d.reviewedText);
    if(!match)invalid('EG_STAGE5_PANEL_NOT_FOUND');
    const stage4=x.stage4;
    const stage5Request={
      task:'draft_stage5_document',requestId:stage4.requestId,
      caseId,subject:stage4.subject,scope:stage4.scope,
      parcelIds:stage4.parcelIds,evidenceRevision:stage4.evidenceRevision,
      stage4Version:Number.isInteger(stage4.stage4Version)?stage4.stage4Version:1,
      selectedPanelLine:match[0].trim(),
      selectedPanelId:reviewerDecision.panelId,
      documentTitle:value(match[2]),
      incomingReference:value(stage4.incomingReference),
      confirmedStage4Text:d.reviewedText,
      reviewerIntermediate:d,
      reviewerIntermediateProof:x.response.reviewerIntermediateProof,
      automaticReviewerIntermediate:true,expertConfirmed:false,
      projectOnly:true,qualificationRecord:x.response.qualificationRecord,
      qualificationProof:x.response.qualificationProof,
      qualificationGate:x.response.qualificationGate,
      caseContext:{
       parcels:stage4.completeCaseEvidence?.parcels||[],
       gis:stage4.completeCaseEvidence?.gis||null,
       pdf1Ref:stage4.completeCaseEvidence?.pdf1Ref||null,
       pdf2Ref:stage4.completeCaseEvidence?.pdf2Ref||null,
       documents:(stage4.completeCaseEvidence?.sourceTexts||[]).slice(0,20).map(x=>({source:x.source,text:String(x.text||'').slice(0,2800)})),
       confirmedFacts:(stage4.evidence||[]).filter(x=>x.status==='established').slice(0,40)
      }
    };
    if(!stage5Request.documentTitle)invalid('EG_STAGE5_NO_DOCUMENT_TITLE');
    const result=await post('/stage5-document',stage5Request);
    if(result.caseId!==caseId||!value(result.draft)||result.projectOnly!==true||
       result.documentIssued!==false||result.automaticReviewerIntermediate!==true)
       invalid('EG_STAGE5_RESULT_MISMATCH');
    return {caseId,revision,status:'draft',expertApproved:false,
       panelId:reviewerDecision.panelId,
       documentTitle:result.reviewerProposalOnly===true?result.documentTitle:stage5Request.documentTitle,
       content:stage4.completeCaseEvidence?.evidenceProvenance==='CASE_SPECIFIC_NO_SYNTHETIC_SOURCE'
        ?composeKt134CaseAwareStage5Draft({stage5Text:result.draft,stage4Request:stage4})
        :result.draft};
  }
 });
}
