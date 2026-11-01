import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
const worker = (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const savedFetch=globalThis.fetch;
let calls=0;
globalThis.fetch=async (_url,opts)=>{
  calls++;
  assert.equal(opts.headers.Authorization,'Bearer test-openai-key');
  const request=JSON.parse(opts.body);
  assert.equal(request.store,false);
  assert.equal(request.model,'gpt-4.1-mini');
  return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'ПРОЕКТ — за експертна проверка'}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
};
const env={OPENAI_API_KEY:'test-openai-key',AI_AUTHOR_ACCESS_TOKEN:'test-access-token'};
const url='https://example.test/author';
const facts={subject:'Тестово инвестиционно предложение',parcelIds:['99999.999.9999'],gisFindings:'НЯМА ДАННИ',legalReferences:'НЯМА ДАННИ'};
const post=(token,body)=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
try{
  const health=await (await worker.fetch(new Request('https://example.test/health'),env)).json();
  assert.equal(health.aiGenerationEnabled,true);
  const noAuth=await worker.fetch(post(null,{mode:'expert',facts}),env);
  assert.equal(noAuth.status,401);
  assert.equal(calls,0);
  const bad=await worker.fetch(post('test-access-token',{mode:'expert',facts:{subject:'No parcel'}}),env);
  assert.equal(bad.status,400);
  assert.equal(calls,0);
  for(const mode of ['classic','expert']){
    const response=await worker.fetch(post('test-access-token',{mode,facts}),env);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.mode,mode);
    assert.equal(data.reviewRequired,true);
    assert.match(data.draft,/ПРОЕКТ/);
  }
  assert.equal(calls,2);
  console.log('PASS: health, unauthorized access, invalid input, classic and expert AI drafting (mock provider).');
  console.log('No real OpenAI API calls made; live generation still requires separate verification.');
} finally {globalThis.fetch=savedFetch}
