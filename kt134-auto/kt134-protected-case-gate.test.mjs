import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prepareProtectedAutomaticCase as prepare,assertSameCaseRevision,assertDraftNotApproval} from './kt134-protected-case-gate.mjs';
const id='EG-2026-000004', digest='a'.repeat(64);
const receipt=type=>({type,caseId:id,sourceId:'synthetic-'+type,digest,verifiedAt:'2026-11-25T00:00:00Z'});
function fixture(){return {
 principal:{source:'KT125_SERVER',authenticated:true,status:'active',userId:'expert1',roles:['expert']},
 caseRecord:{id,revision:'7',subject:'Синтетична преписка',registryNumber:'PD-4',registryConfirmed:true,status:'active',ownerUserId:'expert1',gisMode:'required'},
 evidence:{dossier:receipt('dossier'),normativeMaster:receipt('normative_master'),piMaster:receipt('pi_master'),gisPdf1:receipt('gis_pdf1')},
 policy:{source:'KT125_SERVER',liveAutomaticEnabled:true}
};}
function denied(mutate,code){const f=fixture();mutate(f);assert.throws(()=>prepare(f),e=>e.code===code);}
test('valid protected draft with 4 case-bound receipts',()=>{const p=prepare(fixture());assert.equal(p.evidence.length,4);assert.equal(p.expertApproved,false);assert.ok(Object.isFrozen(p.evidence));});
test('reject public and inactive users',()=>{denied(x=>x.principal.source='PUBLIC','KT125_AUTH_REQUIRED');denied(x=>x.principal.status='inactive','KT125_AUTH_REQUIRED');});
test('reject foreign case and unconfirmed registry',()=>{denied(x=>x.caseRecord.ownerUserId='other','CASE_ACCESS_DENIED');denied(x=>x.caseRecord.registryConfirmed=false,'REGISTRY_NOT_CONFIRMED');});
test('reject cross-case and forged evidence',()=>{denied(x=>x.evidence.dossier.caseId='other','CROSS_CASE_EVIDENCE');denied(x=>x.evidence.piMaster.digest='bad','UNVERIFIED_EVIDENCE');});
test('reject missing GIS evidence',()=>denied(x=>delete x.evidence.gisPdf1,'UNVERIFIED_EVIDENCE'));
test('GIS contextual skip only when confirmed',()=>{const f=fixture();f.caseRecord.gisMode='contextual_skip';f.caseRecord.gisSkipReason='Жалба без ГИС предмет';f.caseRecord.gisSkipConfirmed=true;delete f.evidence.gisPdf1;assert.equal(prepare(f).gis.mode,'contextual_skip');denied(x=>{x.caseRecord.gisMode='contextual_skip';delete x.evidence.gisPdf1;},'GIS_SKIP_UNCONFIRMED');});
test('live automatic mode disabled unless server-enabled',()=>denied(x=>x.policy.liveAutomaticEnabled=false,'AUTOMATION_NOT_ENABLED'));
test('deny stale case and unauthorized finalization',()=>{const p=prepare(fixture());assert.throws(()=>assertSameCaseRevision(p,{id,revision:'8'}),/STALE_OR_DIFFERENT_CASE/);assert.throws(()=>assertDraftNotApproval({status:'approved',expertApproved:true}),/UNAUTHORIZED_FINALIZATION/);assert.equal(assertDraftNotApproval({status:'draft',expertApproved:false}).status,'draft');});
