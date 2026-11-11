/* KT80 E01 visual design system V14.
   Mark only genuinely expert-confirmed stages as done; no legal facts inferred by animations.
   All motions short and suppressed by prefers-reduced-motion. */
(function(root){'use strict';
function init(){
 const steps=[...document.querySelectorAll('.kt80-step')],routePanel=document.getElementById('kt80RoutePanels');
 if(steps.length!==5||!routePanel)return;
 const getState=()=>root.KT80WorkflowState||null;
 function refresh(){
  const state=getState();if(!state)return;
  const completed=[false,Boolean(state.subjectConfirmed),Boolean(state.parcelsConfirmed),Boolean(state.lawConfirmed),Boolean(state.routeConfirmed)];
  // IN can be legitimately manual; completion of stage 1 requires an actual input, not just visit.
  const fileDone=Boolean(state.intake)||Boolean(state.subjectConfirmed?.text);
  completed[0]=fileDone;
  for(let i=0;i<steps.length;i++){
   const button=steps[i],active=button.getAttribute('aria-current')==='step',done=Boolean(completed[i])&&!active;
   button.dataset.state=active?'active':done?'done':'pending';
  }
 }
 const observer=new MutationObserver(()=>{refresh()});
 observer.observe(document.querySelector('.kt80-stages'),{attributes:true,attributeFilter:['aria-current'],subtree:true});
 observer.observe(routePanel,{attributes:true,attributeFilter:['hidden']});
 const safeRefresh=()=>setTimeout(refresh,0);
 ['click','input','change'].forEach(type=>document.addEventListener(type,safeRefresh,true));
 const activate=document.getElementById('kt80ActivateRoute');
 if(activate)activate.addEventListener('click',()=>{
  setTimeout(()=>{
   if(routePanel.hidden||!getState()?.routeConfirmed)return;
   const reduce=root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
   routePanel.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});
  },50);
 });
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
