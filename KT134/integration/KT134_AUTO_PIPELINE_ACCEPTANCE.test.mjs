import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=new URL('../../../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,base),'utf8');
const e4=read('vt03/kt80/integration/KT134_PINNED_kt96-eg-ai-stage4-author.mjs');
const handoff=read('vt03/kt80/integration/KT134_PINNED_kt116-expert-approval-handoff.mjs');
const e5=read('vt03/kt80/integration/KT134_PINNED_kt117-stage5-document-author.mjs');
const auto=read('vt03/kt80/integration/kt134-auto-pipeline.mjs');
const worker=read('cloudflare/ai-author-v27/src/worker.js');
const isolated=read('vt03/kt80/KT134_PDF1_ISOLATED_REGRESSION_TEST.html');
for(const [name,body,expected] of [
 ['E4 author',e4,["import './kt134-auto-pipeline.mjs'","kt115:stage4-draft"]],
 ['Auto coordinator',auto,["Избери автоматичен маршрут","draft_stage5_candidate","kt115:stage4-draft",
   "kt134PreFinal!==true","expertConfirmed:false","approveAutomatedFinal","acceptAutomatedDocument",
   "KT119Download?.()","candidateNow.stage4Draft"]],
 ['Final expert sign-off',handoff,["approveAutomatedFinal","expertExplicitConfirm:true",
   "stage4-expert-decision","expertApproved:true"]],
 ['Final Word adoption',e5,["acceptAutomatedDocument","finalAutomatedApproval:true",
   "formatDraftSubject(text)","confirmed=Object.freeze"]],
 ['Worker',worker,["kt134PreFinal=input?.task===\"draft_stage5_candidate\"",
   "input?.expertConfirmed===false","kt134PreFinal,expertConfirmed:!kt134PreFinal"]]
]){
 for(const expectedText of expected)assert.ok(body.includes(expectedText),name+' missing: '+expectedText);
}
assert.ok(isolated.includes('KT134_PINNED_kt96-eg-ai-stage4-author.mjs'));
assert.ok(!isolated.includes('script type="module" src="integration/kt134-auto-pipeline.mjs'),
 'No changes to approved HTML script order');
assert.ok(auto.indexOf('final.onclick=')>auto.indexOf('event.detail||{}'));
assert.ok(auto.includes('final.disabled=true'),'Final approval unavailable until candidate exists');
assert.ok(auto.includes("['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated']"));
assert.ok(!auto.includes('expertExplicitConfirm:true'),'Auto coordinator must not pre-sign an expert decision');
assert.ok(worker.includes('if(!validProof||input.qualificationGate?.sourceAnchorsMatched!==true)'),
 'Prefinal drafting retains signed legal evidence gate');
console.log('KT134: opt-in automatic route, prefinal drafting and single final expert action acceptance contract passed');
