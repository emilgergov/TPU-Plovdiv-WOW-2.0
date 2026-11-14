import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseAssessmentPacket} from '../kt80/integration/kt83-v612-independent-rule-packet.mjs';
import {assessStage4} from '../kt80/integration/stage4-independent-legal-engine.mjs';
import {auditNaturaOsCompetence,COMPETENCE_FACT_IDS} from '../kt80/integration/kt83-p5-competence-audit.mjs';
import {prepareExpertV11Review} from '../kt80/integration/kt83-p5-expert-v11-review.mjs';
import {createCaseReviewStore} from '../kt80/integration/kt83-p3-case-review-provider.mjs';
import {createMasterV11Bridge} from '../kt80/integration/kt83-p3-canonical-v11-master-bridge.mjs';
import {verifiedReference} from '../kt80/integration/v11-trusted-source-registry.mjs';
import V11Handoff from '../kt80/integration/kt83-vt01-v11-handoff.js';
const v11Handoff=V11Handoff.assess;
const ctx={caseId:'EG-P6-CYCLE-0001',generation:1,evidenceRevision:5,
 subject:'Експертно потвърден предмет по Наредбата за ОС',
 scope:'Доказателствено потвърден териториален обхват',
 subjectConfirmed:true,scopeConfirmed:true};
const competent={name:'Директор на РИОСВ – Пловдив',municipality:'Пловдив',
 registryId:'N_OS_6A',sourceId:'current-case.pdf',
 sourceLocation:'стр. 2',reason:'Експертно потвърдено отсъствие на изключенията и доказана териториална компетентност'};
const ids=Object.keys(COMPETENCE_FACT_IDS);
function packet(){
 const positive=ids.filter(id=>COMPETENCE_FACT_IDS[id]==='true');
 const exceptions=ids.filter(id=>COMPETENCE_FACT_IDS[id]==='false');
 const hypotheses=[{id:'os_6a_independent',title:'Самостоятелна проверка на компетентността по чл. 6а НОС',
  registryId:'N_OS_6A',requirements:positive,exceptions,
  exceptionAudit:{status:'listed',sourceId:'N_OS_6A',
   sourceLocation:'чл. 6а, т. 1, букви а–ж',reason:'Седемте министерски изключения са проверени поотделно'},
  missingFactProposal:'Предложение: проверете всяка неопределена компетентностна предпоставка.',
  supportedProposal:'Предложение: мотивирана преценка след проверка на компетентността.',
  notSupportedProposal:'Предложение: преценете компетентността на друг орган.'}];
 const facts=ids.map(factId=>({factId,value:COMPETENCE_FACT_IDS[factId],
  sourceId:'current-case.pdf',sourceType:'Преписка',sourceLocation:'стр. 2',
  sourceQuote:'Доказателствен цитат от текущия проверен документ',
  reason:'Експертна проверка за конкретната преписка'}));
 return createCaseAssessmentPacket({hypotheses,facts});
}
const audit=(context,pk)=>auditNaturaOsCompetence({context,competence:competent,
 archived:verifiedReference('N_OS_6A'),packet:pk,
 caseDocuments:[{file:'current-case.pdf',state:'TEXT_EXTRACTED'}],
 verifySource:f=>f.sourceQuote==='Доказателствен цитат от текущия проверен документ'});
test('P6: complete ORIGINAL V11 case chain from seven exceptions through expert approval to independent Stage5 proposal',()=>{
 const pk=packet();
 const stage4=assessStage4({confirmedSubject:ctx.subject,scopeConfirmed:true,
  evidence:pk.evidence,rules:pk.rules});
 assert.equal(stage4.readyForStage5Draft,true);
 const independentAudit=audit(ctx,pk);
 assert.equal(independentAudit.verified,true);
 const review=prepareExpertV11Review({context:ctx,packet:pk,existingStage4:stage4,
  authority:competent,expertApproved:true,independentCompetenceAudit:independentAudit});
 const current={...ctx};
 const store=createCaseReviewStore(()=>current);
 assert.equal(store.submit(review).ok,true);
 const bridge=createMasterV11Bridge(store);
 const checked=v11Handoff(ctx,bridge);
 assert.equal(checked.ok,true);
 assert.equal(checked.archiveVersion,'V11');
 assert.equal(checked.caseId,ctx.caseId);
 assert.equal(checked.competenceVerified,true);
 assert.ok(checked.provisions.some(p=>p.documentId==='N_OS_6A'));
 assert.match(checked.reasonedAssessment,/Предложение за следващо действие/);
 assert.equal(bridge.verifyProvenance(bridge.evaluateCase(ctx),ctx),true);
 current.evidenceRevision+=1;
 assert.equal(v11Handoff(current,bridge).ok,false);
});
test('P6: ministerial exception cannot become territorial RIOSV authority, even if a file cites article 6a',()=>{
 const original=packet();
 const pk={...original,evidence:original.evidence.map(f=>
  f.factId==='OS_MINISTER_EXCEPTION_A'?{...f,value:'true'}:f)};
 assert.equal(audit(ctx,pk).verified,false);
 const stage4=assessStage4({confirmedSubject:ctx.subject,scopeConfirmed:true,
  evidence:pk.evidence,rules:pk.rules});
 assert.equal(stage4.legalFindings[0].state,'not_supported');
 assert.equal(stage4.readyForStage5Draft,false);
});
test('P6: no unsupported authority or unreviewed article can progress to official act',()=>{
 const pk=packet(),bad=audit(ctx,pk);
 assert.equal(bad.verified,true);
 assert.equal(auditNaturaOsCompetence({context:ctx,competence:competent,packet:pk,
  archived:verifiedReference('ZOOS_93'),caseDocuments:[{file:'current-case.pdf',state:'TEXT_EXTRACTED'}],
  verifySource:()=>true}).verified,false);
 assert.equal(v11Handoff(ctx,null).ok,false);
 assert.equal(createMasterV11Bridge(null).available,false);
});
