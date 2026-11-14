/* WOW KT83–VT01 / P1. Independent automatic-route coordinator.
 * Does not select procedures, mutate legal findings, or infer GIS geometry.
 * It exposes a case-bound progress model for the existing modules.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KT83AutomaticRouteP1 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const PHASES = Object.freeze(['subject_scope', 'gis_pdf1', 'evidence', 'normative_v11', 'motivated_proposal', 'out_draft']);
  function asText(x) { return String(x == null ? '' : x).trim(); }
  function sameCase(a, b) {
    return !!a && !!b && a.caseId === b.caseId && a.generation === b.generation && a.evidenceRevision === b.evidenceRevision;
  }
  function coordinator(deps) {
    if (!deps || typeof deps.current !== 'function') throw new Error('Изисква се текущ контекст на преписката.');
    let ticket = null;
    let status = 'НЕЗАПОЧНАТ';
    let phase = PHASES[0];
    let reason = 'Потвърдете предмета и обхвата.';
    const receipt = () => {
      const x = deps.current() || {};
      return {caseId:asText(x.caseId), generation:x.generation, evidenceRevision:x.evidenceRevision};
    };
    const active = () => !!ticket && sameCase(ticket, receipt());
    const reset = () => { ticket = null; status='НЕЗАПОЧНАТ'; phase=PHASES[0]; reason='Нова или изменена преписка.'; return snapshot(); };
    const snapshot = () => Object.freeze({caseId:active()?ticket.caseId:null,status,phase,reason,valid:active()});
    function start(confirmed) {
      const now = receipt();
      if (!now.caseId || !Number.isInteger(now.generation) || !Number.isInteger(now.evidenceRevision))
        return {ok:false,reason:'Липсва валидна идентичност или ревизия на преписката.'};
      if (!confirmed || !confirmed.subject || !confirmed.scope)
        return {ok:false,reason:'Предметът и обхватът изискват отделни експертни потвърждения.'};
      ticket=now; phase='gis_pdf1';status='В ПРОЦЕС';reason='Проверка на имоти и пространствени доказателства.';
      return {ok:true,...snapshot()};
    }
    function advance(next, evidence) {
      if (!active()) {reset();return {ok:false,reason:'Преписката или доказателствата са изменени; старият резултат е невалиден.'};}
      const currentIndex=PHASES.indexOf(phase),nextIndex=PHASES.indexOf(next);
      if (nextIndex!==currentIndex+1) return {ok:false,reason:'Не е разрешено прескачане или връщане на автоматичния маршрут.'};
      if (!evidence || evidence.caseId!==ticket.caseId || evidence.generation!==ticket.generation || evidence.evidenceRevision!==ticket.evidenceRevision || evidence.verified!==true)
        return {ok:false,reason:'Не са удостоверени необходимите доказателства за тази фаза.'};
      if(next==='evidence'&&!((evidence.pdf1Verified===true&&evidence.geometryVerified===true)
         ||(evidence.gisNotRequired===true&&evidence.expertConfirmed===true&&asText(evidence.reason)))){
        return {ok:false,reason:'Необходимо е PDF1 с валидирана геометрия или мотивирано експертно решение, че ГИС не е приложим.'};
      }
      // A normative proposition is NOT proof of a legal conclusion.
      if (next==='motivated_proposal' && !asText(evidence.reasonedAssessment))
        return {ok:false,reason:'Липсва мотивирана нормативна оценка по V11.'};
      if (next==='out_draft' && !asText(evidence.motivatedProposal))
        return {ok:false,reason:'Липсва конкретно мотивирано предложение.'};
      phase=next;reason='Етапът е удостоверен; следва '+next+'.';
      return {ok:true,...snapshot()};
    }
    function needsReview(message) {
      if (!active()) return reset();
      status='НЕОБХОДИМА ПРОВЕРКА';reason=asText(message)||'Необходима е конкретна експертна проверка.';
      return snapshot();
    }
    function complete(evidence) {
      if (!active() || phase!=='out_draft' || !evidence || evidence.verified!==true || !sameCase(evidence,ticket))
        return {ok:false,reason:'Няма валиден проект за тази преписка.'};
      status='ПРОЕКТ ЗА ПРЕГЛЕД';reason='Неподписан проект; не представлява административно произнасяне.';
      return {ok:true,...snapshot()};
    }
    return Object.freeze({start,advance,needsReview,complete,reset,snapshot,PHASES});
  }
  return Object.freeze({coordinator,PHASES,sameCase});
});
