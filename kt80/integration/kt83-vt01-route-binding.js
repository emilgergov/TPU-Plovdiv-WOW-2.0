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
  function onSubject(){
    // The original handler confirms the subject and the scope before we can advance.
    if(!isConfirmed()){render('Необходими са отделно потвърдени предмет и обхват.');return;}
    const started=route.start({subject:true,scope:true});
    if(!started.ok){render(started.reason);return;}
    render('Предметът и обхватът са потвърдени. Отварям ГИС анализа.');
    root.KT80WorkflowGo?.(3); // Existing stage 3 already starts the GIS engine.
    // KT80DashboardOpenStage already emits kt80:stage-open exactly once.
  }
  $('kt80ToParcels')?.addEventListener('click',()=>queueMicrotask(onSubject));
  // Independent GIS results must never be treated as a legal determination.
  function checkedGIS(){
    if(!route.snapshot().valid||route.snapshot().phase!=='gis_pdf1')return;
    const s=root.KT80WorkflowState||{},ids=(root.V26ParcelEditor?.normalize?.($('kt80ParcelInput')?.value||'')?.ids)||[];
    const g=root.KT80FreeGISResults;
    if(!ids.length){fail('Няма проверен имот. Прилагайте контекстна проверка; не приемайте геометрия по архивен запис.');return;}
    if(g?.ids?.length!==ids.length||!ids.every((id,i)=>id===g.ids[i])
      ||!g.results?.every(x=>x.status==='Намерен'&&x.geojson?.features?.length)){
      render('Изчаква се геометрична проверка за всички имоти. Архивна принадлежност не е геометрично доказателство.');return;
    }
    const r=receipt(),passed=route.advance('evidence',{...r,verified:true});
    render(passed.ok?'Геометрията е налична. Проверете ЗЗ/ЗТ и PDF1; нормативният извод остава независим.':passed.reason);
  }
  document.addEventListener('kt80:parcel-selected',checkedGIS);
  document.addEventListener('kt82:pdf1-completed',()=>{checkedGIS();render()});
  $('kt80ToLaw')?.addEventListener('click',()=>{
    queueMicrotask(()=>{
      if(root.KT80WorkflowState?.step!==4)return;
      const snap=route.snapshot();
      if(!snap.valid)return render('Няма валиден единен маршрут за текущата преписка.');
      if(snap.phase==='gis_pdf1')return render('Прегледайте липсващите ГИС доказателства. Архивните пресичания не доказват геометрия.');
      if(snap.phase==='evidence'){
        const progressed=route.advance('normative_v11',{...receipt(),verified:true});
        render(progressed.ok?'ГИС е разгледан. Следва независима оценка по нормативния архив V11.':progressed.reason);
      }
    });
  });
  $('kt80ToProposal')?.addEventListener('click',()=>{
    queueMicrotask(()=>{
      if(root.KT80WorkflowState?.step!==5)return;
      const law=root.KT80WorkflowState?.lawConfirmed;
      if(!law?.expertConfirmed)return fail('Липсва експертно удостоверена нормативна преценка.');
      const snap=route.snapshot();
      if(snap.phase!=='normative_v11')return render('Нормативният маршрут все още не е удостоверен.');
      const r=route.advance('motivated_proposal',{...receipt(),verified:true,reasonedAssessment:law.legal});
      render(r.ok?'Има мотивирана експертна правна оценка. Изходният проект остава за преглед, не за подписване.':r.reason);
    });
  });
  const invalidate=()=>{route.reset();render('Данните са променени. Предходните резултати не се пренасят към новата преписка.')};
  document.addEventListener('kt80:case-reset',invalidate);
  document.addEventListener('kt80:case-change',invalidate);
  document.addEventListener('kt82:evidence-invalidated',()=>{
    route.reset();
    // Reconcile confirmed subject/scope against the new evidence revision.
    // No legal finding or GIS receipt is carried across revisions.
    if(isConfirmed()){
      const restarted=route.start({subject:true,scope:true});
      render(restarted.ok?'Доказателствата са изменени. Повторете пространствената проверка; правният извод е невалиден.':restarted.reason);
    } else invalidate();
  });
  // Diagnostics are retained in the DOM, but hidden in normal professional view.
  const style=document.createElement('style');
  style.textContent=`
    .kt83-p1-route{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 16px;margin:9px 0 17px;background:#eef2e8;color:#193727;border:1px solid #98ae9e;border-radius:8px;font:400 14px/1.5 "Segoe UI",Arial,sans-serif}
    .kt83-p1-route strong{font-weight:750;color:#1a4731}
    .kt80-stage-panel[data-panel="4"] #kt83NormativePanel + details,
    .kt80-stage-panel[data-panel="5"] #kt80ProcedureSelect {display:none!important}
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
