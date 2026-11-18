import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {overlayPresentationPolish} from '../src/kt126/presentation-polish.mjs';
import {installRegistryClient} from '../src/kt126/client.mjs';
const read=p=>readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
const stage4=overlayPresentationPolish('vt03/kt80/integration/kt116-expert-approval-handoff.mjs',read('vt03/kt80/integration/kt116-expert-approval-handoff.mjs'));
const stage5=overlayPresentationPolish('vt03/kt80/integration/kt117-stage5-document-author.mjs',read('vt03/kt80/integration/kt117-stage5-document-author.mjs'));
new vm.Script(stage5.replace(/^import[^\n]*\n/gmu,''));
const a=stage4.indexOf(' next.onclick=()=>{'),b=stage4.indexOf(' save.onclick=',a);
assert(a>=0&&b>a);
const nextCode=stage4.slice(a,b);
for(const allowed of [true,false]){
 const four={hidden:false},five={hidden:true,scrollIntoView(){}};
 const workflow={step:4,highest:4},events=[];
 const sandbox={next:{},approved:allowed?{caseId:'case-a',evidenceRevision:7,version:2}:null,current:()=>allowed,render5(){},five,
  window:{KT80WorkflowState:workflow,KT117Document:{refresh(){}}},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},
  document:{dispatchEvent(e){events.push(e)},querySelectorAll(selector){return selector==='.kt80-stage-panel'?[four,five]:[]}}};
 vm.runInNewContext(nextCode+'\nnext.onclick();',sandbox);
 assert.equal(workflow.step,allowed?5:4);assert.equal(workflow.highest,allowed?5:4);
 assert.equal(five.hidden,!allowed);assert.equal(events.length,allowed?1:0);
}
const client=installRegistryClient.toString();
const start=client.indexOf(' function snapshot(){'),end=client.indexOf(' function saveSoon',start);
const root={KT80WorkflowState:{step:4,intake:{},subjectConfirmed:{}},KT116ExpertHandoff:{checkpoint:()=>({approved:true})},KT117Document:{checkpoint:()=>({source:{caseId:'case-a'}})}};
const snap=vm.runInNewContext(client.slice(start,end)+'\nsnapshot();',{root,fields:[],savedGlobals:[],$(){},document:{querySelectorAll(){return [{hidden:true,dataset:{panel:'4'}},{hidden:false,dataset:{panel:'5'}}]}}});
assert.equal(snap.state.step,4);assert.equal(snap.navigation.step,5,'Visible Stage5 survives legacy state.step=4');
const choiceStart=client.indexOf('   const legacyStage5='),choiceEnd=client.indexOf("   if(step===5",choiceStart);
assert(choiceStart>=0&&choiceEnd>choiceStart);
const choose=client.slice(choiceStart,choiceEnd)+'\nstep;';
const run=(prior,approved=true)=>vm.runInNewContext(choose,{prior,root:{KT116ExpertHandoff:{snapshot:()=>approved?{caseId:'case-a'}:null}},record:{case_id:'case-a'},w:{}});
assert.equal(run({state:{step:4},stage5:{source:{caseId:'case-a'}}}),5,'Legacy saved project resumes Stage5 only with current approval');
assert.equal(run({navigation:{step:4},state:{step:4},stage5:{source:{caseId:'case-a'}}}),4,'Explicit return to Stage4 respected');
assert.equal(run({state:{step:4},stage5:{source:{caseId:'case-a'}}},false),4,'No approval means no automatic Stage5');
assert(stage5.includes('sourcePreviewOnly:diagnosticOnly'));
assert(stage5.includes('data.providerCalled===false'));
assert(stage5.includes("make('button','Провери източниците')"));
console.log('PASS KT130 resume: authorized next saves Stage5, actual visible navigation saved, legacy resume and explicit return respected; source inspection is separate from generation');
