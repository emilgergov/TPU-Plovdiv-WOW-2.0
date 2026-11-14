import test from 'node:test';
import assert from 'node:assert/strict';
import {createMasterV11Bridge} from '../kt80/integration/kt83-p3-canonical-v11-master-bridge.mjs';
import {verifiedReference,LOCKED_ARCHIVE_SHA256} from '../kt80/integration/v11-trusted-source-registry.mjs';
import {CANONICAL_ARCHIVE} from '../kt80/integration/stage4-independent-legal-engine.mjs';
const c=()=>({caseId:'KT83-X',generation:2,evidenceRevision:4,subject:'Експертно потвърден предмет',scope:'Потвърден обхват'});
const makeReview=()=>({...c(),expertConfirmed:true,confirmedCompetence:'Проверен компетентен орган',
 competenceEvidence:[{factId:'competence',sourceId:'reviewed-document',archiveOrDossierOrigin:'Преписка'}],
 legalFacts:[{factId:'hypothesis',value:'true',sourceId:'reviewed-document',sourceType:'Преписка'}],
 rules:[{id:'legal-hypothesis',title:'Проверена предпоставка',
   legalBasis:verifiedReference('ZOOS_93'),condition:{fact:'hypothesis'},
   missingFactProposal:'Предложение: изискайте конкретни доказателства.',
   supportedProposal:'Предложение: разгледайте хипотезата по чл. 93.'}]});
const p=(getCaseReview=()=>makeReview(),verifyCaseReview=()=>true)=>({getCaseReview,verifyCaseReview});
test('P3 uses the ONLY locked V11 MASTER and its independent engines',()=>{
 const b=createMasterV11Bridge(p()),x=b.evaluateCase(c());
 assert.equal(b.archive,CANONICAL_ARCHIVE);
 assert.equal(b.archiveSha256,LOCKED_ARCHIVE_SHA256);
 assert.equal(x.archiveVersion,'V11');
 assert.equal(x.provisions[0].documentId,'ZOOS_93');
 assert.equal(x.provisions[0].articleSha256,verifiedReference('ZOOS_93').articleSha256);
 assert.equal(b.verifyProvenance(x,c()),true);
});
test('P3 refuses missing provider, unverifiable review, no supporting facts',()=>{
 assert.equal(createMasterV11Bridge().available,false);
 assert.equal(createMasterV11Bridge(p(()=>makeReview(),()=>false)).evaluateCase(c()),null);
 const r=makeReview();r.legalFacts[0].value='unknown';
 assert.equal(createMasterV11Bridge(p(()=>r)).evaluateCase(c()),null);
});
test('P3 rejects stale case, subject, scope, changed evidentiary review',()=>{
 const x=c(),r=makeReview();
 for(const patch of [{caseId:'other'}, {generation:99},{evidenceRevision:9},
  {subject:'Друга преписка'},{scope:'Друг обхват'}]){
  assert.equal(createMasterV11Bridge(p(()=>({...r,...patch}))).evaluateCase(x),null);
 }
 let active=makeReview();
 const bridge=createMasterV11Bridge(p(()=>active));
 const candidate=bridge.evaluateCase(x);
 assert.equal(bridge.verifyProvenance(candidate,x),true);
 active={...active,legalFacts:[{...active.legalFacts[0],value:'conflict'}]};
 assert.equal(bridge.verifyProvenance(candidate,x),false);
});
test('P3 never uses unlisted or altered legal citations',()=>{
 const r=makeReview();
 r.rules[0].legalBasis={...r.rules[0].legalBasis,articleSha256:'0'.repeat(64)};
 assert.equal(createMasterV11Bridge(p(()=>r)).evaluateCase(c()),null);
});
test('P3 cannot automatically issue a final act or infer procedure from GIS',()=>{
 const bridge=createMasterV11Bridge(p());
 assert.equal(bridge.evaluateCase({...c(),evidence:{gisScenario:'OUTSIDE'}}).provisions[0].documentId,'ZOOS_93');
 assert.equal(bridge.evaluateCase({...c(),evidence:{gisScenario:'INTERSECTS'}}).provisions[0].documentId,'ZOOS_93');
});
