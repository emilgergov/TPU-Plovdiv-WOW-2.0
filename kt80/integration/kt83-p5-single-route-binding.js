/* KT83 P5 — compact single expert route in the EXISTING status line.
 * Read-only. No duplicate wizard, no automatic stage clicks or legal choice. */
(function(root){'use strict';
 const $=id=>root.document.getElementById(id);
 function init(){
  const projector=root.KT83P5SingleRoute,existing=$('kt83P1RouteStatus');
  if(!projector?.next||!existing||!root.KT83P1Binding)return;
  const note=root.document.createElement('span');
  note.id='kt83P5NextAction';note.setAttribute('role','status');
  note.setAttribute('aria-live','polite');
  note.style.cssText='display:block;flex-basis:100%;font:400 13px/1.45 "Segoe UI",Arial,sans-serif;color:#284d38';
  existing.append(note);
  // The earlier heuristic Stage 5 adviser is retained in code for
  // regression, but hidden from the single professional expert view:
  // it does not constitute an independently verified V11 decision.
  if(!$('kt83P5SingleRouteStyle')){
   const style=root.document.createElement('style');
   style.id='kt83P5SingleRouteStyle';
   style.textContent='#kt82RouteAdvicePanel{display:none!important}'+
     '#kt83P5NextAction{max-width:100%;white-space:normal}';
   root.document.head.append(style);
  }
  let last='';
  function refresh(){
   const state=root.KT80WorkflowState||{};
   const identity=root.KT83P1Binding.receipt();
   const route=root.KT83P1Binding.route.snapshot();
   const stage=state.step;
   let pdf=null;
   if(stage===3&&root.KT83P2Automatic?.current&&root.KT83P2SpatialGate?.pdfReceiptMatches){
    const proof=root.KT83P2Automatic.current();
    const receipt=root.KT83NormativeBridge?.pdfStatus?.();
    const passed=root.KT83P2SpatialGate.pdfReceiptMatches(proof,receipt);
    pdf={verified:passed,pdf1Verified:passed,caseId:identity.caseId,
      generation:identity.generation,evidenceRevision:identity.evidenceRevision};
   }
   // The legal result must come from the single current V11 handoff,
   // never from the old route catalog, GIS intersection or a text checkbox.
   const law=stage>=4&&route.valid&&
     ['normative_v11','motivated_proposal','out_draft'].includes(route.phase)
      ?root.KT83RouteAccess?.currentV11?.():null;
   const view=projector.next({
    step:stage,...identity,route,
    confirmedSubject:state.subjectConfirmed?.expertConfirmed===true,
    confirmedScope:state.subjectConfirmed?.scopeConfirmed===true,
    spatialGate:state.normativeGate,spatialReceipt:pdf,
    verifiedLaw:law,hasDraft:false
   });
   if(view.text!==last){
    note.textContent=view.text;note.dataset.p5Code=view.code;
    last=view.text;
   }
   return view;
  }
  const update=()=>root.queueMicrotask?root.queueMicrotask(refresh):Promise.resolve().then(refresh);
  for(const event of ['kt80:stage-open','kt80:case-change','kt80:case-reset',
    'kt82:evidence-invalidated','kt82:pdf1-completed','kt80:procedure-confirmed',
    'kt83:gis-intersections-checked']){
    root.document.addEventListener(event,update);
  }
  const controls=['kt80ProcessFile','kt80ToSubject','kt80ToParcels','kt80ToLaw',
    'kt80ToProposal','kt80SubjectConfirmation','kt80ScopeConfirmation',
    'kt80ParcelsConfirmation','kt80LawConfirmed'];
  for(const id of controls)$(id)?.addEventListener('click',update);
  root.KT83P5Integration=Object.freeze({refresh,getCurrent:refresh});
  refresh();
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
