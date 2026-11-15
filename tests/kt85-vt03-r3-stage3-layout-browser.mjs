import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const faults=[];page.on('pageerror',e=>faults.push(e.message));
 await page.goto('http://127.0.0.1:8765/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.KT85Stage3UX?.ready===true,null,{timeout:20000});
 await page.locator('#kt80DashboardFive .kt80-dashboard-tile').nth(2).click();
 await page.waitForFunction(()=>!document.querySelector('.kt80-stage-panel[data-panel="3"]').hidden,null,{timeout:12000});
 await page.waitForTimeout(700);
 const layout=await page.evaluate(()=>{
  const stage=document.querySelector('.kt80-stage-panel[data-panel="3"]');
  const map=document.getElementById('kt80GISMapWrap'), side=document.getElementById('kt85Stage3Sidebar'),actions=document.getElementById('kt85Stage3Actions');
  const m=map?.getBoundingClientRect(),s=side?.getBoundingClientRect();
  const help=stage.querySelector('.kt85-auxiliary');
  return {ready:window.KT85Stage3UX.ready,map:!!map,sidebar:!!side,actions:!!actions,
    left:m?.left,right:m?.right,sidebarLeft:s?.left,sidebarRight:s?.right,
    toolbar:!!map?.querySelector('#kt80GISContext'),
    spatialData:side?.contains(document.getElementById('kt80GISDetail')),
    pdf:actions?.contains(document.getElementById('kt80PDF1')),
    find:actions?.contains(document.getElementById('kt80FindParcels')),
    next:actions?.contains(document.getElementById('kt80ToLaw')),
    confirm:side?.contains(document.getElementById('kt80ParcelsConfirmation')),
    helpCollapsed:help?.open===false,
    mapVisible:!!m?.width && !!m?.height,
    span:document.querySelector('.kt85-gis-main')?.getBoundingClientRect().width,
    mainColumn:getComputedStyle(document.querySelector('.kt85-gis-main')).gridTemplateColumns,
    sourceEngine:!!window.KT80Stage3Result
  };
 });
 assert.equal(layout.ready,true);
 assert.equal(layout.map,true);
 assert.equal(layout.sidebar,true);
 assert.equal(layout.actions,true);
 assert.equal(layout.toolbar,true);
 assert.equal(layout.spatialData,true);
 assert.equal(layout.pdf,true);
 assert.equal(layout.find,true);
 assert.equal(layout.next,true);
 assert.equal(layout.confirm,true);
 assert.equal(layout.helpCollapsed,true);
 assert.equal(layout.mapVisible,true);
 assert.ok(layout.right<=layout.sidebarLeft,'map should be to the left of sidebar');
 assert.deepEqual(faults,[]);
 console.log('VT03_R3_STAGE3_LAYOUT_PASS',JSON.stringify({layout,faults}));
}finally{await browser.close();}
