/* KT84-E visual hierarchy. Presentation only: never advances route, validates
   a norm, generates an OUT or changes any GIS/Word evidence. */
(function(root){'use strict';
 const $=id=>document.getElementById(id);
 const css=document.createElement('style');
 css.id='kt84-e-legal-hierarchy';
 css.textContent=`
 .kt80-stage-panel{font-family:"Segoe UI",Arial,sans-serif!important}
 .kt80-stage-panel h2,.kt80-stage-panel h3,.kt80-dashboard h2,.kt80-dashboard h3{
   font-family:"Segoe UI",Arial,sans-serif!important;line-height:1.35}
 .kt80-stage-panel p{font-size:14px;line-height:1.48}
 .kt80-stage-panel button{font-family:"Segoe UI",Arial,sans-serif!important}
 .kt84-primary-finding{background:#15392e;color:#fff5df;border:2px solid #ddb790;
   border-left:7px solid #f1bd77;border-radius:10px;margin:4px 0 15px;padding:15px 17px;
   font:500 16px/1.5 "Segoe UI",Arial,sans-serif;box-shadow:0 4px 16px #0003}
 .kt84-primary-finding[data-ready="true"]{border-color:#aed5b7;border-left-color:#a2d9b2}
 .kt84-primary-finding h3{margin:0 0 7px!important;color:#fff0cd!important;
   font:750 21px/1.3 "Segoe UI",Arial,sans-serif!important}
 .kt84-primary-finding p{margin:4px 0!important;color:#fff1df!important;
   font:500 15px/1.5 "Segoe UI",Arial,sans-serif!important}
 .kt84-primary-finding .kt84-next{font-weight:700!important}
 .kt80-stage-panel[data-panel="4"] .kt83-independent-panel button,
 .kt80-stage-panel[data-panel="4"] #kt83P5CommitV11{
   font-size:13px!important;font-weight:650!important}
 .kt84-result-group{position:relative}
 .kt84-result-group h3{font-family:"Segoe UI",Arial,sans-serif!important}
 @media(max-width:650px){.kt84-primary-finding{padding:11px 13px}
 .kt84-primary-finding h3{font-size:18px!important}}
 `;
 document.head.append(css);
 function legal(){
  // This is the already-accepted independent case-bound V11 handoff.
  // Never interpret the user checkbox as a legal verification.
  const assessment=root.KT83RouteAccess?.currentV11?.();
  return assessment?.ok===true
   ? {ready:true,title:'Правната преценка е удостоверена',
      reason:'Нормативните предпоставки и компетентността са удостоверени за текущата преписка.',
      next:'Следва експертен преглед на мотивираното предложение. Не е издаден административен акт.'}
   : {ready:false,title:'Правната готовност не е удостоверена',
      reason:assessment?.reason||'Няма независимо удостоверена правна преценка за текущата преписка.',
      next:assessment?.nextAction||'Предложение: проверете относимите разпоредби в Нормативния архив и доказателствените факти.'};
 }
 function show(){
  const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
  if(!stage)return;
  let area=$('kt84PrimaryLegalFinding');
  if(!area){
   area=document.createElement('section');area.id='kt84PrimaryLegalFinding';
   area.className='kt84-primary-finding';area.setAttribute('role','status');
   area.setAttribute('aria-live','polite');
   for(const [tag,id] of [['h3','kt84PrimaryLegalTitle'],['p','kt84PrimaryLegalReason'],['p','kt84PrimaryLegalNext']]){
    const child=document.createElement(tag);child.id=id;
    if(id==='kt84PrimaryLegalNext')child.className='kt84-next';
    area.append(child);
   }
   stage.prepend(area);
  }
  const value=legal();
  area.dataset.ready=String(value.ready);
  for(const [id,txt] of [
   ['kt84PrimaryLegalTitle',value.title],['kt84PrimaryLegalReason',value.reason],
   ['kt84PrimaryLegalNext',value.next]
  ]){
   const node=$(id);if(node&&node.textContent!==txt)node.textContent=txt;
  }
 }
 function init(){
  show();
  for(const event of ['kt80:case-change','kt80:case-reset','kt80:stage-open',
    'kt82:evidence-invalidated','kt80:procedure-confirmed']){
   document.addEventListener(event,()=>queueMicrotask(show));
  }
  for(const id of ['kt80LawConfirmed','kt80ToProposal','kt83P5CommitV11',
   'kt80SubjectConfirmation','kt80ScopeConfirmation']){
   $(id)?.addEventListener('click',()=>queueMicrotask(show));
  }
  const legalResult=$('kt83P5ReviewStatus');
  if(legalResult&&root.MutationObserver)
   new MutationObserver(()=>queueMicrotask(show))
    .observe(legalResult,{childList:true,characterData:true,subtree:true});
  root.KT84EVisual=Object.freeze({refresh:show});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
