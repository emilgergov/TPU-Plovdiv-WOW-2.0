import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const faults=[];page.on('pageerror',e=>faults.push(e.message));
 await page.goto('http://127.0.0.1:8765/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.KT80KT53?.proposition&&window.KT84Feedback?.notify&&document.querySelector('#kt84FeedbackDock'),null,{timeout:30000});
 const result=await page.evaluate(()=>{
  const f={file:'test-input.pdf',page:2,excerpt:'Инвестиционното предложение предвижда подмяна на съществуващ мрежови трансформатор.',readerState:'TEXT_EXTRACTED'};
  const fake={subjectCandidate:'Подмяна на трансформатор в електрическа уредба',
   suggestedActivityTypes:[],activityTypeAmbiguous:false,unresolved:[],confirmedParameters:[],
   sections:[{key:'technical_scope',label:'Технически обхват',items:[
     {key:'replacement',label:'Подмяна на съоръжения',evidence:[f]},
     {key:'installation',label:'Монтаж и оборудване',evidence:[]}
   ]}]};
  const withFacts=window.KT80KT53.proposition(fake);
  const missing=window.KT80KT53.proposition({...fake,sections:[]});
  window.KT84Feedback.notify('Предметът е потвърден успешно.',{forceTone:'success'});
  const toast=document.querySelector('#kt84FeedbackDock .kt84-feedback');
  return {scope:withFacts.scope,empty:missing.scope,evidence:withFacts.evidence,summary:withFacts.scopeSummary,
   hasToast:!!toast,tone:toast?.dataset.tone,
   logs:window.KT84Feedback.historyCount()};
 });
 // KT105 preservation: expert-confirmed subject remains in concise scope;
 // unverified candidate excerpts belong in the separate evidence map, not in the approved scope.
 assert.match(result.scope,/Предметно определен обхват/);
 assert.match(result.scope,/Подмяна на трансформатор/);
 assert.doesNotMatch(result.scope,/непотвърдени кандидати за дейности|test-input\\.pdf/);
 assert.equal(result.evidence.replacement[0].file,'test-input.pdf');
 assert.match(result.evidence.replacement[0].excerpt,/подмяна на съществуващ/);
 assert.ok(!result.evidence.installation,'candidate without source must not enter evidence');
 assert.match(result.empty,/Предметно определен обхват/);
 assert.doesNotMatch(result.empty,/test-input\\.pdf/);
 assert.equal(result.hasToast,true);
 assert.equal(result.tone,'success');
 assert.equal(result.logs,1);
 // A legacy brown action banner must be replaced by one compact notice.
 await page.evaluate(()=>{
  document.getElementById('kt80FlowMessage').textContent='Автоматичната обработка приключи. Прегледайте документа.';
  document.getElementById('kt80InputStatus').textContent='Инвентаризирани файлове: 5 · извлечен текст: 1 · за проверка: 2 · непрочетени: 2.';
 });
 await page.waitForTimeout(150);
 const notices=await page.evaluate(()=>({
  count:document.querySelectorAll('#kt84FeedbackDock .kt84-feedback').length,
  oldHidden:document.getElementById('kt80FlowMessage').classList.contains('kt84-feedback-source-hidden'),
  logs:window.KT84Feedback.historyCount()
 }));
 assert.equal(notices.count,1,'never stack action notices');
 assert.equal(notices.oldHidden,true,'remove permanent brown flow banner');
 assert.ok(notices.logs>=2,'retain notice history in the log');
 await page.locator('#kt80DashboardFive .kt80-dashboard-tile').nth(1).click();
 await page.waitForFunction(()=>!document.querySelector('.kt80-stage-panel[data-panel="2"]').hidden);
 await page.evaluate(()=>{
  const subject=document.getElementById('kt80SubjectText');
  subject.value='Подмяна на електрическо оборудване';
  const confirmed=document.getElementById('kt80SubjectConfirmation');confirmed.checked=true;confirmed.dispatchEvent(new Event('change',{bubbles:true}));
  const scope=document.getElementById('kt80ScopeText');scope.value='Дейности и технически обхват на инвестиционното предложение:\nНе са установени достатъчно надеждни описания на конкретни предвидени дейности и строително-монтажни работи. Необходима е проверка на първичните документи.';
  scope.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('#kt80ScopeConfirmation').click();
 const insufficient=await page.evaluate(()=>({
  checked:document.getElementById('kt80ScopeConfirmation').checked,
  open:document.getElementById('kt80V562Confirm').open,
  status:document.getElementById('kt80ScopeProposalStatus').textContent
 }));
 assert.equal(insufficient.checked,false);
 assert.equal(insufficient.open,false);
 assert.match(insufficient.status,/Не може да потвърдите обхват|подлежи на експертна проверка/);
 assert.deepEqual(faults,[],'no uncaught exceptions');
 console.log('VT03_R2_SCOPE_FEEDBACK_PASS',JSON.stringify({result,insufficient,faults}));
}finally{await browser.close();}
