/* V27 optional AI request from the existing expert screen.
   Credentials are never embedded in the public repository or persisted. */
(function(root){'use strict';
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/author';
async function generate(payload,token){
 if(!payload?.facts?.subject||!Array.isArray(payload.facts.parcelIds)||!payload.facts.parcelIds.length)throw Error('V27: липсват потвърдени входни данни.');
 if(typeof token!=='string'||!token.trim())throw Error('V27: липсва временен токен за защитения AI достъп.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),70000);
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.trim()},body:JSON.stringify(payload),signal:controller.signal,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error('КТ67-2.6: AI авторът не върна пълни индивидуални раздели (HTTP '+response.status+')'+(Array.isArray(data.qualityIssues)?' — '+data.qualityIssues.join('; '):data.providerStatus?' / '+data.providerStatus:''));
  if(data.reviewRequired!==true||typeof data.draft!=='string'||!data.draft.trim())throw Error('V27: невалиден AI отговор.');
  const draft=data.draft.trim();
  if(draft.length>9000)throw Error('V27.2: AI текстът надвишава допустимия обем; документът не се генерира от съкратен текст.');
  const required=['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'];
  const headings=[...draft.matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)].map(x=>x[1]);
  if(headings.length!==4||required.some((key,i)=>headings[i]!==key))throw Error('V27.2: AI отговорът няма четирите раздела в правилния ред.');
  return draft;
 }finally{clearTimeout(timer)}
}
root.V27AIAuthor=Object.freeze({generate});
})(typeof window!=='undefined'?window:globalThis);
