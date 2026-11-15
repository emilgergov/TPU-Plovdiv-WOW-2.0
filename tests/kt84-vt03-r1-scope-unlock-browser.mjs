import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const faults=[];page.on('pageerror',e=>faults.push(e.message));
 await page.goto('http://127.0.0.1:8765/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.KT80ScopeEvidence?.snapshot&&window.KT84EVisual?.refresh&&document.getElementById('kt84ScopeUnlock'),null,{timeout:30000});
 const home=await page.evaluate(()=>{
  const fold=document.getElementById('kt84VT03Specialized');
  const tiles=[...document.querySelectorAll('#kt80DashboardFive .kt80-dashboard-tile')];
  return {fold:!!fold,collapsed:!fold?.open,tiles:tiles.length,
   greens:tiles.filter(t=>t.dataset.kt83State==='future').length,
   golds:tiles.filter(t=>t.dataset.kt83State==='next').length};
 });
 assert.equal(home.fold,true);assert.equal(home.collapsed,true);
 assert.equal(home.tiles,5);assert.equal(home.golds,1,'exactly one next task should be gold');
 await page.locator('#kt80DashboardFive .kt80-dashboard-tile').nth(1).click();
 await page.waitForFunction(()=>!document.querySelector('.kt80-stage-panel[data-panel="2"]').hidden);
 const seed=await page.evaluate(()=>{
  const subject=document.getElementById('kt80SubjectText');
  const approval=document.getElementById('kt80SubjectConfirmation');
  const scope=document.getElementById('kt80ScopeText');
  const confirmation=document.getElementById('kt80ScopeConfirmation');
  subject.value='Преустройство на складова сграда в ПИ 56784.13.102';
  approval.checked=true;approval.dispatchEvent(new Event('change',{bubbles:true}));
  scope.value='Преустройство на съществуваща складова сграда с вътрешни строително-монтажни работи и съществуваща инженерна инфраструктура.';
  confirmation.checked=true;confirmation.dispatchEvent(new Event('change',{bubbles:true}));
  const unlock=document.getElementById('kt84ScopeUnlock');
  return {visible:!unlock.hidden,subject:approval.checked,scope:confirmation.checked};
 });
 assert.equal(seed.visible,true);assert.equal(seed.subject,true);assert.equal(seed.scope,true);
 await page.locator('#kt84ScopeUnlock').click();
 const released=await page.evaluate(()=>{
  const scope=document.getElementById('kt80ScopeText');
  return {subject:document.getElementById('kt80SubjectConfirmation').checked,
   scope:document.getElementById('kt80ScopeConfirmation').checked,
   editable:!scope.readOnly&&!scope.disabled,
   status:document.getElementById('kt80ScopeProposalStatus').textContent};
 });
 assert.equal(released.subject,true,'do not unfix approved subject');
 assert.equal(released.scope,false,'scope can be unlocked');
 assert.equal(released.editable,true,'scope textarea can be edited');
 assert.match(released.status,/Потвърждението на обхвата е отменено/);
 await page.evaluate(()=>{
  const scope=document.getElementById('kt80ScopeText');
  scope.value='Пловдив, район Северен.';
  scope.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('#kt80ScopeConfirmation').click();
 const location=await page.evaluate(()=>({
  checked:document.getElementById('kt80ScopeConfirmation').checked,
  open:document.getElementById('kt80V562Confirm').open,
  status:document.getElementById('kt80ScopeProposalStatus').textContent
 }));
 assert.equal(location.checked,false,'location-only scope must not be approved');
 assert.equal(location.open,false,'no confirmation dialog for known insufficient scope');
 assert.match(location.status,/само местоположение/);
 await page.evaluate(()=>{
  const scope=document.getElementById('kt80ScopeText');
  scope.value='Преустройство на съществуваща складова сграда с вътрешни строително-монтажни работи, без изграждане на нова инфраструктура.';
  scope.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('#kt80ScopeConfirmation').click();
 assert.equal(await page.locator('#kt80V562Confirm').evaluate(e=>e.open),true);
 await page.getByRole('button',{name:'Върни към редакцията'}).click();
 assert.equal(await page.locator('#kt80V562Confirm').evaluate(e=>e.open),false);
 assert.equal(await page.locator('#kt80SubjectConfirmation').isChecked(),true);
 assert.equal(await page.locator('#kt80ScopeConfirmation').isChecked(),false);
 assert.deepEqual(faults,[],'no uncaught UI exceptions');
 console.log('VT03_R1_SCOPE_UNLOCK_PASS',JSON.stringify({home,seed,released,location,faults}));
}finally{await browser.close();}
