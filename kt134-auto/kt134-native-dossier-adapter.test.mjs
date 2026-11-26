import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134NativeDossierAdapters} from './kt134-native-dossier-adapter.mjs';
const id='EG-2026-000013';
const rows={
 kt125_users:[{user_id:'u1',organization_id:'riosv',role:'expert',active:1}],
 kt125_cases:[{case_id:id,organization_id:'riosv',owner_id:'u1',status:'active',updated_at_ms:1}],
 kt125_grants:[],
 kt126_registry:[{revision:3,internal_number:id,external_number:'ПД-013',external_status:'confirmed'}],
 kt126_files:[{source_id:'doc1',filename:'vazrazhenie.pdf',sha256:'b'.repeat(64),complete:1}],
 kt126_versions:[{revision:3,kind:'stage2',content_json:JSON.stringify({
   subject:'Възражение срещу писмо',scope:'Искане за изменение на административно писмо',
   documents:[{sourceId:'doc1',text:'Подадено е възражение срещу формулировката в писмото.',fileName:'vazrazhenie.pdf'}],
   gisSkipConfirmed:true,gisSkipReason:'Предметът не изисква пространствен анализ'
 })}]
};
function fixture(overrides={}){
 const db={prepare(sql){let args=[];return{
   bind(...a){args=a;return this},
   async first(){
     if(sql.includes('FROM kt125_users'))return overrides.user??rows.kt125_users[0];
     if(sql.includes('FROM kt125_cases'))return overrides.caseRow??rows.kt125_cases[0];
     if(sql.includes('FROM kt125_grants'))return null;
     if(sql.includes('FROM kt126_registry'))return overrides.registry??rows.kt126_registry[0];
     throw Error('UNEXPECTED_SQL '+sql);
   },
   async all(){
     if(sql.includes('FROM kt126_versions'))return {results:overrides.versions??rows.kt126_versions};
     if(sql.includes('FROM kt126_files'))return {results:overrides.files??rows.kt126_files};
     throw Error('UNEXPECTED_SQL '+sql);
   }
  }}};
 return createKt134NativeDossierAdapters({db,
  resolvePrincipal:async()=>overrides.principal??{authenticated:true,userId:'u1',organizationId:'riosv'},
  getNormativeMaster:async()=>({name:'НОРМАТИВЕН MASTER',sha256:'a'.repeat(64),verifiedReferences:[{id:'zbr'}]})
 });
}
test('isolated server D1 dossier generates case-bound evidence, no user-supplied identity',async()=>{
 const a=fixture();
 const ctx=await a.loadProtectedContext({authenticatedSession:'protected-server-session',caseId:id});
 assert.equal(ctx.principal.userId,'u1');assert.equal(ctx.caseRecord.id,id);
 const b=await a.loadEvidenceBundle({preflight:{case:{caseId:id}},authenticatedSession:'protected-server-session'});
 assert.equal(b.documents[0].text,'Подадено е възражение срещу формулировката в писмото.');
 assert.equal(b.gisMode,'contextual_skip');
 assert.equal(b.receiptRefs.length,3);
 assert.equal(b.serverVerified,true);
});
test('case owner mismatch fails closed',async()=>{
 await assert.rejects(()=>fixture({caseRow:{...rows.kt125_cases[0],owner_id:'someone_else'}})
  .loadProtectedContext({authenticatedSession:'protected-server-session',caseId:id}),/CASE_ACCESS_DENIED/);
});
test('inactive principal denied before dossier',async()=>{
 await assert.rejects(()=>fixture({user:{...rows.kt125_users[0],active:0}})
  .loadProtectedContext({authenticatedSession:'protected-server-session',caseId:id}),/KT125_AUTH_REQUIRED/);
});
test('incomplete extracted document texts cannot enter EG',async()=>{
 const versions=[{revision:3,content_json:JSON.stringify({
  subject:'Възражение',scope:'Искане',documents:[],gisSkipConfirmed:true,gisSkipReason:'Контекстен режим'
 })}];
 await assert.rejects(()=>fixture({versions})
  .loadProtectedContext({authenticatedSession:'protected-server-session',caseId:id}),/KT134_VERIFIED_SOURCE_TEXTS_MISSING/);
});
test('unconfirmed external registry number fails closed',async()=>{
 await assert.rejects(()=>fixture({registry:{...rows.kt126_registry[0],external_status:'proposed'}})
  .loadProtectedContext({authenticatedSession:'protected-server-session',caseId:id}),/KT126_EXTERNAL_NUMBER_NOT_CONFIRMED/);
});

test('actual KT126 nested state and values snapshots feed Stage2 context',async()=>{
 const versions=[{revision:9,kind:'state',content_json:JSON.stringify({
   state:{intake:{files:[{sourceId:'doc1',text:'Обжалва се текст на административно писмо.',filename:'vazrazhenie.pdf'}]},
     subjectConfirmed:{text:'Възражение срещу предходно писмо'},gisSkipConfirmed:true,
     gisSkipReason:'Разглеждане на възражение без ново инвестиционно предложение'},
   values:{kt80ScopeText:'Редакция на съдържание на административно писмо'},
   globals:{KT80IPMasterDraft:{proposedSubject:'Предходно уведомление'}}
 })}];
 const a=fixture({versions});
 const c=await a.loadProtectedContext({authenticatedSession:'session-nested',caseId:id});
 assert.equal(c.caseRecord.subject,'Възражение срещу предходно писмо');
 const b=await a.loadEvidenceBundle({preflight:{case:{caseId:id}},authenticatedSession:'session-nested'});
 assert.equal(b.scope,'Редакция на съдържание на административно писмо');
 assert.equal(b.documents[0].sourceId,'doc1');
});

test('KT126 document_texts links exact filename to the only authoritative file',async()=>{
 const versions=[{revision:4,kind:'stage1',content_json:JSON.stringify({
   state:{intake:{document_texts:[{source:'vazrazhenie.pdf',text:'Пълен извлечен текст от възражение.'}],
     gisSkipConfirmed:true,gisSkipReason:'Жалба без ново пространствено действие'}},
   values:{kt80SubjectText:'Възражение',kt80ScopeText:'Преразглеждане на писмо'},
   gisSkipConfirmed:true,gisSkipReason:'Жалба без пространствена преценка'
 })}];
 const a=fixture({versions});
 await a.loadProtectedContext({authenticatedSession:'session-doc-texts',caseId:id});
 const b=await a.loadEvidenceBundle({
   authenticatedSession:'session-doc-texts',preflight:{case:{caseId:id}}
 });
 assert.deepEqual(b.documents.map(d=>d.sourceId),['doc1']);
 assert.equal(b.documents[0].text,'Пълен извлечен текст от възражение.');
});
test('duplicate filenames in manifest cannot attach unverified document text',async()=>{
 const versions=[{revision:5,content_json:JSON.stringify({
   subject:'Възражение',scope:'Отговор',gisSkipConfirmed:true,gisSkipReason:'Без ГИС',
   document_texts:[{source:'vazrazhenie.pdf',text:'Текст от файл'}]
 })}];
 const files=[{source_id:'doc1',filename:'vazrazhenie.pdf',sha256:'b'.repeat(64),complete:1},
              {source_id:'doc2',filename:'vazrazhenie.pdf',sha256:'c'.repeat(64),complete:1}];
 await assert.rejects(()=>fixture({versions,files})
  .loadProtectedContext({authenticatedSession:'session-ambiguous',caseId:id}),
  /KT134_DOCUMENT_SOURCE_UNVERIFIED/);
});
test('missing manifest source refuses partial dossier instead of drafting',async()=>{
 const files=[...rows.kt126_files,
  {source_id:'doc2',filename:'attachment.pdf',sha256:'c'.repeat(64),complete:1}];
 await assert.rejects(()=>fixture({files}).loadProtectedContext({
  authenticatedSession:'session-incomplete',caseId:id
 }),/KT134_VERIFIED_SOURCE_TEXTS_MISSING/);
});

test('KT134 rereads D1 and rejects changed evidence before passing to EG',async()=>{
 const files=rows.kt126_files.map(x=>({...x}));
 const a=fixture({files});
 const session='session-evidence-change';
 const ctx=await a.loadProtectedContext({authenticatedSession:session,caseId:id});
 const preflight={case:{caseId:id,revision:String(ctx.caseRecord.revision)},
  principalId:ctx.principal.userId,
  evidence:Object.values(ctx.evidence)};
 files[0].sha256='d'.repeat(64);
 await assert.rejects(()=>a.loadEvidenceBundle({preflight,authenticatedSession:session}),
  /KT134_CASE_EVIDENCE_CHANGED/);
});
test('KT134 rejects wrong case revision at latest D1 read',async()=>{
 const versions=rows.kt126_versions.map(x=>({...x}));
 const a=fixture({versions});
 const session='session-version-change';
 const ctx=await a.loadProtectedContext({authenticatedSession:session,caseId:id});
 const preflight={case:{caseId:id,revision:String(ctx.caseRecord.revision)},
  principalId:ctx.principal.userId,
  evidence:Object.values(ctx.evidence)};
 versions[0].revision=15;
 await assert.rejects(()=>a.loadEvidenceBundle({preflight,authenticatedSession:session}),
  /KT134_CASE_SNAPSHOT_CHANGED/);
});
