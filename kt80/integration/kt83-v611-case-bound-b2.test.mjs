import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT83V611Bridge} from './kt83-v611-case-bound-b2-bridge.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
const uuidA='123e4567-e89b-42d3-a456-426614174000';
const uuidB='123e4567-e89b-42d3-a456-426614174001';
function fixture(){
 let revision=0;
 const fields={kt80SubjectText:{value:'Предмет за проверка'},
  kt80ScopeText:{value:'Потвърден обхват'},kt80ParcelInput:{value:'36676.129.457'},
  kt80Authority:{value:'riosv'},kt80LawConfirmed:{checked:false}};
 const workflow={caseCycleId:uuidA,generation:0,
  subjectConfirmed:{text:'Предмет за проверка',scope:'Потвърден обхват'},
  parcelsConfirmed:null};
 const spatial={ids:[],scenario:'CONTEXT',valid:false,intersections:false};
 const root={document:{getElementById:id=>fields[id]},
  KT80WorkflowState:workflow,KT82EvidenceInvalidation:{getRevision:()=>revision},
  KT83NormativeBridge:{getEvidence:()=>spatial}};
 return {root,workflow,fields,spatial,bump:()=>++revision};
}
const evidence={factId:'applicable',value:'true',sourceId:'Документ 1',
 sourceType:'Преписка',sourceLocation:'стр. 2, т. 3'};
const rule={id:'case-neutral-hypothesis',title:'Условно проверявано основание',
 legalBasis:verifiedReference('ZOOS_93'),condition:{fact:'applicable'},
 missingFactProposal:'Предложение: проверете доказателствата',
 supportedProposal:'Предложение: експертно сверете всички предпоставки'};
test('непотвърден обхват не се анализира',()=>{
 const f=fixture();f.fields.kt80ScopeText.value='Променен обхват';
 assert.throws(()=>createKT83V611Bridge(f.root).assess({rules:[rule],evidence:[evidence]}),/не са потвърдени/);
});
test('без доказани хипотези остава конкретно следващо действие',()=>{
 const f=fixture(),bridge=createKT83V611Bridge(f.root);
 const x=bridge.assess();assert.equal(x.legalFindings.length,0);
 assert.ok(x.proposals.some(p=>p.includes('Предложение')));
 const y=bridge.propose();assert.equal(y.administrativeActIssued,false);
 assert.equal(y.readyForFormalDraft,false);
});
test('проверен V11 цитат плюс истински източник допуска само кандидатен анализ',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 const x=b.assess({evidence:[evidence],rules:[rule]});
 assert.equal(x.legalFindings[0].state,'supported');
 assert.equal(x.sourceArchive,'KT82_Normative_MASTER_V11_Tariff_Euro_2026-11-13.zip');
 assert.equal(b.propose().administrativeActIssued,false);
});
test('подменен нормативен отпечатък се отказва',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 assert.throws(()=>b.assess({evidence:[evidence],rules:[{...rule,
  legalBasis:{...rule.legalBasis,articleSha256:'invalid'}}]}));
});
test('факт без точна позиция в документа се отказва',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 assert.throws(()=>b.assess({evidence:[{...evidence,sourceLocation:''}],rules:[rule]}),/точно място/);
});
test('отговор от предходна преписка с идентични имоти не се приема',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 b.assess({evidence:[evidence],rules:[rule]});
 f.workflow.caseCycleId=uuidB;
 assert.equal(b.getAssessment(),null);
 assert.throws(()=>b.propose(),/Няма актуална/);
});
test('нова доказателствена ревизия обезсилва старите правни резултати',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 b.assess({evidence:[evidence],rules:[rule]});f.bump();
 assert.throws(()=>b.propose(),/остаряла/);
});
test('редакция на предмета или имотите обезсилва резултата',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 b.assess({evidence:[evidence],rules:[rule]});f.fields.kt80ParcelInput.value='46989.205.218';
 assert.equal(b.getAssessment(),null);
});

test('нов ГИС обект със същите имоти не наследява правната оценка',()=>{
 const f=fixture(),b=createKT83V611Bridge(f.root);
 f.root.KT80FreeGISResults={ids:['36676.129.457'],results:[]};
 b.assess({evidence:[evidence],rules:[rule]});
 f.root.KT80FreeGISResults={ids:['36676.129.457'],results:[]};
 assert.equal(b.getAssessment(),null);
});
