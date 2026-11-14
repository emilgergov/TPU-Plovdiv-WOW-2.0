import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseReviewStore} from '../kt80/integration/kt83-p3-case-review-provider.mjs';
import {createMasterV11Bridge} from '../kt80/integration/kt83-p3-canonical-v11-master-bridge.mjs';
import {verifiedReference} from '../kt80/integration/v11-trusted-source-registry.mjs';
function scenario(){
 const current={caseId:'EG-CASE-01',generation:1,evidenceRevision:4,
  subject:'Потвърден предмет на преписката',scope:'Потвърден обхват'};
 const review={...current,expertConfirmed:true,confirmedCompetence:'Доказан компетентен орган',
  competenceEvidence:[{factId:'competence',sourceId:'file1',archiveOrDossierOrigin:'Преписка'}],
  legalFacts:[{factId:'premise',sourceId:'file1',sourceType:'Преписка',value:'true'}],
  rules:[{id:'rule-1',title:'Удостоверена нормативна предпоставка',
   legalBasis:verifiedReference('ZOOS_93'),condition:{fact:'premise'},
   missingFactProposal:'Предложение: изискайте конкретните доказателства.',
   supportedProposal:'Предложение: мотивирана преценка за приложимост.'}]};
 return {current,review};
}
test('P3 accepts explicitly reviewed facts from the single existing MASTER only',()=>{
 const {current,review}=scenario();
 const store=createCaseReviewStore(()=>current);
 assert.equal(store.getCaseReview(current),null);
 assert.equal(store.submit(review).ok,true);
 const v=createMasterV11Bridge(store);
 const result=v.evaluateCase(current);
 assert.equal(result.archiveVersion,'V11');
 assert.equal(result.provisions[0].documentId,'ZOOS_93');
 assert.equal(v.verifyProvenance(result,current),true);
});
test('P3 refuses unconfirmed, unreferenced or unsupported review',()=>{
 const {current,review}=scenario(),store=createCaseReviewStore(()=>current);
 for(const bad of [
  {...review,expertConfirmed:false},
  {...review,legalFacts:[]},
  {...review,competenceEvidence:[]},
  {...review,rules:[{...review.rules[0],legalBasis:{...review.rules[0].legalBasis,articleSha256:'0'.repeat(64)}}]},
  {...review,scope:'Различен обхват'}
 ])assert.equal(store.submit(bad).ok,false);
 assert.equal(store.getCaseReview(current),null);
});
test('P3 changes of case or evidence revision invalidate prior expert review',()=>{
 const {current,review}=scenario(),store=createCaseReviewStore(()=>current);
 assert.equal(store.submit(review).ok,true);
 const prior=store.getCaseReview(current);
 current.evidenceRevision+=1;
 assert.equal(store.getCaseReview(current),null);
 assert.equal(store.verifyCaseReview(prior,current),false);
 store.clear();
 assert.equal(store.getCaseReview(current),null);
});
test('P3 deep freezes its review so late mutation of original input cannot change the legal conclusion',()=>{
 const {current,review}=scenario(),store=createCaseReviewStore(()=>current);
 store.submit(review);
 review.legalFacts[0].value='false';
 assert.equal(store.getCaseReview(current).legalFacts[0].value,'true');
 assert.equal(Object.isFrozen(store.getCaseReview(current).rules[0].legalBasis),true);
});
