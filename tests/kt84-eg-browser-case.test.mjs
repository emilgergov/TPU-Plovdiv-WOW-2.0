import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const URL='http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html';
async function testLate(kind){
 const page=await browser.newPage();
 try{
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
  const isScope=kind==='scope';
  const endpoint=isScope?'**/scope-improve':'**/subject-improve';
  let requestSeen,release;
  const arrived=new Promise(resolve=>requestSeen=resolve);
  const gate=new Promise(resolve=>release=resolve);
  await page.route(endpoint,async route=>{
   requestSeen();
   await gate;
   try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     proposal:isScope?'Остаряло EG предложение за обхват':'Остаряло EG предложение за предмет',
     reviewRequired:true,expertAcceptanceRequired:true
   })});}catch{}
  });
  await page.evaluate(scope=>{
   const sub=document.getElementById('kt80SubjectText');
   sub.value='Изграждане на технически обект в недвижим имот';
   sub.dispatchEvent(new Event('input',{bubbles:true}));
   if(scope){
    const check=document.getElementById('kt80SubjectConfirmation');
    check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));
    const field=document.getElementById('kt80ScopeText');
    field.value='Монтаж на електрическо оборудване в съществуваща сграда';
    field.dispatchEvent(new Event('input',{bubbles:true}));
   }
  },isScope);
  const button=isScope?'kt80ImproveScope':'kt80ImproveSubject';
  await page.locator('#'+button).evaluate(el=>el.click());
  const dialog=page.locator(isScope?'#kt80EGScopeDialog':'#kt80AISubjectDialog');
  await dialog.waitFor({state:'visible',timeout:10000});
  await dialog.locator('input[type=password]').fill('MOCK_BROWSER_PASSWORD');
  await dialog.locator('button[type=submit]').click();
  await Promise.race([arrived,new Promise((_,reject)=>setTimeout(()=>reject(Error('Mock EG request not received')),15000))]);
  await page.evaluate(()=>{
   const state=window.KT80WorkflowState;
   if(state)state.generation+=1;
   document.dispatchEvent(new Event('kt80:case-change'));
  });
  release();
  await page.waitForTimeout(400);
  const result=await page.evaluate(scope=>({
   reviewHidden:document.getElementById(scope?'kt80EGScopeReview':'kt80AISubjectReview')?.hidden===true,
   text:document.getElementById(scope?'kt80ScopeText':'kt80SubjectText')?.value,
   access:window.KT80EGSession?.hasAccess?.()===true
  }),isScope);
  assert.equal(result.reviewHidden,true,kind+': stale response must stay hidden');
  assert.equal(result.access,false,kind+': token must be cleared after case change');
  assert.doesNotMatch(result.text,/Остаряло EG предложение/,kind+': stale response must not mutate content');
  console.log('KT84_B_DELAYED_EG_'+kind.toUpperCase(),JSON.stringify(result));
 }finally{await page.close();}
}
try{
 await testLate('subject');
 await testLate('scope');
 console.log('KT84_B_REAL_BROWSER_CASE_ISOLATION_SUCCESS');
}finally{await browser.close();}
