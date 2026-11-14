/**
 * KT84-03: private case ↔ expert ↔ local WOW cycle binding.
 *
 * This module is intended for a future Access-protected *same-origin* admin
 * client; it is deliberately not loaded by public GitHub Pages.
 *
 * The server, not this client, authorizes access. Rechecking GET /v1/cases/:id
 * is a freshness guard only: it does NOT authorize editing or EG processing.
 * No credentials, dossier files, AI content or personal data are persisted.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean=x=>typeof x==='string'?x.trim():'';
const snapshot=x=>({cycleId:clean(x?.cycleId),generation:x?.generation,
  evidenceRevision:x?.evidenceRevision});
const validSnapshot=x=>uuid.test(x?.cycleId)&&Number.isSafeInteger(x?.generation)&&
  Number.isSafeInteger(x?.evidenceRevision);
const same=(a,b)=>a?.cycleId===b?.cycleId&&a?.generation===b?.generation&&
 a?.evidenceRevision===b?.evidenceRevision;
const clone=x=>Object.freeze({...x});
const fail=(code)=>Object.freeze({ok:false,code});
const success=(data)=>Object.freeze({ok:true,...data});

export function createProtectedTransport({origin,fetcher}={}){
 if(typeof fetcher!=='function'||typeof origin!=='string')throw new TypeError('Необходим е защитен транспорт.');
 let url;
 try{url=new URL(origin)}catch{throw new TypeError('Невалиден защитен адрес.')}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    url.pathname!=='/'||url.origin!==origin.replace(/\/$/,''))
  throw new TypeError('Защитеният API изисква точен HTTPS origin.');
 const prefix=url.origin;
 return async ({method='GET',path,body,headers={},signal}={})=>{
  if(typeof path!=='string'||!/^\/v1\/[a-z0-9/-]+$/i.test(path)||
     path.includes('//'))throw new TypeError('Невалиден маршрут към защитения API.');
  const target=new URL(path,prefix);
  if(target.origin!==prefix)throw new TypeError('Отказан външен API адрес.');
  const response=await fetcher(target.href,{
   method,credentials:'same-origin',redirect:'error',cache:'no-store',
   headers:{...headers,...(body!==undefined?{'content-type':'application/json'}:{})},
   ...(body!==undefined?{body:JSON.stringify(body)}:{}),signal
  });
  let data=null;
  try{data=await response.json()}catch{}
  return {status:response.status,ok:response.ok,
   data:data&&typeof data==='object'?data:null};
 };
}

export function createCaseSession({transport,local,abortPending}={}){
 if(typeof transport!=='function'||typeof local!=='function')
  throw new TypeError('Липсва защитен транспорт или локален работен цикъл.');
 let expert=null,caseInfo=null,cycle=null,serial=0;
 const current=()=>snapshot(local());
 const active=()=>!!expert&&!!caseInfo&&same(cycle,current());
 function clear(){
  serial++;expert=null;caseInfo=null;cycle=null;
  if(typeof abortPending==='function')abortPending();
 }
 function identity(){return expert?clone(expert):null}
 function bound(){return active()?clone({...caseInfo,localCycleId:cycle.cycleId,
    generation:cycle.generation,evidenceRevision:cycle.evidenceRevision}):null}
 async function login(){
  clear();
  const ticket=serial;
  const r=await transport({path:'/v1/me'});
  if(ticket!==serial)return fail('SESSION_CHANGED');
  const user=r.data?.user;
  if(!r.ok||!r.data?.ok||!clean(user?.id)||!clean(user?.orgId)||
     !['expert','reviewer','administrator'].includes(user?.role))
    return fail('EXPERT_AUTH_REQUIRED');
  expert=clone({id:user.id,orgId:user.orgId,role:user.role});
  return success({expert:identity()});
 }
 async function attach(id){
  if(!expert||!uuid.test(id))return fail('SESSION_OR_CASE_INVALID');
  // A local dossier cycle is bound to ONE permanent case ID. Attaching
  // another server case without an explicit local reset could mix evidence.
  if(active()&&caseInfo.id!==id)return fail('NEW_LOCAL_CYCLE_REQUIRED');
  const localAtStart=current();
  if(!validSnapshot(localAtStart))return fail('INVALID_LOCAL_CYCLE');
  const ticket=++serial;
  caseInfo=null;cycle=null;
  // Any work for a prior binding must be canceled before reattachment.
  if(typeof abortPending==='function')abortPending();
  const r=await transport({path:'/v1/cases/'+id});
  if(ticket!==serial||!same(localAtStart,current()))return fail('LOCAL_CYCLE_CHANGED');
  const c=r.data?.case;
  if(!r.ok||!r.data?.ok||c?.id!==id||
    c?.orgId!==expert.orgId||c?.status!=='active'||
    !Number.isSafeInteger(c.version)||c.version<1)
    return fail('CASE_NOT_AUTHORIZED');
  cycle=localAtStart;
  caseInfo=clone({id:c.id,version:c.version,ownerId:c.ownerId,orgId:c.orgId});
  return success({case:bound()});
 }
 async function create(subject){
  if(expert?.role!=='expert'||!clean(subject))return fail('EXPERT_OR_SUBJECT_REQUIRED');
  // Do not create an orphan server case while a different case is still
  // assigned to this same local dossier. Start an explicit new cycle first.
  if(active())return fail('NEW_LOCAL_CYCLE_REQUIRED');
  const start=current();
  if(!validSnapshot(start))return fail('INVALID_LOCAL_CYCLE');
  const ticket=serial;
  const r=await transport({method:'POST',path:'/v1/cases',body:{subject:clean(subject)}});
  if(ticket!==serial||!same(start,current()))return fail('LOCAL_CYCLE_CHANGED');
  if(!r.ok||!r.data?.ok||!uuid.test(r.data.id))return fail('SERVER_CASE_CREATE_FAILED');
  return attach(r.data.id);
 }
 async function check(){
  if(!active())return fail('CASE_OR_CYCLE_CHANGED');
  const atStart=current(),prior=caseInfo,ticket=serial;
  const r=await transport({path:'/v1/cases/'+prior.id});
  if(ticket!==serial||!active()||!same(atStart,current()))
   return fail('CASE_OR_CYCLE_CHANGED');
  if(!r.ok||!r.data?.ok||r.data.case?.id!==prior.id||
      r.data.case?.orgId!==prior.orgId||r.data.case?.version!==prior.version||
      r.data.case?.status!=='active'){
   // All dependent case material must become unusable until reattached.
   caseInfo=null;cycle=null;serial++;
   if(typeof abortPending==='function')abortPending();
   return fail(r.status===403||r.status===404?'ACCESS_REVOKED_OR_CASE_GONE':'REMOTE_VERSION_CHANGED');
  }
  return success({case:bound()});
 }
 async function authorizedReadWork(task){
  if(typeof task!=='function')throw new TypeError('Необходим е работен процес.');
  const before=await check();
  if(!before.ok)return before;
  const ticket=serial,expected=caseInfo;
  let value;
  try{value=await task(clone({expertId:expert.id,
    orgId:expert.orgId,serverCaseId:expected.id,version:expected.version,
    localCycleId:cycle.cycleId,generation:cycle.generation,
    evidenceRevision:cycle.evidenceRevision}))}
  catch(_){return fail('WORK_FAILED')}
  if(ticket!==serial||!active())return fail('CASE_CHANGED_DURING_WORK');
  const after=await check();
  if(!after.ok)return after;
  return success({value,case:bound()});
 }
 async function updateSubject(subject){
  if(!active()||!clean(subject))return fail('CASE_OR_SUBJECT_INVALID');
  const old=caseInfo,atStart=current(),ticket=serial;
  const response=await transport({method:'PATCH',path:'/v1/cases/'+old.id,
    body:{subject:clean(subject),version:old.version}});
  if(ticket!==serial||!same(atStart,current())||!active())
   return fail('CASE_CHANGED_DURING_EDIT');
  if(!response.ok||!response.data?.ok||response.data.id!==old.id||
      response.data.version!==old.version+1){
   if(response.status===409){
    caseInfo=null;cycle=null;serial++;
    if(typeof abortPending==='function')abortPending();
   }
   return fail(response.status===409?'VERSION_CONFLICT':'EDIT_REJECTED');
  }
  caseInfo=clone({...old,version:response.data.version});
  return success({case:bound()});
 }
 return Object.freeze({login,attach,create,check,authorizedReadWork,
  updateSubject,identity,bound,clear});
}
