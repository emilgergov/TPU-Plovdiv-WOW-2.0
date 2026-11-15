import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {zipSync,strToU8} from 'fflate';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const faults=[];page.on('pageerror',e=>faults.push(e.message));
 await page.goto('http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.V26LocalIntake?.process&&window.KT80SubjectMaster?.propose&&window.KT80DossierCompleteness?.audit,
  null,{timeout:30000});
 const subject='Подмяна на съществуващо оборудване в производствена сграда';
 const text='Уведомление за инвестиционно предложение.\\nОтносно: '+subject+
  '.\\nИнвестиционното предложение предвижда подмяна на съществуващи машини в сграда, без нови строителни работи.\\n'+
  'Местоположение: поземлен имот с идентификатор 56784.13.102.\\n';
 const zip=zipSync({'Uvedomlenie_OVOS.txt':strToU8(text), 'Neprocheten.doc':strToU8('test not a real DOC')},{level:0});
 await page.locator('#kt80InputFile').setInputFiles({name:'synthetic-vt03-source.zip',mimeType:'application/zip',buffer:Buffer.from(zip)});
 await page.locator('#kt80ProcessFile').evaluate(button=>button.click());
 await page.waitForFunction(()=>window.KT80WorkflowState?.intake?.files?.length===2,null,{timeout:30000});
 const result=await page.evaluate(()=>{
  const data=window.KT80WorkflowState.intake, audit=window.KT80DossierAudit, subject=window.KT80SubjectMaster.propose(data);
  return {records:audit.records.map(r=>({file:r.file,state:r.state})),source:subject.source,
   state:subject.sourceReadStatus,candidates:subject.candidates.length,
   field:document.getElementById('kt80SubjectText').value,
   status:document.getElementById('kt80SubjectProposalStatus').textContent,
   intakeStatus:document.getElementById('kt80InputStatus').textContent,
   caseId:window.KT80WorkflowState.caseCycleId,
   confirmed:!!window.KT80WorkflowState.subjectConfirmed,
   reconstruction:window.KT80KT52Draft?.subjectCandidate||null};
 });
 assert.equal(result.records.length,2);
 assert.ok(result.records.some(x=>x.file==='Neprocheten.doc'&&x.state!=='TEXT_EXTRACTED'));
 assert.equal(result.source,'Uvedomlenie_OVOS.txt');
 assert.equal(result.state,'TEXT_EXTRACTED');
 assert.equal(result.confirmed,false);
 assert.match(result.intakeStatus,/Инвентаризирани файлове: 2/);
 assert.ok(result.field.length>5,'real reader must provide an editable candidate');
 assert.ok(result.caseId.length>20);
 assert.equal(faults.length,0,'no uncaught UI exceptions: '+faults.join(' | '));
 console.log('KT84_FINAL_REAL_ZIP_BROWSER_CHAIN',JSON.stringify({result,faults}));
}finally{await browser.close();}
