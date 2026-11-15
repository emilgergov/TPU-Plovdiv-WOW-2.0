/* KT80 RESET-01: one global button, one confirmed reset; user-friendly Bulgarian messages. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
function init(){
 const trigger=$('kt80ClearAll'),modal=$('kt80ResetDialog'),cancel=$('kt80ResetCancel'),confirm=$('kt80ResetConfirm');
 if(!trigger||!modal||!cancel||!confirm)return;
 let previous=null;
 function close(){modal.hidden=true;trigger.setAttribute('aria-expanded','false');if(previous?.isConnected)previous.focus()}
 function open(){previous=document.activeElement;modal.hidden=false;trigger.setAttribute('aria-expanded','true');cancel.focus()}
 trigger.addEventListener('click',open);
 cancel.addEventListener('click',close);
 modal.addEventListener('click',event=>{if(event.target===modal)close()});
 modal.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close()}
  if(event.key==='Tab'){
   const items=[cancel,confirm];const i=items.indexOf(document.activeElement);
   if(event.shiftKey&&i===0){event.preventDefault();confirm.focus()}
   else if(!event.shiftKey&&i===1){event.preventDefault();cancel.focus()}
  }
 });
 confirm.addEventListener('click',()=>{
  try{
   if(typeof root.KT80ResetCurrentCase!=='function')throw Error('Модулът за изчистване не е зареден');
   const result=root.KT80ResetCurrentCase();
   if(!result?.reset)throw Error('Изчистването не е потвърдено');
   close();
  }catch(e){
   modal.hidden=true;trigger.setAttribute('aria-expanded','false');
   const message=$('kt80FlowMessage');
   if(message)message.textContent='Не успяхме да изчистим всичко. Част от данните може да са останали. Опитайте отново.';
  }
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
