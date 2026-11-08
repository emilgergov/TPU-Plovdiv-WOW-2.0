/* V27 optional AI request from the existing expert screen.
   Credentials are never embedded in the public repository or persisted. */
(function(root){'use strict';
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/author';
async function generate(payload,token){
 if(!payload?.facts?.subject||!Array.isArray(payload.facts.parcelIds)||!payload.facts.parcelIds.length)throw Error('V27: липсват потвърдени входни данни.');
 if(typeof token!=='string'||!token.trim())throw Error('V27: липсва временен токен за защитения AI достъп.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),70000);
 try{
  let response,data;
  for(let attempt=0;attempt<2;attempt++){
    response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.trim()},body:JSON.stringify(payload),signal:controller.signal,cache:'no-store'});
    try{data=await response.json();}catch{data={error:'Невалиден сървърен отговор'};}
    const permanent=Number(data?.providerStatus)===401||Number(data?.providerStatus)===403||response.status===401||response.status===403;
    if(response.ok||permanent||![502,503,504,429].includes(response.status)||attempt===1)break;
  }
  if(!response.ok){
   const provider=Number(data?.providerStatus||0);
   if(provider===401||provider===403)throw Error('V27: AI доставчикът отказва достъп (HTTP '+provider+'). Необходима е проверка на Cloudflare secret OPENAI_API_KEY; това не е грешна парола за EG автора. ZIP не е създаден.');
   if(response.status===401||response.status===403)throw Error('V27: Невалидна парола или токен за EG автора (HTTP '+response.status+'). ZIP не е създаден.');
   throw Error('V27: AI услугата върна HTTP '+response.status+(Array.isArray(data?.qualityIssues)?' / '+data.qualityIssues.join('; '):provider?' / доставчик HTTP '+provider:'')+'. ZIP не е създаден.');
  }
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
