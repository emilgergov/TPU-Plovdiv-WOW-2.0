/**
 * KT134 ↔ KT125 local-auth compatibility port (isolated only).
 * The historic KT125 worker stores case_id as UUID; internal_number is a
 * separate, human-readable EG-YYYY-NNNNNN string.
 * The live KT125 host must inject its OWN tested identity/caseContext/readState
 * procedures. Never copy session cookies, JWTs or D1 rows into the browser.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const visible=/^EG-\d{4}-\d{6}$/;
const str=v=>String(v??'').trim();
const check=(v,msg)=>{if(!v)throw Error(msg)};
const closed=x=>Object.freeze(x);
export function createKT125LocalPorts({identity,caseContext,readState,unpackState,listSources}={}){
 for(const [name,fn] of Object.entries({identity,caseContext,readState,unpackState,listSources}))
  check(typeof fn==='function','Липсва оригинален KT125 порт: '+name);
 async function authenticateRequest(request){
  // KT125 local-authorized cookie, verified via D1 session + active membership.
  // Cloudflare Access JWT is NOT the user login for this local-auth route.
  const who=await identity(request);
  if(who?.verified!==true||!str(who.userId)||!['expert','egmaster','administrator'].includes(who.role))
   return closed({verified:false});
  return closed({verified:true,userId:str(who.userId),role:who.role});
 }
 async function authorizeCase({user,caseId,action='case.edit'}){
  if(!user?.verified||!uuid.test(str(caseId))||
    !['case.edit','case.confirm','document.generate'].includes(action))return false;
  const ctx=await caseContext({who:user,caseId,action});
  return ctx?.verified===true&&ctx.caseId===caseId&&
   Number.isSafeInteger(ctx.revision)&&ctx.revision>=0;
 }
 async function readDossier({user,caseId}){
  check(await authorizeCase({user,caseId,action:'case.edit'}),'Няма разрешен достъп до преписката');
  const ctx=await caseContext({who:user,caseId,action:'case.edit'});
  check(ctx?.verified===true&&ctx.caseId===caseId,'Неуспешна проверка на преписката');
  check(visible.test(str(ctx.internalNumber)),'Неочакван вътрешен номер');
  const persisted=await readState({who:user,caseId});
  check(persisted?.record?.case_id===caseId,'Несъответствие с регистъра');
  check(persisted.record.revision===ctx.revision,'Преписката е променена');
  check(persisted.evidenceChanged!==true,'Източниците са променени след последния прочит на документите');
  const unpacked=await unpackState(persisted.state);
  const intake=unpacked?.intake||unpacked?.state?.intake;
  const texts=Array.isArray(intake?.document_texts)?intake.document_texts:[];
  const sources=await listSources({who:user,caseId});
  check(Array.isArray(sources)&&sources.length>0,'Липсват регистрирани източници');
  check(sources.every(s=>s.complete===1||s.complete===true),'Непълен оригинал на преписката');
  check(texts.length>0,'Липсва прочетен документален текст');
  // Documents within a ZIP can outnumber KT126 stored sources.
  // Use the extracted source filename as the within-archive identity.
  const seen=new Set();
  const documents=texts.map(d=>{
   const fileId=str(d?.source);
   check(fileId&&!seen.has(fileId),'Повторен или неидентифициран документ в архива');
   seen.add(fileId);
   return closed({fileId,kind:str(d.kind)||'unknown',sourceText:str(d.text),
    evidenceRefs:closed([]),verification:'source_unverified'});
  });
  return closed({caseId,internalNumber:ctx.internalNumber,
   incomingNumber:str(ctx.externalNumber),version:String(ctx.revision),
   revision:ctx.revision,documents:closed(documents)});
 }
 return closed({authenticateRequest,authorizeCase,readDossier});
}
