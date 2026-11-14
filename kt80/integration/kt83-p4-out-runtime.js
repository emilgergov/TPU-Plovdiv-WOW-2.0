/* KT83 P4 isolated runtime: no untrusted or generic OUT fallback.
 * Original master V11 only; approved templates and specific renderers are
 * supplied by separate trusted institutional sources, not a new catalogue.
 */
(function(root){'use strict';
 const registry=root.KT83P4TemplateContract;
 const dispatcher=root.KT83P4Dispatcher;
 if(!registry?.create||!dispatcher?.create)return;
 const getCase=()=>{
  const s=root.KT80WorkflowState||{};
  return {caseId:s.caseCycleId||'',generation:s.generation,
   evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??null,
   confirmedSubject:s.subjectConfirmed?.text||''};
 };
 const verifiedLaw=()=>{
  const w=root.KT80WorkflowState||{};
  const evidence=root.KT83NormativeBridge?.getEvidence?.()||{};
  const route=root.KT83P1Binding?.route?.snapshot?.();
  if(!route?.valid||!['motivated_proposal','out_draft'].includes(route.phase))return null;
  const response=root.KT83V11Handoff?.assess?.({
   caseId:w.caseCycleId,generation:w.generation,
   evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??null,
   subject:w.subjectConfirmed?.text,scope:w.subjectConfirmed?.scope,
   spatialScenario:evidence.scenario,evidence
  },root.KT83NormativeArchiveV11);
  return response?.ok===true?response:null;
 };
 const digest=async bytes=>{
  if(!root.crypto?.subtle)throw Error('SHA-256 verification unavailable');
  const a=new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes));
  return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
 };
 const templates=registry.create({
  digest,
  verifyApproval:async(meta,bytes)=>{
   const provider=root.KT83ApprovedOutTemplates;
   return typeof provider?.verifyApproval==='function'&&
    (await provider.verifyApproval(meta,bytes))===true;
  }
 });
 const renderers=new Proxy({},{
  get(_,key){const provider=root.KT83ApprovedOutRenderers;
   const [outId,variant='DEFAULT']=String(key).split('::');
   return typeof provider?.getRenderer==='function'?provider.getRenderer(outId,variant):undefined;}
 });
 const service=dispatcher.create({templates,currentCase:getCase,
  renderers,legalReceipt:verifiedLaw});
 for(const event of ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'])
  root.document?.addEventListener?.(event,service.invalidate);
 for(const id of ['kt80SubjectText','kt80ScopeText'])
  root.document?.getElementById?.(id)?.addEventListener?.('input',service.invalidate);
 root.KT83P4Out=Object.freeze({
  register:input=>templates.register(input),
  prepare:input=>service.prepare(input),
  invalidate:service.invalidate,
  getStatus:()=>Object.freeze({...templates.status(),master:'V11',allowUniversalBlank:false})
 });
})(window);
