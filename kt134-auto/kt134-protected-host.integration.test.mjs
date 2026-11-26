import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134IsolatedProtectedHost} from './kt134-protected-host.mjs';
const caseId='33333333-3333-4333-8333-333333333333';
const sessionCookie='kt125_integration_test';
const secret='X'.repeat(64);
const getHash=async()=>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
};
function makeDb(hash){
 return {prepare(sql){
   let args=[];
   return {
    bind(...values){args=values;return this},
    async first(){
     if(sql.includes('FROM kt125_local_sessions')){
       if(args[0]!==hash)return null;
       return {token_hash:hash,session_credential_version:1,user_updated_at_ms:12,
        expires_at_ms:2100000000000,account_id:'acct',
        user_id:'test-expert',organization_id:'test-organization',
        account_state:'approved',activated_at_ms:12,account_credential_version:1,
        role:'expert',active:1,updated_at_ms:12,user_organization_id:'test-organization'};
     }
     if(sql.includes('FROM kt125_users'))
       return {user_id:'test-expert',organization_id:'test-organization',role:'expert',active:1};
     if(sql.includes('FROM kt125_cases'))
       return args[0]===caseId?{case_id:caseId,organization_id:'test-organization',
         owner_id:'test-expert',status:'active'}:null;
     if(sql.includes('FROM kt125_grants'))return null;
     if(sql.includes('FROM kt126_registry'))
       return {revision:2,internal_number:'EG-TEST-1',
         external_number:'TEST-1/2026',external_status:'confirmed'};
     throw Error('Unexpected query '+sql);
    },
    async all(){
     if(sql.includes('FROM kt126_versions'))return {results:[{revision:2,kind:'stage1',
       content_json:JSON.stringify({
        values:{kt80SubjectText:'Възражение относно писмо',
          kt80ScopeText:'Искане за корекция на административен текст'},
        documents:[{sourceId:'f1',fileName:'vazrazhenie.pdf',
          text:'Подадено е възражение по съдържание на писмо.'}],
        gisSkipConfirmed:true,gisSkipReason:'Предметът е възражение без ново пространствено предложение'
       })}]};
     if(sql.includes('FROM kt126_files'))return {results:[{
       source_id:'f1',filename:'vazrazhenie.pdf',sha256:'b'.repeat(64),complete:1
     }]};
     throw Error('Unexpected list '+sql);
    }
   };
 }};
}
function makeTestHost({db,transport}){
 return createKt134IsolatedProtectedHost({
   db,cookieName:sessionCookie,
   getNormativeMaster:async()=>({name:'Локален нормативен MASTER',
     sha256:'c'.repeat(64),verifiedReferences:[{id:'norm-a',applicabilityVerified:false}]}),
   buildDraftWord:async()=>Uint8Array.from({length:204},(_,i)=>i%256),
   egWorkerBase:'https://eg-test.invalid',egAccessToken:'test-token-private',
   fetchImpl:transport
 });
}
const request=(cookie=secret,id=caseId)=>new Request('https://kt134-test.invalid/kt134/automatic/draft',{
 method:'POST',headers:{'content-type':'application/json',cookie:sessionCookie+'='+cookie},
 body:JSON.stringify({caseId:id})
});
test('end-to-end handler: KT125 D1 session + KT126 dossier + stage4/reviewer + stage5 + Word',async()=>{
 const hash=await getHash();
 const calls=[];
 const author='ИЗБРАН ПАНЕЛ: 17 — Отговор на възражение\nПредлагаме мотивиран отговор.';
 const host=makeTestHost({db:makeDb(hash),transport:async(url,init)=>{
   const body=JSON.parse(init.body);calls.push({url,body});
   assert.equal(init.headers.Authorization,'Bearer test-token-private');
   if(url.endsWith('/stage4-proposal'))return {ok:true,json:async()=>({
     caseId,evidenceRevision:body.evidenceRevision,authorDraft:author,draft:author,
     reviewerIntermediate:{
       caseId,intermediateConfirmed:true,selectedPanelId:17,reviewedText:author
     },reviewerIntermediateProof:'signed-reviewer-test-proof',
     normativeAudit:{reviewVerdict:'pass',findings:[]}
   })};
   if(url.endsWith('/stage5-document'))return {ok:true,json:async()=>({
     caseId,projectOnly:true,documentIssued:false,automaticReviewerIntermediate:true,
     draft:'Относно: „Възражение относно писмо“\nПредложение за мотивиран отговор.'
   })};
   throw Error('UNEXPECTED_EG_ENDPOINT');
 }});
 const response=await host(request());
 assert.equal(response.status,200);
 const output=await response.json();
 assert.equal(output.status,'draft_ready');
 assert.equal(output.expertApproved,false);
 assert.equal(output.finalDecision,null);
 assert.equal(output.stage5.panelId,17);
 assert.equal(output.registryNumber,'TEST-1/2026');
 assert.equal(calls.length,2);
 assert.equal(calls[0].body.completeCaseEvidence.sourceTexts[0].source,'f1');
 assert.equal(calls[0].body.completeCaseEvidence.gis.analysisMode,'contextual_skip');
 const word=Uint8Array.from(atob(output.docxBase64),x=>x.charCodeAt(0));
 assert.equal(word.length,204);
});
test('unverified KT125 session never calls EG or reads dossier',async()=>{
 const hash=await getHash();let calls=0;
 const host=makeTestHost({db:makeDb(hash),transport:async()=>{calls++;throw Error('EG_CALLED')}});
 const r=await host(request('wrong-cookie-value'));
 assert.equal(r.status,401);assert.equal(calls,0);
});
test('wrong case cannot enter EG pipeline despite valid KT125 cookie',async()=>{
 const hash=await getHash();let calls=0;
 const host=makeTestHost({db:makeDb(hash),transport:async()=>{calls++;throw Error('EG_CALLED')}});
 const r=await host(request(secret,'44444444-4444-4444-8444-444444444444'));
 assert.equal(r.status,422);assert.equal(calls,0);
});
