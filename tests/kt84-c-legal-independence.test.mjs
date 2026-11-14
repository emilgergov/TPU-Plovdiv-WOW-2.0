import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseAssessmentPacket} from '../kt80/integration/kt83-v612-independent-rule-packet.mjs';
import {assessStage4} from '../kt80/integration/stage4-independent-legal-engine.mjs';
import {proposeStage5} from '../kt80/integration/stage5-independent-proposal.mjs';
import {verifiedReference,LOCKED_ARCHIVE_SHA256} from '../kt80/integration/v11-trusted-source-registry.mjs';
import {createMasterV11Bridge} from '../kt80/integration/kt83-p3-canonical-v11-master-bridge.mjs';
import {createCaseReviewStore} from '../kt80/integration/kt83-p3-case-review-provider.mjs';
import handoff from '../kt80/integration/kt83-vt01-v11-handoff.js';

const ctx={caseId:'kt84-case-101',generation:2,evidenceRevision:6,
 subject:'Експертно установен предмет',scope:'Експертно потвърден обхват'};
const hypotheses=[{id:'individual_test',title:'Индивидуална правна хипотеза',
 registryId:'ZOOS_93',requirements:['RELEVANT_FACT'],exceptions:['EXCEPTION_FACT'],
 exceptionAudit:{status:'listed',sourceId:'ZOOS_93',sourceLocation:'официален заключен индекс',
  reason:'Изключението се разглежда независимо от положителната предпоставка'},
 missingFactProposal:'Предложение: изискайте конкретни сведения за недоказаните условия.',
 supportedProposal:'Предложение: изследвайте доказаното приложимо основание.',
 notSupportedProposal:'Предложение: мотивирайте проверка на друго законово основание.'}];
const entry=(id,value)=>({factId:id,value,sourceId:'dossier-file-1',sourceType:'Преписка',
 sourceLocation:'стр. 2',sourceQuote:'Проверено съдържание от документа',
 reason:'Изрично прегледан доказателствен материал'});
const pkt=facts=>createCaseAssessmentPacket({hypotheses,facts});
const assess=facts=>{const packet=pkt(facts);return assessStage4({
 confirmedSubject:ctx.subject,scopeConfirmed:true,evidence:packet.evidence,rules:packet.rules})};
test('KT84-C: zero legal hypotheses does not produce a Stage 5 determination',()=>{
 const r=assessStage4({confirmedSubject:ctx.subject,scopeConfirmed:true,evidence:[],rules:[]});
 assert.equal(r.readyForStage5Draft,false);
 assert.equal(r.legalFindings.length,0);
 assert.ok(r.proposals.some(p=>p.includes('архив V11')));
});
test('KT84-C: unknown or absent proof means undetermined, not an adverse conclusion',()=>{
 for(const facts of [[],[entry('RELEVANT_FACT','unknown'),entry('EXCEPTION_FACT','false')]]){
  const r=assess(facts);
  assert.equal(r.legalFindings[0].state,'undetermined');
  assert.equal(r.readyForStage5Draft,false);
  assert.match(r.legalFindings[0].proposedAction,/изискайте конкретни сведения/);
 }
});
test('KT84-C: conflicting facts remain disputed even with negative exception evidence',()=>{
 const r=assess([entry('RELEVANT_FACT','true'),entry('RELEVANT_FACT','false'),entry('EXCEPTION_FACT','false')]);
 assert.equal(r.legalFindings[0].state,'disputed');
 assert.equal(r.readyForStage5Draft,false);
 const s=proposeStage5({stage4:r,confirmedCompetence:'Тестово експертно означение',
 competenceEvidence:[{factId:'competence',sourceId:'dossier-file-1',archiveOrDossierOrigin:'Преписка'}]});
 assert.equal(s.readyForFormalDraft,false);
 assert.equal(s.administrativeActIssued,false);
 assert.ok(s.independentText.includes('Неизяснена предпоставка'));
});
test('KT84-C: verified absence of an exception is required independently of positive fact',()=>{
 const unknown=assess([entry('RELEVANT_FACT','true')]);
 assert.equal(unknown.readyForStage5Draft,false);
 const excluded=assess([entry('RELEVANT_FACT','true'),entry('EXCEPTION_FACT','true')]);
 assert.equal(excluded.legalFindings[0].state,'not_supported');
 assert.equal(excluded.readyForStage5Draft,false);
 const supported=assess([entry('RELEVANT_FACT','true'),entry('EXCEPTION_FACT','false')]);
 assert.equal(supported.legalFindings[0].state,'supported');
 assert.equal(supported.readyForStage5Draft,true);
});
test('KT84-C: altered or unlisted V11 citation is always rejected',()=>{
 assert.throws(()=>createCaseAssessmentPacket({hypotheses:[{...hypotheses[0],registryId:'UNLISTED_LAW'}],facts:[]}));
 const verified=verifiedReference('ZOOS_93');
 assert.equal(verified.archiveSha256,LOCKED_ARCHIVE_SHA256);
 assert.throws(()=>assessStage4({confirmedSubject:ctx.subject,scopeConfirmed:true,evidence:[entry('RELEVANT_FACT','true')],
  rules:[{id:'tampered',title:'Unsupported',
    legalBasis:{...verified,archiveSha256:'0'.repeat(64)},
    condition:{fact:'RELEVANT_FACT'},missingFactProposal:'Предложение: проверете източника.'}]}));
});
test('KT84-C: case and review revision changes cannot reopen V11 legal readiness',()=>{
 const current={...ctx};
 const review={...ctx,expertConfirmed:true,confirmedCompetence:'Само тестов орган',
  competenceEvidence:[{factId:'competence',sourceId:'dossier-file-1',archiveOrDossierOrigin:'Преписка'}],
  legalFacts:[entry('RELEVANT_FACT','true'),entry('EXCEPTION_FACT','false')],
  rules:pkt([entry('RELEVANT_FACT','true'),entry('EXCEPTION_FACT','false')]).rules};
 const store=createCaseReviewStore(()=>current);
 assert.equal(store.submit(review).ok,true);
 const bridge=createMasterV11Bridge(store);
 assert.equal(handoff.assess(ctx,bridge).ok,true);
 current.evidenceRevision++;
 assert.equal(handoff.assess(current,bridge).ok,false);
 assert.equal(handoff.assess({...ctx,caseId:'different-case'},bridge).ok,false);
});
