/**
 * KT134 — use KT125's EXISTING native service RPC authorization.
 * This is a server-to-server method of the KT125 Worker, not a client claim.
 * KT125 verifies local session, active account, case ACL and requested action.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const str=x=>typeof x==='string'?x.trim():'';
export function createKt134NativeCaseAuthorization({nativeRpc}={}){
 if(typeof nativeRpc?.getCaseContext!=='function')
  fail('KT125_NATIVE_RPC_NOT_CONFIGURED');
 return async function verify({request,caseId,revision}={}){
  if(!(request instanceof Request)||!uuid.test(caseId||''))
   fail('KT134_CASE_UUID_REQUIRED');
  const cookie=request.headers.get('cookie')||'';
  if(!cookie||cookie.length>8000)fail('KT125_LOGIN_REQUIRED');
  let proof;
  try{
   proof=await nativeRpc.getCaseContext({
    cookie,caseId,action:'case.edit'
   });
  }catch{fail('KT125_NATIVE_RPC_UNAVAILABLE')}
  if(proof?.verified!==true||proof?.caseId!==caseId||
    !str(proof?.actorId))
   fail('KT125_CASE_EDIT_ACCESS_NOT_VERIFIED');
  const current=Number(proof?.revision);
  if(!Number.isSafeInteger(current)||String(current)!==String(revision))
   fail('KT125_CASE_REVISION_CHANGED');
  return Object.freeze({
   source:'KT125_NATIVE_RPC',verified:true,caseId,
   revision:String(current),actorId:proof.actorId,action:'case.edit',
   internalNumber:str(proof.internalNumber),
   externalNumber:str(proof.externalNumber)
  });
 };
}
