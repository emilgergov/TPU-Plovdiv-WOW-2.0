import assert from 'node:assert/strict';
import {buildEvidenceChunks,verifyEvidenceDigest,evidenceCoverage} from './kt134-evidence-chunks.mjs';
const docs=[
 {source:'Уведомление.pdf',text:'Задължителен предмет на инвестиционното предложение. '.repeat(151)},
 {source:'Техническо описание.pdf',text:'Конкретни фактически параметри на сградата. '.repeat(120)},
 {source:'Приложение без текст.pdf',text:''}
];
const expected=buildEvidenceChunks(docs,5000);
assert.equal(expected.totalDocuments,3);
assert.equal(expected.unreadable.length,1);
for(let i=0;i<2;i++){
 const full=expected.chunks.filter(x=>x.documentIndex===i).map(x=>x.text).join('');
 assert.equal(full,docs[i].text);
}
const responses=expected.chunks.map(chunk=>verifyEvidenceDigest(chunk,{
 examined:true,notes:'Прочетена е цялата част.',
 claims:[{quote:chunk.text.slice(0,45),summary:'Потвърждение за съпоставяне с оригиналния документален текст.'},
 {quote:'ИЗМИСЛЕН ТЕКСТ, КОЙТО НЕ СЪЩЕСТВУВА.',summary:'Недопустима измислена позиция в извлечението.'}]
}));
assert.equal(responses.length,expected.chunks.length);
assert.ok(responses.every(r=>r.claims.length===1));
assert.ok(responses.every(r=>r.claims[0].verifiedQuoteMatch));
assert.equal(evidenceCoverage(expected,responses).complete,false,'An unreadable document cannot pass');
const readable=buildEvidenceChunks(docs.slice(0,2),5000);
const complete=readable.chunks.map(chunk=>verifyEvidenceDigest(chunk,{examined:true,
 claims:[{quote:chunk.text.slice(0,45),summary:'Това е конкретно твърдение в приложените документи.'}]}));
assert.equal(evidenceCoverage(readable,complete).complete,true);
assert.equal(evidenceCoverage(readable,complete.slice(0,-1)).complete,false,'Missing span must be visible');
assert.equal(evidenceCoverage(readable,[]).examinedChunks,0);
console.log('KT134 full-span coverage and quote provenance regression passed');

const truncated=buildEvidenceChunks([{source:'Дълъг PDF.pdf',text:'Съществен фактически текст. '.repeat(200),
 totalChars:150000,truncated:true}],5000);
assert.ok(truncated.unreadable.some(x=>x.reason==='EXTRACTED_TEXT_TRUNCATED'));
assert.equal(evidenceCoverage(truncated,truncated.chunks.map(chunk=>verifyEvidenceDigest(chunk,{examined:true,claims:[]}))).complete,false);
const ocrGap=buildEvidenceChunks([{source:'Сканиран документ.pdf',text:'Наличен извлечен текст от PDF, но с непрочетени страници.',
 readStatus:'ПРОВЕРКА: стр. 3 — недостатъчно разчетен текст'}]);
assert.ok(ocrGap.unreadable.some(x=>x.reason==='EXTRACTION_REQUIRES_REVIEW'));
