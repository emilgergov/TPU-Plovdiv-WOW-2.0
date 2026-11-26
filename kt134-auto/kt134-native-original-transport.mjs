/**
 * KT134 native original-file transport. Every byte is sent to the SAME
 * KT126 registry as manual E1; nothing is stored in isolated KT134.
 * Routes remain internal until the full E1 intake bridge is verified.
 */
const NATIVE='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const problem=code=>{const e=new Error(code);e.code=code;throw e};
function destination(p){
 const start=/^\/kt134\/new-case\/original\/([0-9a-f-]{36})\/start$/i.exec(p);
 const part=/^\/kt134\/new-case\/original\/([0-9a-f-]{36})\/part\/([0-9]{1,5})$/i.exec(p);
 const finish=/^\/kt134\/new-case\/original\/([0-9a-f-]{36})\/finish$/i.exec(p);
 const id=start?.[1]||part?.[1]||finish?.[1];
 if(!id||!UUID.test(id))problem('KT134_INVALID_ORIGINAL_ROUTE');
 if(part&&Number(part[2])>4999)
  problem('KT134_PART_INDEX_INVALID');
 const step=start?'start':part?'part':'finish';
 const pathname='/kt126/registry/'+id+'/source/'+
  (step==='start'?'start':step==='finish'?'finish':'part/'+Number(part[2]));
 return {caseId:id,step,pathname};
}
export function createKt134NativeOriginalTransport({nativeFetch}={}){
 if(typeof nativeFetch!=='function')problem('KT125_NATIVE_SERVICE_REQUIRED');
 return async function transfer(request){
  if(!(request instanceof Request)||request.method!=='POST')problem('KT134_POST_REQUIRED');
  const url=new URL(request.url);
  if(request.headers.get('origin')!==url.origin||
     request.headers.get('sec-fetch-site')==='cross-site')
   problem('KT134_ORIGIN_REJECTED');
  const cookie=request.headers.get('cookie')||'';
  if(!cookie||cookie.length>8000)problem('KT125_LOGIN_REQUIRED');
  const {pathname,step}=destination(url.pathname);
  const size=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(size)||size<0||size>4_400_000)
   problem('KT134_ORIGINAL_PART_TOO_LARGE');
  const type=request.headers.get('content-type')||'';
  if((step==='start'||step==='finish')&&!type.startsWith('application/json'))
   problem('KT134_ORIGINAL_METADATA_JSON_REQUIRED');
  if(step==='part'&&!type.startsWith('application/octet-stream'))
   problem('KT134_ORIGINAL_PART_BINARY_REQUIRED');
  const body=await request.arrayBuffer();
  if(body&&body.byteLength>4_400_000)problem('KT134_ORIGINAL_PART_TOO_LARGE');
  if(step==='start'){
   let metadata;
   try{metadata=JSON.parse(new TextDecoder().decode(body))}
   catch{problem('KT134_ORIGINAL_METADATA_INVALID')}
   if(!metadata||Object.keys(metadata).sort().join(',')!=='filename,sha256,size'||
      typeof metadata.filename!=='string'||metadata.filename.length<1||
      metadata.filename.length>255||!Number.isSafeInteger(metadata.size)||
      metadata.size<1||metadata.size>40_000_000||
      !/^[a-f0-9]{64}$/i.test(metadata.sha256))
    problem('KT134_ORIGINAL_METADATA_INVALID');
  }
  let upstream;
  try{upstream=await nativeFetch(new Request(NATIVE+pathname,{
   method:'POST',redirect:'manual',headers:{
    Accept:'application/json',Cookie:cookie,Origin:NATIVE,Referer:NATIVE+'/',
    ...(step==='start'||step==='finish'?{'Content-Type':'application/json'}:
       step==='part'?{'Content-Type':'application/octet-stream'}:{})
   },body
  }))}
  catch{problem('KT125_NATIVE_UNREACHABLE')}
  if([301,302,303,307,308,401].includes(upstream.status))
   problem('KT125_LOGIN_REQUIRED');
  if(upstream.status===403)problem('KT125_CASE_ACCESS_DENIED');
  if(!upstream.ok)problem('KT126_ORIGINAL_UPLOAD_FAILED');
  const raw=await upstream.text();
  if(raw.length>12000)problem('KT126_ORIGINAL_RECEIPT_TOO_LARGE');
  let receipt;
  try{receipt=JSON.parse(raw)}catch{problem('KT126_ORIGINAL_RECEIPT_INVALID')}
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))
   problem('KT126_ORIGINAL_RECEIPT_INVALID');
  return {caseId:destination(url.pathname).caseId,stage:step,receipt,
   source:'KT126_NATIVE_ORIGINAL_STORE',storedInKT134:false};
 };
}
