/* КТ82 А1 · V59.6: изолирано обезсилване на производни доказателствени снимки.
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
 let last=signature(),revision=0;
 function clearDerived(reason,force){
  const now=signature();
  if(!force&&now===last)return false;
  last=now;revision++;
  // Нито един стар нормативен/маршрутен снимков резултат не се употребява след промяна на входа.
  root.KT83NormativeEvidence=null;
  root.KT82RouteAdviceLast=null;
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
 root.KT82EvidenceInvalidation=Object.freeze({version:'V59.6',getRevision:()=>revision,getParcelSignature:()=>last,
  invalidate:()=>clearDerived('Изрично поискано обновяване',true)});
})(window);
