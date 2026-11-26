/**
 * KT134: read ONLY cases returned by the existing authenticated KT126
 * registry list. KT125 enforces case.read and organization access itself.
 * No D1 production binding, credentials in JS, or UUID required from expert.
 */
const ORIGIN='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const str=v=>typeof v==='string'?v.trim():'';
function caseItem(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return null;
 const id=str(v.case_id||v.caseId);
 if(!uuid.test(id))return null;
 return {
  caseId:id,
  internalNumber:str(v.internal_number||v.internalNumber),
  externalNumber:str(v.external_number||v.externalNumber),
  revision:Number.isSafeInteger(Number(v.revision))?Number(v.revision):null,
  title:str(v.subject||v.subject_text||v.title).slice(0,200)
 };
}
export function createKt134NativeCaseList({nativeFetch,maxBytes=300000}={}){
 if(typeof nativeFetch!=='function')fail('KT125_NATIVE_SERVICE_REQUIRED');
 return async function list({request}={}){
  if(!(request instanceof Request))fail('KT125_REQUEST_REQUIRED');
  const cookie=request.headers.get('cookie')||'';
  if(!cookie||cookie.length>8000)fail('KT125_LOGIN_REQUIRED');
  const url=ORIGIN+'/kt126/registry';
  let response;
  try{
   response=await nativeFetch(new Request(url,{method:'GET',headers:{
    'Accept':'application/json','Cookie':cookie
   },redirect:'manual'}));
  }catch{fail('KT125_NATIVE_UNREACHABLE')}
  if([301,302,303,307,308,401,403].includes(response.status))
   fail('KT125_LOGIN_REQUIRED');
  if(!response.ok)fail('KT126_CASE_LIST_UNAVAILABLE');
  if(!(response.headers.get('content-type')||'').includes('application/json'))
   fail('KT126_CASE_LIST_UNEXPECTED_RESPONSE');
  if(Number(response.headers.get('content-length')||0)>maxBytes)
   fail('KT126_CASE_LIST_TOO_LARGE');
  const raw=await response.text();
  if(new TextEncoder().encode(raw).byteLength>maxBytes)
   fail('KT126_CASE_LIST_TOO_LARGE');
  let data;
  try{data=JSON.parse(raw)}catch{fail('KT126_CASE_LIST_BAD_JSON')}
  if(!data||!Array.isArray(data.items)||data.error)
   fail('KT126_CASE_LIST_INVALID');
  const items=data.items.map(caseItem).filter(Boolean).slice(0,100);
  if(items.length!==data.items.length)
   fail('KT126_CASE_LIST_INVALID');
  return {authenticated:true,source:'KT125_NATIVE_REGISTRY_CASE_READ_ACL',
   items,caseDataStored:false};
 };
}
