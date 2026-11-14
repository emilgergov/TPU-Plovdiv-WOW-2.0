import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareExpertV11Review} from '../kt80/integration/kt83-p5-expert-v11-review.mjs';
import {assessStage4} from '../kt80/integration/stage4-independent-legal-engine.mjs';
import {verifiedReference} from '../kt80/integration/v11-trusted-source-registry.mjs';
const context={caseId:'case-2026-001',generation:2,evidenceRevision:7,
 subject:'Експертно потвърден предмет',scope:'Експертно потвърден обхват',
 subjectConfirmed:true,scopeConfirmed:true};
const rules=[{id:'premise-rule',title:'Проверена правна хипотеза',
 legalBasis:verifiedReference('ZOOS_93'),condition:{fact:'premise'},
 missingFactProposal:'Предложение: изискайте относимата информация.',
 supportedProposal:'Предложение: проверете конкретното действие.'}];
const evidence=[{factId:'premise',value:'true',sourceId:'file01',sourceType:'Преписка',sourceLocation:'стр. 1'}];
const packet={rules,evidence};
const stage4=assessStage4({confirmedSubject:context.subject,scopeConfirmed:true,evidence,rules});
const authority={name:'Удостоверен орган',registryId:'ZOOS_93',
 sourceId:'source-01',sourceLocation:'стр. 2',reason:'Експертно мотивирана материална и териториална компетентност'};
const review=overrides=>prepareExpertV11Review({
 context,packet,existingStage4:stage4,authority,expertApproved:true,...overrides});
test('P5 reuses independently checked V11 rules and evidence, preserving case identity',()=>{
 const r=review();
 assert.equal(r.caseId,context.caseId);
 assert.equal(r.evidenceRevision,7);
 assert.equal(r.legalFacts[0].sourceId,'file01');
 assert.equal(r.rules[0].legalBasis.registryId,'ZOOS_93');
 assert.equal(r.competenceEvidence[0].legalReference.archiveSha256,verifiedReference('ZOOS_93').archiveSha256);
 assert.equal(r.expertConfirmed,true);
});
test('P5 rejects auto-approval, missing authority proof or unlisted V11 reference',()=>{
 assert.throws(()=>review({expertApproved:false}),/потвърждение/);
 assert.throws(()=>review({authority:{...authority,reason:''}}),/Компетентността/);
 assert.throws(()=>review({authority:{...authority,registryId:'UNLISTED'}}),/не е проверен/);
});
test('P5 rejects stale stage4, unknown legal facts, changed scope or different case',()=>{
 assert.throws(()=>review({existingStage4:null}),/остаряла/);
 assert.throws(()=>review({context:{...context,caseId:''}}),/идентичността/);
 assert.throws(()=>review({context:{...context,scope:'друг обхват'}}),/остаряла/);
 const inconclusive=[{...evidence[0],value:'unknown'}];
 assert.throws(()=>review({packet:{rules,evidence:inconclusive},
  existingStage4:assessStage4({confirmedSubject:context.subject,scopeConfirmed:true,
   evidence:inconclusive,rules})}),/Непълните/);
});
test('P5 review controls exist only inside existing Stage 4 section and never select procedure',()=>{
 const ui=readFileSync(new URL('../kt80/integration/kt83-p5-expert-review-ui.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html',import.meta.url),'utf8');
 assert.match(ui,/panel\?\.querySelector\('details'\)/);
 assert.match(ui,/createCaseAssessmentPacket/);
 assert.match(ui,/provider\.submit\(review\)/);
 assert.match(ui,/route\.commitVerifiedExpertReview\(\)/);
 assert.doesNotMatch(ui,/KT80RouteCatalog|Classic|routeId:/);
 assert.match(html,/kt83-p5-expert-review-ui\.mjs/);
});
