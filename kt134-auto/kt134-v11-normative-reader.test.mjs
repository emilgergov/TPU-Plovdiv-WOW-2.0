import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134V11NormativeReader} from './kt134-v11-normative-reader.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const context={caseId,documents:[{fileId:'notice.pdf',sourceText:'Уведомление за инвестиционно предложение за складове и офиси. Искане за произнасяне.'}]};
test('real V11 corpus provisions are extracted for P4-style notice with exact source provenance',async()=>{
 const read=createKT134V11NormativeReader();
 const result=await read({caseId,context});
 assert.ok(result.provisions.length>=10);
 assert.ok(result.provisions.some(x=>x.act==='ЗООС'&&x.reference==='чл. 92'));
 assert.ok(result.provisions.some(x=>x.reference==='чл. 31'));
 assert.ok(result.provisions.every(x=>x.fullLegalText.length>0&&x.contentSHA256.length===64));
 assert.equal(result.legalApplicabilityVerified,false);
 assert.equal(result.verified,false);
 assert.equal(result.evidence.length,0);
});
test('archive content cannot be treated as an administrative applicability determination',async()=>{
 const read=createKT134V11NormativeReader({getContext:async()=>({archiveSHA256:'8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c',legalProvisions:[
  {applicabilityVerified:true,sourcePath:'file',contentSHA256:'123',reference:'чл. 1',fullLegalText:'тест'}
 ]})});
 await assert.rejects(read({caseId,context}),/Недоказан/);
});
test('foreign dossier cannot draw legal text through the current case context',async()=>{
 const read=createKT134V11NormativeReader();
 await assert.rejects(read({caseId:'22222222-2222-4222-8222-222222222222',context}),/Невалидна преписка/);
});
test('missing extracted document text prevents implying corpus used the actual dossier',async()=>{
 const read=createKT134V11NormativeReader();
 await assert.rejects(read({caseId,context:{caseId,documents:[{fileId:'a.pdf',sourceText:''}]}}),/Няма документален текст/);
});

test('both EG agents can request any complete V11 act on demand, not only the initially selected extracts',async()=>{
 const read=createKT134V11NormativeReader();
 const library=await read({caseId,context});
 assert.ok(library.availableActs.length>library.provisions.length);
 assert.ok(library.availableActs.includes('apk'));
 const full=await library.getAct({forCaseId:caseId,id:'apk'});
 assert.equal(full.id,'apk');
 assert.ok(full.fullLegalText.length>100);
 assert.equal(full.contentSHA256.length,64);
 assert.equal(full.applicabilityVerified,false);
});
test('on-demand legal library is bound to the current dossier and refuses other case IDs',async()=>{
 const read=createKT134V11NormativeReader();
 const library=await read({caseId,context});
 await assert.rejects(library.getAct({forCaseId:'another-case',id:'apk'}),/чужда преписка/);
 await assert.rejects(library.getAct({forCaseId:caseId,id:'unknown-legal-act'}),/Неразрешен/);
});
