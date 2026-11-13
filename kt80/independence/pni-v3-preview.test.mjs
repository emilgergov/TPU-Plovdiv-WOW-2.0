import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const base=read('../KT82_15_PACKAGE_A_V598_TEST.html');
const v2=read('../KT83_03_PNI_V2_SOURCE_FIRST_GATED_TEST.html');
const v3=read('../KT83_04_PNI_V3_FREE_HYPOTHESIS_AUDIT_TEST.html');
const module=read('../integration/kt83-pni-v3-exploration-ui.mjs');
test('ПНИ-V3: не променя V59.8 и ПНИ-V2',()=>{
 assert.ok(!base.includes('kt83-pni-v3-exploration-ui.mjs'));
 assert.ok(!v2.includes('kt83-pni-v3-exploration-ui.mjs'));
 assert.ok(v3.includes('kt83-pni-v3-exploration-ui.mjs'));
 assert.ok(!v3.includes('kt83-pni-v2-admin-preview.mjs'));
});
test('ПНИ-V3: свободната изследователска проверка не дава процедура или акт',()=>{
 assert.ok(module.includes('auditExploratoryHypotheses('));
 assert.ok(module.includes('normativeCoverageComplete:false'));
 assert.ok(module.includes('Не е определена процедура. Не е издаден административен акт.'));
});
test('ПНИ-V3: интерфейсът не твърди, че AI е интегриран без действителна връзка',()=>{
 assert.ok(module.includes('няма включено автоматично AI генериране'));
 assert.ok(!module.includes('fetch('));
 assert.ok(!module.includes('OPENAI_API_KEY'));
});
test('ПНИ-V3: само експертно потвърдените предмет и обхват преминават към одит',()=>{
 assert.ok(module.includes('confirmedSubject:data.confirmedSubject'));
 assert.ok(module.includes('scopeConfirmed:data.scopeConfirmed'));
});
test('ПНИ-V3: подмяна на предмета отменя предходен резултат',()=>{
 assert.ok(module.includes('Променен предмет или обхват'));
 assert.ok(module.includes("'kt80:case-reset'"));
});
