import assert from 'node:assert/strict';
const worker=(await import(new URL('../src/worker.js',import.meta.url))).default;
const oldFetch=globalThis.fetch;
const ACCESS='integration-token';
const SHA='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
const env={OPENAI_API_KEY:'mock-no-paid-api',AI_AUTHOR_ACCESS_TOKEN:ACCESS};
const scenarios=[
 {name:'А — без пресичане',caseId:'KT105-A-001',parcel:'56784.13.102',gis:'OUTSIDE',source:'A-notification.pdf',description:'склад и офис'},
 {name:'Б — защитена зона',caseId:'KT105-B-002',parcel:'36676.129.457',gis:'INSIDE_N2000',source:'B-notification.pdf',description:'производствено помещение'},
 {name:'Б+ЗТ — ЗЗ и ЗТ',caseId:'KT105-BZT-003',parcel:'46989.205.218',gis:'INSIDE_N2000_AND_ZT',source:'BZT-notification.pdf',description:'инвестиционно предложение с установено пресичане'}
];
const contextLog=[];
let calls=0;
globalThis.fetch=async (_url,options)=>{
 calls++;
 const req=JSON.parse(options.body);
 const isAudit=req.input[0].content.includes('НЕЗАВИСИМ РЕЦЕНЗЕНТ');
 const context=JSON.parse(req.input[1].content);
 contextLog.push({isAudit,context});
 assert.equal(req.store,false);
 if(isAudit){
  assert(context.exactApplicableLawTexts.length>=10);
  assert.equal(context.fullArticleTextsAvailable,true);
  assert(context.caseDocumentExcerpts.length>0);
  return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'pass',issues:[],revisedDraft:''})}]}]}),{status:200});
 }
 assert(context.legalTextsExact.some(x=>x.reference==='Приложение № 2 към ЗООС'));
 assert(context.legalTextsExact.some(x=>x.reference==='чл. 2'));
 assert(context.caseDocuments.sourceTexts.length===1);
 const draft=[
  'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Конкретен проект за експертна проверка по наличните правни предпоставки.',
  'Фактическа основа',
  'Извлечените документи и пространствените данни са индивидуални за всяка преписка.',
  'Нормативни предпоставки и граници на проверката',
  'ЗООС, ЗБР и Наредбата за ОС се разглеждат по техните точни разпоредби и установените доказателства.',
  'Мотивирано предложение',
  'Проектното действие подлежи на експертно потвърждение без предварително зададен процедурен резултат.',
  'Данни за експертна проверка',
  'Категориите и приложимите изключения се сверяват с първичните нормативни разпоредби.'
 ].join('\n');
 return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:draft}]}]}),{status:200});
};
try{
 for(const [idx,s] of scenarios.entries()){
  const p={task:'draft_normative_proposal',documentType:'PROJECT_NOT_ACT',
   caseId:s.caseId,caseIdType:'local-cycle',localCycleId:s.caseId,
   requestId:'regression-'+idx,generation:1,evidenceRevision:idx+1,
   subject:'ИП: '+s.description,scope:'Обхват на '+s.description+' в ПИ '+s.parcel,
   parcelIds:[s.parcel],
   completeCaseEvidence:{archiveName:'synthetic_'+idx+'.zip',sourceTextCount:1,sourceTextTruncated:false,
    documents:[{file:s.source,status:'TEXT_EXTRACTED'}],
    sourceTexts:[{source:s.source,text:'Тестов документ '+s.source+' за ПИ '+s.parcel,
     totalChars:90,truncated:false}],
    gis:{parcelIds:[s.parcel],spatial:s.gis,sourceSummary:[{factId:'gis_spatial_status',value:s.gis}]}},
   evidence:[{factId:'gis_spatial_status',value:s.gis,status:'established',
    sourceId:'GIS:TEST:'+s.caseId,sourceLocation:'Етап 3',description:'ГИС клас'}],
   archive:{name:'MASTER V11',sha256:SHA,verifiedReferences:[]},
   constraints:{expertApprovalRequired:true,neverIssueAct:true,noInventedFacts:true}};
  const response=await worker.fetch(new Request('https://example.test/stage4-proposal',{
   method:'POST',headers:{Origin:'https://emilgergov.github.io','Authorization':'Bearer '+ACCESS,'Content-Type':'application/json'},
   body:JSON.stringify(p)}),env);
  assert.equal(response.status,200,s.name);
  const result=await response.json();
  assert.equal(result.caseId,s.caseId);
  assert.equal(result.evidenceRevision,p.evidenceRevision);
  assert.equal(result.requestId,p.requestId);
  assert.equal(result.archiveEvidenceVerified,true);
  assert.equal(result.normativeAudit.reviewed,true);
  assert.equal(result.normativeAudit.fullArticlesVerified,true);
  assert.equal(result.expertReviewRequired,true);
  assert.equal(result.evidenceReceipt.archiveCorpusDocumentsAvailable,22);
  const gen=contextLog[2*idx].context,review=contextLog[2*idx+1].context;
  // KT112: compare what the actual two model calls receive, not merely
  // what the V11 loader can return in isolation.
  const exact=(items,ref)=>items.find(x=>x.reference===ref)?.fullLegalText||'';
  for(const modelInput of [gen.legalTextsExact,review.exactApplicableLawTexts]){
   assert.match(exact(modelInput,'чл. 2'),/чл\.\s*6а указва начина на процедиране/iu);
   assert.match(exact(modelInput,'чл. 2'),/процедурата се прекратява/iu);
   const os6a=modelInput.find(x=>x.act==='Наредба за ОС'&&x.reference==='чл. 6а');
   assert.match(os6a?.fullLegalText||'',/^Чл\.\s*6а\./u);
   assert.match(exact(modelInput,'Приложение № 1 към ЗООС'),/^Приложение № 1\s+към чл\.\s*92/u);
   assert.match(exact(modelInput,'Приложение № 2 към ЗООС'),/^Приложение № 2\s+към чл\.\s*93/u);
  }
  assert.equal(gen.parcelIds[0],s.parcel);
  assert.equal(gen.gisAnalysis.spatial,s.gis);
  assert.equal(gen.caseDocuments.sourceTexts[0].source,s.source);
  assert.equal(review.caseDocumentExcerpts[0].source,s.source);
  assert.equal(review.gisEvidence.spatial,s.gis);
  for(const other of scenarios.filter(x=>x!==s)){
   assert(!JSON.stringify(gen.caseDocuments).includes(other.source),'dossier leaked between cases');
  }
 }
 assert.equal(calls,6);
 console.log('PASS: KT105 A / B / B+ЗТ independent case isolation, full legal V11 retrieval, AI author and independent reviewer end-to-end (mock provider).');
}finally{globalThis.fetch=oldFetch}
