import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 let authorRequests=0;
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/stage4-proposal',route=>{authorRequests++;return route.abort('blockedbyclient')});
 await page.goto('http://127.0.0.1:8765/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForSelector('#kt96EGAuthor',{state:'attached',timeout:30000});
 const initial=await page.evaluate(()=>{
  document.dispatchEvent(new CustomEvent('kt80:stage-open',{detail:{step:4}}));
  return {
   heading:document.querySelector('#kt96EGAuthor h3')?.textContent,
   evidence:document.querySelector('#kt105EvidenceOverview')?.textContent,
   actions:[...document.querySelectorAll('#kt96EGAuthor>button')].map(x=>x.textContent),
   statusVisible:getComputedStyle(document.querySelector('#kt96EGStatus')).display!=='none',
   leadVisible:getComputedStyle(document.querySelector('#kt104EGLead')).display!=='none',
   detailsVisible:getComputedStyle(document.querySelector('#kt104EGDetails')).display!=='none',
   legacyHidden:getComputedStyle(document.querySelector('#kt91Proposal')).display==='none'
  };
 });
 await page.waitForTimeout(650);
 assert.equal(authorRequests,0,'Stage 4 must not initiate AI automatically');
 assert(initial.heading?.includes('EG AI Автор'));
 for(const stage of ['Етап 1','Етап 2','Етап 3'])assert(initial.evidence?.includes(stage),'missing established stage overview: '+stage);
 assert.deepEqual(initial.actions,['Изготви проект с EG Автора']);
 assert.equal(initial.statusVisible,false);
 assert.equal(initial.leadVisible,false);
 assert.equal(initial.detailsVisible,false);
 assert.equal(initial.legacyHidden,true,'legacy automatic proposal must stay hidden before expert action');
 assert.deepEqual(errors,[]);
 console.log('PASS: KT105 real Chromium Stage 4 initial overview, single author button, no automatic request, no visible legacy proposals');
}finally{await browser.close()}
