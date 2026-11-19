import assert from 'node:assert/strict';
import preview from '../preview/author-entry.mjs';
const origin='https://kt131-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const make=(headers={})=>new Request('https://author.invalid/subject-improve',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify({caseId:'11111111-1111-4111-8111-111111111111',subject:'Контролна сграда',facts:[]})});
const env={OPENAI_API_KEY:'fixture',AI_AUTHOR_PASSWORD_V27:'fixture-token'};
const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not reach paid provider')};
try{
 assert.equal((await preview.fetch(make(),env)).status,401,'Preview does not introduce anonymous access');
 const denied=await preview.fetch(make({'X-KT126-Case':'11111111-1111-4111-8111-111111111111','X-KT126-Session':'invalid'}),{...env,KT126_REGISTRY:{getCaseContext:async()=>null}});
 assert.equal(denied.status,403);assert.equal(denied.headers.get('X-KT131-Preview'),'editor-style-v1');
 const bad=new Request(make(),{headers:{Origin:origin+'.attacker.invalid','Content-Type':'application/json'}});assert.equal((await preview.fetch(bad,env)).status,401);
 assert.equal(calls,0);
}finally{globalThis.fetch=original}
console.log('PASS KT131 preview: exact origin normalization retains anonymous, foreign-origin and invalid-session rejection; no provider call.');
