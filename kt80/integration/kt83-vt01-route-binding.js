/* KT83–VT01 / P1: expert-facing coordinator binding for the ISOLATED acceptance page.
   No automatic legal choice, no archive writes, no automatic official document. */
(function(root) {'use strict';
 const $=id=>document.getElementById(id);
 function init(){
  const factory=root.KT83AutomaticRouteP1;
  if(!factory?.coordinator||!root.KT80WorkflowState)return;
  const status=document.createElement('section');
  status.id='kt83P1RouteStatus';status.className='kt83-p1-route';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.innerHTML='<strong>Единен маршрут · КТ83</strong><span id="kt83P1RouteText">Потвърдете предмета и обхвата.</span>';
  const workflow=document.querySelector('.kt80-workflow');
  workflow?.prepend(status);
  const receipt=()=>{
   const s=root.KT80WorkflowState||{};
   return {caseId:s.caseCycleId||'',generation:s.generation,evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??0};
  };
  const route=factory.coordinator({current:receipt});
  const render=(msg)=>{
    const snap=route.snapshot();
    const node=$('kt83P1RouteText');
    if(node) node.textContent=msg||snap.reason;
    status.dataset.phase=snap.phase;status.dataset.status=snap.status;
  };
  const isConfirmed=()=>!!root.KT80WorkflowState?.subjectConfirmed?.expertConfirmed
     &&!!root.KT80WorkflowState?.subjectConfirmed?.scopeConfirmed;
  const fail=(msg)=>{route.needsReview(msg);render(msg)};
  // Keep the existing expert GIS relevance gate. It may send the case to stage 3
  // (GIS required) or stage 4 (GIS not relevant). Never force GIS via onSubject.
  function onGateStage(step){
    const state=root.KT80WorkflowState||{}, gate=state.normativeGate;
    if(!isConfirmed()||gate?.expertConfirmed!==true)return;
    if((step===3&&gate.decision!=='REQUIRED')
      ||(step===4&&gate.decision!=='NOT_REQUIRED'))return;
    const current=route.snapshot();
    if(!current.valid||current.phase==='subject_scope'){
      const started=route.start({subject:true,scope:true});
      if(!started.ok)return render(started.reason);
    }
    if(gate.decision==='NOT_REQUIRED'){
      if(route.snapshot().phase==='normative_v11')return render('ГИС е мотивирано неприложим. Нормативната оценка продължава по V11.');
      // These receipts certify an expert relevance decision, NOT a GIS result.
      const spatial=route.advance('evidence',{...receipt(),verified:true,
        gisNotRequired:true,expertConfirmed:true,reason:gate.reason});
      if(!spatial.ok)return render(spatial.reason);
      const handoff=route.advance('normative_v11',{...receipt(),verified:true});
      return render(handoff.ok?
        'ГИС е мотивирано неприложим. Етап 4 разглежда документните доказателства и нормативния архив V11.':
        handoff.reason);
    }
    render('ГИС е необходим. Стартира съществуващият пространствен анализ в Етап 3.');
  }
  document.addEventListener('kt80:stage-open',e=>{
    if(e.detail?.step===3||e.detail?.step===4)queueMicrotask(()=>onGateStage(e.detail.step));
  });
  // GIS completeness does not imply that PDF1 has been generated or accepted.
  // The normative bridge owns the case-bound PDF1 receipt.
  function checkedGIS(){
    if(!route.snapshot().valid||route.snapshot().phase!=='gis_pdf1')return;
    const normalized=root.V26ParcelEditor?.normalize?.($('kt80ParcelInput')?.value||'');
    const ids=normalized?.ids||[], g=root.KT80FreeGISResults;
    if(!ids.length||normalized?.invalid?.length||normalized?.uncertain?.length){
      render('Няма валидирани имотни идентификатори. Необходимо е конкретно уточняване на местоположението.');
      return;
    }
    const proof=root.KT83P2Automatic?.current?.();
    const checked=root.KT83P2SpatialGate?.check?.(proof);
    if(!checked?.ok){
      render((checked?.message||'П2 не е удостоверил ГИС, ПИ MASTER и пространствените пресичания.')+
       ' Не използвайте архивно пресичане като геометрично доказателство.');
      return;
    }
    const pdf=root.KT83NormativeBridge?.pdfStatus?.();
    if(!root.KT83P2SpatialGate?.pdfReceiptMatches?.(proof,pdf)){
      render('Пространствените данни са проверени. Необходим е действително генериран PDF1 за текущата преписка и ревизия.');
      return;
    }
    const r=receipt();
    const passed=route.advance('evidence',{...r,verified:true,pdf1Verified:true,geometryVerified:true});
    render(passed.ok?'ГИС и PDF1 са удостоверени. Следва независим преглед на доказателствата.':passed.reason);
  }
  document.addEventListener('kt80:parcel-selected',checkedGIS);
  document.addEventListener('kt82:pdf1-completed',()=>queueMicrotask(checkedGIS));
  $('kt80ToLaw')?.addEventListener('click',()=>{
    queueMicrotask(()=>{
      if(root.KT80WorkflowState?.step!==4)return;
      checkedGIS();
      const snap=route.snapshot();
      if(!snap.valid)return render('Няма валиден единен маршрут за текущата преписка.');
      if(snap.phase==='gis_pdf1')return render('Необходимо е потвърдено PDF1 и геометрия; не приемайте архивен запис за доказателство.');
      if(snap.phase==='evidence'){
        // The legal review remains independent; passing the stage is NOT a legal finding.
        const progressed=route.advance('normative_v11',{...receipt(),verified:true});
        render(progressed.ok?'Пространствените доказателства са предадени. Следва нормативна оценка по V11.':progressed.reason);
      }
    });
  });
  // One case-specific, provenance-checked evaluation contract. No loose
  // mutable global approval marker can promote a procedure.
  function currentV11(){
    const state=root.KT80WorkflowState||{}, now=receipt();
    const d=root.KT83NormativeBridge?.getEvidence?.()||{};
    return root.KT83V11Handoff?.assess({
      ...now,subject:state.subjectConfirmed?.text,
      scope:state.subjectConfirmed?.scope,
      spatialScenario:d.scenario,
      evidence:d
    },root.KT83NormativeArchiveV11)||{
      ok:false,code:'V11_UNAVAILABLE',
      nextAction:'Предложение: проверете правните основания, приложимостта и компетентността в локалния архив V11.'
    };
  }
  function canEnterStageFive(){
    const state=root.KT80WorkflowState||{};
    const verified=currentV11();
    // Reopening stage 5 must not regress a completed, still-current
    // assessment back to stage 4. Source V11 is verified anew every time.
    return route.snapshot().valid&&
      ['normative_v11','motivated_proposal','out_draft'].includes(route.snapshot().phase)
      &&state.lawConfirmed?.expertConfirmed===true&&verified.ok===true;
  }
  function commitVerifiedExpertReview(){
    const before=route.snapshot(),verified=currentV11(),now=receipt();
    if(!before.valid||!['normative_v11','motivated_proposal','out_draft'].includes(before.phase)||
       verified.ok!==true||verified.caseId!==now.caseId||
       verified.generation!==now.generation||verified.evidenceRevision!==now.evidenceRevision){
      const why=verified.reason||'Правната преценка не е актуално удостоверена от MASTER V11.';
      render(why+' '+(verified.nextAction||'Предложение: проверете приложимите нормативни основания.'));
      return {ok:false,reason:why};
    }
    const state=root.KT80WorkflowState||{};
    if(!isConfirmed()||state.step!==4){
      return {ok:false,reason:'Потвърдете предмета и обхвата и завършете преценката в Етап 4.'};
    }
    // One expert action, not a second manual transcription of legal grounds.
    // In all cases the V11 source is verified again before stage 5 can open.
    state.lawConfirmed={expertConfirmed:true,archiveVersion:'V11',
      legal:verified.reasonedAssessment,authority:'VERIFIED_CASE_COMPETENCE',
      caseId:now.caseId,generation:now.generation,evidenceRevision:now.evidenceRevision};
    if(before.phase==='normative_v11'){
      const moved=route.advance('motivated_proposal',{...now,verified:true,
        reasonedAssessment:verified.reasonedAssessment});
      if(!moved.ok){state.lawConfirmed=null;render(moved.reason);return moved}
    }
    root.KT80WorkflowGo?.(5);
    if(state.step!==5){
      state.lawConfirmed=null;
      return {ok:false,reason:'Етап 5 не беше отворен. Повторете проверката на текущата преписка.'};
    }
    render('Нормативният MASTER V11 е удостоверен за текущата преписка. Следва мотивиран OUT проект.');
    return {ok:true,caseId:now.caseId,evidenceRevision:now.evidenceRevision};
  }
  root.KT83RouteAccess=Object.freeze({
    canOpenStage:step=>Number(step)!==5||canEnterStageFive(),
    commitVerifiedExpertReview,
    denied:()=>{const v=currentV11();fail((v.reason||'Непотвърдена нормативна приложимост.')+' '+(v.nextAction||''));}
  });
  // Guard the legacy click BEFORE it advances to stage 5.
  // Passing a stage and typing legal prose are not independent legal validation.
  $('kt80ToProposal')?.addEventListener('click',event=>{
    const eligible=canEnterStageFive();
    if(eligible)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const v=currentV11();fail((v.reason||'Нормативните доказателства са непълни.')+' '+(v.nextAction||''));
  },true);
  $('kt80ToProposal')?.addEventListener('click',()=>{
    queueMicrotask(()=>{
      if(root.KT80WorkflowState?.step!==5)return;
      const law=root.KT80WorkflowState?.lawConfirmed;
      if(!law?.expertConfirmed)return fail('Липсва експертно удостоверена нормативна преценка.');
      const snap=route.snapshot();
      if(['motivated_proposal','out_draft'].includes(snap.phase))
        return render('Нормативната преценка е актуална. Продължете с проекта на административния документ.');
      if(snap.phase!=='normative_v11')return render('Нормативният маршрут все още не е удостоверен.');
      // Expert-entered legal notes alone are NOT proof of V11 applicability.
      // The independent normative verifier must provide a fresh, case-bound
      // assessment before P1 can promote a procedural recommendation.
      const verified=currentV11();
      const now=receipt();
      if(!verified.ok)
        return fail((verified.reason||'Нормативната оценка не е удостоверена.')+' '+(verified.nextAction||''));
      const r=route.advance('motivated_proposal',{...now,verified:true,reasonedAssessment:verified.reasonedAssessment});
      render(r.ok?'Има удостоверена нормативна оценка. Следва конкретно мотивирано предложение за експертен преглед.':r.reason);
    });
  });
  const invalidate=()=>{route.reset();render('Данните са променени. Предходните резултати не се пренасят към новата преписка.')};
  // Changes to the legal question invalidate the route even if no parcel changes.
  $('kt80SubjectText')?.addEventListener('input',invalidate);
  $('kt80ScopeText')?.addEventListener('input',invalidate);
  document.addEventListener('kt80:case-reset',invalidate);
  document.addEventListener('kt80:case-change',invalidate);
  document.addEventListener('kt82:evidence-invalidated',()=>{
    route.reset();
    // Reconcile confirmed subject/scope against the new evidence revision.
    // No legal finding or GIS receipt is carried across revisions.
    render('Доказателствата са изменени. Предишните проверки са невалидни; следва повторна проверка по актуалния маршрут.');
  });
  // Diagnostics are retained in the DOM, but hidden in normal professional view.
  const style=document.createElement('style');
  style.textContent=`
    .kt83-p1-route{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 16px;margin:9px 0 17px;background:#eef2e8;color:#193727;border:1px solid #98ae9e;border-radius:8px;font:400 14px/1.5 "Segoe UI",Arial,sans-serif}
    .kt83-p1-route strong{font-weight:750;color:#1a4731}
    /* One public expert route. Keep research modules installed but invisible
       unless a later authenticated engineering mode explicitly exposes them. */
    #kt83PNIV3Exploration,#kt83PNIV3Stage5Notice,
    .kt80-stage-panel[data-panel="5"] #kt80ProcedureSelect,
    .kt80-stage-panel[data-panel="5"] #kt80ActivateRoute,
    .kt80-stage-panel[data-panel="5"] #kt80RoutePanels,
    .kt80-stage-panel[data-panel="5"] #kt80OpenConditions,
    .kt80-stage-panel[data-panel="5"] #kt80RouteConfirmation {display:none!important}
    .kt80-stage-panel[data-panel="4"] .kt83-normative-panel details:not([open]){margin-top:5px}
    .kt80-stage-panel[data-panel="4"] .kt83-normative-panel details > summary{font-size:13px}
    .kt80-stage-panel[data-panel="4"] .kt83-normative-panel{font-family:"Segoe UI",Arial,sans-serif}
  `;
  document.head.append(style);
  root.KT83P1Binding=Object.freeze({route,receipt,render});
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
