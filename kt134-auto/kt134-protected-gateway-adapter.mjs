// KT134 protected-host adapter (isolated). No credentials, passwords, secrets,
// CORS bypass, or direct OpenAI calls in this module.
const clean=x=>String(x??'').trim();
const supportedOperation='kt134.auto-dossier-analyze.v1';
function safeSession(session) {
 if(!session || session.active!==true || !clean(session.userId))throw Error('Няма активен експертен профил');
 return {userId:clean(session.userId),active:true};
}
function safeRequest(request) {
 if(!request || !clean(request.caseId) || request.mode!=='automatic_proposal')
  throw Error('Невалидна автоматична заявка');
 if(request.requireExpertApproval!==true)throw Error('Окончателното решение трябва да остане за експерта');
 if(!Array.isArray(request.documents)||request.documents.length===0)
  throw Error('Липсват документи за обработка');
 return Object.freeze({caseId:clean(request.caseId),dossierVersion:clean(request.dossierVersion),
  mode:'automatic_proposal',requireExpertApproval:true,documents:request.documents});
}
// invokeAuthorized MUST be a server-validated operation supplied by the KT125
// protected host. The browser's "active" flag is not adequate proof of authorization.
export function createProtectedAutoGateway({verifySession,invokeAuthorized}) {
 if(typeof verifySession!=='function'||typeof invokeAuthorized!=='function')
  throw Error('Липсва удостоверен сървърен механизъм за достъп');
 return Object.freeze({
  async run({session,request}) {
   const user=safeSession(session),payload=safeRequest(request);
   const verified=await verifySession();
   if(verified?.active!==true||!clean(verified.userId)||verified.userId!==user.userId)
    throw Error('Неуспешно сървърно удостоверяване на експерта');
   // The trusted host is responsible for per-case authorization, bounded transport
   // and using the server-side EG credentials. Never expose a bearer to the client.
   const result=await invokeAuthorized({operation:supportedOperation,caseId:payload.caseId,payload});
   if(!result || clean(result.caseId)!==payload.caseId)
    throw Error('Върнат е невалиден резултат за чужда преписка');
   if(result.expertConfirmed===true)throw Error('Недопустимо автоматично експертно потвърждение');
   return result;
  }
 });
}
