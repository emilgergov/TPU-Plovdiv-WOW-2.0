import test from 'node:test';
import assert from 'node:assert/strict';
import {groupKT134DocumentVariants} from './kt134-document-variants.mjs';
const s='Предмет: складове за промишлени стоки и офиси в поземлен имот 56784.13.102 с площ 3435 кв. м. Уведомление за инвестиционно предложение по заявление за четири отделни склада с офисна част. ';
const base=s.repeat(6);
const copies=()=>[
 {fileId:'Uvedomlenie_OVOS_Joreto_26.pdf',kind:'notification',sourceText:base},
 {fileId:'Uvedomlenie_OVOS_Joreto_26.doc',kind:'notification',sourceText:base.replace('четири отделни склада','четири самостоятелни склада')},
 {fileId:'Skica.pdf',kind:'unknown',sourceText:'Кадастрална скица'},
 {fileId:'Not_Akt.pdf',kind:'unknown',sourceText:'Нотариален акт'}
];
test('P4-like notice DOC/PDF remain two physical sources but one proposed logical document',()=>{
 const docs=groupKT134DocumentVariants(copies());
 assert.equal(docs.length,4);
 assert.equal(docs[0].logicalDocumentId,docs[1].logicalDocumentId);
 assert.equal(docs[0].originalVariant,true);
 assert.equal(docs[1].sourceText.includes('самостоятелни'),true);
 assert.equal(docs[1].equivalenceStatus,'probable_same_notice_pending_source_review');
 assert.equal(docs[2].originalVariant,false);
});
test('changed parcel or quantitative claim prevents unsafe automatic grouping',()=>{
 const [a,b]=copies();
 const docs=groupKT134DocumentVariants([a,{...b,sourceText:b.sourceText.replaceAll('56784.13.102','56784.13.103')}]);
 assert.notEqual(docs[0].logicalDocumentId,docs[1].logicalDocumentId);
});
test('matching names alone cannot join different administrative requests',()=>{
 const [a,b]=copies();
 const docs=groupKT134DocumentVariants([a,{...b,sourceText:'Възражение срещу административен акт, различна хронология. '.repeat(12)}]);
 assert.equal(docs[1].originalVariant,false);
});
test('short unreadable scans cannot be silently treated as verified duplicates',()=>{
 const docs=groupKT134DocumentVariants([
  {fileId:'same.pdf',sourceText:'Тест'},
  {fileId:'same.doc',sourceText:'Тест'}
 ]);
 assert.equal(docs[0].originalVariant,false);
});
test('same file extension does not imply duplicate',()=>{
 const docs=groupKT134DocumentVariants([
  {fileId:'same.pdf',sourceText:base},{fileId:'SAME.PDF',sourceText:base}
 ]);
 assert.equal(docs[0].originalVariant,false);
});
test('ambiguous multi-way copies remain separate for review',()=>{
 const docs=groupKT134DocumentVariants([
  {fileId:'same.pdf',sourceText:base},
  {fileId:'same.doc',sourceText:base},
  {fileId:'same.docx',sourceText:base}
 ]);
 assert.equal(docs.every(x=>!x.originalVariant),true);
});
test('non-duplicate original content is preserved without deletion',()=>{
 const input=copies(),out=groupKT134DocumentVariants(input);
 assert.deepEqual(out.map(x=>x.sourceText),input.map(x=>x.sourceText));
});
