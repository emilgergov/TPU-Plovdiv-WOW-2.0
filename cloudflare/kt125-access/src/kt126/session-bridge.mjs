import {withAuthorDeadline} from './author-deadline.mjs';
export const sessionBridgeSource=`/* KT128: authenticated native session; server is the sole authority. No browser bearer. */
(function(root){'use strict';
 const withAuthorDeadline=${withAuthorDeadline.toString()};
 const endpoints=new Set(['/author','/subject-improve','/scope-improve','/stage4-proposal','/stage4-expert-decision','/stage5-document']);
 async function request(endpoint,payload){
  const url=new URL(endpoint,location.href);
  if(url.origin!=='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev'||!endpoints.has(url.pathname))throw Error('Невалидна операция с EG автора.');
  const current=root.KT126Registry?.current();if(!current)throw Error('Първо регистрирайте или отворете преписката в Етап 1.');
  const body=JSON.parse(payload);if(!body||Array.isArray(body)||body.caseId&&body.caseId!==current.case_id)throw Error('Заявката е за друга преписка.');
  body.caseId=current.case_id;if(!body.requestId)body.requestId=crypto.randomUUID();
  try{return await withAuthorDeadline(async signal=>{const response=await root.fetch(url.href,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});return new Response(await response.text(),{status:response.status,headers:response.headers})},{timeoutMs:150000})}
  catch(error){return Response.json({error:error?.egTransport?'EG_PROVIDER_TIMEOUT':'EG_PROVIDER_UNAVAILABLE',transportFailure:true,message:error?.egTransport?error.message:'Няма връзка с ЕГ услугата. Текущите данни са запазени. Проверете връзката и опитайте отново.'},{status:error?.egTransport?504:503})}
 }
 root.KT80EGSession=Object.freeze({hasAccess:()=>true,request,clear:()=>{}});
})(window);`;
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('KT128 access overlay mismatch');return s.replace(a,b)};
const cut=(s,start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a);if(a<0||b<0||s.indexOf(start,a+start.length)!==-1)throw Error('KT128 dialog overlay mismatch');return s.slice(0,a)+s.slice(b)};
export function overlaySessionAccess(rel,source){
 if(rel.endsWith('/KT80_EG_ACCESS_SESSION_V01.js')){if(!source.includes('let credential=null,activeCase=null,epoch=0;'))throw Error('KT128 session source mismatch');return sessionBridgeSource;}
 if(rel.endsWith('/KT83_AI_SUBJECT_V572.js')){
  source=cut(source," const dialog=document.createElement('dialog');dialog.id='kt80AISubjectDialog';",' async function runImprovement(token){');
  source=once(source," form.addEventListener('submit',event=>{event.preventDefault();const token=password.value;password.value='';dialog.close();runImprovement(token);});",'');
  source=once(source,"  password.value='';if(dialog.open)dialog.close();",'');
  source=once(source,'  dialog.showModal();','  runImprovement(null);');
 }
 if(rel.endsWith('/KT83_AI_SCOPE_V572.js')){
  source=cut(source," const dialog=document.createElement('dialog');dialog.id='kt80EGScopeDialog';",' // Administrative reconstruction approval');
  source=once(source," form.addEventListener('submit',event=>{event.preventDefault();const token=password.value;password.value='';dialog.close();runImprovement(token);});",'');
  source=once(source,'  dialog.showModal();','  runImprovement(null);');
 }
 if(rel.endsWith('/kt96-eg-ai-stage4-author.mjs')){
  source=cut(source," const dialog=make('dialog');dialog.id='kt96EGPassword';",' host.prepend(ui);');
  source=once(source,"serial++;pendingSignature='';finishedSignature='';lastResult=null;password.value='';","serial++;pendingSignature='';finishedSignature='';lastResult=null;");
  source=once(source,"  if(dialog.open)dialog.close();button.disabled=false;output.textContent='';output.style.display='none';","  button.disabled=false;output.textContent='';output.style.display='none';");
  source=once(source,"  if(!firstPassword&&!window.KT80EGSession.hasAccess()){dialog.showModal();return;}","  if(!window.KT80EGSession.hasAccess()){status.textContent='Няма действаща потребителска сесия.';return;}");
  source=once(source," form.addEventListener('submit',e=>{e.preventDefault();const p=password.value;password.value='';dialog.close();generate(p)});",'');
  source=once(source,'Достъпът до EG Автора е отказан. Паролата за тази сесия е изчистена.','Достъпът до EG Автора е отказан. Проверете активния профил и правата по преписката.');
 }
 if(rel.endsWith('/KT83_AI_SUBJECT_V572.js')||rel.endsWith('/KT83_AI_SCOPE_V572.js'))source=once(source,'if(!response.ok){',"if(!response.ok){if(data.transportFailure===true&&typeof data.message==='string'){throw Error(data.message);}");
 if(rel.endsWith('/kt96-eg-ai-stage4-author.mjs'))source=once(source,'   if(!response.ok){',"   if(!response.ok&&data.transportFailure===true&&typeof data.message==='string'){status.textContent=data.message;return;}\n   if(!response.ok){");
 if(rel.endsWith('/kt117-stage5-document-author.mjs'))source=once(source,'   if(!res.ok){',"   if(!res.ok&&data.transportFailure===true&&typeof data.message==='string'){note.textContent=data.message;return;}\n   if(!res.ok){");
 return source.replaceAll('Въведете отново правилната парола чрез „Интелигентно подобряване“.','Проверете активния профил и правата по преписката.').replaceAll('Липсва парола за EG автора.','Няма действаща потребителска сесия.');
}
