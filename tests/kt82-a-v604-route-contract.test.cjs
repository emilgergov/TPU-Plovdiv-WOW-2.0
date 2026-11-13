// KT82 Package A V60.4 — route independence and script integration tests.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../kt80');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const route=read('KT82_A_STAGE5_ROUTE_ADVISER_V604.js');
const gis=read('KT82_A_FREE_GIS_V603.js');
const invalidation=read('KT82_A_EVIDENCE_INVALIDATION_V602.js');
const html=read('KT82_18_PACKAGE_A_V604_INTEGRATION_TEST.html');
test('integration page loads isolated A1-A4 versions without overwriting locked V22',()=>{
 for(const script of ['KT82_A_FREE_GIS_V603.js','KT82_A_EVIDENCE_INVALIDATION_V602.js','KT82_A_STAGE5_ROUTE_ADVISER_V604.js',
   'KT82_A_PDF1_V600.js','KT82_STAGE4_NORMATIVE_BRIDGE_V600.js','KT82_STAGE3_CONSOLIDATED_V600.js'])
   assert.ok(html.includes(script),script);
 for(const script of [route,gis,invalidation])assert.doesNotThrow(()=>new Function(script));
});
test('stage 5 never invents procedure without expert legal confirmation',()=>{
 const root={},document={readyState:'loading',addEventListener(){}};
 vm.runInNewContext(route,{window:root,document});
 const advise=root.KT82RouteAdvice.advise;
 const catalog=[{id:18,title:'Писмо',type:'administrative_document'},{id:17,title:'Жалба',type:'administrative_document'}];
 const noLaw=advise({type:'SIGNAL',subject:'Сигнал',lawConfirmed:null},catalog);
 assert.equal(noLaw.routeId,null);
 assert.match(noLaw.next,/№4/);
 const investment=advise({type:'INVESTMENT',subject:'Изграждане на обект',lawConfirmed:{expertConfirmed:true,legal:'Проверени предпоставки'},
  normativeGate:{decision:'REQUIRED'},parcelIds:['36676.129.457']},catalog);
 assert.equal(investment.routeId,null);
 assert.match(investment.next,/проверете/);
 const signal=advise({type:'SIGNAL',subject:'Сигнал',lawConfirmed:{expertConfirmed:true,legal:'Проверени предпоставки'}},catalog);
 assert.equal(signal.routeId,18);
 assert.match(signal.next,/потвърдете експертно/);
});
test('stage 5 candidate is case and evidence revision scoped',()=>{
 assert.match(route,/evidenceRevision:root\.KT82EvidenceInvalidation/);
 assert.match(route,/addEventListener\('kt82:evidence-invalidated'/);
 assert.match(route,/a\.caseId!==\(w\.caseCycleId\|\|null\)/);
 assert.match(route,/a\.evidenceRevision!==/);
});
test('old GIS callbacks are invalidated and workflow confirmations are removed',()=>{
 assert.match(gis,/addEventListener\('kt80:case-change',clear\)/);
 assert.match(gis,/if\(gen!==S\.epoch\)return/);
 for(const key of ['parcelsConfirmed','lawConfirmed','routeConfirmed','activeRoute'])
  assert.ok(invalidation.includes('workflow.'+key+'=null'),key);
 assert.match(invalidation,/root\.KT80FreeGISResults=null/);
});
