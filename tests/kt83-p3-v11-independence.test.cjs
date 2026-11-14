'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {create}=require('../kt80/integration/kt83-p3-independent-v11.js');
const {assess}=require('../kt80/integration/kt83-vt01-v11-handoff.js');
function fixture(){
 const context={caseId:'KT83-CASE-X',generation:3,evidenceRevision:7,
  subject:'Потвърден предмет',scope:'Потвърден обхват',spatialScenario:'GIS_NOT_REQUIRED'};
 const doc={id:'official-document-1',archiveVersion:'V11',sourceUri:'local-archive://record/1',
  fingerprint:'source-fingerprint-from-trusted-archive',officialSourceVerified:true,
  currentValidityChecked:true,articles:['чл. 10, ал. 1']};
 const archive={version:'V11',getDocument:()=>doc,verifyDocument:()=>true};
 const review={getCaseReview:()=>({...context,expertConfirmed:true,
  applicabilityVerified:true,competenceVerified:true,legalQuestionReviewed:true,
  reasonedAssessment:'Оценка на установените факти и проверените основания',
  proposedAction:'Мотивирано искане за допълнителна информация',
  provisions:[{documentId:doc.id,articleRef:doc.articles[0],
   applicabilityReason:'Относимостта е прегледана по конкретния предмет',
   sourceFingerprint:doc.fingerprint}]})};
 return {context,doc,archive,review};
}
test('P3 refuses missing local sources or independent legal review',()=>{
 const x=fixture();
 assert.equal(create().available,false);
 assert.equal(create({archive:x.archive}).evaluateCase(x.context),null);
 assert.equal(assess(x.context,create({archive:x.archive})).code,'V11_UNVERIFIED');
});
test('P3 can produce a case-bound V11 receipt with explicitly verified records only',()=>{
 const x=fixture(),verifier=create(x);
 assert.equal(verifier.available,true);
 const output=assess(x.context,verifier);
 assert.equal(output.ok,true);
 assert.equal(output.provisions[0].documentId,x.doc.id);
 assert.equal(output.motivatedProposal,'Мотивирано искане за допълнителна информация');
});
test('P3 rejects changed case, revision, unreviewed competence or legal question',()=>{
 const x=fixture(),r=x.review.getCaseReview();
 for(const changed of [{caseId:'OTHER'}, {evidenceRevision:9}, {competenceVerified:false},
  {legalQuestionReviewed:false}, {expertConfirmed:false}]){
  const review={getCaseReview:()=>({...r,...changed})};
  assert.equal(create({archive:x.archive,review}).evaluateCase(x.context),null);
 }
});
test('P3 never infers applicability from GIS or blank archival overlap',()=>{
 const x=fixture();
 const review={getCaseReview:()=>null};
 assert.equal(create({archive:x.archive,review}).evaluateCase({...x.context,
  spatialScenario:'B_INTERSECTS',evidence:{archiveOverlap:true}}),null);
});
test('P3 rejects missing verified source, invalid fingerprint and stale validity',()=>{
 const x=fixture(),review=x.review;
 for(const changed of [{articles:[]},{officialSourceVerified:false},
  {currentValidityChecked:false},{fingerprint:'wrong'}]){
  const archive={...x.archive,getDocument:()=>({...x.doc,...changed})};
  assert.equal(create({archive,review}).evaluateCase(x.context),null);
 }
});
test('P3 fails closed if archive source integrity cannot be verified',()=>{
 const x=fixture();
 for(const verifyDocument of [()=>false,()=>{throw Error('bad source')}]){
  const archive={...x.archive,verifyDocument};
  assert.equal(assess(x.context,create({archive,review:x.review})).ok,false);
 }
});
test('P3 rejects incomplete articles, fabricated source references or duplicate approvals',()=>{
 const x=fixture(),r=x.review.getCaseReview();
 for(const provisions of [
  [{...r.provisions[0],articleRef:'чл. 999'}],
  [{...r.provisions[0],sourceFingerprint:'fake'}],
  [r.provisions[0],r.provisions[0]],
  []]){
  assert.equal(create({archive:x.archive,review:{getCaseReview:()=>({...r,provisions})}})
   .evaluateCase(x.context),null);
 }
});
test('P3 uses no fixed parcel, route, V11 statute or GIS-based procedure heuristic',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const code=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-p3-independent-v11.js'),'utf8');
 assert.doesNotMatch(code,/56784\.13\.102|36676\.129\.457|46989\.205\.218/);
 assert.doesNotMatch(code,/routeId\s*=|procedureId\s*=/);
 assert.match(code,/archive\.verifyDocument\(doc\)/);
 assert.match(code,/review\.getCaseReview\(c\)/);
});
