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


  // KT97: real client-shaped Stage 4 request, with no secrets and no paid AI call.
  let stage4Calls=0,stage4Context=null;
  globalThis.fetch=async (_url,opts)=>{
    stage4Calls++;
    const sent=JSON.parse(opts.body);
    assert.equal(sent.store,false);
    if(sent.input[0].content.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ')){
      const audit=JSON.parse(sent.input[1].content);
      assert.equal(audit.fullArticleTextsAvailable,false);
      assert(audit.draft.includes('Фактическа основа'));
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
    }
    stage4Context=JSON.parse(sent.input[1].content);
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',
      text:'Фактическа основа\\nПотвърден е предметът и обхватът на конкретното предложение.\\n\\nНормативни предпоставки и граници на проверката\\nАрхивните указатели не удостоверяват приложимостта на нормите.\\n\\nМотивирано предложение\\nПредлага се проверка на конкретните правни предпоставки по наличните доказателства.\\n\\nДанни за експертна проверка\\nПроверява се наличният нормативен текст и относимостта му към предмета.'}]}]}),{status:200});
  };
  const stage4Url='https://example.test/stage4-proposal';
  const stage4Body={task:'draft_normative_proposal',documentType:'PROJECT_NOT_ACT',
   caseId:'case-KT97-001',caseIdType:'local-cycle',localCycleId:'case-KT97-001',
   generation:1,evidenceRevision:0,requestId:'request-kt97',
   subject:'Монтаж на съоръжение',scope:'Монтаж в съществуващ обект',
   parcelIds:['56784.13.102'],
   completeCaseEvidence:{archiveName:'p4.zip',sourceTextCount:1,sourceTextTruncated:false,
    documents:[{file:'notification.pdf',status:'TEXT_EXTRACTED'}],
    sourceTexts:[{source:'notification.pdf',text:'Потвърдено инвестиционно предложение: складове в ПИ 56784.13.102.',totalChars:83,truncated:false}],
    documentRecords:[{file:'notification.pdf',readable:true}],
    gis:{parcelIds:['56784.13.102'],spatial:'no intersection',sourceSummary:[]}},
   evidence:[{factId:'subject_confirmed',value:'true',status:'established',
    sourceId:'KT83',sourceLocation:'Етап 2',description:'Потвърден предмет'},
    {factId:'spatial_intersection',value:'unknown',status:'missing',
    sourceId:'KT83',sourceLocation:'Етап 3',description:'ГИС не е потвърден'}],
   archive:{name:'V11',sha256:'8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c',archivedTextIncluded:false,
    verifiedReferences:[{id:'ZOOS_93',act:'ЗООС',article:'чл. 93',textAnchor:'текстов указател',
     citationVerified:true,applicabilityVerified:false}]},
   constraints:{expertApprovalRequired:true,neverIssueAct:true,noInventedFacts:true}};
  const stage4Post=(auth,body,origin='https://emilgergov.github.io')=>
   new Request(stage4Url,{method:'POST',headers:{Origin:origin,
    'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},
    body:JSON.stringify(body)});
  const stage4Preflight=await worker.fetch(new Request(stage4Url,{method:'OPTIONS',
   headers:{Origin:'https://emilgergov.github.io'}}),env);
  assert.equal(stage4Preflight.status,204);
  assert.equal(stage4Preflight.headers.get('Access-Control-Allow-Origin'),'https://emilgergov.github.io');
  const noStage4Auth=await worker.fetch(stage4Post(null,stage4Body),env);
  assert.equal(noStage4Auth.status,401);assert.equal(stage4Calls,0);
  const malformedStage4=await worker.fetch(stage4Post('test-access-token',
   {...stage4Body,caseId:''}),env);
  assert.equal(malformedStage4.status,400);assert.equal(stage4Calls,0);
  const stage4Response=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(stage4Response.status,200);
  const stage4Data=await stage4Response.json();
  assert.equal(stage4Data.caseId,stage4Body.caseId);
  assert.equal(stage4Data.evidenceRevision,stage4Body.evidenceRevision);
  assert.equal(stage4Data.requestId,stage4Body.requestId);
  assert.equal(stage4Data.projectOnly,true);
  assert.equal(stage4Data.expertReviewRequired,true);
  assert.equal(stage4Data.archiveEvidenceVerified,false);
  assert.ok(stage4Data.draft.length>120);
  assert.equal(stage4Context.sourceHints[0].applicabilityVerified,false);
  assert.equal(stage4Context.archiveTextProvided,false);
  assert.equal(stage4Context.archiveExcerptProvenanceConfirmed,true);
  assert.equal(stage4Context.verifiedOfflineLegalExcerpts.length,8);
  assert.equal(stage4Context.verifiedOfflineLegalExcerpts[1].ref,'чл. 2, ал. 2');
  assert.equal(stage4Context.verifiedOfflineLegalExcerpts[1].applicable,null);
  assert.equal(stage4Context.caseDocuments.sourceTexts[0].source,'notification.pdf');
  assert.ok(stage4Context.caseDocuments.sourceTexts[0].text.includes('56784.13.102'));
  assert.equal(stage4Context.caseDocuments.sourceTexts[0].verified,false);
  assert.equal(stage4Context.gisAnalysis.spatial,'no intersection');
  assert.equal(stage4Context.uncertainFacts[0].status,'missing');
  assert.equal(stage4Calls,2);
  assert.equal(stage4Data.normativeAudit.reviewed,true);
  assert.equal(stage4Data.normativeAudit.reviewVerdict,'pass');
  assert.equal(stage4Data.normativeAudit.fullArticlesVerified,false);

  // KT104: do not allow a fabricated annex classification or wrong Natura 2000 title
  // to be silently presented as an accepted project.
  const forbiddenDrafts=[
    'Фактическа основа\\nДанни по преписката.\\nНормативни предпоставки и граници на проверката\\nНаредба за оценка за съвместимост с околната среда.\\nМотивирано предложение\\nДа се провери приложение № 2.\\nДанни за експертна проверка\\nИзточници.',
    'Фактическа основа\\nДанни по преписката.\\nНормативни предпоставки и граници на проверката\\nПриложение № 2 към Наредбата за ОВОС съдържа списък с категории дейности.\\nМотивирано предложение\\nДа се провери приложимостта.\\nДанни за експертна проверка\\nИзточници.'
  ];
  for(const forbidden of forbiddenDrafts){
    globalThis.fetch=async ()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:forbidden}]}]}),{status:200});
    const guarded=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
    assert.equal(guarded.status,422,'invalid legal characterization must not reach an expert as accepted draft');
    const reason=await guarded.json();
    assert(reason.qualityIssues.some(x=>x==='INCORRECT_COMPATIBILITY_TERMINOLOGY'||x==='CONFUSED_ZOOS_AND_EIA_ANNEX_2'));
  }
  console.log('PASS: KT104 misleading OS terminology and confused EIA annex rejected.');

  // KT105-C: separately test the independent review's fail-closed path.
  globalThis.fetch=async (_url,opts)=>{
    const sent=JSON.parse(opts.body);
    const second=sent.input[0].content.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ');
    const review=JSON.stringify({verdict:'reject',
      issues:['Не е доказана конкретна категория по приложение № 2 към ЗООС'],revisedDraft:''});
    const ordinary='ВОДЕЩО ПРЕДЛОЖЕНИЕ: Указване на начина на процедиране при проверка на законовите предпоставки.\\nФактическа основа\\nИзвлечени са данни от преписката и ГИС.\\nНормативни предпоставки и граници на проверката\\nОтношението към съответната категория по ЗООС следва да се установи от първичен нормативен текст.\\nМотивирано предложение\\nПредлага се конкретно мотивирано писмо за указване на начина на процедиране.\\nДанни за експертна проверка\\nПриложимостта на категорията остава непотвърдена.';
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:second?review:ordinary}]}]}),{status:200});
  };
  const independentReject=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(independentReject.status,422);
  assert((await independentReject.json()).qualityIssues.includes('INDEPENDENT_REJECTION'));
  console.log('PASS: KT105-C reviewer rejection blocks unsupported normative claim.');
  // KT105-C: a review revision must replace the first draft, not append or silently pass.
  const corrected='ВОДЕЩО ПРЕДЛОЖЕНИЕ: Указване на начина на процедиране по наличните обстоятелства при потвърдена компетентност.\\nФактическа основа\\nИмотът е установен в Етап 3, а предметът е експертно потвърден.\\nНормативни предпоставки и граници на проверката\\nПриложимостта на категорията по ЗООС остава непотвърдена.\\nМотивирано предложение\\nДа се посочат конкретните проверени предпоставки и да се дадат мотивирани указания съобразно закона.\\nДанни за експертна проверка\\nКомпетентността и категорията следва да бъдат потвърдени по първични източници.';
  globalThis.fetch=async (_url,opts)=>{
    const sent=JSON.parse(opts.body);
    const second=sent.input[0].content.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ');
    const review=JSON.stringify({verdict:'revise',issues:['Нужно е по-точно разграничаване на правните предпоставки'],revisedDraft:corrected});
    const initial='Фактическа основа\\nДанни по преписката.\\nНормативни предпоставки и граници на проверката\\nПриложимостта не е потвърдена.\\nМотивирано предложение\\nПредлага се проверка на правните предпоставки преди определяне на действие.\\nДанни за експертна проверка\\nИзточниците подлежат на проверка.';
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:second?review:initial}]}]}),{status:200});
  };
  const reviewedRevision=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(reviewedRevision.status,200);
  const revisionData=await reviewedRevision.json();
  assert.equal(revisionData.normativeAudit.reviewVerdict,'revise');
  assert.equal(revisionData.draft,corrected);
  assert.equal(revisionData.normativeAudit.fullArticlesVerified,false);
  console.log('PASS: KT105-C reviewer revision replaces original draft without claiming full-law verification.');



  console.log('PASS: KT97 Stage 4 protected route, CORS, evidence contract, case identity and archive honesty.');

  console.log('PASS: health, unauthorized access, invalid input, classic and expert AI drafting (mock provider).');
  console.log('No real OpenAI API calls made; live generation still requires separate verification.');
} finally {globalThis.fetch=savedFetch}
