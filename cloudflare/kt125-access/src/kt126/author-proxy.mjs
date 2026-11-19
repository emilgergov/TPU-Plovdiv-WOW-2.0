import {withAuthorDeadline} from './author-deadline.mjs';
import {caseContext,validCaseId,sha256,actionGuard} from './registry.mjs';
import {registryJson} from './http.mjs';
const allowed=new Set(['/author','/subject-improve','/scope-improve','/stage4-proposal','/stage4-expert-decision','/stage5-document']);
export async function proxyAuthor({request,env,who,config,now=Date.now(),authorFetch=fetch,authorTimeoutMs=130000}){
 const path=new URL(request.url).pathname.slice('/kt126/author'.length);
 if(request.method!=='POST'||!allowed.has(path))return registryJson({error:'Невалидна аналитична операция.'},404);
 if(request.headers.get('Origin')!==config.origin||(request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'))return registryJson({error:'Заявката е отказана.'},403);
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('Content-Type')||''))return registryJson({error:'Невалиден формат.'},415);
 const caseId=request.headers.get('X-KT126-Case'),revision=Number(request.headers.get('X-KT126-Revision'));
 if(!validCaseId(caseId)||!Number.isSafeInteger(revision)||revision<0)return registryJson({error:'Първо регистрирайте преписката в Етап 1.'},400);
 const action=path==='/stage5-document'?'document.generate':path==='/stage4-expert-decision'?'case.confirm':'case.edit';
 const args={db:env.KT125_DB,who,org:config.org,caseId,now,action},context=await caseContext(args);
 if(!context)return registryJson({error:'Нямате право за тази операция по преписката.'},403);
 if(context.revision!==revision)return registryJson({error:'Данните на преписката са променени. Обновете ги преди анализа.'},409);
 let input,raw='';try{const reader=request.body?.getReader();if(reader){const decoder=new TextDecoder();let bytes=0;while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>950000){await reader.cancel();return registryJson({error:'Доказателственият контекст е твърде голям.'},413)}raw+=decoder.decode(part.value,{stream:true})}raw+=decoder.decode()}input=JSON.parse(raw)}catch{return registryJson({error:'Невалидна аналитична заявка.'},400)}
 if(!input||Array.isArray(input)||input.caseId!==caseId)return registryJson({error:'Заявката не съответства на текущата преписка.'},409);
 const key=validCaseId(input.requestId)?input.requestId:crypto.randomUUID(),payloadHash=await sha256(raw),db=env.KT125_DB;
 const claim=await db.prepare(`INSERT INTO kt126_operations(case_id,request_id,case_revision,actor_id,endpoint,payload_hash,status,created_at_ms)
 SELECT case_id,?,revision,?,?,?,'pending',? FROM kt126_registry WHERE case_id=? AND revision=? AND ${actionGuard.sql} ON CONFLICT(case_id,request_id) DO NOTHING`).bind(key,who.userId,path,payloadHash,now,caseId,revision,...actionGuard.args(who,config.org,action,now)).run();
 if(claim.meta.changes===0){const prior=await db.prepare('SELECT * FROM kt126_operations WHERE case_id=? AND request_id=?').bind(caseId,key).first();if(prior?.payload_hash!==payloadHash||prior?.case_revision!==revision||prior?.actor_id!==who.userId||prior?.endpoint!==path)return registryJson({error:'Повторната заявка има различни данни.'},409);if(prior.status==='done')return new Response(prior.response_json,{status:prior.response_status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private'}});return registryJson({error:'Тази заявка вече се обработва. Изчакайте резултата.'},409)}
 const headers=new Headers({'Content-Type':'application/json',Origin:config.origin,'X-KT126-Case':caseId,'X-KT126-Session':request.headers.get('Cookie')||''});
 if(/^[0-9a-f-]{36}$/.test(env.KT131_AUTHOR_VERSION||''))headers.set('Cloudflare-Workers-Version-Overrides','tpu-plovdiv-ai-author-v27="'+env.KT131_AUTHOR_VERSION+'"');
 let status=503,body=JSON.stringify({error:'Анализът не е завършен. Опитайте с нова заявка.'});
 try{const invoke=env.KT128_AUTHOR?.fetch?((url,options)=>env.KT128_AUTHOR.fetch(new Request(url,options))):authorFetch;const result=await withAuthorDeadline(async signal=>{const response=await invoke('https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev'+path,{method:'POST',headers,body:raw,signal});return {response,text:await response.text()}},{signal:request.signal,timeoutMs:authorTimeoutMs});const response=result.response;status=response.status;body=result.text;if(new TextEncoder().encode(body).length>950000||!response.headers.get('Content-Type')?.includes('json')){status=502;body=JSON.stringify({error:'Получен е невалиден аналитичен отговор.'})}}
 catch(error){status=error?.egTransport?504:503;body=JSON.stringify({error:error?.egTransport?'EG_PROVIDER_TIMEOUT':'EG_PROVIDER_UNAVAILABLE',transportFailure:true,message:error?.egTransport?error.message:'ЕГ услугата временно не е достъпна. Текущите данни са запазени. Опитайте по-късно.'})}
 const fresh=await caseContext({...args,now:Date.now()});if(!fresh||fresh.revision!==revision){status=409;body=JSON.stringify({error:'Преписката е променена по време на анализа. Закъснелият резултат не се прилага.'})}
 const event=crypto.randomUUID();
 await db.batch([
 db.prepare("UPDATE kt126_operations SET status='done',response_status=?,response_json=? WHERE case_id=? AND request_id=? AND status='pending'").bind(status,body,caseId,key),
 db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json) SELECT ?,organization_id,case_id,?,'case.analysis',?,?,?,json_object('endpoint',?,'revision',?,'response_status',?) FROM kt126_registry WHERE case_id=? AND changes()=1`).bind(event,who.userId,status>=200&&status<300?'allowed':'denied',Date.now(),key,path,revision,status,caseId)
 ]);
 return new Response(body,{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private'}});
}
