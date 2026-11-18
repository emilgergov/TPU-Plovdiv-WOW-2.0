import assert from 'node:assert/strict';
import vm from 'node:vm';
import {installRegistryClient} from '../src/kt126/client.mjs';
const source=installRegistryClient.toString();
const start=source.indexOf(' async function openCase(id){'),end=source.indexOf(' async function showRegister',start);
assert(start>=0&&end>start);
const open=source.slice(start,end);
const resetMatch=source.match(/document.addEventListener\('kt80:case-reset',([\s\S]*?)\);\n  document.addEventListener\('input'/);
assert(resetMatch);
const resetHandler=resetMatch[1];
async function run(mode){
 let release;const delayed=new Promise(r=>release=r);let apiReached,partReached;
 const reachedAPI=new Promise(r=>apiReached=r),reachedPart=new Promise(r=>partReached=r);
 let clicks=0,resetCount=0;
 const nodes={kt80InputFile:{files:[]},kt80SelectedFileName:{textContent:''},kt80ProcessFile:{click(){clicks++}}};
 const sandbox={queue:Promise.resolve(),record:null,restore:null,restoring:false,savedFingerprint:'old',requestKey:'initial',timer:null,
  async save(){},async api(path){if(path==='/case-a'){apiReached();if(mode==='early')await delayed;return {record:{case_id:'case-a',internal_number:'CONTROL'},state:{state:{intake:{files:[]}}}}}return {file:{complete:true,parts:1,filename:'control.zip',sha256:'verified'}}},
  async unpack(x){return x},async hash(){return 'verified'},confirm:()=>true,display(){},say(){},clearTimeout(){},
  crypto:{randomUUID:()=>String(Math.random())},
  fetch:async()=>{partReached();if(mode==='late')await delayed;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}},
  File:class {constructor(parts,name){this.name=name}async arrayBuffer(){return new ArrayBuffer(2)}},
  DataTransfer:class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)}}},
  $:id=>nodes[id],isCurrent:id=>sandbox.record?.case_id===id,
  root:{KT80WorkflowState:{caseCycleId:'initial'},KT80ResetCurrentCase(){resetCount++;vm.runInContext('('+resetHandler+')()',context)}}};
 const context=vm.createContext(sandbox);
 vm.runInContext(open+'\npendingOpen=openCase("case-a");',context);
 if(mode==='early'){await reachedAPI;vm.runInContext('('+resetHandler+')()',context);release()}
 if(mode==='late'){await reachedPart;vm.runInContext('('+resetHandler+')()',context);release()}
 await sandbox.pendingOpen;
 if(mode==='normal'){assert.equal(clicks,1);assert.equal(sandbox.record.case_id,'case-a');assert.equal(nodes.kt80InputFile.files.length,1)}
 else {assert.equal(clicks,0,'Late open must not click Process after explicit reset');assert.equal(sandbox.record,null);assert.equal(sandbox.restore,null);assert.equal(sandbox.restoring,false);assert.equal(nodes.kt80InputFile.files.length,0)}
 return resetCount;
}
assert.equal(await run('early'),0);
assert.equal(await run('late'),1);
assert.equal(await run('normal'),1);
const displayStart=source.indexOf(' function display(){'),displayEnd=source.indexOf(' async function storeSource',displayStart);
const node=()=>({textContent:'OLD',append(x){this.textContent+=x},classList:{toggle(){}},style:{}});
const nodes=Object.fromEntries(['kt126Number','kt126External','kt80CaseBadge','kt80DashboardNotice','kt126ActiveCase'].map(x=>[x,node()]));
const view={record:null,$:id=>nodes[id],document:{querySelector:()=>({}),createElement:node},externalLabel:x=>x};
vm.runInNewContext(source.slice(displayStart,displayEnd)+'\ndisplay();',view);
assert(!nodes.kt80CaseBadge.textContent.includes('OLD'));
assert.equal(nodes.kt126ActiveCase.textContent,'');
assert(nodes.kt80DashboardNotice.textContent.includes('Нова преписка'));
view.record={internal_number:'CONTROL',external_status:'confirmed',external_number:'CONTROL-EXTERNAL'};
vm.runInNewContext(source.slice(displayStart,displayEnd)+'\ndisplay();',view);
assert(nodes.kt80DashboardNotice.textContent.includes('Отворена преписка CONTROL'));
assert(!nodes.kt80DashboardNotice.textContent.includes('Всичко е изчистено'));
console.log('PASS KT130 reset: pending restore canceled before/after source load, normal restore preserved, no old file or ID resurrected, dashboard reflects real active case; no archive deletion');
