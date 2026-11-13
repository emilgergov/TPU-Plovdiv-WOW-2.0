import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const old=read('../KT82_15_PACKAGE_A_V598_TEST.html');
const page=read('../KT83_03_PNI_V2_SOURCE_FIRST_GATED_TEST.html');
const js=read('../integration/kt83-pni-v2-admin-preview.mjs');
test('ПНИ-V2: пилотният екран е отделен и старите версии не са подменени',()=>{
 assert.ok(!old.includes('kt83-pni-v2-admin-preview.mjs'));
 assert.ok(page.includes('integration/kt83-pni-v2-admin-preview.mjs'));
 assert.ok(!page.includes('integration/kt83-v1-4-admin-auto-preview.mjs?v='));
});
test('ПНИ-V2: защитеният вход не приема подадени правни правила от преписката',()=>{
 assert.ok(js.includes("import { reviewIndependently } from '../independence/pni-independent-review.mjs'"));
 assert.ok(js.includes('state.lastStage4=reviewIndependently({'));
 assert.ok(js.includes('confirmedSubject:dossier.confirmedSubject'));
 assert.ok(js.includes('evidence:dossier.legalFacts'));
 assert.ok(!js.includes('state.lastStage4=assessStage4(stage4RequestFromKT80('));
});
test('ПНИ-V2: без независим нормативен граф етап 5 е блокиран',()=>{
 assert.ok(js.includes('state.lastStage4.normativeCoverageComplete!==true'));
 assert.ok(js.includes('проект за процедура не се изготвя'));
 assert.ok(!js.includes('administrativeActIssued:true'));
});
test('ПНИ-V2: съществуващите етапи и експертен контрол са запазени',()=>{
 for(const id of ['kt80SubjectText','kt80ScopeText','kt80Authority','kt80LawConfirmed','kt80ToProposal'])
  assert.ok(page.includes('id="'+id+'"'));
});
