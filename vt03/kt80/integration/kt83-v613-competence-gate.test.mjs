import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
import {draftWithCompetenceGate} from './kt83-v613-competence-gate.mjs';
import {createKT83V611Bridge} from './kt83-v613-case-bound-b2-bridge.mjs';
import {createCaseAssessmentPacket} from './kt83-v612-independent-rule-packet.mjs';
const rule={id:'hypothesis',title:'Независима хипотеза',legalBasis:verifiedReference('ZOOS_93'),
 condition:{fact:'relevant'},missingFactProposal:'Предложение: уточнете липсващия факт',
 supportedProposal:'Предложение: проверете нормативната приложимост',
 notSupportedProposal:'Предложение: проверете други нормативни хипотези'};
function stage4(value='true'){return assessStage4({confirmedSubject:'Предмет на преписка',scopeConfirmed:true,
 evidence:[{factId:'relevant',value,sourceId:'Преписка №1',sourceType:'Документ',sourceLocation:'стр. 2'}],rules:[rule]})}
const probe=()=>({confirmedCompetence:'РИОСВ – Пловдив',competenceEvidence:[{
 sourceId:'измислен източник',factId:'competence',archiveOrDossierOrigin:'Преписка'}],
 fee:{scheduleId:'OVOS_SCREENING',bgnAmount:'500.00',linkedLegalFindingId:'hypothesis',
 tariffSource:verifiedReference('TARIFA_1'),euroLawSource:verifiedReference('EURO_12')}});
test('free-text local authority does not become proven competence',()=>{
 const out=draftWithCompetenceGate({stage4:stage4(),...probe()});
 assert.equal(out.competentAuthority,null);assert.equal(out.authorityVerification,'NOT_ESTABLISHED_BY_CASE_AND_V11');
 assert.equal(out.readyForFormalDraft,false);assert.equal(out.administrativeActIssued,false);
 assert.match(out.independentText,/не са нормативно удостоверени/);
});
test('archival tariff amount without case-specific prerequisites never becomes fee',()=>{
 const out=draftWithCompetenceGate({stage4:stage4(),...probe()});
 assert.equal(out.tariff,null);assert.equal(out.feeVerification,'NOT_ESTABLISHED_BY_CASE_AND_V11');
 assert.match(out.independentText,/Не е начислена такса/);
});
test('unknown, conflicting and negative factual prerequisites cannot produce formal draft',()=>{
 for(const v of ['unknown','conflict','false']){
  const out=draftWithCompetenceGate({stage4:stage4(v),...probe()});
  assert.equal(out.readyForFormalDraft,false,v);assert.equal(out.administrativeActIssued,false,v);
  assert.ok(out.pendingChecks.some(s=>s.startsWith('Предложение:')),v);
 }
});
test('missing candidate authority retains a constructive next action',()=>{
 const out=draftWithCompetenceGate({stage4:stage4(),confirmedCompetence:null});
 assert.equal(out.evidenceClaimed,false);
 assert.match(out.independentText,/Предложение: проверете компетентността/);
});
test('old B2 bridge keeps old behavior, new V61.3 bridge always applies competence gate',()=>{
 const nodes={kt80SubjectText:{value:'Предмет'},kt80ScopeText:{value:'Обхват'},kt80ParcelInput:{value:''},
  kt80Authority:{value:'riosv'}};
 const workflow={caseCycleId:'case-unique-613',generation:1,subjectConfirmed:{text:'Предмет',scope:'Обхват'}};
 const root={KT80WorkflowState:workflow,document:{getElementById:id=>nodes[id]},
  KT82EvidenceInvalidation:{getRevision:()=>0},KT83NormativeBridge:{getEvidence:()=>({scenario:'CONTEXT',ids:[]})}};
 const bridge=createKT83V611Bridge(root);
 const p=createCaseAssessmentPacket({hypotheses:[{id:'h1',title:'Конкурираща хипотеза',
  registryId:'ZOOS_93',requirements:['fact_a'],exceptions:[],
  exceptionAudit:{status:'no_known_exceptions',sourceId:'V11',sourceLocation:'чл. 93',reason:'Експертен преглед'},
  supportedProposal:'Предложение: допълнителна нормативна преценка',
  notSupportedProposal:'Предложение: проверете алтернативите',
  missingFactProposal:'Предложение: изискайте документи'}],
  facts:[{factId:'fact_a',value:'true',sourceId:'Преписка №1',sourceType:'Документ',sourceLocation:'стр.1',reason:'Фактически анализ'}]});
 bridge.assess(p);
 const out=bridge.propose(probe());
 assert.equal(out.readyForFormalDraft,false);
 assert.equal(out.competentAuthority,null);
 workflow.caseCycleId='case-other-613';
 assert.equal(bridge.getAssessment(),null);
 assert.throws(()=>bridge.propose(),/Няма актуална/);
});
