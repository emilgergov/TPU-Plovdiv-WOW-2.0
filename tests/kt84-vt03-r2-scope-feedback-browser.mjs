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
  return {scope:withFacts.scope,empty:missing.scope,
   hasToast:!!toast,tone:toast?.dataset.tone,
   logs:window.KT84Feedback.historyCount()};
 });
 assert.match(result.scope,/непотвърдени кандидати за дейности/);
 assert.match(result.scope,/Подмяна на съоръжения/);
 assert.match(result.scope,/test-input.pdf/);
 assert.doesNotMatch(result.scope,/^Основна дейност и обект:/);
 assert.match(result.empty,/Не са установени достатъчно надеждни описания/);
 assert.equal(result.hasToast,true);
 assert.equal(result.tone,'success');
 assert.equal(result.logs,1);
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
 assert.match(insufficient.status,/Не може да потвърдите обхват/);
 assert.deepEqual(faults,[],'no uncaught exceptions');
 console.log('VT03_R2_SCOPE_FEEDBACK_PASS',JSON.stringify({result,insufficient,faults}));
}finally{await browser.close();}
