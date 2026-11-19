import assert from 'node:assert/strict';
import {providerFetch,providerFailureData} from '../../ai-author-v27/src/kt131-provider-transport.mjs';
const endpoint='https://api.openai.com/v1/responses';
for(const [status,upstream,expected,http] of [
 [429,{code:'insufficient_quota'},'EG_CREDIT_EXHAUSTED',503],
 [429,{type:'insufficient_quota'},'EG_CREDIT_EXHAUSTED',503],
 [429,{code:'rate_limit_exceeded'},'EG_RATE_LIMIT',429],
 [401,{},'EG_PROVIDER_ACCESS',502],[403,{},'EG_PROVIDER_ACCESS',502],
 [408,{},'EG_PROVIDER_TIMEOUT',504],[504,{},'EG_PROVIDER_TIMEOUT',504],
 [500,{},'EG_PROVIDER_UNAVAILABLE',503],[503,{},'EG_PROVIDER_UNAVAILABLE',503]
]){
 let calls=0;
 await assert.rejects(()=>providerFetch(endpoint,{},async()=>{calls++;return Response.json({error:{...upstream,message:'PRIVATE-UPSTREAM-SECRET'}},{status,headers:{'Retry-After':'999'}})}),error=>{
  const result=providerFailureData(error);assert.equal(result.status,http);assert.equal(result.body.error,expected);
  assert.equal(result.body.transportFailure,true);assert(!JSON.stringify(result).includes('PRIVATE-UPSTREAM-SECRET'));
  if(status===429&&expected==='EG_RATE_LIMIT')assert.equal(result.body.retryAfterSeconds,120);
  return true;
 });assert.equal(calls,1,'No automatic paid retry');
}
const success=Response.json({output:[]});assert.equal(await providerFetch(endpoint,{},async()=>success),success);
for(const error of [new TypeError('PRIVATE network detail'),new DOMException('aborted','AbortError')]){
 await assert.rejects(()=>providerFetch(endpoint,{},async()=>{throw error}),e=>{const d=providerFailureData(e);assert.equal(d.status,error.name==='AbortError'?504:503);assert(!JSON.stringify(d).includes('PRIVATE'));return true});
}
await assert.rejects(()=>providerFetch('https://attacker.invalid',{},async()=>{throw Error('must not run')}),/Unexpected provider endpoint/);
console.log('PASS KT131: quota, rate, credentials, timeout, outage; no retries or upstream details; success untouched.');
