import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({acceptDownloads:true});
 const downloads=[];
 page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.goto('http://127.0.0.1:8765/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',
 {waitUntil:'domcontentloaded',timeout:90000});
 const before=await page.evaluate(()=>({
  step:window.KT80WorkflowState?.step,
  legal:window.KT83RouteAccess?.currentV11?.(),
  formalGate:window.KT83RouteAccess?.canOpenStage?.(5)
 }));
 assert.equal(before.formalGate,false,'unreviewed V11 cannot open Stage 5');
 await page.evaluate(()=>window.KT80WorkflowGo?.(5));
 await page.waitForTimeout(150);
 const after=await page.evaluate(()=>({
  step:window.KT80WorkflowState?.step,
  legal:window.KT83RouteAccess?.currentV11?.(),
  formalGate:window.KT83RouteAccess?.canOpenStage?.(5)
 }));
 assert.notEqual(after.step,5,'unverified legal case cannot enter formal Stage 5');
 assert.equal(after.formalGate,false);
 assert.equal(downloads.length,0,'no documents generated from blocked stage');
 console.log('KT84_G_UNVERIFIED_V11_BLOCKS_STAGE5',JSON.stringify({before,after,downloads}));
}finally{await browser.close()}
