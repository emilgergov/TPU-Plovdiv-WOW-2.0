/* KT84-C proof: a delayed competence audit must never promote or clear
   another case's independent V11 review. Test uses real Stage 4 UI,
   V11 registry and validation, with an explicitly mocked competence response.
*/
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',
  {waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.getElementById('kt83P5CommitV11'),null,{timeout:30000});
 const prep=await page.evaluate(()=>{
  const wf=window.KT80WorkflowState;
  if(!wf)throw Error('Missing real dossier state');
  wf.step=4;
  wf.generation=5;
  wf.subjectConfirmed={text:'Тестов предмет',scope:'Тестов обхват',expertConfirmed:true,scopeConfirmed:true};
  const rule={
   id:'test-v11',title:'Изпитване на заключен източник',
   registryId:'N_OS_6A',requirements:['TEST_FACT'],exceptions:[],
   exceptionAudit:{status:'no_known_exceptions',sourceId:'test-source',sourceLocation:'стр. 1',reason:'Само за технически тест'},
   missingFactProposal:'Предложение: изискайте доказателства.',
   supportedProposal:'Предложение: продължете нормативния контрол.',
   notSupportedProposal:'Предложение: проверете друга хипотеза.'
  };
  const fact={factId:'TEST_FACT',value:'true',sourceId:'test-source',sourceType:'Преписка',
   sourceLocation:'стр. 1',reason:'Само за тест',sourceQuote:'Тестово извлечение от документа'};
  document.getElementById('kt83V612Rules').value=JSON.stringify([rule]);
  document.getElementById('kt83V612Facts').value=JSON.stringify([fact]);
  const fields={
   kt83P5CompetentAuthority:'Директор на РИОСВ – Пловдив',
   kt83P5CompetenceMunicipality:'Пловдив',
   kt83P5CompetenceRegistry:'N_OS_6A',
   kt83P5CompetenceDocument:'test-source',
   kt83P5CompetenceLocation:'стр. 1',
   kt83P5CompetenceReason:'Техническа проверка за смяна на преписка'
  };
  for(const [id,value] of Object.entries(fields)){
   const el=document.getElementById(id);if(!el)throw Error('Missing field '+id);el.value=value;
  }
  document.getElementById('kt83P5CompetenceConfirmed').checked=true;
  const counters={submit:0,clear:0,promote:0,verify:0,resolve:null};
  window.__KT84V11Counters=counters;
  window.KT83B2CaseBridge={getAssessment:()=>({readyForStage5Draft:true})};
  window.KT83V11CaseEvidenceProvider={submit:()=>{counters.submit++;return {ok:true}},
   clear:()=>{counters.clear++}};
  window.KT83RouteAccess={commitVerifiedExpertReview:()=>{counters.promote++;return {ok:true}}};
  window.KT83IndependentCompetenceAudit={verify:()=>{counters.verify++;
   return new Promise(resolve=>{counters.resolve=resolve})}};
  document.getElementById('kt83P5CommitV11').click();
  return {caseId:wf.caseCycleId,generation:wf.generation,hasReviewUI:!!document.getElementById('kt83P5ExpertVerification')};
 });
 await page.waitForFunction(()=>window.__KT84V11Counters?.resolve!==null,null,{timeout:10000});
 const result=await page.evaluate(()=>{
  const c=window.__KT84V11Counters;
  const wf=window.KT80WorkflowState;
  wf.generation++;
  document.dispatchEvent(new Event('kt80:case-change'));
  const clearsAfterSwitch=c.clear;
  const statusAfterSwitch=document.getElementById('kt83P5ReviewStatus').textContent;
  c.resolve({verified:true});
  return {clearsAfterSwitch,statusAfterSwitch};
 });
 await page.waitForTimeout(200);
 const done=await page.evaluate(()=>{
  const c=window.__KT84V11Counters;
  return {submit:c.submit,clear:c.clear,promote:c.promote,verify:c.verify,
   status:document.getElementById('kt83P5ReviewStatus').textContent};
 });
 assert.equal(done.verify,1);
 assert.equal(done.submit,0,'old competence result cannot submit a V11 review');
 assert.equal(done.promote,0,'old competence result cannot open stage 5');
 assert.equal(done.clear,result.clearsAfterSwitch,'old asynchronous handler cannot clear the new case');
 assert.equal(done.status,result.statusAfterSwitch,'old result cannot change new case message');
 console.log('KT84_C_STALE_V11_AUDIT_BLOCKED',JSON.stringify({prep,result,done}));
}finally{await browser.close()}
