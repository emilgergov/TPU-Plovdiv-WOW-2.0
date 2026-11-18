import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const path='cloudflare/ai-author-v27/src/worker.js';
const before=execFileSync('git',['show','1e949e654f9d002f51f7e0b0e8629a78f43512d1:'+path],{encoding:'utf8'});
const native='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const expected=before.replace('const ALLOWED_ORIGIN="https://emilgergov.github.io";','const ALLOWED_ORIGIN="https://emilgergov.github.io";\nconst ALLOWED_ORIGINS=new Set([ALLOWED_ORIGIN,"'+native+'"]);')
 .replaceAll('origin===ALLOWED_ORIGIN','ALLOWED_ORIGINS.has(origin)')
 .replaceAll('origin!==ALLOWED_ORIGIN','!ALLOWED_ORIGINS.has(origin)')
 .replaceAll('"Access-Control-Allow-Origin":ALLOWED_ORIGIN','"Access-Control-Allow-Origin":origin')
 .replaceAll('h.set("Access-Control-Allow-Origin",ALLOWED_ORIGIN)','h.set("Access-Control-Allow-Origin",origin)');
const kt126Expected=expected
 .replace(" const safeReference=/^ОВОС[-– ]?\\d+[-–]\\d+\\s*\\/\\s*\\d{1,2}\\.\\d{1,2}\\.\\d{4}(\\s*г\\.?)?$/iu.test(incoming)?incoming:placeholder;\n"," // KT126 confirmed external number comes only from the private registry RPC.\n const registryReference=env.KT126_CASE_CONTEXT?.caseId===input.caseId?env.KT126_CASE_CONTEXT.externalNumber:null;\n const safeReference=registryReference!==null&&registryReference!==undefined?registryReference:/^ОВОС[-– ]?\\d+[-–]\\d+\\s*\\/\\s*\\d{1,2}\\.\\d{1,2}\\.\\d{4}(\\s*г\\.?)?$/iu.test(incoming)?incoming:placeholder;\n")
 .replace(" const refLine=\"Във връзка с постъпилата документация с вх. № \"+safeReference+\n"," const refLine=\"Във връзка с постъпилата документация\"+(registryReference!==null&&registryReference!==undefined?(safeReference?\" с Деловоден № \"+safeReference:\"\"):\" с вх. № \"+safeReference)+\n")
 .replace("  const origin=request.headers.get(\"Origin\")||\"\";\n","  const origin=request.headers.get(\"Origin\")||\"\";\n  // KT126: private RPC rechecks identity, active user and case-specific permission.\n  if(request.headers.has(\"X-KT126-Case\")){\n   const caseId=request.headers.get(\"X-KT126-Case\"),cookie=request.headers.get(\"X-KT126-Session\");\n   if(!env.KT126_REGISTRY||!cookie||request.method!==\"POST\")return reply({error:\"Case authorization required\"},403);\n   let context;try{context=await env.KT126_REGISTRY.getCaseContext({cookie,caseId,action:url.pathname===\"/stage5-document\"?\"document.generate\":url.pathname===\"/stage4-expert-decision\"?\"case.confirm\":\"case.edit\"})}catch{return reply({error:\"Case authorization unavailable\"},503)}\n   if(!context||context.verified!==true||context.caseId!==caseId)return reply({error:\"Case access denied\"},403);\n   let payload;try{payload=await request.clone().json()}catch{return reply({error:\"Invalid case request\"},400)}\n   if(payload?.caseId!==caseId)return reply({error:\"Case request mismatch\"},409);\n   env={...env,KT126_CASE_CONTEXT:context};\n  }\n  // End KT126 private RPC boundary.\n");
const kt128Expected=kt126Expected.replace("   env={...env,KT126_CASE_CONTEXT:context};\n","   env={...env,KT126_CASE_CONTEXT:context};\n   // KT128: only a freshly verified native case/session may use the server credential.\n   if(origin===\"https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev\"){\n    const serverToken=env.AI_AUTHOR_PASSWORD_V27||env.AI_AUTHOR_ACCESS_TOKEN;\n    if(typeof serverToken!==\"string\"||!serverToken)return reply({error:\"Author service not configured\"},503);\n    const bridgedHeaders=new Headers(request.headers);bridgedHeaders.set(\"Authorization\",\"Bearer \"+serverToken);bridgedHeaders.delete(\"Content-Length\");\n    const bridgedInit={headers:bridgedHeaders};\n    if(url.pathname===\"/subject-improve\"||url.pathname===\"/scope-improve\"){\n     const {caseId:transportCase,requestId:transportRequest,...editorial}=payload;bridgedInit.body=JSON.stringify(editorial);\n    }\n    request=new Request(request,bridgedInit);\n   }\n");
assert.equal(readFileSync(path,'utf8'),kt128Expected,'Only exact-origin transport, private case authorization and confirmed reference changes are allowed in the R6 author source');
const worker=(await import(pathToFileURL(process.cwd()+'/'+path))).default;
const paths=['/author','/subject-improve','/scope-improve','/stage4-proposal','/stage5-document','/stage4-expert-decision'];
for(const endpoint of paths){
 for(const origin of ['https://emilgergov.github.io',native]){
  const response=await worker.fetch(new Request('https://author.example.invalid'+endpoint,{method:'OPTIONS',headers:{Origin:origin}}),{});
  assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Vary'),'Origin');
  const post=await worker.fetch(new Request('https://author.example.invalid'+endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}),{});
  assert([401,503].includes(post.status),'No unauthenticated AI generation');assert.equal(post.headers.get('Access-Control-Allow-Origin'),origin);
 }
 for(const origin of ['https://attacker.invalid',native+'.attacker.invalid','null']){
  assert.equal((await worker.fetch(new Request('https://author.example.invalid'+endpoint,{method:'OPTIONS',headers:{Origin:origin}}),{})).status,403);
 }
}
console.log('PASS LOCAL100: exact original/native origins only; unauthenticated author routes remain closed; complete R6 business logic byte-identical after transport normalization.');

