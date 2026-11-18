import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {sessionBridgeSource,overlaySessionAccess} from '../src/kt126/session-bridge.mjs';
import worker from '../../ai-author-v27/src/worker.js';
const origin='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev',caseId='11111111-1111-4111-8111-111111111111';
const requests=[],root={KT126Registry:{current:()=>({case_id:caseId})},fetch:async(url,options)=>{requests.push({url,options});return new Response('{}')}};
vm.runInNewContext(sessionBridgeSource,{window:root,location:{href:origin+'/module/'},URL,crypto,Response});
assert.equal(root.KT80EGSession.hasAccess(),true);
await root.KT80EGSession.request('https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/subject-improve',JSON.stringify({subject:'Сграда',facts:[]}),'must-not-be-used');
assert(!JSON.stringify(requests).includes('must-not-be-used'));assert.equal(requests[0].options.headers.Authorization,undefined);assert.equal(JSON.parse(requests[0].options.body).caseId,caseId);
await assert.rejects(root.KT80EGSession.request('https://attacker.invalid/author','{}'));
await assert.rejects(root.KT80EGSession.request('https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/subject-improve',JSON.stringify({caseId:'foreign'})));
for(const rel of ['vt03/kt80/KT80_EG_ACCESS_SESSION_V01.js','vt03/kt80/KT83_AI_SUBJECT_V572.js','vt03/kt80/KT83_AI_SCOPE_V572.js','vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs']){
 const source=readFileSync('../../'+rel,'utf8'),patched=overlaySessionAccess(rel,source);await transform(patched,{loader:'js',format:'esm'});
 assert(!/password\.value|dialog\.showModal|Парола за EG [Аа]втор/.test(patched));assert.throws(()=>overlaySessionAccess(rel,patched),'Overlays reject repeated mutation');
}
const env={OPENAI_API_KEY:'provider-fixture',AI_AUTHOR_PASSWORD_V27:'server-only-fixture',KT126_REGISTRY:{getCaseContext:async({caseId:id,action})=>id===caseId?{verified:true,caseId,actorId:'expert',externalNumber:'',revision:1}:null}};
const request=(path,body={},extra={})=>new Request('https://author.invalid'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-KT126-Case':caseId,'X-KT126-Session':'opaque-test-session',...extra},body:JSON.stringify({caseId,...body})});
const previous=globalThis.fetch;let providerCalls=0;
globalThis.fetch=async(_url,opts)=>{providerCalls++;assert.equal(opts.headers.Authorization,'Bearer provider-fixture');return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'Строителство на жилищна сграда без сутерен.'}]}]}),{status:200})};
try{
 const allowed=await worker.fetch(request('/subject-improve',{requestId:crypto.randomUUID(),subject:'Строителство на жилищна сграда без сутерен',facts:[]}),env);
 assert.equal(allowed.status,200,await allowed.clone().text());const response=await allowed.text();assert(!response.includes('server-only-fixture'));assert.equal(providerCalls,1);
 const scope=await worker.fetch(request('/scope-improve',{requestId:crypto.randomUUID(),subject:'Жилищна сграда',scope:'Строителство на жилищна сграда без сутерен.'}),env);assert.equal(scope.status,200,await scope.clone().text());
 for(const path of ['/author','/stage4-proposal','/stage4-expert-decision','/stage5-document']){const r=await worker.fetch(request(path),env);assert([400,409,422].includes(r.status),path+' reaches preserved payload validation without a browser token: '+r.status);}
 const paid=providerCalls;
 for(const registry of [undefined,{getCaseContext:async()=>null},{getCaseContext:async()=>({verified:true,caseId:'foreign'})}])assert.equal((await worker.fetch(request('/subject-improve',{subject:'Сграда',facts:[]}),{...env,KT126_REGISTRY:registry})).status,403);
 assert.equal((await worker.fetch(request('/subject-improve',{caseId:'foreign',subject:'Сграда',facts:[]}),env)).status,409);
 const publicRequest=new Request('https://author.invalid/subject-improve',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({subject:'Сграда',facts:[],KT126_CASE_CONTEXT:{verified:true}})});assert.equal((await worker.fetch(publicRequest,env)).status,401);
 assert.equal(providerCalls,paid,'Denied sessions never reach provider');
}finally{globalThis.fetch=previous}
console.log('PASS KT128: no browser credential/dialogs; native session/case RPC before server-only credential; all author routes preserve gates; metadata separated from editorial input; legacy anonymous routes closed');
