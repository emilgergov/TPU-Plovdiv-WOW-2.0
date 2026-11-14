/* KT83 VT01 / P1: neutral, case-bound handoff to the independent V11 verifier.
   This does not create legal citations, decide jurisdiction, or pick a procedure.
   An absent verifier produces a concrete request for evidence, never fake approval. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83V11Handoff=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const clean=x=>String(x??'').trim();
 const nextAction='Предложение: проверете в Нормативния архив относимите разпоредби, условията за приложимост и компетентността; приложете точните източници и доказателствената връзка към конкретната преписка. Ако липсват данни, подгответе конкретно искане за допълването им.';
 const fail=(code,reason)=>Object.freeze({ok:false,code,reason,nextAction});
 function assess(context,verifier){
  const c=context||{};
  if(!clean(c.caseId)||!Number.isInteger(c.generation)||!Number.isInteger(c.evidenceRevision))
   return fail('CASE_UNBOUND','Липсва идентичност или актуална доказателствена ревизия на преписката.');
  if(!clean(c.subject)||!clean(c.scope))
   return fail('SUBJECT_SCOPE_MISSING','Липсва потвърден предмет или обхват.');
  if(typeof verifier?.evaluateCase!=='function')
   return fail('V11_UNAVAILABLE','Няма включен независим проверяващ механизъм за Нормативния архив.');
  let candidate;
  try{candidate=verifier.evaluateCase(Object.freeze({
    caseId:c.caseId,generation:c.generation,evidenceRevision:c.evidenceRevision,
    subject:clean(c.subject),scope:clean(c.scope),
    spatialScenario:clean(c.spatialScenario),evidence:c.evidence||null
  }));}catch(_){return fail('V11_ERROR','Нормативната проверка не завърши успешно.');}
  if(!candidate||typeof candidate.then==='function')
   return fail('V11_PENDING','Нормативният резултат не е удостоверен синхронно; изисква се потвърден резултат.');
  if(candidate.caseId!==c.caseId||candidate.generation!==c.generation||
    candidate.evidenceRevision!==c.evidenceRevision)
   return fail('STALE_V11','Нормативната оценка принадлежи на друга преписка или ревизия.');
  if(candidate.archiveVersion!=='V11'||candidate.status!=='VERIFIED'||
     candidate.applicabilityVerified!==true||candidate.competenceVerified!==true)
   return fail('V11_UNVERIFIED','Не са доказани приложимите нормативни условия и компетентността.');
  if(!clean(candidate.reasonedAssessment)||!clean(candidate.proposedAction))
   return fail('NO_MOTIVATION','Няма мотивирана нормативна оценка и конкретно предложение.');
  if(!Array.isArray(candidate.provisions)||candidate.provisions.length===0||
      !candidate.provisions.every(p=>clean(p.documentId)&&clean(p.articleRef)&&
        clean(p.archiveSource)&&clean(p.applicabilityReason)))
   return fail('NO_V11_PROOFS','Липсват проверими архивни реквизити, разпоредби или мотиви за тяхната приложимост.');
  let provenance=false;
  try{provenance=typeof verifier?.verifyProvenance==='function' &&
    verifier.verifyProvenance(candidate,c)===true;}catch(_){provenance=false;}
  if(!provenance)
   return fail('PROVENANCE_UNVERIFIED','Локалният архив V11 не удостоверява произхода и неизменността на правните източници.');
  return Object.freeze({ok:true,code:'VERIFIED',caseId:c.caseId,generation:c.generation,
    evidenceRevision:c.evidenceRevision,verified:true,archiveVersion:'V11',
    competenceVerified:true,reasonedAssessment:clean(candidate.reasonedAssessment),
    motivatedProposal:clean(candidate.proposedAction),
    provisions:Object.freeze(candidate.provisions.map(p=>Object.freeze({
      documentId:clean(p.documentId),articleRef:clean(p.articleRef),
      archiveSource:clean(p.archiveSource),applicabilityReason:clean(p.applicabilityReason)
    })))});
 }
 return Object.freeze({assess,nextAction});
});
