import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseAssessmentPacket,compileExpertHypotheses} from './kt83-v612-independent-rule-packet.mjs';
import {createKT83V611Bridge} from './kt83-v611-case-bound-b2-bridge.mjs';
const base={id:'independent_hypothesis_01',title:'Независима правна хипотеза',
 registryId:'ZOOS_93',requirements:['scope_a','parameter_b'],exceptions:['exception_c'],
 exceptionAudit:{status:'listed',sourceId:'V11-archive',sourceLocation:'чл. 93, съответната точка',reason:'Експертен контрол върху изключенията'},
 missingFactProposal:'Предложение: проверете всички непотвърдени предпоставки',
 supportedProposal:'Предложение: проверете възможния процедурен ред с компетентния орган',
 notSupportedProposal:'Предложение: изследвайте друга относима правна хипотеза'};
const fact=(factId,value,doc='Документ 1')=>({factId,value,sourceId:doc,sourceType:'Преписка',
 sourceLocation:'стр. 2, т. 3',reason:'Експертна констатация'});
const ledger=(exception='false')=>[fact('scope_a','true'),fact('parameter_b','true'),fact('exception_c',exception)];
const mock=()=>{
 const fields={kt80SubjectText:{value:'Потвърден предмет'},kt80ScopeText:{value:'Потвърден обхват'},kt80ParcelInput:{value:''},
  kt80Authority:{value:'other'},kt80LawConfirmed:{checked:false}};
 const workflow={caseCycleId:'case-a-v612',generation:2,subjectConfirmed:{text:'Потвърден предмет',scope:'Потвърден обхват'}};
 const root={KT80WorkflowState:workflow,document:{getElementById:id=>fields[id]},
  KT82EvidenceInvalidation:{getRevision:()=>0},KT83NormativeBridge:{getEvidence:()=>({scenario:'CONTEXT',ids:[],valid:false,intersections:false})}};
 return {fields,workflow,root,bridge:createKT83V611Bridge(root)};
};
test('two independently constructed hypotheses do not inherit example-based route priority',()=>{
 const packet=createCaseAssessmentPacket({hypotheses:[base,{...base,id:'independent_hypothesis_02',title:'Конкурираща хипотеза'}],facts:ledger()});
 assert.equal(packet.rules.length,2);
 assert.equal(packet.notAProceduralDecision,true);
 assert.equal(packet.automaticIssueAllowed,false);
 const f=mock(),out=f.bridge.assess(packet);
 assert.equal(out.legalFindings.length,2);
 assert.ok(out.legalFindings.every(x=>x.state==='supported'));
 assert.equal(out.eligibilityForStage5FinalAct,false);
});
test('documented exception blocks support even when all positive conditions hold',()=>{
 const p=createCaseAssessmentPacket({hypotheses:[base],facts:ledger('true')});
 const x=mock().bridge.assess(p);
 assert.equal(x.legalFindings[0].state,'not_supported');
 assert.equal(x.readyForStage5Draft,false);
});
test('unknown exception remains undetermined, never interpreted as absence',()=>{
 const p=createCaseAssessmentPacket({hypotheses:[base],facts:ledger('unknown')});
 const x=mock().bridge.assess(p);
 assert.equal(x.legalFindings[0].state,'undetermined');
 assert.equal(x.readyForStage5Draft,false);
});
test('contradictory evidence remains disputed',()=>{
 const p=createCaseAssessmentPacket({hypotheses:[base],facts:[...ledger(),fact('scope_a','false','Документ 2')]});
 const x=mock().bridge.assess(p);
 assert.equal(x.legalFindings[0].state,'disputed');
});
test('unapproved or fabricated normative record is refused',()=>{
 assert.throws(()=>compileExpertHypotheses([{...base,registryId:'FAKE_93'}]),/не е удостоверена/);
});
test('missing exception audit is refused, including unsubstantiated absence of exceptions',()=>{
 assert.throws(()=>compileExpertHypotheses([{...base,exceptionAudit:null}]),/Изключенията/);
 assert.throws(()=>compileExpertHypotheses([{...base,exceptions:[],exceptionAudit:{status:'no_known_exceptions',sourceId:'',sourceLocation:'',reason:''}}]),/Изключенията/);
});
test('missing documentary location or unrecognized fact cannot enter legal engine',()=>{
 assert.throws(()=>createCaseAssessmentPacket({hypotheses:[base],facts:[fact('scope_a','true'),fact('other','true')]}),/Недоказан факт/);
 assert.throws(()=>createCaseAssessmentPacket({hypotheses:[base],facts:[{...fact('scope_a','true'),sourceLocation:''}]}),/Недоказан факт/);
});
test('cross-case reuse and changes to evidence revision are rejected',()=>{
 const f=mock(),packet=createCaseAssessmentPacket({hypotheses:[base],facts:ledger()});
 f.bridge.assess(packet);
 f.workflow.caseCycleId='case-b-v612';
 assert.equal(f.bridge.getAssessment(),null);
 assert.throws(()=>f.bridge.propose(),/Няма актуална/);
});
test('no confirmed rules yields specific next action but never a final act',()=>{
 const f=mock(),x=f.bridge.assess(createCaseAssessmentPacket());
 assert.ok(x.proposals.some(p=>p.includes('Предложение')));
 const y=f.bridge.propose();
 assert.equal(y.administrativeActIssued,false);
 assert.equal(y.readyForFormalDraft,false);
});
