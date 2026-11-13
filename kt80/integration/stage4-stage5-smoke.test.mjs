// Run independently: node --test kt80/integration/stage4-stage5-smoke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStage4,CANONICAL_ARCHIVE,ARCHIVE_SHA256} from './stage4-independent-legal-engine.mjs';
import {proposeStage5,convertTariffBgnToEur} from './stage5-independent-proposal.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
const legalRef=(id)=>verifiedReference(id);
const rule={
  id:'hypothesis',title:'Примерна правна хипотеза',
  legalBasis:legalRef('ZOOS_93'),
  condition:{fact:'applicable'},
  missingFactProposal:'Изясни приложимостта',
  supportedProposal:'Предложи мотивирано процедурно действие'
};
const evidence=value=>[{factId:'applicable',value,sourceId:'test-doc',sourceType:'Преписка'}];
const stage4=value=>assessStage4({
  confirmedSubject:'Тестов самостоятелен предмет',
  scopeConfirmed:true,evidence:evidence(value),rules:[rule]
});
const competence=[{sourceId:'test-doc',factId:'location',archiveOrDossierOrigin:'Преписка'}];
const fee={
  linkedLegalFindingId:'hypothesis',bgnAmount:'500.00',
  tariffSource:legalRef('TARIFA_1'),
  euroLawSource:legalRef('EURO_12')
};
test('нормативна опора задължително от V11',()=>{
  assert.throws(()=>assessStage4({confirmedSubject:'Предмет',scopeConfirmed:true,evidence:evidence('true'),rules:[{...rule,legalBasis:{...rule.legalBasis,articleSha256:'0000'}}]}));
});
test('положителен факт -> подкрепена правна хипотеза',()=>{
  assert.equal(stage4('true').legalFindings[0].state,'supported');
});
test('неизвестен факт не става отрицателен',()=>{
  assert.equal(stage4('unknown').legalFindings[0].state,'undetermined');
});
test('противоречиви документи остават спорни',()=>{
  const ev=[...evidence('true'),{factId:'applicable',value:'false',sourceId:'other',sourceType:'Преписка'}];
  const out=assessStage4({confirmedSubject:'Предмет',scopeConfirmed:true,evidence:ev,rules:[rule]});
  assert.equal(out.legalFindings[0].state,'disputed');
});
test('без предмет не е допустимо да се преминава към формален проект',()=>{
  const out=assessStage4({confirmedSubject:'',scopeConfirmed:true,evidence:evidence('true'),rules:[rule]});
  assert.equal(out.readyForStage5Draft,false);
});
test('няма предварително задължителен имот',()=>{
  assert.equal(stage4('true').readyForStage5Draft,true);
});
test('без компетентност няма формален проект',()=>{
  assert.equal(proposeStage5({stage4:stage4('true')}).readyForFormalDraft,false);
});
test('независим проект без издаване на административен акт',()=>{
  const out=proposeStage5({stage4:stage4('true'),confirmedCompetence:'Тестов компетентен орган',competenceEvidence:competence});
  assert.equal(out.readyForFormalDraft,true);
  assert.equal(out.administrativeActIssued,false);
  assert.equal(out.requiresExpertAuthorization,true);
});
test('500 лв. стават 255,65 евро по пълния курс',()=>{
  assert.equal(convertTariffBgnToEur('500.00'),'255.65');
  assert.equal(proposeStage5({stage4:stage4('true'),confirmedCompetence:'Орган',competenceEvidence:competence,fee}).tariff.calculatedEuroAmount,'255.65');
});
test('не се допуска произволна такса без приложимо основание',()=>{
  assert.throws(()=>proposeStage5({stage4:stage4('false'),fee}));
});
test('недоказан нормативен източник не дава такса',()=>{
  assert.throws(()=>proposeStage5({stage4:stage4('true'),fee:{...fee,tariffSource:{...fee.tariffSource,verifiedAgainstV11:false}}}));
});
