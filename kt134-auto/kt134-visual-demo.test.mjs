import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const markup=fs.readFileSync(new URL('./KT134_AUTO_VISUAL_DEMO.html',import.meta.url),'utf8');
const make=()=>{
 const dom=new JSDOM(markup,{url:'https://isolated.invalid/preview',runScripts:'outside-only'});
 const {window:w}=dom;
 const scripts=[...w.document.querySelectorAll('script')];
 assert.equal(scripts.length,1);
 w.setTimeout=callback=>{callback();return 0};
 w.eval(scripts[0].textContent);
 return {w,doc:w.document};
};
test('standalone preview preserves all five approved stage labels and compact two-lane scale',()=>{
 const {doc}=make();
 assert.equal(doc.querySelectorAll('.stage').length,5);
 assert.equal(doc.querySelectorAll('.node').length,5);
 assert.equal(doc.querySelectorAll('.gate').length,2);
 assert.ok(doc.querySelector('.auto').compareDocumentPosition(doc.querySelector('.stages')));
});
test('preview is explicitly marked synthetic without real requests or automatic approval',()=>{
 const {doc}=make();
 assert.match(doc.body.textContent,/НЕ Е РЕАЛЕН АНАЛИЗ/u);
 assert.equal(doc.querySelector('#output').classList.contains('visible'),false);
 assert.ok(!markup.includes('fetch('));
});
test('one click carries demo to final proposal with no intermediate forms or passwords',()=>{
 const {doc}=make();
 doc.querySelector('#start').click();
 assert.equal(doc.querySelector('#output').classList.contains('visible'),true);
 assert.equal(doc.querySelector('#fill').style.width,'100%');
 assert.equal(doc.querySelectorAll('.node.done').length,5);
 assert.match(doc.querySelector('#status').textContent,/Неодобрен проект/u);
});
test('edit keeps project explicitly unapproved until separate final action',()=>{
 const {doc}=make();doc.querySelector('#start').click();doc.querySelector('#edit').click();
 assert.equal(doc.querySelector('#editor').hidden,false);
 assert.match(doc.querySelector('#status').textContent,/неодобрен/u);
 assert.equal(doc.querySelector('#confirm').disabled,false);
});
test('confirm is only demo state, not real administrative approval',()=>{
 const {doc}=make();doc.querySelector('#start').click();doc.querySelector('#confirm').click();
 assert.match(doc.querySelector('#status').textContent,/демонстрацията/u);
 assert.match(doc.querySelector('#decisionHelp').textContent,/не е административно действие/u);
});
test('return to classic clears active demo without transferring approval',()=>{
 const {doc}=make();doc.querySelector('#start').click();doc.querySelector('#classic').click();
 assert.equal(doc.querySelector('#output').classList.contains('visible'),false);
 assert.equal(doc.querySelector('#fill').style.width,'0%');
 assert.match(doc.querySelector('#decisionHelp').textContent,/без пренесени експертни потвърждения/u);
});
