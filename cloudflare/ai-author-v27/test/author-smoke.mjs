import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
const worker = (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const savedFetch=globalThis.fetch;
const sampleDraft=[
 '[[CHARACTERIZATION]]',
 ...Array.from({length:4},(_,i)=>'Характеристика '+(i+1)+': конкретните параметри на инвестиционното предложение се съобразяват с представената проверима документация и пространствената основа.'),
 '[[LEGAL]]',
 ...Array.from({length:4},(_,i)=>'Правен анализ '+(i+1)+': наличните правни основания се използват като проектна преценка при проверка на индивидуалните обстоятелства, а не като окончателно произнасяне.'),
 '[[PROCEDURE]]',
 ...Array.from({length:2},(_,i)=>'Процедура '+(i+1)+': приложимостта следва да се определи въз основа на установените доказателства, без автоматична преценка единствено по пространствено пресичане.'),
 '[[IMPACTS]]',
 ...Array.from({length:6},(_,i)=>'Въздействие '+(i+1)+': индивидуалният пространствен анализ следва да отчете относимите параметри на проекта и предмета на опазване, без неподкрепен категоричен извод.')
].join('\n\n');
let calls=0;
let lastFacts=null;
globalThis.fetch=async (_url,opts)=>{
  calls++;
  assert.equal(opts.headers.Authorization,'Bearer test-openai-key');
  const request=JSON.parse(opts.body);
  lastFacts=request.input[1].content ? JSON.parse(request.input[1].content) : null;
  assert.equal(request.store,false);
  assert.equal(request.model,'gpt-4.1-mini');
  return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:sampleDraft}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
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
    assert.match(data.draft,/\[\[IMPACTS\]\]/);
  }
  const legalFacts={...facts,legalSources:[
    {id:'verified-1',title:'Тестов нормативен източник',source:'Официален архив',article:'чл. 1',verifiedScope:'Проверен тестов обхват',page:'стр. 1',revisionVerified:true},
    {id:'accepted-1',title:'Проектно приет източник',source:'Интегриран архив',article:'чл. 3',verifiedScope:'Приет текст',revisionVerified:false,projectRevisionAccepted:true},
    {id:'unverified-1',title:'Непотвърден източник',source:'Неустановен',article:'чл. 2',verifiedScope:'Тест',revisionVerified:false}
  ]};
  const legalResponse=await worker.fetch(post('test-access-token',{mode:'expert',facts:legalFacts}),env);
  assert.equal(legalResponse.status,200);
  assert.equal(lastFacts.legalSources.length,2);
  assert.equal(lastFacts.legalSources[1].article,'чл. 3');
  assert.equal(lastFacts.legalSources[1].projectRevisionAccepted,true);
  assert.equal(lastFacts.legalSources[1].revisionVerified,false);
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
  // KT67-2.6: a real-shaped five-impact reply must cause one full authorial
  // revision rather than a partial DOCX, generic filler, or six-way text split.
  const fiveImpacts=sampleDraft.replace(/\n\nВъздействие 6:[^\n]+$/u,'');
  let revisionCalls=0;
  globalThis.fetch=async (_url,opts)=>{
    revisionCalls++;
    const request=JSON.parse(opts.body);
    assert.equal(request.store,false);
    assert.equal(request.max_output_tokens,4200);
    if(revisionCalls===2){
      assert.equal(request.input.length,4);
      assert.match(request.input[3].content,/IMPACTS_COUNT 5\/6/);
    }
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:revisionCalls===1?fiveImpacts:sampleDraft}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const repairedResponse=await worker.fetch(post('test-access-token',{mode:'expert',facts}),env);
  assert.equal(repairedResponse.status,200);
  const repaired=await repairedResponse.json();
  assert.equal(repaired.revised,true);
  assert.equal(revisionCalls,2);
  assert.match(repaired.draft,/Въздействие 6/);
  console.log('PASS: five-impact AI response is automatically rewritten into six substantive sections before sending to browser.');

  // KT67-2.7 A and B use the same substantive repair, never swap the Word writer.
  for(const [mode,claim,code] of [
    ['classic','Оценката за съвместимост е необходима поради пространственото пресичане.','UNSUPPORTED_CATEGORICAL_OS'],
    ['expert','Обектът се намира в защитена територия (защитена зона BG0000194).','ZONE_TERRITORY_CONFLATION'],
    ['expert','Процедурният ред е ОСВОС въз основа на пресичането.','INVALID_OSVOS_TERM']
  ]){
    const faulty=sampleDraft.replace('Правен анализ 1:',claim+' Правен анализ 1:');
    let attempts=0;
    globalThis.fetch=async (_url,opts)=>{
      attempts++;
      const request=JSON.parse(opts.body);
      if(attempts===2)assert.match(request.input[3].content,new RegExp(code));
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:attempts===1?faulty:sampleDraft}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
    };
    const fixed=await worker.fetch(post('test-access-token',{mode,facts}),env);
    assert.equal(fixed.status,200,mode+' '+code);
    const answer=await fixed.json();
    assert.equal(answer.revised,true,mode+' '+code);
    assert.equal(attempts,2,mode+' '+code);
    assert.equal(answer.draft,sampleDraft);
  }
  // Fail closed if the provider still emits the same unsupported conclusion.
  const categoric=sampleDraft.replace('Правен анализ 1:','Оценката за съвместимост е необходима поради пространственото пресичане. Правен анализ 1:');
  let rejectedCalls=0;
  globalThis.fetch=async()=>{
    rejectedCalls++;
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:categoric}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const blocked=await worker.fetch(post('test-access-token',{mode:'classic',facts}),env);
  assert.equal(blocked.status,422);
  const rejection=await blocked.json();
  assert(rejection.qualityIssues.includes('UNSUPPORTED_CATEGORICAL_OS'));
  assert.equal(rejectedCalls,2);
  console.log('PASS: A/B legal and Natura 2000 terminology revision, and fail-closed unresolved quality checks.');

  console.log('PASS: health, unauthorized access, invalid input, classic and expert AI drafting (mock provider).');
  console.log('No real OpenAI API calls made; live generation still requires separate verification.');
} finally {globalThis.fetch=savedFetch}
