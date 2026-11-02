import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
const worker = (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const savedFetch=globalThis.fetch;
let calls=0;
let lastFacts=null;
globalThis.fetch=async (_url,opts)=>{
  calls++;
  assert.equal(opts.headers.Authorization,'Bearer test-openai-key');
  const request=JSON.parse(opts.body);
  lastFacts=request.input[1].content ? JSON.parse(request.input[1].content) : null;
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
  const legalFacts={...facts,legalSources:[
    {id:'verified-1',title:'Тестов нормативен източник',source:'Официален архив',article:'чл. 1',verifiedScope:'Проверен тестов обхват',page:'стр. 1',revisionVerified:true},
    {id:'unverified-1',title:'Непотвърден източник',source:'Неустановен',article:'чл. 2',verifiedScope:'Тест',revisionVerified:false}
  ]};
  const legalResponse=await worker.fetch(post('test-access-token',{mode:'expert',facts:legalFacts}),env);
  assert.equal(legalResponse.status,200);
  assert.equal(lastFacts.legalSources.length,1);
  assert.equal(lastFacts.legalSources[0].article,'чл. 1');
  assert.equal(lastFacts.legalSources[0].verifiedScope,'Проверен тестов обхват');
  assert.equal(lastFacts.legalSources[0].page,'стр. 1');
  assert.equal(lastFacts.legalSources[0].revisionVerified,true);
  // Verify public expert module wiring without invoking a paid provider.
  const {readFileSync}=await import('node:fs');
  const {Script,createContext}=await import('node:vm');
  const root=new URL('../../../v26-test/',import.meta.url);
  const screen=readFileSync(new URL('index.html',root),'utf8');
  const packageCode=readFileSync(new URL('v26-draft-package.js',root),'utf8');
  const expertCode=readFileSync(new URL('v26-expert-word.js',root),'utf8');
  for(const fragment of ['V27AIFacts.build','V27AIAuthor.generate','v27AiDraft,'])assert.ok(screen.includes(fragment),'missing screen integration: '+fragment);
  assert.ok(packageCode.includes('aiDraft:register?.v27AiDraft'));
  assert.ok(expertCode.includes('draft.aiDraft'));
  const sandbox={window:{}};
  createContext(sandbox);
  for(const file of ['v27-ai-facts.js','v26-expert-draft.js'])new Script(readFileSync(new URL(file,root),'utf8')).runInContext(sandbox);
  const verified=[{input:'40717.28.4',status:'Намерен',geojson:{features:[{geometry:{type:'Polygon'}}]}}];
  const roles={'40717.28.4':'leading'};
  const payload=sandbox.window.V27AIFacts.build({results:verified,roles,workingDraft:{metadata:{subject:'Тестово предложение'}}});
  assert.equal(payload.facts.parcelIds[0],'40717.28.4');
  assert.throws(()=>sandbox.window.V27AIFacts.build({results:verified,roles:{},workingDraft:{metadata:{subject:'Тест'}}}));
  const draft=sandbox.window.V26ExpertDraft.build({results:verified,roles,determination:{scenario:'А'},metadata:{parcelIds:'40717.28.4',subject:'„Тестово инвестиционно предложение“ в ПИ 40717.28.4'},paragraphs:['a','b','c','d'],aiDraft:'Тестов AI текст'});
  assert.equal(draft.aiDraft,'Тестов AI текст');
  const origin='https://emilgergov.github.io';
  const preflight=await worker.fetch(new Request(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}}),env);
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  const deniedPreflight=await worker.fetch(new Request(url,{method:'OPTIONS',headers:{Origin:'https://untrusted.example'}}),env);
  assert.equal(deniedPreflight.status,403);
  const browserRequest=new Request(url,{method:'POST',headers:{Origin:origin,Authorization:'Bearer test-access-token','Content-Type':'application/json'},body:JSON.stringify({mode:'expert',facts})});
  const browserResponse=await worker.fetch(browserRequest,env);
  assert.equal(browserResponse.status,200);
  assert.equal(browserResponse.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal(calls,4);
  console.log('PASS: health, unauthorized access, invalid input, classic and expert AI drafting (mock provider).');
  console.log('No real OpenAI API calls made; live generation still requires separate verification.');
} finally {globalThis.fetch=savedFetch}
