import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {zipSync,unzipSync} from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
import {createVerifiedWordPresentation} from './kt134-verified-word-presentation.mjs';

const caseId='11111111-1111-4111-8111-111111111111';
const proposalVersion='v17';
const create=async ({text='Относно: „Възражение“\nРазглеждаме възражението по административната преписка.\nПредлагаме мотивиран отговор.',title='Отговор по жалба'}={})=>{
 const fflate={zipSync,unzipSync};
 globalThis.window={fflate};
 const builder=createDraftWordAdapter({fflate,templateWindow:globalThis.window});
 const bytes=await builder.buildDraft({status:'draft',panelId:17,documentTitle:title,content:text});
 const proposal={caseId,expertConfirmed:false,documentTitle:title,documentDraft:text};
 const verifier=createVerifiedWordPresentation({unzipSync,subtle:webcrypto.subtle});
 return {bytes,proposal,verifier};
};
const params=x=>({caseId,proposalVersion,wordBytes:x.bytes,proposal:x.proposal});
test('preview reads exact paragraphs from real KT120 DOCX, not duplicate hand-written HTML',async()=>{
 const x=await create();
 const result=await x.verifier.bind(params(x));
 assert.equal(result.title,'ОТГОВОР ПО ЖАЛБА');
 assert.deepEqual(result.previewParagraphs,[
  'Относно: „Възражение“',
  'Разглеждаме възражението по административната преписка.',
  'Предлагаме мотивиран отговор.'
 ]);
 assert.equal(result.wordReady,true);
 assert.equal(result.expertConfirmed,false);
 assert.equal(result.wordSha256.length,64);
 assert.equal(result.bindingSha256.length,64);
});
test('edited text with old DOCX cannot be offered as an identical final project',async()=>{
 const x=await create();
 await assert.rejects(x.verifier.bind({...params(x),
  proposal:{...x.proposal,documentDraft:'Относно: „Възражение“\nДруг текст за административен акт.'}}),/различават/);
});
test('stale document title is detected before expert confirmation',async()=>{
 const x=await create();
 await assert.rejects(x.verifier.bind({...params(x),
  proposal:{...x.proposal,documentTitle:'Решение за процедура'}}),/Видът/);
});
test('other case identity and simulated expert confirmation are rejected',async()=>{
 const x=await create();
 await assert.rejects(x.verifier.bind({...params(x),proposal:{...x.proposal,caseId:'wrong'}}),/валиден/);
 await assert.rejects(x.verifier.bind({...params(x),proposal:{...x.proposal,expertConfirmed:true}}),/валиден/);
});
test('two proposal versions give different final-screen binding even with identical DOCX',async()=>{
 const x=await create();
 const first=await x.verifier.bind(params(x));
 const second=await x.verifier.bind({...params(x),proposalVersion:'v18'});
 assert.notEqual(first.bindingSha256,second.bindingSha256);
 assert.equal(first.wordSha256,second.wordSha256);
});
test('invalid and empty archives never produce a preview',async()=>{
 const x=await create();
 await assert.rejects(x.verifier.bind({...params(x),wordBytes:new Uint8Array([1,2,3])}),/DOCX/);
 await assert.rejects(x.verifier.bind({...params(x),
  wordBytes:zipSync({'word/unrelated.xml':new TextEncoder().encode('no content')})}),/текст в DOCX/);
});
