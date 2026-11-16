import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
const worker = (await import(new URL('../src/worker.js', import.meta.url))).default;
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
      assert.equal(audit.fullArticleTextsAvailable,true);
      assert(audit.exactApplicableLawTexts.some(x=>x.reference==='чл. 93'));
      assert(audit.exactApplicableLawTexts.some(x=>x.reference==='Приложение № 2 към ЗООС'));
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
  assert.equal(stage4Data.archiveEvidenceVerified,true);
  assert(stage4Data.evidenceReceipt.archiveArticleTextsReceived>=8);
  assert.equal(stage4Data.evidenceReceipt.archiveCorpusDocumentsAvailable,22);
  assert.ok(stage4Data.draft.length>120);
  assert.equal(stage4Context.sourceHints[0].applicabilityVerified,false);
  assert.equal(stage4Context.archiveTextProvided,true);
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
  assert.equal(stage4Data.normativeAudit.fullArticlesVerified,true);

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
  assert.equal(revisionData.normativeAudit.fullArticlesVerified,true);
  console.log('PASS: KT105-C reviewer revision replaces original draft without claiming full-law verification.');

  // KT106: first draft may fail a deterministic quality check. The author receives
  // the precise defect and the original legal provisions, repairs ONCE, then the
  // independent reviewer checks the corrected version. No invalid text reaches UI.
  let kt106Calls=0;
  const invalidDraft='ВОДЕЩО ПРЕДЛОЖЕНИЕ: Оценка за съвместимост с околната среда.\\nФактическа основа\\nДокументи от преписката.\\nНормативни предпоставки и граници на проверката\\nОтносими норми.\\nМотивирано предложение\\nСъображения по конкретния случай.\\nДанни за експертна проверка\\nОстават експертни проверки.';
  globalThis.fetch=async (_url,opts)=>{
    kt106Calls++;
    const sent=JSON.parse(opts.body),system=sent.input[0].content;
    if(system.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ')){
      const audit=JSON.parse(sent.input[1].content);
      assert.equal(audit.draft,corrected);
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
    }
    if(system.includes('Преработи ПЪЛНИЯ проект')){
      const repair=JSON.parse(sent.input[1].content);
      assert(repair.qualityIssues.includes('INCORRECT_COMPATIBILITY_TERMINOLOGY'));
      assert(repair.legalTextsExact.some(x=>x.reference==='чл. 2'));
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:corrected}]}]}),{status:200});
    }
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:invalidDraft}]}]}),{status:200});
  };
  const kt106Repaired=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(kt106Repaired.status,200);
  const repairedData=await kt106Repaired.json();
  assert.equal(repairedData.draft,corrected);
  assert.equal(repairedData.normativeAudit.authorRepairs,1);
  assert.equal(kt106Calls,3);
  console.log('PASS: KT106 one automatic repair followed by independent normative verification; no invalid draft reaches expert.');

  // KT107: contradictory "no category established" + "decision not to conduct EIA"
  // must not be accepted, even if a model repeats it after one corrective request.
  const k107Bad='ВОДЕЩО ПРЕДЛОЖЕНИЕ: Да се издаде решение за непровеждане на ОВОС поради липса на доказано попадане в приложения № 1 или № 2 към ЗООС.\\nФактическа основа\\nСкладови помещения по индивидуална преписка.\\nНормативни предпоставки и граници на проверката\\nНе е установено попадане в приложения № 1 или № 2.\\nМотивирано предложение\\nДа се издаде решение за непровеждане на ОВОС.\\nДанни за експертна проверка\\nПравните предпоставки не са удостоверени.';
  let k107Calls=0;
  globalThis.fetch=async (_url,opts)=>{
    k107Calls++;
    const sent=JSON.parse(opts.body),sys=sent.input[0].content;
    if(sys.includes('Преработи ПЪЛНИЯ проект')){
      const req=JSON.parse(sent.input[1].content);
      assert(req.qualityIssues.includes('EIA_DECISION_WITHOUT_ESTABLISHED_SCREENING_JURISDICTION'));
    }
    if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ'))throw Error('Reviewer must not be called on unresolved contradiction');
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:k107Bad}]}]}),{status:200});
  };
  const kt107Blocked=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(kt107Blocked.status,422);
  const blockedBody=await kt107Blocked.json();
  assert(blockedBody.qualityIssues.includes('EIA_DECISION_WITHOUT_ESTABLISHED_SCREENING_JURISDICTION'));
  assert.equal(k107Calls,2);
  console.log('PASS: KT107 unsupported non-EIA decision rejected even after correction attempt.');

  // KT108: no proposed screening decision when classification is explicitly unresolved.
  const k108Bad='ВОДЕЩО ПРЕДЛОЖЕНИЕ: Директорът на РИОСВ да вземе решение за преценяване необходимостта от извършване на ОВОС за складовете, като попадането в приложение № 1 или № 2 към ЗООС не е установено.\\nФактическа основа\\nИзграждане на склад и офиси.\\nНормативни предпоставки и граници на проверката\\nКатегорията не е установена; съответствието с приложение № 2 е неясно.\\nМотивирано предложение\\nПредлага се провеждане на преценка за необходимостта от ОВОС без установена категория.\\nДанни за експертна проверка\\nНеобходими са доказателства за категория.';
  let k108Calls=0;
  globalThis.fetch=async (_url,opts)=>{
    k108Calls++;
    const sent=JSON.parse(opts.body),sys=sent.input[0].content;
    if(sys.includes('Преработи ПЪЛНИЯ проект')){
      const req=JSON.parse(sent.input[1].content);
      assert(req.qualityIssues.includes('EIA_SCREENING_PROPOSED_BEFORE_LEGAL_CLASSIFICATION'));
    }
    if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ'))throw Error('Review must not accept the contradictory screening proposal');
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:k108Bad}]}]}),{status:200});
  };
  const kt108Blocked=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(kt108Blocked.status,422);
  assert((await kt108Blocked.json()).qualityIssues.includes('EIA_SCREENING_PROPOSED_BEFORE_LEGAL_CLASSIFICATION'));
  assert.equal(k108Calls,2);
  console.log('PASS: KT108 screening applicability must be established before recommendation.');

  // KT109: 22-route catalog must reach both AI passes. A panel 02 without
  // a verified missing fact and source cannot pass; panel 02 is not a fallback
  // for uncertainty in legal qualification.
  const route02Bad=[
    'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Писмо за допълнителна информация.',
    'ИЗБРАН ПАНЕЛ: 02 — Писмо за допълнителна информация',
    'ЗАЩО ТОЗИ ПАНЕЛ: Неясно е коя процедура се прилага.',
    'ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Няма сигурност за панел 01 и панел 04.',
    'Фактическа основа','Складова сграда и офиси.',
    'Нормативни предпоставки и граници на проверката','Трябва да се определи законовата категория.',
    'Мотивирано предложение','Предлага се писмо за допълнителна информация.',
    'Данни за експертна проверка','Правната квалификация трябва да бъде извършена от органа.'
  ].join('\\n');
  let route02Calls=0;
  globalThis.fetch=async (_url,opts)=>{
    route02Calls++;
    const sent=JSON.parse(opts.body),sys=sent.input[0].content;
    if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ'))throw Error('Unsubstantiated panel 02 must not reach the reviewer');
    const req=JSON.parse(sent.input[1].content);
    assert.equal(req.routeCatalog.length,22);
    assert(req.routeCatalog.some(x=>x.id===2));
    assert(req.routeCatalog.some(x=>x.id===20));
    if(sys.includes('Преработи ПЪЛНИЯ проект'))
      assert(req.qualityIssues.includes('PANEL_02_MISSING_EVIDENCED_FACT_GAP'));
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:route02Bad}]}]}),{status:200});
  };
  const panel02Rejected=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(panel02Rejected.status,422);
  assert((await panel02Rejected.json()).qualityIssues.includes('PANEL_02_MISSING_EVIDENCED_FACT_GAP'));
  assert.equal(route02Calls,2);
  console.log('PASS: KT109 panel 02 rejected when no specific missing fact is traced to a dossier source.');

  const route02Qualified=[
    "ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — Видът на описаната в уведомлението складова дейност не съответства на установените нормативни категории.",
    "ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: НЕОПРЕДЕЛЕНА — В уведомлението липсва конкретният капацитет на съоръжението, който е решаващ физически факт при проверка на приложимия праг и категория по приложение № 2 ЗООС.",
    "ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: НЕОПРЕДЕЛЕНА — В уведомлението липсва конкретният вид технологичен процес, необходим за проверка на определена категория и правна предпоставка по чл. 2, ал. 1 Наредба за ОС.",
    "ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: НЕОПРЕДЕЛЕНА — В уведомлението липсва конкретният технически параметър на капацитета, без който не може да се провери правната предпоставка на чл. 2, ал. 2 Наредба за ОС.",
    'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Изготвяне на писмо за допълнителна информация за техническа характеристика на водоплътната яма.',
    'ИЗБРАН ПАНЕЛ: 02 — Писмо за допълнителна информация',
    'ЗАЩО ТОЗИ ПАНЕЛ: В представеното уведомление липсва конкретна информация за отпадъчните води; за проверка по относимата разпоредба е нужна характеристиката на съоръжението, която не е установена в наличния документ.',
    'ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Панел 01 изисква вече достатъчно потвърдени факти, а панел 04 предполага обоснован режим по ОВОС.',
    'Фактическа основа','Представена е преписка с предмет изграждане на складова сграда.',
    'Нормативни предпоставки и граници на проверката','Компетентният орган трябва да удостовери конкретната приложима норма и пропуснатото фактическо обстоятелство.',
    'Мотивирано предложение','Предлага се конкретно писмо по доказаната фактическа липса, а не искане възложителят да определя правната категория.',
    'Данни за експертна проверка','Преди одобрение се сверява оригиналното уведомление и липсата на сведения.'
  ].join('\n');
  let panel02AcceptedCalls=0;
  globalThis.fetch=async (_url,opts)=>{
    panel02AcceptedCalls++;
    const sent=JSON.parse(opts.body),sys=sent.input[0].content;
    const req=JSON.parse(sent.input[1].content);
    assert.equal(req.routeCatalog.length,22);
    if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ')){
      assert(req.draft.includes('ИЗБРАН ПАНЕЛ: 02'));
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
    }
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:route02Qualified}]}]}),{status:200});
  };
  const qualifiedRoute=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(qualifiedRoute.status,200);
  const qualifiedBody=await qualifiedRoute.json();
  assert.equal(qualifiedBody.normativeAudit.selectedPanelId,2);
  assert.equal(panel02AcceptedCalls,2);
  console.log('PASS: KT109 panel 02 remains possible when a specific sourced factual gap is stated and independently reviewed.');

  // KT110: an author draft containing hidden transport tokens must be corrected
  // before the second model is allowed to mark it reviewed.
  const kt110Valid=[
    "ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — Проверените категории от нормативния списък не съответстват на установената в уведомлението складова дейност.",
    "ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставката на конкретните параметри на складовата дейност с относимите нормативни категории потвърждава неприложимост на описаните позиции.",
    "ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — Проверените отделни хипотези на ал. 1 по представените документи не съответстват на описания предмет.",
    "ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — На база изяснения предмет, ГИС анализа и констатациите по ал. 1 компетентният орган разглежда начина на процедиране.",
    'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Проект за мотивирано писмо за начина на процедиране според прегледа на доказателствата.',
    'ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС',
    'ЗАЩО ТОЗИ ПАНЕЛ: Проверяват се отделно ал. 1 и ал. 2 от чл. 2 по наличните факти и архивния нормативен текст.',
    'ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Други резултати предполагат допълнителни установени правни предпоставки.',
    'Фактическа основа','Складове за промишлени стоки и офиси с установен имот.',
    'Нормативни предпоставки и граници на проверката','Юридическата квалификация на дейността се извършва от компетентния орган.',
    'Мотивирано предложение','Мотивирано писмо за начина на процедиране като проект за експертна проверка.',
    'Данни за експертна проверка','Фактите по уведомлението трябва да се сравнят с относимите законови категории.'
  ].join('\n');
  const kt110Invalid=kt110Valid.replace('Складове за промишлени стоки и офиси с установен имот.','Складове за промишлени стоки и офиси, spatial_intersection = false.');
  let kt110Calls=0;
  globalThis.fetch=async (_url,opts)=>{
    kt110Calls++;
    const sent=JSON.parse(opts.body),sys=sent.input[0].content;
    const req=JSON.parse(sent.input[1].content);
    if(sys.includes('Преработи ПЪЛНИЯ проект')){
      assert(req.qualityIssues.includes('INTERNAL_GIS_TRANSPORT_TOKEN_IN_DRAFT'));
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:kt110Valid}]}]}),{status:200});
    }
    if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ')){
      assert.equal(req.draft,kt110Valid);
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
    }
    assert(sys.includes('КТ110'));
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:kt110Invalid}]}]}),{status:200});
  };
  const kt110Run=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(kt110Run.status,200);
  const kt110Json=await kt110Run.json();
  assert.equal(kt110Json.draft,kt110Valid);
  assert.equal(kt110Json.normativeAudit.authorRepairs,1);
  assert.equal(kt110Calls,3);
  console.log('PASS: KT110 strips internal GIS transport identifiers through bounded repair before independent review.');

  // KT123 bounded content cleanup: internal KT notes and self-certification.
  const kt123Invalid=kt110Valid.replace(
    'Фактите по уведомлението трябва да се сравнят с относимите законови категории.',
    'Съгласно КТ114 този проект изцяло съответства на всички нормативни изисквания и не са установени съществени липси или противоречия.'
  );
  let kt123Calls=0;
  globalThis.fetch=async(_url,opts)=>{
    kt123Calls++;
    const sent=JSON.parse(opts.body),sys=sent.input[0].content;
    if(sys.includes('Преработи ПЪЛНИЯ проект')){
      const req=JSON.parse(sent.input[1].content);
      assert(req.qualityIssues.includes('INTERNAL_TEST_REFERENCES_IN_EXPERT_DRAFT'));
      assert(req.qualityIssues.includes('UNSUPPORTED_AUTHOR_SELF_ASSESSMENT'));
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:kt110Valid}]}]}),{status:200});
    }
    if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ')){
      assert.equal(JSON.parse(sent.input[1].content).draft,kt110Valid);
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
    }
    assert(sys.includes('ИЗХОДНА СЪДЪРЖАТЕЛНА ДИСЦИПЛИНА'));
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:kt123Invalid}]}]}),{status:200});
  };
  const kt123Fixed=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(kt123Fixed.status,200);
  assert.equal((await kt123Fixed.json()).draft,kt110Valid);
  assert.equal(kt123Calls,3);
  console.log('PASS: KT123 internal references and unsupported self-rating are repaired before expert confirmation.');

  // KT123 final: reproduce the observed ambiguous urban-development reasoning.
  // A legal classification problem is not evidence of a missing physical area.
  const observedBad=kt110Valid
   .replace(
    'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставката на конкретните параметри на складовата дейност с относимите нормативни категории потвърждава неприложимост на описаните позиции.',
    'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: НЕОПРЕДЕЛЕНА — Липсва обаче ясна правна квалификация с точна категория и праг, поради непълна информация относно конкретната площ на обекта от наличния доклад по приложение № 2 ЗООС.'
   ).replace(
    'Фактите по уведомлението трябва да се сравнят с относимите законови категории.',
    'Настоящият проект е структуриран и преработен съгласно приложените материали и в пълно съответствие с приложимата нормативна уредба.'
   );
  let observedCalls=0,observedQuality=[];
  globalThis.fetch=async(_url,opts)=>{
   observedCalls++;
   const sent=JSON.parse(opts.body),system=sent.input[0].content;
   if(system.includes('Преработи ПЪЛНИЯ проект')){
    observedQuality=JSON.parse(sent.input[1].content).qualityIssues;
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:kt110Valid}]}]}),{status:200});
   }
   if(system.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ'))
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
   return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:observedBad}]}]}),{status:200});
  };
  const observedFixed=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(observedFixed.status,200,JSON.stringify(await observedFixed.clone().json()));
  assert.equal((await observedFixed.json()).draft,kt110Valid);
  assert.equal(observedCalls,3);
  assert(observedQuality.includes('UNDETERMINED_BASED_ON_LEGAL_CLASSIFICATION_GAP'),JSON.stringify(observedQuality));
  assert(observedQuality.includes('UNSPECIFIED_AREA_TYPE_IN_EVIDENCE_GAP'),JSON.stringify(observedQuality));
  assert(observedQuality.includes('DRAFT_SELF_CERTIFICATION_NOT_EVIDENCE'),JSON.stringify(observedQuality));
  console.log('PASS: KT123 legal-only uncertainty and unspecified building/property area trigger one bounded expert-safe repair.');

  // KT123: contradictory Art. 2(1) and 2(2) cannot be passed to the expert.
  const bothPositive=kt110Valid.replace(
   'ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — За описаната складова дейност са проверени релевантните хипотези, без установена приложимост на тези по ал. 1.',
   'ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — По описанието на дейността и местоположението в урбанизирана територия е предположена необходимост от ОС, въпреки че законовите основания все още не са съпоставени.'
  );
  assert.notEqual(bothPositive,kt110Valid,'KT123 fixture must alter the OS1 legal row');
  let contradictionIssues=[];
  globalThis.fetch=async (_url,opts)=>{
   const sent=JSON.parse(opts.body),sys=sent.input[0].content;
   if(sys.includes('Преработи ПЪЛНИЯ проект')){
    contradictionIssues=JSON.parse(sent.input[1].content).qualityIssues;
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:kt110Valid}]}]}),{status:200});
   }
   if(sys.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ'))
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
   return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:bothPositive}]}]}),{status:200});
  };
  const correctedBoth=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
  assert.equal(correctedBoth.status,200,JSON.stringify(await correctedBoth.clone().json()));
  assert(contradictionIssues.includes('OS_ART_2_1_AND_2_2_BOTH_POSITIVE'),JSON.stringify(contradictionIssues));
  assert.equal((await correctedBoth.json()).draft,kt110Valid);
  console.log('PASS: KT123 Art. 2(1)/Art. 2(2) contradiction triggers authorial correction before expert review.');

  // KT113 regression: panel 01 must NEVER be passed when a necessary
  // applicability test is positive or indeterminate instead of negative.
  const undecided=kt110Valid.replace(
    'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставката на конкретните параметри на складовата дейност с относимите нормативни категории потвърждава неприложимост на описаните позиции.',
    'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: НЕОПРЕДЕЛЕНА — Не е представен решаващ технически параметър за капацитета и вида на обекта в приложеното уведомление.'
  );
  const positive=kt110Valid.replace(
    'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставката на конкретните параметри на складовата дейност с относимите нормативни категории потвърждава неприложимост на описаните позиции.',
    'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ПОЛОЖИТЕЛНА — Съпоставката на действително документирани параметри на обекта с конкретната категория потвърждава приложимостта.'
  );
  for(const [name,invalid] of [['undetermined',undecided],['positive',positive],['missing',kt110Valid.replace(/^ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС:[^\n]*\n/u,'')]]){
    let callsKT113=0;
    globalThis.fetch=async (_url,opts)=>{
      callsKT113++;
      const sent=JSON.parse(opts.body),system=sent.input[0].content;
      if(system.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ'))throw Error('KT113 invalid comparison reached independent acceptance');
      if(system.includes('Преработи ПЪЛНИЯ проект')){
        const submitted=JSON.parse(sent.input[1].content);
        assert(submitted.qualityIssues.some(x=>x==='PANEL_01_NOT_SUPPORTED_BY_NEGATIVE_CLASSIFICATION'||x==='MISSING_REASONED_LEGAL_COMPARISON'),name);
      }
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:invalid}]}]}),{status:200});
    };
    const blocked=await worker.fetch(stage4Post('test-access-token',stage4Body),env);
    assert.equal(blocked.status,422,name);
    const details=await blocked.json();
    assert(details.qualityIssues.some(x=>x==='PANEL_01_NOT_SUPPORTED_BY_NEGATIVE_CLASSIFICATION'||x==='MISSING_REASONED_LEGAL_COMPARISON'),name);
    assert.equal(callsKT113,2,name);
  }
  console.log('PASS: KT113 panel 01 rejected on positive, indeterminate or missing legal matrix before independent review.');









  console.log('PASS: KT97 Stage 4 protected route, CORS, evidence contract, case identity and archive honesty.');

  console.log('PASS: health, unauthorized access, invalid input, classic and expert AI drafting (mock provider).');
  console.log('No real OpenAI API calls made; live generation still requires separate verification.');
} finally {globalThis.fetch=savedFetch}
