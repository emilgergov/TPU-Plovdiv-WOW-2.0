/* KT80 EG — one working-case credential, RAM only.
 * No localStorage/sessionStorage/cookies, no DOM attributes, no logs.
 * Only exposes request(), hasAccess(), clear(); never exposes the bearer string.
 * Scope: this tab, one case, until route confirmation or reset.
 */
(function(root){'use strict';
 let credential=null,activeCase=null,epoch=0;
 const currentCase=()=>root.KT80WorkflowState?.generation??null;
 function clear(){
  credential=null;activeCase=null;epoch++;
 }
 function hasAccess(){
  if(!credential)return false;
  if(activeCase!==currentCase()){clear();return false}
  return true;
 }
 async function request(endpoint,payload,firstPassword){
  const supplied=typeof firstPassword==='string'&&firstPassword.trim()?firstPassword:null;
  let key;
  if(supplied)key=supplied;
  else if(hasAccess())key=credential;
  else throw new Error('Необходимо е еднократно въвеждане на паролата за EG автора.');
  const requestEpoch=epoch,caseAtStart=currentCase();
  const response=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:payload});
  if(response.status===401||response.status===403){clear();return response}
  // Store only after a successfully authenticated and successful request.
  if(response.ok&&epoch===requestEpoch&&caseAtStart===currentCase()&&!root.KT80WorkflowState?.routeConfirmed){
   credential=key;activeCase=caseAtStart;
  }
  return response;
 }
 document.addEventListener('kt80:case-reset',clear);
 document.addEventListener('kt80:case-change',clear);
 document.addEventListener('kt80:procedure-confirmed',clear);
 root.addEventListener('pagehide',clear);
 root.KT80EGSession=Object.freeze({hasAccess,request,clear});
})(window);
