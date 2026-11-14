import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../kt84/private-api-worker.mjs';
import {readFileSync} from 'node:fs';

const request=(path='https://private.example/v1/me',method='GET',headers={})=>
 new Request(path,{method,headers});

test('KT84 private API defaults to deny without configured bindings',async()=>{
 const r=await worker.fetch(request(),{},{});assert.equal(r.status,503);
 assert.equal((await r.json()).code,'PRIVATE_ACCESS_NOT_CONFIGURED');
});
test('KT84 private API requires actual Access-authenticated worker invocation',async()=>{
 const env={PRIVATE_DB:{},PRIVATE_FILES:{}};
 const r=await worker.fetch(request(),env,{});assert.equal(r.status,503);
});
test('KT84 does not accept claimed user identity from unverified headers',async()=>{
 const env={PRIVATE_DB:{},PRIVATE_FILES:{}};
 const ctx={access:{getIdentity:async()=>({id:'claimed-expert'})}};
 const r=await worker.fetch(request('https://private.example/v1/me','GET',
 {'Cf-Access-Authenticated-User-Email':'someone@example.org',
  Origin:'https://public.example'}),env,ctx);
 assert.equal(r.status,403);
 assert.equal((await r.json()).code,'CROSS_ORIGIN_BLOCKED');
});
test('KT84 denies unknown Access principal even when identity is returned',async()=>{
 const env={PRIVATE_DB:{prepare:()=>({bind:()=>({first:async()=>null})})},PRIVATE_FILES:{}};
 const ctx={access:{getIdentity:async()=>({id:'unregistered'})}};
 const r=await worker.fetch(request(),env,ctx);
 assert.equal(r.status,403);assert.equal((await r.json()).code,'ACCESS_REQUIRED');
});
test('KT84 D1 schema keeps all documents, grants and revisions bound to a case',()=>{
 const sql=readFileSync(new URL('../kt84/migrations/0001_access.sql',import.meta.url),'utf8');
 for(const table of ['users','cases','case_grants','case_documents','case_revisions','audit_events'])
  assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\s*\\('));
 assert.match(sql,/owner_id TEXT NOT NULL REFERENCES users/);
 assert.match(sql,/case_id TEXT NOT NULL REFERENCES cases/);
 assert.match(sql,/revoked_at INTEGER/);
 const config=readFileSync(new URL('../kt84/wrangler.toml',import.meta.url),'utf8');
 assert.match(config,/workers_dev = false/);
 assert.doesNotMatch(config,/^route\s*=|OPENAI_API_KEY\s*=/m);
});
test('KT84 privacy: protected API does not trust JSON userId or open any public bucket route',()=>{
 const src=readFileSync(new URL('../kt84/private-api-worker.mjs',import.meta.url),'utf8');
 assert.match(src,/ctx\.access\.getIdentity\(\)/);
 assert.match(src,/orgId:row\.org_id/);
 assert.match(src,/validateGrant\(/);
 assert.match(src,/authorize\(/);
 assert.match(src,/version=version\+1/);
 assert.doesNotMatch(src,/Access-Control-Allow-Origin|\.workers\.dev|r2\.dev/);
});
