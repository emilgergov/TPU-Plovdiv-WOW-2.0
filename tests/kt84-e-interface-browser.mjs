import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',
  {waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.KT84EVisual?.refresh&&window.KT83SafeStageFive?.open,
  null,{timeout:30000});
 const legal=await page.evaluate(()=>{
  const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
  const finding=document.getElementById('kt84PrimaryLegalFinding');
  const content=window.KT83RouteAccess?.currentV11?.();
  if(!finding)throw Error('Missing primary legal conclusion');
  const order=[...stage.children].indexOf(finding);
  const title=document.getElementById('kt84PrimaryLegalTitle').textContent;
  const reason=document.getElementById('kt84PrimaryLegalReason').textContent;
  const next=document.getElementById('kt84PrimaryLegalNext').textContent;
  return {order,title,reason,next,ready:finding.dataset.ready,legalCode:content?.code,
   font:getComputedStyle(finding).fontFamily,aria:finding.getAttribute('role')};
 });
 assert.equal(legal.order,0,'legal status must precede stage 4 controls');
 assert.equal(legal.ready,'false');
 assert.match(legal.title,/не е удостоверена/);
 assert.ok(legal.reason.length>10);
 assert.match(legal.next,/Предложение:/);
 assert.equal(legal.aria,'status');
 const intake=await page.evaluate(()=>{
  const audit=document.getElementById('kt84IntakeEvidenceResult');
  assertPresent(audit,'missing intake summary');
  window.KT80DossierAudit={records:[
   {state:'TEXT_EXTRACTED'},{state:'REVIEW_REQUIRED'},
   {state:'NOT_READ'},{state:'UNSUPPORTED'},{state:'NOT_READ'}
  ]};
  window.KT84EVisual.refresh();
  return {title:document.getElementById('kt84IntakeResultTitle').textContent,
   counts:document.getElementById('kt84IntakeResultCounts').textContent,
   next:document.getElementById('kt84IntakeResultNext').textContent,
   incomplete:audit.dataset.incomplete,
   position:[...audit.parentElement.children].indexOf(audit)};
  function assertPresent(node,message){if(!node)throw Error(message)}
 });
 assert.equal(intake.position,0);
 assert.equal(intake.incomplete,'true');
 assert.match(intake.counts,/Инвентаризирани: 5/);
 assert.match(intake.counts,/Извлечен текст: 1/);
 assert.match(intake.counts,/За проверка: 1/);
 assert.match(intake.counts,/Без надеждно извлечен текст: 3/);
 assert.match(intake.next,/оригиналите/);
 const before=await page.evaluate(()=>window.KT80WorkflowState.step);
 const preview=await page.evaluate(()=>{
  const result=window.KT83SafeStageFive.open();
  const layer=document.querySelector('.kt83-preview-overlay');
  const body=document.getElementById('kt83PreviewBody');
  return {result,open:!layer.hidden,
   outline:body.querySelectorAll('.kt84-stage5-outline li').length,
   details:body.querySelectorAll('details').length,
   forms:body.querySelectorAll('form,input,textarea,select').length,
   fullStageClone:!!body.querySelector('.kt80-stage-panel'),
   words:body.textContent.slice(0,1900),
   stage:window.KT80WorkflowState.step};
 });
 assert.equal(preview.result,true);
 assert.equal(preview.open,true);
 assert.equal(preview.outline,3);
 assert.equal(preview.details,0);
 assert.equal(preview.forms,0);
 assert.equal(preview.fullStageClone,false);
 assert.equal(preview.stage,before);
 assert.equal(errors.length,0,'no uncaught JavaScript exception');
 console.log('KT84_E_BROWSER_VISUAL_QA',JSON.stringify({legal,intake,preview,errors}));
}finally{await browser.close();}
