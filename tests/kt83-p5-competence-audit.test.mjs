import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNaturaOsCompetence,COMPETENCE_FACT_IDS} from '../kt80/integration/kt83-p5-competence-audit.mjs';
import {verifiedReference,assertVerifiedReference,LOCKED_ARCHIVE_SHA256} from '../kt80/integration/v11-trusted-source-registry.mjs';
const ctx={caseId:'EG-CASE-001',generation:3,evidenceRevision:8,
 subject:'Експертно потвърден предмет',scope:'Експертно потвърден обхват',
 subjectConfirmed:true,scopeConfirmed:true};
const archived=verifiedReference('N_OS_6A');
const basis=verifiedReference('PRAVILNIK_RIOSV_1');
const competence={name:'Директор на РИОСВ – Пловдив',municipality:'Пловдив',
 sourceId:'current-document.pdf',sourceLocation:'стр. 2',
 registryId:'N_OS_6A',reason:'Изрично експертно установяване при липса на основания за компетентност на министъра'};
const facts=()=>Object.entries(COMPETENCE_FACT_IDS).map(([factId,value])=>({
 factId,value,sourceId:'current-document.pdf',sourceType:'Преписка',sourceLocation:'стр. 2',
 sourceQuote:'Проверена доказателствена информация от първичния документ'
}));
const packet=()=>({rules:[{id:'competence',legalBasis:archived}],evidence:facts()});
const documents=[{file:'current-document.pdf',state:'TEXT_EXTRACTED'}];
const check=(over={})=>auditNaturaOsCompetence({
 context:ctx,competence,archived,packet:packet(),caseDocuments:documents,
 verifySource:()=>true,...over
});
test('P5 extends only the same locked V11 with exact independently checked archived article hashes',()=>{
 assert.equal(archived.archiveSha256,LOCKED_ARCHIVE_SHA256);
 assert.equal(archived.documentSha256,'2ff40c1a607a0f88cf1b25ff2a587d472dbe0bcda26313922330ad0c25de814d');
 assert.equal(archived.articleSha256,'7d230f385ef9c7f1fc25f693b5cbccaa847193648d89f64fac1141d9218a1152');
 assert.equal(basis.articleSha256,'a8b23f4fa876f804a925cc63f3096f73a4771e569cc1d416e8e9ffd7410fdb79');
 assert.equal(assertVerifiedReference(archived).id,'N_OS_6A');
});
test('P5 makes only conditional RIOSV Plovdiv OS art 6a competence with 7 explicit exclusions',()=>{
 const x=check();
 assert.equal(x.verified,true);
 assert.equal(x.registryId,'N_OS_6A');
 assert.equal(x.caseId,ctx.caseId);
 assert.equal(x.municipality,'Пловдив');
 assert.match(x.caveat,/само по чл/);
 assert.equal(Object.keys(COMPETENCE_FACT_IDS).filter(x=>x.includes('EXCEPTION')).length,7);
});
test('P5 does not infer absence of minister exception from silence, unknown or conflicting facts',()=>{
 for(const value of ['true','unknown','conflict']){
  const p=packet();p.evidence.find(x=>x.factId==='OS_MINISTER_EXCEPTION_A').value=value;
  assert.equal(check({packet:p}).verified,false);
 }
 const p=packet();p.evidence=p.evidence.filter(f=>f.factId!=='OS_MINISTER_EXCEPTION_ZH');
 assert.equal(check({packet:p}).code,'CONDITION_UNPROVEN');
});
test('P5 never approves unreferenced, unread, old or independently unverified case facts',()=>{
 assert.equal(check({verifySource:null}).code,'INDEPENDENT_SOURCE_CHECK_UNAVAILABLE');
 assert.equal(check({verifySource:()=>false}).code,'FACT_NOT_ATTESTED');
 assert.equal(check({caseDocuments:[{file:'current-document.pdf',state:'REVIEW_REQUIRED'}]}).code,'SOURCE_UNVERIFIED');
 assert.equal(check({context:{...ctx,evidenceRevision:NaN}}).verified,false);
});
test('P5 refuses different jurisdiction, non-OS legal reference or municipality outside Plovdiv scope',()=>{
 assert.equal(check({competence:{...competence,name:'МОСВ'}}).code,'OUT_OF_SCOPE');
 assert.equal(check({competence:{...competence,municipality:'Варна'}}).code,'TERRITORY_UNVERIFIED');
 assert.equal(check({archived:verifiedReference('ZOOS_93')}).code,'OUT_OF_SCOPE');
 assert.equal(check({packet:{rules:[{id:'unrelated',legalBasis:verifiedReference('ZOOS_93')}],evidence:facts()}}).code,'OS_HYPOTHESIS_MISSING');
});
test('P5 keeps the trusted verifier on the isolated professional interface with original legal source',()=>{
 const fs=await import('node:fs');
 const url=new URL('../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html',import.meta.url);
 const html=fs.readFileSync(url,'utf8');
 assert.ok(html.indexOf('kt83-p5-competence-runtime.mjs')>=0);
 assert.ok(html.indexOf('kt83-p5-competence-runtime.mjs')<html.indexOf('kt83-p5-expert-review-ui.mjs'));
});
