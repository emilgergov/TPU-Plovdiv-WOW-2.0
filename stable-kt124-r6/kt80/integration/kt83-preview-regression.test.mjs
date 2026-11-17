import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const baseline=read('../KT82_15_PACKAGE_A_V598_TEST.html');
const preview=read('../KT83_01_INDEPENDENT_STAGE4_STAGE5_V13_TEST.html');
const ui=read('./kt83-v1-3-admin-preview.mjs');
const adapter=read('./kt80-v598-case-evidence-adapter.mjs');
test('КТ83 изолира V59.8 — новият модул е само в тестовата страница',()=>{
 assert.ok(preview.includes('integration/kt83-v1-3-admin-preview.mjs'));
 assert.ok(!baseline.includes('integration/kt83-v1-3-admin-preview.mjs'));
 assert.ok(preview.includes('KT80_STAGE4_NORMATIVE_BRIDGE_V592.js'));
 assert.ok(preview.includes('KT82_STAGE5_ROUTE_ADVISER_V591.js'));
});
test('В1.3 показва правния резултат без прекъсване на старите етапни панели',()=>{
 for(const id of ['kt80SubjectText','kt80ScopeText','kt80Authority','kt80LawConfirmed',
                  'kt80ToProposal','kt80ProcedureSelect'])
   assert.ok(preview.includes('id="'+id+'"'),'Липсва '+id);
 assert.ok(ui.includes('kt83IndependentStage4'));
 assert.ok(ui.includes('kt83IndependentStage5'));
});
test('Новите панели не записват в каталога или OUT',()=>{
 assert.ok(!/\.value\s*=\s*.*\bkt80ProcedureSelect/.test(ui));
 assert.ok(!/KT80RouteCatalog\s*=/.test(ui));
 assert.ok(!/KT80RouteConfirmation\s*=/.test(ui));
 assert.ok(!/administrativeActIssued\s*:\s*true/.test(ui));
});
test('Предмет и обхват се приемат само като потвърдени експертно',()=>{
 assert.ok(adapter.includes('wf.subjectConfirmed?.text'));
 assert.ok(adapter.includes('wf.subjectConfirmed?.scope'));
 assert.ok(adapter.includes('norm(subjectApproved) === norm(subjectField)'));
 assert.ok(adapter.includes('norm(scopeApproved) === norm(scopeField)'));
});
test('Експертно доказателство задължително със записан източник и място',()=>{
 assert.ok(ui.includes("!clean(source.value)||!clean(location.value)||!clean(notes.value)"));
 assert.ok(ui.includes('verifiedReference(refId)'));
 assert.ok(ui.includes('assessStage4('));
 assert.ok(ui.includes('proposeStage5('));
});
test('Адаптерът не извежда компетентността от менюто като доказана',()=>{
 assert.ok(adapter.includes('competenceEvidence:[]'));
 assert.ok(adapter.includes('legalFacts:[]'));
});
test('В1.3 изчиства предходни резултати при промяна на предмета или имотите',()=>{
 assert.ok(ui.includes("'kt80SubjectText','kt80ScopeText','kt80ParcelInput'"));
 assert.ok(ui.includes("'kt80:case-reset'"));
 assert.ok(ui.includes('state.signature!==currentSignature()'));
});
