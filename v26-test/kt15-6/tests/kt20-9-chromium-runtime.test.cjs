'use strict';
// KT20.9: run the REAL published-style V26 page in Chromium.
// No mocked document renderers and no external AI credentials.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error.message)));
  await page.goto('http://127.0.0.1:8765/v26-test/kt15-6/index.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.V26DraftPackage&&window.V26TemplateWord&&window.V26ExpertWord&&window.V26AuthorBridge,{timeout:25000});
  const result=await page.evaluate(()=>{
   const names=['V26DraftPackage','V26TemplateWord','V26ExpertWord','V26AuthorBridge'];
   return {modules:names.map(n=>[n,typeof window[n]?.make,typeof window[n]?.resolve]),
    aiVisible:!!document.getElementById('v26AiReview'),
    proposal:!!document.getElementById('proposal'),
    fallback:window.V26AuthorBridge.resolve(null,'TEST',['56784.13.102'])};
  });
  assert(result.modules.every(x=>x[1]==='function'||x[2]==='function'),JSON.stringify(result.modules));
  assert.equal(result.aiVisible,false);
  assert.equal(result.proposal,true);
  assert.equal(result.fallback,null);
  assert.deepEqual(errors,[],errors.join('; '));
  console.log('PASS KT20.9: Chromium loaded actual V26 modules and invisible AI fallback');
  console.log('LIMIT: no dossier ZIP or actual PDF/DOCX generation was executed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
