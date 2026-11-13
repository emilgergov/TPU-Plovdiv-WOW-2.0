import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const dashboard=read('../KT80_E01_ARCH_WORKFLOW_DASHBOARD_V590.js');
const subjectEditor=read('../KT80_E01_AI_SUBJECT_IMPROVE_V571.js');
const worker=read('../../cloudflare/ai-author-v27/src/worker.js');
const base=read('../KT82_15_PACKAGE_A_V598_TEST.html');
const pilot=read('../KT83_05_INDEPENDENT_CASE_CYCLE_TEST.html');

function fakeUI(){
 const map=new Map(),listeners=new Map(),events=[],created=[];
 const newNode=id=>{
  const listeners=new Map();let val='',files=[];
  return {
   id,style:{},hidden:false,checked:false,disabled:false,selectedIndex:0,
   readOnly:false,textContent:'',title:'',dataset:{},className:'',
   classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},
   append(){},appendChild(){},replaceChildren(){},focus(){},showModal(){this.open=true},
   close(){this.open=false},insertAdjacentElement(){},
   addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
   dispatchEvent(e){for(const fn of (listeners.get(e.type)||[]))fn(e);return true},
   get value(){return val},set value(v){val=v;if(id==='kt80InputFile'&&v==='')files=[]},
   get files(){return files},set files(v){files=v}
  };
 };
 const get=id=>{const item=created.find(x=>x.id===id);if(item)return item;if(!map.has(id))map.set(id,newNode(id));return map.get(id)};
 const doc={
  readyState:'loading',
  body:{append(){}},getElementById:get,createElement:t=>{const item=newNode(t);created.push(item);return item},createTextNode:t=>({textContent:t}),
  querySelectorAll(){return []},querySelector(){return null},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
  dispatchEvent(e){events.push(e.type);for(const f of listeners.get(e.type)||[])f(e);return true}
 };
 let uuid=0;
 const root={crypto:{randomUUID:()=>('case-id-'+(++uuid))},KT80RouteCatalog:[],
  KT80DashboardHome(){},addEventListener(){}};
 const ctx={window:root,document:doc,Event:class{constructor(type){this.type=type}},
  AbortController,console,TextEncoder,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}}};
 return {doc,root,get,ctx,events,fire:type=>doc.dispatchEvent({type}),init:()=>doc.dispatchEvent({type:'DOMContentLoaded'})};
}
function startDashboard(){
 const ui=fakeUI();vm.runInNewContext(dashboard,ui.ctx,{filename:'V590.js'});ui.init();return ui;
}
function newFile(ui,name){
 ui.get('kt80InputFile').files=[{name}];
 ui.get('kt80InputFile').dispatchEvent({type:'change'});
}
test('ПНИ-цикъл 1: нов файл дава нов идентификатор, запазва избрания файл',()=>{
 const u=startDashboard(),a=u.root.KT80WorkflowState.caseCycleId;
 newFile(u,'А.zip');const b=u.root.KT80WorkflowState.caseCycleId;
 assert.notEqual(a,b);assert.equal(u.get('kt80InputFile').files[0].name,'А.zip');
 newFile(u,'Б.zip');assert.notEqual(u.root.KT80WorkflowState.caseCycleId,b);
 assert.equal(u.get('kt80InputFile').files[0].name,'Б.zip');
 assert.ok(u.events.includes('kt80:case-reset'));
 assert.ok(u.events.includes('kt80:case-change'));
});
test('ПНИ-цикъл 2: смяна А→Б изчиства всички основни полета и доказателства',()=>{
 const u=startDashboard();newFile(u,'А.zip');
 for(const id of ['kt80SubjectText','kt80ScopeText','kt80ParcelInput','kt80LegalNotes'])u.get(id).value='ОСТАТЪК ОТ А';
 for(const id of ['kt80SubjectConfirmation','kt80ScopeConfirmation','kt80ParcelsConfirmation','kt80LawConfirmed','kt80RouteConfirmation'])u.get(id).checked=true;
 u.root.KT80IPMasterDraft={parcel:'А'};u.root.KT80KT52Draft={subject:'А'};
 u.root.KT80WorkflowState.intake={name:'А'};
 u.root.KT80WorkflowState.subjectConfirmed={text:'А'};
 u.root.KT80WorkflowState.routeConfirmed={routeId:7};
 newFile(u,'Б.zip');
 for(const id of ['kt80SubjectText','kt80ScopeText','kt80ParcelInput','kt80LegalNotes'])assert.equal(u.get(id).value,'',id);
 for(const id of ['kt80SubjectConfirmation','kt80ScopeConfirmation','kt80ParcelsConfirmation','kt80LawConfirmed','kt80RouteConfirmation'])assert.equal(u.get(id).checked,false,id);
 assert.equal(u.root.KT80IPMasterDraft,undefined);
 assert.equal(u.root.KT80KT52Draft,undefined);
 assert.equal(u.root.KT80WorkflowState.subjectConfirmed,null);
 assert.equal(u.root.KT80WorkflowState.routeConfirmed,null);
 assert.equal(u.root.KT80WorkflowState.intake,null);
});
test('ПНИ-цикъл 3: еднакво име на файл не означава една и съща преписка',()=>{
 const u=startDashboard();newFile(u,'същото-име.zip');const a=u.root.KT80WorkflowState.caseCycleId;
 u.get('kt80SubjectText').value='ПРЕДМЕТ А';newFile(u,'същото-име.zip');
 assert.notEqual(a,u.root.KT80WorkflowState.caseCycleId);
 assert.equal(u.get('kt80SubjectText').value,'');
});
test('ПНИ-цикъл 4: пълното изчистване премахва и избрания файл',()=>{
 const u=startDashboard();newFile(u,'А.zip');const a=u.root.KT80WorkflowState.caseCycleId;
 const r=u.root.KT80ResetCurrentCase();
 assert.equal(r.reset,true);assert.notEqual(a,u.root.KT80WorkflowState.caseCycleId);
 assert.equal(u.get('kt80InputFile').files.length,0);
 assert.equal(u.root.KT80WorkflowState.generation,r.generation);
});
test('ПНИ-цикъл 5: стар асинхронен отговор А не попълва преписка Б',async()=>{
 const u=startDashboard();let resolveOld;
 u.root.V26LocalIntake={process:()=>new Promise(r=>{resolveOld=r})};
 newFile(u,'А.zip');u.get('kt80ProcessFile').dispatchEvent({type:'click'});
 const a=u.root.KT80WorkflowState.caseCycleId;
 newFile(u,'Б.zip');assert.notEqual(a,u.root.KT80WorkflowState.caseCycleId);
 resolveOld({files:[{name:'А'}],subject_candidates:['ПРЕДМЕТ А'],classification:{leading_candidates:[]}});
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(u.root.KT80WorkflowState.intake,null);
 assert.equal(u.get('kt80SubjectText').value,'');
});
test('ПНИ-цикъл 6: стара AI редакция на предмета не се появява в новата преписка',async()=>{
 const u=fakeUI();u.root.KT80WorkflowState={generation:1,caseCycleId:'A',subjectConfirmed:null,routeConfirmed:null};
 let done;u.root.KT80EGSession={hasAccess:()=>true,request:()=>new Promise(r=>{done=r})};
 u.get('kt80SubjectText').value='Еднакво заглавие';
 vm.runInNewContext(subjectEditor,u.ctx,{filename:'V571.js'});u.init();
 u.get('kt80ImproveSubject').dispatchEvent({type:'click'});
 u.root.KT80WorkflowState.caseCycleId='B';u.fire('kt80:case-change');
 done({ok:true,json:async()=>({proposal:'ОСТАРЯЛО ПРЕДЛОЖЕНИЕ А',reviewRequired:true,expertAcceptanceRequired:true})});
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(u.get('kt80SubjectText').value,'Еднакво заглавие');
 assert.equal(u.get('kt80AISubjectReview').hidden,true);
});
test('ПНИ-цикъл 7: трите Worker маршрута не пренасят AI разговор',()=>{
 assert.equal((worker.match(/\bstore\s*:\s*false/g)||[]).length,3);
 assert.doesNotMatch(worker,/\bprevious_response_id\b|\bconversation_id\b|\bthread_id\b/);
 assert.doesNotMatch(worker,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
 assert.ok(worker.includes('Cache-Control')&&worker.includes('no-store'));
});
test('ПНИ-цикъл 8: EG токенът остава в RAM и се обезсилва при смяна',()=>{
 const s=read('../KT80_EG_ACCESS_SESSION_V01.js');
 for(const e of ['kt80:case-reset','kt80:case-change','kt80:procedure-confirmed'])assert.ok(s.includes(e));
 assert.ok(s.includes('activeCase!==currentCase()'));
 assert.ok(s.includes('epoch===requestEpoch&&caseAtStart===currentCase()'));
});
test('ПНИ-цикъл 9: стабилната V598 не е променена от изолирания пилот',()=>{
 assert.ok(base.includes('KT80_E01_ARCH_WORKFLOW_DASHBOARD_V589.js'));
 assert.ok(base.includes('KT80_E01_AI_SUBJECT_IMPROVE_V570.js'));
 assert.ok(pilot.includes('KT80_E01_ARCH_WORKFLOW_DASHBOARD_V590.js'));
 assert.ok(pilot.includes('KT80_E01_AI_SUBJECT_IMPROVE_V571.js'));
 assert.ok(!pilot.includes('KT80_E01_ARCH_WORKFLOW_DASHBOARD_V589.js'));
});
test('ПНИ-цикъл 10: изчистването не изменя постоянния нормативен MASTER',()=>{
 const s=dashboard.slice(dashboard.indexOf('function resetAll('),dashboard.indexOf('function installBackNavigation('));
 assert.ok(!s.includes('v11-'));
 assert.ok(!s.includes('localStorage')&&!s.includes('sessionStorage'));
});
