/* WOW KT83 / P3 — independent, explicit-facts V11 normative verifier.
 * No legal rules, documents, jurisdiction or procedures are invented here.
 * Operates only on source records from a separately trusted LOCAL archive and
 * case-specific expert assertions; does not interpret GIS overlap as legal proof.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83P3NormativeVerifierFactory=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const t=x=>String(x??'').trim();
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const exact=(a,b)=>a.caseId===b.caseId&&a.generation===b.generation&&a.evidenceRevision===b.evidenceRevision;
 const distinct=x=>new Set(x).size===x.length;
 function create({archive,review}={}){
  // The archive provider owns provenance. A case draft alone cannot create it.
  const available=archive?.version==='V11'&&typeof archive?.getDocument==='function'&&
    typeof archive?.verifyDocument==='function'&&typeof review?.getCaseReview==='function';
  function evaluateCase(context){
   if(!available)return null;
   const c=context||{};
   if(!t(c.caseId)||!Number.isInteger(c.generation)||!Number.isInteger(c.evidenceRevision)||
      !t(c.subject)||!t(c.scope))return null;
   let r;
   try{r=review.getCaseReview(c);}catch(_){return null}
   if(!r||!exact(r,c)||r.expertConfirmed!==true||r.applicabilityVerified!==true||
      r.competenceVerified!==true||r.legalQuestionReviewed!==true||
      !t(r.reasonedAssessment)||!t(r.proposedAction)||
      !Array.isArray(r.provisions)||!r.provisions.length||
      !distinct(r.provisions.map(p=>t(p.documentId)+'|'+t(p.articleRef))))return null;
   const resolved=[];
   for(const item of r.provisions){
    if(!t(item?.documentId)||!t(item.articleRef)||!t(item.applicabilityReason)||
       !t(item.sourceFingerprint))return null;
    let doc;
    try{doc=archive.getDocument(item.documentId)}catch(_){return null}
    if(!doc||doc.archiveVersion!=='V11'||doc.id!==item.documentId||
       !t(doc.sourceUri)||!t(doc.fingerprint)||doc.fingerprint!==item.sourceFingerprint||
       doc.officialSourceVerified!==true||doc.currentValidityChecked!==true||
       !Array.isArray(doc.articles)||!doc.articles.includes(item.articleRef))return null;
    // A verified archive record is necessary, not sufficient: verifyDocument
    // must independently attest the stored source and fingerprint.
    try{if(archive.verifyDocument(doc)!==true)return null}catch(_){return null}
    resolved.push(Object.freeze({documentId:doc.id,articleRef:item.articleRef,
      archiveSource:doc.sourceUri,applicabilityReason:item.applicabilityReason,
      sourceFingerprint:doc.fingerprint}));
   }
   return Object.freeze({caseId:c.caseId,generation:c.generation,evidenceRevision:c.evidenceRevision,
    archiveVersion:'V11',status:'VERIFIED',applicabilityVerified:true,competenceVerified:true,
    reasonedAssessment:r.reasonedAssessment,proposedAction:r.proposedAction,
    provisions:Object.freeze(resolved)});
  }
  function verifyProvenance(candidate,context){
   if(!available||!candidate||!exact(candidate,context||{})||
      candidate.archiveVersion!=='V11'||candidate.status!=='VERIFIED'||!Array.isArray(candidate.provisions)||
      !candidate.provisions.length)return false;
   try{
    return candidate.provisions.every(p=>{
     const d=archive.getDocument(p.documentId);
     return d?.archiveVersion==='V11'&&d.id===p.documentId&&
      d.fingerprint===p.sourceFingerprint&&d.sourceUri===p.archiveSource&&
      d.officialSourceVerified===true&&d.currentValidityChecked===true&&
      d.articles?.includes(p.articleRef)&&archive.verifyDocument(d)===true;
    });
   }catch(_){return false}
  }
  return Object.freeze({evaluateCase,verifyProvenance,available});
 }
 return Object.freeze({create});
});
