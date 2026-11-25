'use strict';
// Isolated browser acceptance of KT134 client orchestration.
// All model and final-approval responses are mocked. No real dossiers or secrets.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const html='/vt03/kt80/KT134_PDF1_ISOLATED_REGRESSION_TEST.html';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const srv=http.createServer((req,res)=>{
 let pathname;
 try{pathname=new URL(req.url,'http://localhost').pathname}catch{return res.writeHead(400).end()}
 const file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,buf)=>{if(err){res.writeHead(err.code==='ENOENT'?404:500);return res.end()}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(buf)});
});
(async()=>{
 await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const url='http://127.0.0.1:'+srv.address().port+html;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>typeof window.KT134AutoMode?.active==='function'&&
   typeof window.KT96EGStage4?.refresh==='function'&&
   typeof window.KT116ExpertHandoff?.snapshot==='function'&&
   typeof window.KT117Document?.refresh==='function',undefined,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.KT134AutoMode.active()),false);
  await page.evaluate(()=>{
   const state=window.KT80WorkflowState||{};
   window.KT80WorkflowState={...state,caseId:'EG-TEST-1',generation:1,
    subjectConfirmed:{text:'Складово помещение',scope:'Преустройство на помещения',
      expertConfirmed:true,scopeConfirmed:true},
    intake:{archive_name:'Симулация.zip',files:[],document_texts:[]}};
   window.__kt134AcceptanceCalls={preliminary:0,final:0,adoption:0,word:0};
   window.KT134CandidateWorkerBase='https://kt134-test-candidate.example.workers.dev';
   const nativeFetch=window.fetch.bind(window);
   window.fetch=async(input,opts)=>{
    if(String(input).endsWith('/kt134-candidate-health'))
     return {ok:true,json:async()=>({status:'ready',contract:'KT134_EVIDENCE_SPAN_V1',
      candidateOnly:true,aiConfigured:true})};
    return nativeFetch(input,opts);
   };
   window.KT80EGSession={
    hasAccess:()=>true,
    request:async(url,payload)=>{
     if(!url.startsWith('https://kt134-test-candidate.example.workers.dev/'))
      throw Error('Auto route MUST NOT use production Worker');
     if(!url.endsWith('/stage5-document'))throw Error('Unexpected live request '+url);
     const data=JSON.parse(payload);
     if(data.task!=='draft_stage5_candidate'||data.expertConfirmed!==false)
      throw Error('Premature expert confirmation in Stage5');
     window.__kt134AcceptanceCalls.preliminary++;
     return {ok:true,json:async()=>({
      caseId:data.caseId,evidenceRevision:data.evidenceRevision,
      requestId:data.requestId,kt134PreFinal:true,expertConfirmed:false,
      draft:'Относно: „Складово помещение“\n\nВъв връзка с представената документация се излагат фактическите констатации от текущата преписка. Това е проект за последващо експертно одобрение, без издаден административен акт. Избраният панел е само предложение и правните основания подлежат на експертно потвърждение.',
      editorialFlags:[],kt134Content:{findings:[]}
     })};
    }
   };
   window.KT96EGStage4={refresh:()=>document.dispatchEvent(new CustomEvent('kt115:stage4-draft',{detail:{
    caseId:'EG-TEST-1',evidenceRevision:'rev-1',requestId:'REQ-1',qualityPassed:true,
    reviewerVerdict:'revise',qualificationGate:{sourceAnchorsMatched:true},
    qualificationProof:'MOCKED-NONPRODUCTION-PROOF',
    qualificationRecord:{selectedPanel:17},
    sourceDraft:'ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — Симулация на нормативен анализ.\nИЗБРАН ПАНЕЛ: 17 — Отговор по жалба\nВОДЕЩО ПРЕДЛОЖЕНИЕ: Изготвяне на проект на отговор, основан на конкретната преписка.'
   }}))};
   window.KT116ExpertHandoff={
    snapshot:()=>null,
    approveAutomatedFinal:async args=>{
     if(args.expert!=='Контролен експерт'||args.caseId!=='EG-TEST-1')
      throw Error('Wrong final approval contract');
     window.__kt134AcceptanceCalls.final++;
     return {ok:true,approved:{caseId:args.caseId}};
    }
   };
   window.KT117Document={
    refresh:()=>{},
    acceptAutomatedDocument:args=>{
     if(args.caseId!=='EG-TEST-1'||args.selectedPanelId!==17)
      throw Error('Wrong accepted document');
     window.__kt134AcceptanceCalls.adoption++;
     return {ok:true};
    }
   };
   window.KT119Download=async()=>{window.__kt134AcceptanceCalls.word++;return true};
  });
  await page.evaluate(()=>document.querySelector('#kt134AutoPipeline button').click());
  await page.waitForFunction(()=>window.KT134AutoMode?.phase()==='await-final',undefined,{timeout:10000});
  let before=await page.evaluate(()=>({...window.__kt134AcceptanceCalls}));
  assert.deepEqual(before,{preliminary:1,final:0,adoption:0,word:0},
   'No expert signing or Word before final user action');
  await page.evaluate(()=>{document.querySelector('#kt134AutoPipeline input').value='Контролен експерт'});
  await page.evaluate(()=>document.querySelectorAll('#kt134AutoPipeline button')[1].click());
  await page.waitForFunction(()=>window.KT134AutoMode?.phase()==='approved',undefined,{timeout:10000});
  let after=await page.evaluate(()=>({...window.__kt134AcceptanceCalls}));
  assert.deepEqual(after,{preliminary:1,final:1,adoption:1,word:1},
   'One final click must bind approval, text and Word once');
  console.log('KT134 AUTOMATIC BROWSER E2E: PASS — opt-in → prefinal → 1 expert approval → Word (mocked server)');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>srv.close());
