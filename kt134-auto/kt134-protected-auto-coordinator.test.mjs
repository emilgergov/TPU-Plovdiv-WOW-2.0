import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createProtectedAutomaticCoordinator} from './kt134-protected-auto-coordinator.mjs';
const id='EG-2026-000004',digest='a'.repeat(64);
const rec=type=>({type,caseId:id,sourceId:'synthetic-'+type,digest,verifiedAt:'2026-11-25T00:00:00Z'});
function fixture(){
 const ctx={principal:{source:'KT125_SERVER',authenticated:true,status:'active',userId:'expert',roles:['expert']},
 caseRecord:{id,revision:'2',subject:'Тестова преписка',registryNumber:'PD-004',registryConfirmed:true,status:'active',ownerUserId:'expert',gisMode:'required'},
 evidence:{dossier:rec('dossier'),normativeMaster:rec('normative_master'),piMaster:rec('pi_master'),gisPdf1:rec('gis_pdf1')},
 policy:{source:'KT125_SERVER',liveAutomaticEnabled:true}};
 const calls={author:0,reviewer:0,word:0,load:0};
 const refs=['dossier','normative_master','pi_master','gis_pdf1'].map(t=>t+':'+digest);
 const adapters={
 async loadProtectedContext(){calls.load++;return ctx;},
 async loadEvidenceBundle(){return {caseId:id,revision:ctx.caseRecord.revision,
  serverVerified:true,caseIsolated:true,receiptRefs:refs,documents:['synthetic']};},
 async invokeAuthor(){calls.author++;return {caseId:id,revision:'2',status:'draft',expertApproved:false,
  panelId:17,reasoning:'Мотивирано предложение',content:'Относно: „Тест“\nПроектен текст.',documentTitle:'Проект на писмо'};},
 async invokeReviewer(){calls.reviewer++;return {caseId:id,revision:'2',verdict:'disagree',reasoning:'Различно мнение',suggestions:['Проверете нормата']};},
 async buildDraftWord(){calls.word++;return new Uint8Array(150);}
 };
 return {ctx,calls,adapters,refs};
}
const run=f=>createProtectedAutomaticCoordinator(f.adapters).prepareDraft({authenticatedSession:'server-session',caseId:id});
test('independent disagreement is visible and Word stays a draft',async()=>{
 const f=fixture(),r=await run(f);
 assert.equal(r.author.panelId,17);assert.equal(r.reviewer.verdict,'disagree');
 assert.equal(r.expertApproved,false);assert.equal(r.finalDecision,null);
 assert.equal(r.requiresExpertConfirmation,true);assert.deepEqual([f.calls.author,f.calls.reviewer,f.calls.word],[1,1,1]);
});
test('unavailable reviewer never blocks creating proposal',async()=>{
 const f=fixture();f.adapters.invokeReviewer=async()=>{throw Error('timeout')};
 const r=await run(f);assert.equal(r.reviewer.status,'unavailable');assert.equal(f.calls.word,1);
});
test('no author proposal means no invented administrative document',async()=>{
 const f=fixture();f.adapters.invokeAuthor=async()=>({});await assert.rejects(()=>run(f),/INVALID_AUTHOR_PROPOSAL/);assert.equal(f.calls.word,0);
});
test('no protected access prevents EG author call',async()=>{
 const f=fixture();f.ctx.principal.status='inactive';await assert.rejects(()=>run(f),/KT125_AUTH_REQUIRED/);assert.equal(f.calls.author,0);
});
test('foreign evidence is rejected before EG calls',async()=>{
 const f=fixture();f.refs[0]='dossier:'+ 'b'.repeat(64);await assert.rejects(()=>run(f),/EVIDENCE_MANIFEST_MISMATCH/);assert.equal(f.calls.author,0);
});
test('case changed during author review prevents Word',async()=>{
 const f=fixture();const original=f.adapters.invokeReviewer;
 f.adapters.invokeReviewer=async x=>{f.ctx.caseRecord.revision='3';return original(x)};
 await assert.rejects(()=>run(f),/STALE_OR_DIFFERENT_CASE/);assert.equal(f.calls.word,0);
});
test('missing protected host adapter fails closed',()=>assert.throws(()=>createProtectedAutomaticCoordinator({}),/MISSING_PROTECTED_ADAPTER/));
test('author cannot submit approved final decision',async()=>{
 const f=fixture();const orig=f.adapters.invokeAuthor;
 f.adapters.invokeAuthor=async x=>({...await orig(x),finalDecision:'approved'});
 await assert.rejects(()=>run(f),/INVALID_AUTHOR_PROPOSAL/);assert.equal(f.calls.word,0);
});
test('wrong case in author output fails closed',async()=>{
 const f=fixture();const orig=f.adapters.invokeAuthor;
 f.adapters.invokeAuthor=async x=>({...await orig(x),caseId:'other'});
 await assert.rejects(()=>run(f),/AUTHOR_CASE_MISMATCH/);assert.equal(f.calls.word,0);
});

test('silent change of normative archive blocks Word even if revision stays constant',async()=>{
 const f=fixture(),original=f.adapters.invokeReviewer;
 f.adapters.invokeReviewer=async x=>{f.ctx.evidence.normativeMaster.digest='b'.repeat(64);return original(x);};
 await assert.rejects(()=>run(f),/CASE_SNAPSHOT_CHANGED/);
 assert.equal(f.calls.word,0);
});
test('silent change of subject blocks Word even if revision stays constant',async()=>{
 const f=fixture(),original=f.adapters.invokeReviewer;
 f.adapters.invokeReviewer=async x=>{f.ctx.caseRecord.subject='Променен предмет';return original(x);};
 await assert.rejects(()=>run(f),/CASE_SNAPSHOT_CHANGED/);
 assert.equal(f.calls.word,0);
});
