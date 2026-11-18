import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const path='cloudflare/ai-author-v27/src/worker.js';
const before=execFileSync('git',['show','1e949e654f9d002f51f7e0b0e8629a78f43512d1:'+path],{encoding:'utf8'});
const native='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const expected=before.replace('const ALLOWED_ORIGIN="https://emilgergov.github.io";','const ALLOWED_ORIGIN="https://emilgergov.github.io";\nconst ALLOWED_ORIGINS=new Set([ALLOWED_ORIGIN,"'+native+'"]);')
 .replaceAll('origin===ALLOWED_ORIGIN','ALLOWED_ORIGINS.has(origin)')
 .replaceAll('origin!==ALLOWED_ORIGIN','!ALLOWED_ORIGINS.has(origin)')
 .replaceAll('"Access-Control-Allow-Origin":ALLOWED_ORIGIN','"Access-Control-Allow-Origin":origin')
 .replaceAll('h.set("Access-Control-Allow-Origin",ALLOWED_ORIGIN)','h.set("Access-Control-Allow-Origin",origin)');
assert.equal(readFileSync(path,'utf8'),expected,'Only exact-origin transport changes are allowed in the R6 author source');
const worker=(await import(pathToFileURL(process.cwd()+'/'+path))).default;
const paths=['/author','/subject-improve','/scope-improve','/stage4-proposal','/stage5-document','/stage4-expert-decision'];
for(const endpoint of paths){
 for(const origin of ['https://emilgergov.github.io',native]){
  const response=await worker.fetch(new Request('https://author.example.invalid'+endpoint,{method:'OPTIONS',headers:{Origin:origin}}),{});
  assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Vary'),'Origin');
  const post=await worker.fetch(new Request('https://author.example.invalid'+endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}),{});
  assert([401,503].includes(post.status),'No unauthenticated AI generation');assert.equal(post.headers.get('Access-Control-Allow-Origin'),origin);
 }
 for(const origin of ['https://attacker.invalid',native+'.attacker.invalid','null']){
  assert.equal((await worker.fetch(new Request('https://author.example.invalid'+endpoint,{method:'OPTIONS',headers:{Origin:origin}}),{})).status,403);
 }
}
console.log('PASS LOCAL100: exact original/native origins only; unauthenticated author routes remain closed; complete R6 business logic byte-identical after transport normalization.');
