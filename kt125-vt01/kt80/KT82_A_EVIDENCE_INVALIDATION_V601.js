/* КТ82 А1 · V60.1: изолирано обезсилване на производни доказателствени снимки.
   Не променя workflow, не изтрива преписката/предмета и не се произнася по право. */
(function(root){'use strict';
 const input=document.getElementById('kt80ParcelInput');
 const $=id=>document.getElementById(id);
 const normalize=()=>root.V26ParcelEditor?.normalize?.(input?.value||'');
 const signature=()=>{
  const p=normalize();
  if(!p||p.invalid?.length||p.uncertain?.length||!p.ids?.length)return '';
  return p.ids.join('; ');
 };
 let last=signature(),lastRaw=String(input?.value||''),revision=0;
 function clearDerived(reason,force){
  const now=signature(),raw=String(input?.value||'');
  if(!force&&now===last&&raw===lastRaw)return false;
  last=now;lastRaw=raw;revision++;
  // Нито един стар нормативен/маршрутен снимков резултат не се употребява след промяна на входа.
  root.KT83NormativeEvidence=null;
  root.KT82RouteAdviceLast=null;
  root.KT80Stage3Result=null;
  root.KT82SpatialEvidenceLast=null;
  root.KT82PDF1AreaAudit=null;
  // Confirmed workflow objects — not only checkboxes — must be invalidated.
  const workflow=root.KT80WorkflowState;
  if(workflow){
   workflow.parcelsConfirmed=null;
   workflow.lawConfirmed=null;
   workflow.routeConfirmed=null;
   workflow.activeRoute=null;
  }
  const parcelConfirm=$('kt80ParcelsConfirmation');
  if(parcelConfirm)parcelConfirm.checked=false;
  const routePanels=$('kt80RoutePanels');
  if(routePanels)routePanels.hidden=true;
  // Модулите запазват собствените си изолирани обработчици и се опресняват при отваряне.
  const law=$('kt80LawConfirmed');
  if(law)law.checked=false;
  const route=$('kt80RouteConfirmation');
  if(route)route.checked=false;
  document.dispatchEvent(new CustomEvent('kt82:evidence-invalidated',{detail:{reason,revision,parcelSignature:now}}));
  return true;
 }
 input?.addEventListener('input',()=>clearDerived('Променени имотни идентификатори',false));
 document.addEventListener('kt80:case-change',()=>clearDerived('Променена преписка',true));
 document.addEventListener('kt80:case-reset',()=>clearDerived('Нова преписка',true));
 // Отварянето на №4 изисква пресен снимков резултат от собствения нормативен мост.
 document.addEventListener('kt80:stage-open',e=>{
  if(e.detail?.step===4)root.KT83NormativeEvidence=root.KT83NormativeBridge?.getEvidence?.()||null;
  if(e.detail?.step===5&&root.KT80WorkflowState?.lawConfirmed?.expertConfirmed!==true)
   root.KT82RouteAdviceLast=null;
 });
 root.KT82EvidenceInvalidation=Object.freeze({version:'V60.1',getRevision:()=>revision,getParcelSignature:()=>last,
  invalidate:()=>clearDerived('Изрично поискано обновяване',true)});
})(window);
