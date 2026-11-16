import assert from 'node:assert/strict';
import {getLegalContext,getArticleFromV11,getFullV11Document,V11_CORPUS_FILES} from '../src/legal-v11-loader.mjs';
const SHA='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
assert.equal(V11_CORPUS_FILES.length,22);
const a=await getLegalContext({archiveSHA256:SHA,subject:'Изграждане на складово помещение и офис',scope:'ПИ 56784.13.102'});
assert.equal(a.indexedDocuments,22);
assert(a.legalProvisions.length>=10,'must return multiple source-verified full articles');
const find=(act,ref)=>a.legalProvisions.find(x=>x.act.includes(act)&&x.reference===ref);
const os2=find('Наредба за ОС','чл. 2');
const os6=find('Наредба за ОС','чл. 6а');
const zoos93=find('ЗООС','чл. 93');
const zoosAnnex2=find('ЗООС','Приложение № 2 към ЗООС');
const ovosAnnex2=find('Наредба за ОВОС','Приложение № 2 към чл. 6 от Наредбата за ОВОС');
for(const x of [os2,os6,zoos93,zoosAnnex2,ovosAnnex2]){
 assert(x?.quotationFromArchive,true);
 assert(x.fullLegalText.length>150,'full article/annex must not be a short paraphrase');
 assert.match(x.contentSHA256,/^[0-9a-f]{64}$/);
 assert.equal(x.applicabilityVerified,false,'presence is not legal applicability');
}
assert.match(os2.fullLegalText,/ал\.?\s*2|\(2\)/iu);
// KT112 strict boundary acceptance: references inside wrapped paragraphs must
// never be mistaken for top-level article or annex headings.
const z1=find('ЗООС','Приложение № 1 към ЗООС');
assert(z1,'the genuine annex 1 must be present');
assert.match(os2.fullLegalText,/компетентният орган по\s+чл\.\s*6а указва начина на процедиране/iu);
assert.match(os2.fullLegalText,/в\s+14-дневен\s+срок/iu);
assert.match(os2.fullLegalText,/предостави допълнителна информация/iu);
assert.match(os2.fullLegalText,/процедурата се прекратява/iu);
assert(!os2.fullLegalText.includes('Чл. 3.'),'art 2 must stop before actual art 3');
assert.match(os6.fullLegalText,/^Чл\.\s*6а\./u);
assert.match(os6.fullLegalText,/Компетентни органи за\s+издаване/u);
assert(!os6.fullLegalText.includes('В 14-дневен срок от подаването'),'art 6а must not be extracted from art 2');
assert.match(z1.fullLegalText,/^Приложение № 1\s+към чл\.\s*92/u);
assert.match(zoosAnnex2.fullLegalText,/^Приложение № 2\s+към чл\.\s*93/u);
assert(!z1.fullLegalText.includes('Конвенцията по оценка на въздействието'),'annex 1 must not include earlier unrelated treaty mentions');
assert(!z1.fullLegalText.includes('Приложение № 2\nкъм чл. 93'),'annex 1 must stop at annex 2');
assert(!zoosAnnex2.fullLegalText.includes('Приложение № 3\nкъм'),'annex 2 must not include the next annex');
console.log('PASS: KT112 boundaries of art. 2 and 6а OS and genuine ZOOS annexes 1/2; full provisions supplied without split-at-mention.');

assert.match(zoosAnnex2.fullLegalText,/Приложение\s*№\s*2/iu);
assert.match(ovosAnnex2.fullLegalText,/Информация\s+за\s+преценяване/iu);
assert(!ovosAnnex2.fullLegalText.includes('Magistrat'));
const zoos=await getFullV11Document('zoos');
assert(zoos.text.length>300000,'source has complete law body');
const extra=await getArticleFromV11('zbr','31');
assert(extra.text?.includes('Чл. 31'),'article is locally retrievable on demand');
await assert.rejects(()=>getLegalContext({archiveSHA256:'wrong',subject:'test'}),/archive hash mismatch/);
console.log('PASS: all 22 V11 documents accessible with digest verification, exact selected legal articles and distinct annexes.');
