'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync('v26-test/v27-preview/kt51-ai-characterization.js','utf8'),sandbox);
const api=sandbox.KT51AICharacterization;
assert.equal(typeof api.build,'function');
const four=[
'С реализацията на инвестиционното предложение се предвижда конкретен складов обект с определен имотен обхват.',
'Електроснабдяването е описано като връзка със съществуващата инфраструктура съгласно наличните документи.',
'Водоснабдяването е предвидено чрез описания в преписката източник на водоподаване.',
'Отпадъчните води се отвеждат по посоченото в представената проектна документация решение.'
];
const draft='[[CHARACTERIZATION]]\n\n'+four.join('\n\n')+'\n\n[[LEGAL]]\n\nПравни съображения.\n\n[[PROCEDURE]]\n\nПроцедурна преценка.\n\n[[IMPACTS]]\n\nВъздействия.';
const confirmed=api.build(draft,four);
assert.equal(confirmed.origin,'expert-confirmed');
assert.deepEqual(Array.from(confirmed.paragraphs),four);
const ai=api.build(draft,['[ЗА ЕКСПЕРТНА ПРОВЕРКА — липсва потвърдено описание]',...four.slice(1)]);
assert.equal(ai.origin,'ai-review-draft');
assert.deepEqual(Array.from(ai.paragraphs),four);
const combined='[[CHARACTERIZATION]]\n\n'+four.join(' ')+'\n\n[[LEGAL]]\n\nРежими.\n\n[[PROCEDURE]]\n\nПреценка.\n\n[[IMPACTS]]\n\nВъздействия.';
const split=api.build(combined,[]);
assert.equal(split.paragraphs.length,4);
assert.equal(split.paragraphs.join(' '),four.join(' '),'No AI words may be omitted or invented');
assert.throws(()=>api.build('[[CHARACTERIZATION]]\n\nОбщо описание.\n\n[[LEGAL]]\n\nРежими.\n\n[[PROCEDURE]]\n\nПреценка.\n\n[[IMPACTS]]\n\nВъздействия.',[]),/четири завършени/);
const marked=api.build('[[CHARACTERIZATION]]\n\n'+four[0]+' [ЗА ЕКСПЕРТНА ПРОВЕРКА — сверете източника]'+'\n\n[ЗА ЕКСПЕРТНА ПРОВЕРКА]\n\n'+four.slice(1).join('\n\n')+'\n\n[[LEGAL]]\n\nПравно.\n\n[[PROCEDURE]]\n\nПроцедурно.\n\n[[IMPACTS]]\n\nВъздействия.',[]);
assert.deepEqual(Array.from(marked.paragraphs),four,'Remove review metadata but keep every factual sentence');
assert.throws(()=>api.build('[[CHARACTERIZATION]]\n\n'+four[0]+'\n\n[ЗА ЕКСПЕРТНА ПРОВЕРКА]\n\n[[LEGAL]]\n\nПравно.\n\n[[PROCEDURE]]\n\nПроцедурно.\n\n[[IMPACTS]]\n\nВъздействия.',[]),/четири завършени/);
console.log('KT51 AI CHARACTERIZATION PASS: 4 confirmed paragraphs retained, 4 AI paragraphs preserved, safe sentence splitting, review tags removed without losing facts, incomplete content rejected');
