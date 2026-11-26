/**
 * KT134 read-only, native-session-bound KT126 case-state reader.
 * KT125 enforces authentication + case ACL in its own production service.
 * This adapter NEVER receives a production D1 binding and NEVER copies the
 * case to public GitHub or isolated D1. The client cannot set trusted facts.
 */
const native='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const pattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=code=>{const e=new Error(code);e.code=code;throw e};
function decodeStrictJSON(text){
 try{const o=JSON.parse(text);if(o&&typeof o==='object'&&!Array.isArray(o))return o}
 catch{}
 fail('KT126_CASE_STATE_INVALID');
}
export function createKt134NativeCaseReader({nativeFetch,maxBytes=4_000_000}={}){
 if(typeof nativeFetch!=='function')fail('KT125_NATIVE_SERVICE_REQUIRED');
 return async function readCase({request,caseId}={}){
  if(!pattern.test(caseId||''))fail('KT134_CASE_UUID_REQUIRED');
  if(!(request instanceof Request))fail('KT125_REQUEST_REQUIRED');
  const cookie=request.headers.get('cookie')||'';
  if(!cookie||cookie.length>8000)fail('KT125_LOGIN_REQUIRED');
  // Native KT126 readState GET is /kt126/registry/:caseId (no /state suffix).
  const sourceUrl=native+'/kt126/registry/'+encodeURIComponent(caseId);
  const internal=new Request(sourceUrl,{method:'GET',headers:{
   'Accept':'application/json','Cookie':cookie
  },redirect:'manual'});
  let response;
  try{response=await nativeFetch(internal)}
  catch{fail('KT125_NATIVE_UNREACHABLE')}
  if(response.status===401||response.status===403)fail('KT125_CASE_ACCESS_DENIED');
  if(!response.ok)fail('KT126_CASE_STATE_UNAVAILABLE');
  if((response.headers.get('content-type')||'').split(';')[0].trim()!=='application/json')
   fail('KT126_CASE_STATE_UNEXPECTED_RESPONSE');
  if(Number(response.headers.get('content-length')||0)>maxBytes)
   fail('KT126_CASE_STATE_TOO_LARGE');
  const body=await response.text();
  if(new TextEncoder().encode(body).byteLength>maxBytes)fail('KT126_CASE_STATE_TOO_LARGE');
  const result=decodeStrictJSON(body);
  const embeddedId=result.caseId||result.case_id||
    result.record?.case_id||result.item?.case_id||result.registry?.case_id||result.case?.caseId;
  if(!embeddedId||embeddedId!==caseId)fail('KT125_DIFFERENT_CASE');
  if(result.error||result.authenticated===false)fail('KT125_CASE_ACCESS_DENIED');
  return Object.freeze({caseId,source:'KT125_NATIVE_CASE_ACL',
   state:result,readOnly:true,storedExternally:false});
 };
}
