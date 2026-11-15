/* KT83 P2 — isolated automated PDF1 trigger. It never edits legal findings. */
(function(root){'use strict';
 const $=id=>document.getElementById(id);
 function boot(){
  if(!root.KT83P2SpatialGate?.check)return;
  let serial=0,issued=null;
  const current=()=>{
   const w=root.KT80WorkflowState||{},parsed=root.V26ParcelEditor?.normalize?.($('kt80ParcelInput')?.value||'');
   return {caseId:w.caseCycleId||'',generation:w.generation,
    evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??null,
    gisDecision:w.normativeGate?.decision,ids:parsed?.ids||[],invalidIds:parsed?.invalid||[],uncertainIds:parsed?.uncertain||[],live:root.KT80FreeGISResults,
    pi:root.KT80PIMaster?.getResult?.(),zones:root.KT80FreeGIS?.getMap?.()?.zones||[]};
  };
  const status=message=>{
   const e=$('kt83P1RouteText');
   if(e&&message)e.textContent=message;
  };
  const active=()=>root.KT80WorkflowState?.step===3&&root.KT80WorkflowState?.normativeGate?.expertConfirmed===true&&
    root.KT80WorkflowState.normativeGate.decision==='REQUIRED';
  function begin(){
   const ticket=++serial;
   if(!active())return;
   let attempts=0;
   const poll=()=>{
    if(ticket!==serial||!active())return;
    const x=current(),check=root.KT83P2SpatialGate.check(x);
    if(check.ok){
     if(issued===check.key)return;
     if(typeof root.KT80PDF1Bridge?.makePDF!=='function'){
      status('Няма достъпен PDF1 генератор. Предложение: проверете зареждането на приетия модул.');
      return;
     }
     issued=check.key;
     status('ГИС, ПИ MASTER и пресичанията са проверени. Подготвям PDF1 за текущата преписка.');
     // A STARTED operation is not a completed PDF1. On failure, release only
     // this attempt's key; a newer case/revision must never be overwritten.
     const releaseFailed=()=>{
      if(ticket!==serial||issued!==check.key)return;
      issued=null;
      status('PDF1 не е изготвен. Предложение: проверете пространствените данни и повторете генерирането.');
     };
     // The original generator also re-verifies geometry/intersections and PDF content.
     try{Promise.resolve(root.KT80PDF1Bridge.makePDF()).catch(releaseFailed)}
     catch(_){releaseFailed()}
     return;
    }
    if(++attempts<60&&['GIS_MISMATCH','GEOMETRY_UNVERIFIED','INTERSECTIONS_UNVERIFIED','PI_MASTER_INCOMPLETE','ZONE_BOUNDARIES_INCOMPLETE'].includes(check.code)){
     root.setTimeout(poll,500);return;
    }
    status(check.message+' Предложение: уточнете доказателствата, преди съставяне на PDF1.');
   };
   poll();
  }
  document.addEventListener('kt83:gis-intersections-checked',event=>{
   const e=event.detail||{},w=root.KT80WorkflowState||{};
   if(e.caseId!==w.caseCycleId||e.generation!==w.generation||
      e.evidenceRevision!==(root.KT82EvidenceInvalidation?.getRevision?.()??null)||
      e.source!==root.KT80FreeGISResults)return;
   begin();
  });
  // Manual PDF1 completion is also authoritative; never auto-download a second copy.
  document.addEventListener('kt82:pdf1-completed',e=>{
   const x=current();
   if(root.KT83P2SpatialGate.pdfReceiptMatches(x,e.detail)){
    issued=root.KT83P2SpatialGate.check(x).key;
    serial++;
    status('PDF1 е изготвен за текущата преписка. Пространствените доказателства са готови за преглед.');
   }
  });
  document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===3)begin()});
  const reset=()=>{serial++;issued=null};
  document.addEventListener('kt82:evidence-invalidated',reset);
  document.addEventListener('kt80:case-reset',reset);
  document.addEventListener('kt80:case-change',reset);
  root.KT83P2Automatic=Object.freeze({current,check:()=>root.KT83P2SpatialGate.check(current()),begin});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(window);
