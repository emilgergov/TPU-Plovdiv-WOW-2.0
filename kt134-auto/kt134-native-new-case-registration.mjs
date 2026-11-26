/**
 * KT134 trusted registration adapter to the SAME native KT126 register used
 * by manual E1. No local sequence, generated number, or second database.
 * Deliberately NOT publicly routed until the original-file write protocol and
 * full automatic E1 handoff have been checked end to end.
 */
const NATIVE_ORIGIN='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(code){const error=new Error(code);error.code=code;throw error}
export function createKt134NativeCaseRegistration({nativeFetch}={}){
 if(typeof nativeFetch!=='function')fail('KT125_NATIVE_SERVICE_REQUIRED');
 return async function register({request,intakeValidated}={}){
  if(!(request instanceof Request))fail('KT125_REQUEST_REQUIRED');
  // E1 intake validation must precede allocation. Original uploads require
  // the newly allocated native caseId and follow on this SAME record.
  if(intakeValidated!==true)fail('KT134_INTAKE_NOT_VALIDATED');
  const url=new URL(request.url);
  if(request.method!=='POST'||url.pathname!=='/kt134/new-case/register')
   fail('KT134_REGISTER_METHOD_OR_PATH_INVALID');
  if(request.headers.get('origin')!==url.origin)
   fail('KT134_REGISTER_ORIGIN_REJECTED');
  if(request.headers.get('sec-fetch-site')==='cross-site')
   fail('KT134_REGISTER_CROSS_SITE_REJECTED');
  const cookie=request.headers.get('cookie')||'';
  if(!cookie||cookie.length>8000)fail('KT125_LOGIN_REQUIRED');
  // All user-supplied intake metadata is validated before consuming the shared
  // KT126 number. Never accept author content or a client-generated caseId.
  let metadata;
  const text=await request.text();
  if(text.length>1500)fail('KT134_INTAKE_METADATA_TOO_LARGE');
  try{metadata=JSON.parse(text)}catch{fail('KT134_INTAKE_METADATA_INVALID')}
  const allowed=['filename','size','sha256'];
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||
     Object.keys(metadata).some(k=>!allowed.includes(k))||
     typeof metadata.filename!=='string'||!metadata.filename.trim()||
     metadata.filename.length>255||/[\\/]/.test(metadata.filename)||
     !/\.(zip|pdf|docx)$/i.test(metadata.filename)||
     !Number.isSafeInteger(metadata.size)||metadata.size<1||metadata.size>40_000_000||
     !/^[a-f0-9]{64}$/i.test(metadata.sha256||''))
   fail('KT134_INTAKE_METADATA_INVALID');
  const forward=new Request(NATIVE_ORIGIN+'/kt126/registry/create',{
   method:'POST',redirect:'manual',headers:{
    'Accept':'application/json','Content-Type':'application/json',
    'Cookie':cookie,'Origin':NATIVE_ORIGIN,'Referer':NATIVE_ORIGIN+'/'
   },
   // The native KT126 E1 creates the record and allocates the unique number.
   body:'{}'
  });
  let response;
  try{response=await nativeFetch(forward)}
  catch{fail('KT125_NATIVE_UNREACHABLE')}
  if([301,302,303,307,308,401].includes(response.status))
   fail('KT125_LOGIN_REQUIRED');
  if(response.status===403)fail('KT125_CASE_CREATE_FORBIDDEN');
  if(!response.ok)fail('KT126_NATIVE_REGISTER_FAILED');
  if(!(response.headers.get('content-type')||'').includes('application/json'))
   fail('KT126_REGISTER_WRONG_RESPONSE_TYPE');
  const raw=await response.text();
  if(new TextEncoder().encode(raw).length>12000)fail('KT126_REGISTER_RESPONSE_TOO_LARGE');
  let data;try{data=JSON.parse(raw)}catch{fail('KT126_REGISTER_BAD_JSON')}
  const record=data?.record;
  const caseId=record?.case_id;
  const internalNumber=record?.internal_number;
  if(!UUID.test(caseId||'')||!Number.isInteger(Number(record?.revision))||
     !internalNumber||typeof internalNumber!=='string')
   fail('KT126_REGISTER_UNVERIFIED_RECEIPT');
  return {caseId,internalNumber,revision:record.revision,
   source:'KT126_SINGLE_NATIVE_REGISTER',numbering:'native-only',
   storedInIsolatedWorker:false};
 };
}
