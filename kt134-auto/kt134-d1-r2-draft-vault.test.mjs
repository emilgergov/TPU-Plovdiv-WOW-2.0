import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createKT134DraftVault} from './kt134-d1-r2-draft-vault.mjs';
const caseId='11111111-1111-4111-8111-111111111111',userId='expert123';
const version='auto-v2',bytes=new Uint8Array([80,75,3,4,1,2,3]);
const sha=async b=>Buffer.from(await webcrypto.subtle.digest('SHA-256',b)).toString('hex');
async function fixture(options={}){
 const actual=await sha(bytes),recorded=[];
 let stored=null;
 const db={prepare:(sql)=>{
  const bind=(...args)=>({run:async()=>{
   recorded.push({kind:'insert',sql,args});
   return {meta:{changes:options.stale?0:1}};
  },first:async()=>{
   recorded.push({kind:'select',sql,args});
   if(options.notFound)return null;
   return {case_id:caseId,case_revision:4,proposal_version:version,
    document_key:stored?.key||'kt134-auto/'+caseId+'/'+actual+'.docx',
    word_sha256:actual,content_sha256:'b'.repeat(64),
    binding_sha256:'c'.repeat(64),
    proposal_json:JSON.stringify({caseId,documentTitle:'Отговор по жалба'}),
    preview_json:JSON.stringify(['Относно: „Възражение“','Текст']),
    status:'awaiting_expert'};
  }});
  return {bind};
 }};
 const r2={
  put:async(key,b)=>{recorded.push({kind:'put',key});stored={key,bytes:b}},
  get:async(key)=>{recorded.push({kind:'get',key});return options.missingR2?null:
   {arrayBuffer:async()=>new Uint8Array(options.corrupt?[80,75,0,0]:bytes).buffer}}
 };
 const vault=createKT134DraftVault({db,r2,subtle:webcrypto.subtle,
  authorizeCase:async()=>!options.denied,now:()=>1234567890});
 const base={userId,caseId,caseRevision:4,proposalVersion:version,
  proposal:{caseId,expertConfirmed:false,documentDraft:'Относно: „Възражение“\nТекст'},
  wordBytes:bytes,presentation:{caseId,proposalVersion:version,
   expertConfirmed:false,wordReady:true,wordSha256:actual,
   contentSha256:'b'.repeat(64),bindingSha256:'c'.repeat(64),
   previewParagraphs:['Относно: „Възражение“','Текст']}};
 return {vault,base,recorded};
}
test('KT134 saves only a verified draft to a private case/hash keyed object',async()=>{
 const f=await fixture(),out=await f.vault.saveDraft(f.base);
 assert.equal(out.ok,true);assert.equal(out.caseRevision,4);
 assert.equal(f.recorded[0].kind,'put');
 assert.match(f.recorded[0].key,/^kt134-auto\/11111111-1111-4111-8111-111111111111\/[a-f0-9]{64}\.docx$/);
 assert.match(f.recorded[1].sql,/FROM kt126_registry r WHERE r\.case_id=\? AND r\.revision=\?/);
 assert.equal(f.recorded[1].args.at(-1),4);
 assert.equal(f.recorded[1].args.at(-2),caseId);
});
test('unauthorized case cannot touch R2 or D1',async()=>{
 const f=await fixture({denied:true});
 await assert.rejects(f.vault.saveDraft(f.base),/разрешен достъп/);
 assert.deepEqual(f.recorded,[]);
});
test('different Word bytes fail before any archive write',async()=>{
 const f=await fixture();
 await assert.rejects(f.vault.saveDraft({...f.base,wordBytes:new Uint8Array([80,75,9,9,9])}),/променен/);
 assert.equal(f.recorded.length,0);
});
test('stale case revision refuses D1 commit and never claims success',async()=>{
 const f=await fixture({stale:true});
 await assert.rejects(f.vault.saveDraft(f.base),/не е записан/);
 assert.deepEqual(f.recorded.map(x=>x.kind),['put','insert']);
});
test('load rechecks registry revision and return metadata without exposing bytes',async()=>{
 const f=await fixture();
 const item=await f.vault.loadDraft({userId,caseId,proposalVersion:version});
 assert.equal(item.caseRevision,4);assert.equal(item.bindingSha256,'c'.repeat(64));
 assert.equal(item.wordBytes,undefined);
 assert.match(f.recorded[0].sql,/JOIN kt126_registry r ON r\.case_id=d\.case_id/);
 assert.match(f.recorded[0].sql,/r\.revision=d\.case_revision/);
});
test('explicit authorized load returns hash-verified DOCX bytes',async()=>{
 const f=await fixture();const item=await f.vault.loadDraft({userId,caseId,proposalVersion:version,includeWord:true});
 assert.deepEqual([...item.wordBytes],[...bytes]);
});
test('tampered private R2 archive is rejected on read',async()=>{
 const f=await fixture({corrupt:true});
 await assert.rejects(f.vault.loadDraft({userId,caseId,proposalVersion:version,includeWord:true}),/повреден/);
});
test('no metadata record never produces a fake Word project',async()=>{
 const f=await fixture({notFound:true});
 await assert.rejects(f.vault.loadDraft({userId,caseId,proposalVersion:version}),/Няма актуален/);
});

test('only authorized current D1 draft is offered to final expert proposal loader',async()=>{
 const f=await fixture();
 const item=await f.vault.loadCurrentDraft({userId,caseId,includeWord:true});
 assert.equal(item.proposalVersion,version);
 assert.deepEqual([...item.wordBytes],[...bytes]);
 const selects=f.recorded.filter(x=>x.kind==='select');
 assert.equal(selects.length,2);
 assert.match(selects[0].sql,/d.status='awaiting_expert'/);
 assert.match(selects[0].sql,/r.revision=d.case_revision/);
});
test('revoked rights prevent current-draft lookup and R2 access',async()=>{
 const f=await fixture({denied:true});
 await assert.rejects(f.vault.loadCurrentDraft({userId,caseId,includeWord:true}),/разрешен достъп/);
 assert.deepEqual(f.recorded,[]);
});
