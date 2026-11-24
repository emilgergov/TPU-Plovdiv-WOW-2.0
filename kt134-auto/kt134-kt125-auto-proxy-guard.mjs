/**
 * KT134 future route guard for KT125 LOCAL-AUTH, not Cloudflare Access.
 * Adapter boundary only. This is not registered in the live Worker.
 * Mimics accepted KT125 author-proxy invariants:
 * same origin, session, UUID, revision, request-id idempotency, version recheck.
 * All authorization, reservation and persistence must be server-side D1-backed.
 */
const str=x=>String(x??'').trim();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(code,msg)=>new Response(JSON.stringify({error:msg}),{
 status:code,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, private'}});
export function createKT125AutoProxyGuard({origin,route,reserveOperation,completeOperation,
 getRevision,maxPayloadBytes=950000}={}){
 if(!/^https:\/\/[^/]+$/.test(str(origin))||typeof route!=='function'||
  typeof reserveOperation!=='function'||typeof completeOperation!=='function'||
  typeof getRevision!=='function')throw Error('Липсва защитен сървърен маршрут или журнал');
 return async request=>{
  if(request.method!=='POST')return json(405,'Неподдържан метод');
  if(request.headers.get('Origin')!==origin ||
   (request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'))
    return json(403,'Заявката не е от разрешения произход');
  if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('Content-Type')||''))
    return json(415,'Невалиден формат');
  const caseId=str(request.headers.get('X-KT126-Case'));
  const revision=Number(request.headers.get('X-KT126-Revision'));
  const requestId=str(request.headers.get('X-KT134-Request-Id'));
  if(!uuid.test(caseId)||!Number.isSafeInteger(revision)||revision<0||
   !uuid.test(requestId))return json(400,'Невалиден идентификатор или ревизия');
  const size=Number(request.headers.get('Content-Length')||0);
  if(size>maxPayloadBytes)return json(413,'Прекалено голяма заявка');
  // Read a clone to preserve original bytes for the authenticated route.
  let text;
  try{text=await request.clone().text()}catch{return json(400,'Невалидно тяло')}
  if(new TextEncoder().encode(text).length>maxPayloadBytes)return json(413,'Прекалено голяма заявка');
  let body;
  try{body=JSON.parse(text)}catch{return json(400,'Невалиден JSON')}
  if(!body||Array.isArray(body)||body.caseId!==caseId||
    String(body.dossierVersion)!==String(revision)||
    body.operation!=='kt134.auto-dossier-analyze.v1')
   return json(409,'Преписката или версията не съответстват');
  // This hook MUST atomically claim operation with the current case ACL,
  // request hash, actor identity, case revision and caller's local session.
  // It must return {status:'claimed'} OR an existing exact-match
  // {status:'done',response:Response} for the same actor/payload.
  const claim=await reserveOperation({request,requestId,caseId,revision,payload:text});
  if(claim?.status==='done'&&claim.response instanceof Response)return claim.response;
  if(claim?.status!=='claimed')return json(409,'Заявката е вече обработена или отказана');
  let result;
  try{
   result=await route(request);
   // Do not accept a stale response after a concurrent edit to the same case.
   const fresh=await getRevision({caseId,request});
   if(fresh!==revision)result=json(409,'Преписката е променена по време на анализа');
   // Persist the result before replying, exactly as the established KT125 proxy.
   const done=await completeOperation({requestId,caseId,revision,
    status:result.status,response:await result.clone().text()});
   if(done?.ok!==true)return json(503,'Резултатът не е записан');
   return result;
  }catch{
   await completeOperation({requestId,caseId,revision,status:503,
    response:JSON.stringify({error:'Неуспешна автоматична обработка'})}).catch(()=>{});
   return json(503,'Неуспешна автоматична обработка');
  }
 };
}
