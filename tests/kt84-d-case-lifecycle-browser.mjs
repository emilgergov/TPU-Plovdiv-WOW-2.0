import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>typeof window.KT80ResetCurrentCase==='function'&&window.KT80WorkflowState?.caseCycleId);
 const original=await page.evaluate(()=>({id:window.KT80WorkflowState.caseCycleId,generation:window.KT80WorkflowState.generation}));
 assert.match(original.id,/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
 await page.evaluate(()=>{
  // Delayed intake from a synthetic, non-confidential file, not a real dossier.
  window.__kt84Incoming={received:false,release:null};
  window.V26LocalIntake={process:()=>new Promise(resolve=>{
   window.__kt84Incoming.received=true;
   window.__kt84Incoming.release=()=>resolve({
    files:[],subject_candidates:[{title:'СТАРА ПРЕПИСКА — ДА НЕ СЕ ПРЕНАСЯ'}],
    classification:{leading_candidates:['56784.13.102']}
   });
  })};
 });
 await page.locator('#kt80InputFile').setInputFiles({name:'synthetic-case.zip',mimeType:'application/zip',buffer:Buffer.from('not-a-real-archive')});
 assert.equal((await page.evaluate(()=>window.KT80WorkflowState.caseCycleId)),original.id,'first file selection must not reset case ID');
 await page.locator('#kt80ProcessFile').click();
 await page.waitForFunction(()=>window.__kt84Incoming.received);
 const processing=await page.evaluate(()=>({id:window.KT80WorkflowState.caseCycleId,generation:window.KT80WorkflowState.generation}));
 assert.equal(processing.id,original.id);
 assert.equal(processing.generation,original.generation+1);
 const reset=await page.evaluate(()=>{
  const outcome=window.KT80ResetCurrentCase();
  const newCase={id:window.KT80WorkflowState.caseCycleId,generation:window.KT80WorkflowState.generation,
   intake:window.KT80WorkflowState.intake,subject:document.getElementById('kt80SubjectText').value};
  window.__kt84Incoming.release();
  return {outcome,newCase};
 });
 await page.waitForTimeout(180);
 const after=await page.evaluate(()=>({
  id:window.KT80WorkflowState.caseCycleId,
  generation:window.KT80WorkflowState.generation,
  intake:window.KT80WorkflowState.intake,
  subject:document.getElementById('kt80SubjectText').value,
  fileName:window.KT80WorkflowState.fileName,
  selectedFile:document.getElementById('kt80InputFile').files.length,
  step:window.KT80WorkflowState.step
 }));
 assert.notEqual(after.id,original.id,'explicit new case must have fresh UUID');
 assert.equal(after.id,reset.newCase.id);
 assert.ok(after.generation>processing.generation);
 assert.equal(after.intake,null,'old async intake must not be applied');
 assert.equal(after.subject,'','old subject must never leak');
 assert.equal(after.fileName,null);
 assert.equal(after.selectedFile,0);
 assert.equal(after.step,1);
 console.log('KT84_D_LATE_INTAKE_REJECTED',JSON.stringify({original,processing,reset,after}));
}finally{await page.close();await browser.close();}
