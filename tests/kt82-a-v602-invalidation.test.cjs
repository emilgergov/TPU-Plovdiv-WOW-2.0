// KT82 Package A V60.2 — executable workflow invalidation regression.
// Run: node --test tests/kt82-a-v602-invalidation.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../kt80/KT82_A_EVIDENCE_INVALIDATION_V602.js'),'utf8');
function setup(){
 const listeners={};const nodes={};
 for(const key of ['kt80ParcelInput','kt80LawConfirmed','kt80RouteConfirmation','kt80ParcelsConfirmation','kt80RoutePanels'])
  nodes[key]={value:'',checked:true,hidden:false,addEventListener(name,fn){(this.events??={})[name]=fn;}};
 nodes.kt80ParcelInput.value='36676.129.457';
 const root={
  V26ParcelEditor:{normalize(value){const ids=String(value).split(';').map(s=>s.trim()).filter(Boolean);
   return {ids,invalid:[],uncertain:[]}}},
  KT80WorkflowState:{caseCycleId:'CASE-A',generation:0,
   subjectConfirmed:{text:'Одобрен предмет'},parcelsConfirmed:{ids:['36676.129.457'],expertConfirmed:true},
   lawConfirmed:{legal:'старо правно основание',expertConfirmed:true},
   routeConfirmed:{routeId:18,expertConfirmed:true},activeRoute:{id:18}},
  KT80FreeGISResults:{ids:['36676.129.457'],results:[{status:'Намерен'}]},
  KT80Stage3Result:{status:'GIS_RETURNED'},KT83NormativeEvidence:{status:'old'},
  KT82RouteAdviceLast:{routeId:18},KT82SpatialEvidenceLast:{scenario:'A_OUTSIDE'},
  KT82PDF1AreaAudit:[{raw_m2:1}],
  KT83NormativeBridge:{getEvidence(){return {caseId:'CASE-A',fresh:true}}}
 };
 const document={
  getElementById(id){return nodes[id]||null},
  addEventListener(name,fn){(listeners[name]??=[]).push(fn)},
  dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e)}
 };
 function CustomEvent(type,options){this.type=type;this.detail=options?.detail}
 vm.runInNewContext(source,{window:root,document,CustomEvent});
 return {root,document,nodes};
}
test('changing parcel invalidates ALL dependent confirmations and GIS snapshots',()=>{
 const {root,nodes}=setup();nodes.kt80ParcelInput.value='46989.205.218';
 nodes.kt80ParcelInput.events.input();
 assert.equal(root.KT80WorkflowState.subjectConfirmed.text,'Одобрен предмет');
 for(const v of ['parcelsConfirmed','lawConfirmed','routeConfirmed','activeRoute'])
  assert.equal(root.KT80WorkflowState[v],null,v);
 for(const v of ['KT80FreeGISResults','KT80Stage3Result','KT83NormativeEvidence','KT82RouteAdviceLast','KT82SpatialEvidenceLast','KT82PDF1AreaAudit'])
  assert.equal(root[v],null,v);
 for(const v of ['kt80LawConfirmed','kt80RouteConfirmation','kt80ParcelsConfirmation'])
  assert.equal(nodes[v].checked,false,v);
 assert.equal(nodes.kt80RoutePanels.hidden,true);
 assert.equal(root.KT82EvidenceInvalidation.getRevision(),1);
});
test('switch to another dossier even with identical parcel IDs invalidates cached evidence',()=>{
 const {root,document,nodes}=setup();
 root.KT80WorkflowState.caseCycleId='CASE-B';
 document.dispatchEvent({type:'kt80:case-change'});
 assert.equal(root.KT80FreeGISResults,null);
 assert.equal(root.KT80WorkflowState.lawConfirmed,null);
 assert.equal(root.KT80WorkflowState.subjectConfirmed.text,'Одобрен предмет');
 assert.equal(root.KT82EvidenceInvalidation.getRevision(),1);
});
test('identical input is idempotent, raw change and explicit invalidate are not',()=>{
 const {root,nodes}=setup();
 nodes.kt80ParcelInput.events.input();
 assert.equal(root.KT82EvidenceInvalidation.getRevision(),0);
 nodes.kt80ParcelInput.value=' 36676.129.457 ';
 nodes.kt80ParcelInput.events.input();
 assert.equal(root.KT82EvidenceInvalidation.getRevision(),1);
 root.KT82EvidenceInvalidation.invalidate();
 assert.equal(root.KT82EvidenceInvalidation.getRevision(),2);
});
test('context without parcel input remains possible and never invents spatial facts',()=>{
 const {root,nodes}=setup();
 nodes.kt80ParcelInput.value='';
 nodes.kt80ParcelInput.events.input();
 assert.equal(root.KT80FreeGISResults,null);
 assert.equal(root.KT80WorkflowState.subjectConfirmed.text,'Одобрен предмет');
 assert.equal(root.KT80WorkflowState.parcelsConfirmed,null);
 assert.equal(root.KT82EvidenceInvalidation.getParcelSignature(),'');
});
test('case reset invalidates stale state irrespective of raw parcel input',()=>{
 const {root,document}=setup();
 document.dispatchEvent({type:'kt80:case-reset'});
 assert.equal(root.KT80FreeGISResults,null);
 assert.equal(root.KT80WorkflowState.routeConfirmed,null);
 assert.equal(root.KT82EvidenceInvalidation.getRevision(),1);
});
