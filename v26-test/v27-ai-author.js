/* V27 optional AI request from the existing expert screen.
   Credentials are never embedded in the public repository or persisted. */
(function(root){'use strict';
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/author';
async function generate(payload,token){
 if(!payload?.facts?.subject||!Array.isArray(payload.facts.parcelIds)||!payload.facts.parcelIds.length)throw Error('V27: липсват потвърдени входни данни.');
 if(typeof token!=='string'||!token.trim())throw Error('V27: липсва временен токен за защитения AI достъп.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.trim()},body:JSON.stringify(payload),signal:controller.signal,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error('V27: AI услугата върна HTTP '+response.status+(data.providerStatus?' / '+data.providerStatus:''));
  if(data.reviewRequired!==true||typeof data.draft!=='string'||!data.draft.trim())throw Error('V27: невалиден AI отговор.');
  return data.draft.trim().slice(0,9000);
 }finally{clearTimeout(timer)}
}
root.V27AIAuthor=Object.freeze({generate});
})(typeof window!=='undefined'?window:globalThis);
