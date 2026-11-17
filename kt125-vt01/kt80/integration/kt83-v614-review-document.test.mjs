import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewDocument,renderReviewHTML} from './kt83-v614-review-document.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {draftWithCompetenceGate} from './kt83-v613-competence-gate.mjs';
const context=()=>assessStage4({confirmedSubject:'Предмет на преписката',scopeConfirmed:true,evidence:[],rules:[]});
function draft(){return draftWithCompetenceGate({stage4:context(),authorityClaim:'РИОСВ – Пловдив',fee:{bgnAmount:'500.00'}})}
const make=(over={})=>createReviewDocument({caseId:'case-61-4-unique',generation:1,subject:'Предмет на преписката',proposal:draft(),...over});
test('anonymous case-bound review draft never becomes an outgoing act',()=>{
 const d=make();
 assert.equal(d.status,'EXPERT_REVIEW_ONLY');
 assert.equal(d.formalIssuanceAllowed,false);
 assert.equal(d.signatures.length,2);
 assert.ok(d.signatures.every(s=>s.status==='НЕПОДПИСАНО'));
 assert.match(d.confidentiality,/НЕ Е ИЗХОДЯЩ/);
 assert.match(d.body,/Предложение:/);
});
test('subject mismatch or missing case identity blocks the output',()=>{
 assert.throws(()=>make({subject:'Сменен предмет'}),/потвърден предмет/);
 assert.throws(()=>make({caseId:'',generation:1}),/идентификатор/);
 assert.throws(()=>make({generation:-1}),/идентификатор/);
});
test('ready-to-issue, verified authority and tariff cannot be smuggled into draft',()=>{
 const p=draft();
 for(const changed of [{readyForFormalDraft:true},{administrativeActIssued:true},
  {requiresExpertAuthorization:false},{competentAuthority:'РИОСВ – Пловдив'},
  {tariff:{amount:5}},{sourceCoverageComplete:true}]){
  assert.throws(()=>make({proposal:{...p,...changed}}),/Недопустимо|Неудостоверена/);
 }
});
test('HTML is Bulgarian, Verdana 10, A4, has confidential marking and escapes untrusted strings',()=>{
 const d=make({recipient:'<img src=x onerror=alert(1)>',caseTitle:'Работна чернова <demo>'});
 const html=renderReviewHTML(d);
 assert.match(html,/lang="bg"/);
 assert.match(html,/size:A4/);
 assert.match(html,/font-family:Verdana/);
 assert.match(html,/font-size:10pt/);
 assert.match(html,/НЕПОДПИСАНО/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img src=x/);
});
test('official-template substitution and arbitrary unsigned documents are rejected',()=>{
 assert.throws(()=>renderReviewHTML({schema:'V27_CLASSIC',status:'EXPERT_REVIEW_ONLY',formalIssuanceAllowed:false}),/Неоторизиран/);
 assert.throws(()=>renderReviewHTML({...make(),formalIssuanceAllowed:true}),/Неоторизиран/);
});
