import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const file=process.argv[2];
assert.ok(file&&fs.existsSync(file),'Bundle path required, run esbuild before this test.');
const mod=await import(pathToFileURL(fs.realpathSync(file)).href);
const worker=mod.default;
assert.equal(typeof worker?.fetch,'function','Actual bundled Worker handler required');
const base='https://kt134-local.example',env={
 OPENAI_API_KEY:'TEST_ONLY_NO_REAL_API_KEY',
 AI_AUTHOR_ACCESS_TOKEN:'TEST_ONLY_NO_REAL_ACCESS_TOKEN',
 AI_AUTHOR_PASSWORD_V27:'TEST_ONLY_NO_REAL_PASSWORD'
};
let modelCalls=0;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.openai.com/v1/responses','No external service is allowed');
 modelCalls++;
 const req=JSON.parse(options.body);
 assert.equal(req.model,'gpt-4.1-mini');
 assert.equal(req.store,false);
 assert.ok(JSON.stringify(req).includes('Складово помещение'));
 return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({
  examined:true,notes:'Изследван е целият доказателствен откъс',
  claims:[
   {quote:'Складово помещение с площ 430 кв. м.',summary:'Посочена е площ 430 кв. м. в документа'},
   {quote:'Несъществуващ измислен дословен цитат',summary:'Неподкрепено твърдение'}
  ]
 })}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
};
try{
 const health=await worker.fetch(new Request(base+'/health'),env);
 assert.equal(health.status,200);
 const data=await health.json();
 assert.equal(data.status,'online');
 const legal=await worker.fetch(new Request(base+'/legal-archive-health'),env);
 assert.equal(legal.status,200);
 assert.equal((await legal.json()).status,'ready');
 const excerpt='Складово помещение с площ 430 кв. м. Работна преписка с уточнени параметри.';
 const body={task:'read_case_evidence_span',caseId:'KT134-LOCAL-A',evidenceRevision:5,
  requestId:'REQ-CANDIDATE-1',
  chunk:{source:'Техническо описание.pdf',documentIndex:0,start:0,end:excerpt.length,
   totalChars:excerpt.length,text:excerpt}};
 const call=(auth,payload=body)=>worker.fetch(new Request(base+'/kt134-evidence-span',{
  method:'POST',headers:{"Content-Type":"application/json",...(auth?{Authorization:'Bearer '+auth}:{})},
  body:JSON.stringify(payload)}),env);
 const unauth=await call(null);assert.equal(unauth.status,401,'Unauthorized request must not use AI');
 assert.equal(modelCalls,0);
 const bad=await call('TEST_ONLY_NO_REAL_ACCESS_TOKEN',{...body,chunk:{...body.chunk,end:100000}});
 assert.equal(bad.status,400,'Tampered offsets must be rejected before AI');
 assert.equal(modelCalls,0);
 const response=await call('TEST_ONLY_NO_REAL_ACCESS_TOKEN');
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.caseId,body.caseId);
 assert.equal(result.evidenceRevision,5);
 assert.equal(result.examined,true);
 assert.equal(result.sourceTextStored,false);
 assert.equal(result.claims.length,1,'Fabricated citation must be rejected');
 assert.equal(result.claims[0].quote,'Складово помещение с площ 430 кв. м.');
 assert.equal(result.claims[0].sourceQuoteMatched,true);
 assert.equal(result.claims[0].expertConfirmed,false);
 assert.equal(modelCalls,1,'Exactly one mocked provider call per evidence chunk');
 const preflight=await worker.fetch(new Request(base+'/kt134-evidence-span',{
  method:'OPTIONS',headers:{Origin:'https://emilgergov.github.io',
   'Access-Control-Request-Method':'POST',
   'Access-Control-Request-Headers':'authorization,content-type'}}),env);
 assert.equal(preflight.status,204,'GitHub Pages CORS preflight must work');
 console.log('KT134 CANDIDATE WORKER RUNTIME: PASS — actual bundled Worker; legal corpus; protected HTTP Request/Response; anchored source; simulated model (NO live AI calls).');
}finally{globalThis.fetch=nativeFetch;}
