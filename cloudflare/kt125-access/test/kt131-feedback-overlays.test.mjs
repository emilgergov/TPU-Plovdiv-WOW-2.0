import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {overlayModule} from '../src/kt126/gateway.mjs';
for(const rel of ['vt03/kt80/KT83_AI_SUBJECT_V572.js','vt03/kt80/KT83_AI_SCOPE_V572.js','vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs','vt03/kt80/integration/kt117-stage5-document-author.mjs']){
 const out=overlayModule(rel,readFileSync(new URL('../../../'+rel,import.meta.url),'utf8'));
 assert(out.includes('data.transportFailure===true'),rel);await transform(out,{loader:'js'});
 if(rel.endsWith('kt117-stage5-document-author.mjs'))assert(out.includes('const editorWordChanges='),'Serialized editor helper is present in deployed overlay');
}
console.log('PASS KT131 complete production overlay pipeline: all status messages and editor helper compile.');

// Transport feedback previously returned before checkpoint methods were added.
const rel='vt03/kt80/integration/kt117-stage5-document-author.mjs';
const source=overlayModule(rel,readFileSync(new URL('../../../'+rel,import.meta.url),'utf8'));
const start=source.indexOf(' window.KT117Document=Object.freeze({'),end=source.indexOf('\n });',start);
assert(start>=0&&end>start);const declaration=source.slice(start,end+5);
const approved={caseId:'synthetic-restore-case',version:3,text:'ИЗБРАН ПАНЕЛ: 01 — Контролен документ'};
const checkpoint={source:approved,versions:Array.from({length:5},(_,i)=>({version:i+1,text:'Контролен текст '+i})),confirmed:{caseId:approved.caseId,stage4Version:3,version:5,text:'Контролен текст 4'},editorialIssues:[],external:''};
let rendered=0;
const context={window:{KT126Registry:{confirmedExternal:()=>''}},source:null,versions:[],confirmed:null,editorialIssues:[],sync(){},live:()=>approved,render:()=>rendered++};
vm.runInNewContext(declaration,context);const api=context.window.KT117Document;
assert.equal(typeof api.restoreCheckpoint,'function');assert.equal(typeof api.checkpoint,'function');
assert.equal(api.restoreCheckpoint(checkpoint),true);assert.equal(api.checkpoint().versions.length,5);assert.equal(api.snapshot().version,5);assert.equal(rendered,1);
assert.equal(api.restoreCheckpoint({...checkpoint,source:{...approved,caseId:'foreign'}}),false);
assert.equal(api.restoreCheckpoint({...checkpoint,external:'changed'}),false);assert.equal(api.checkpoint().versions.length,5);
assert(source.includes('if(window.KT126Registry)return window.KT126Registry.confirmedExternal();'),'Confirmed registry number integration retained');
console.log('PASS KT131 restore regression: actual composed Stage5 API restores five versions and approval, retains case/reference guards and transport feedback.');
