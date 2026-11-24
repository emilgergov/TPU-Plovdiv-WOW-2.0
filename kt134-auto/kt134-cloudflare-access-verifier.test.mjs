import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createCloudflareAccessVerifier} from './kt134-cloudflare-access-verifier.mjs';
const subtle=webcrypto.subtle,issuer='https://unit-test.cloudflareaccess.com',audience='test-audience';
const seconds=2000000000;
const b64=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');
async function fixture(){
 const keys=await subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const publicKey=await subtle.exportKey('jwk',keys.publicKey);
 publicKey.kid='test-key'; publicKey.alg='RS256';publicKey.use='sig';
 let active=true;
 const verify=createCloudflareAccessVerifier({issuer,audience,
  getPublicKeys:async()=>({keys:[publicKey]}),
  resolveActiveUser:async()=>active?{userId:'expert123',active:true}:null,
  nowSeconds:()=>seconds,subtle});
 async function jwt(claims={},header={}){
  const h=b64({alg:'RS256',typ:'JWT',kid:'test-key',...header});
  const c=b64({iss:issuer,aud:audience,sub:'cf-access-subject',iat:seconds-100,
   exp:seconds+1000,...claims});
  const signed=h+'.'+c;
  const signature=new Uint8Array(await subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(signed)));
  return signed+'.'+b64(signature);
 }
 const request=t=>new Request('https://isolated.invalid',{
  headers:{'CF-Access-Jwt-Assertion':t}});
 return {verify,jwt,request,deactivate:()=>{active=false}};
}
test('valid signed Cloudflare token plus active KT125 mapping grants identity',async()=>{
 const x=await fixture();const r=await x.verify(x.request(await x.jwt()));
 assert.deepEqual(r,{verified:true,userId:'expert123',subject:'cf-access-subject'});
});
test('unsigned, malformed, and edited token claims are refused',async()=>{
 const x=await fixture();const good=await x.jwt();
 assert.equal((await x.verify(x.request(good+'.changed'))).verified,false);
 assert.equal((await x.verify(x.request('eyJhbGciOiJub25lIn0.eyJzdWIiOiJhIn0.sig'))).verified,false);
 const parts=good.split('.');
 parts[1]=b64({iss:issuer,aud:audience,sub:'attacker',exp:seconds+100});
 assert.equal((await x.verify(x.request(parts.join('.')))).verified,false);
});
test('expired JWT and wrong audience never authenticate',async()=>{
 const x=await fixture();
 assert.equal((await x.verify(x.request(await x.jwt({exp:seconds-1000})))).verified,false);
 assert.equal((await x.verify(x.request(await x.jwt({aud:'wrong'})))).verified,false);
});
test('JWT valid but user deactivated is denied',async()=>{
 const x=await fixture();x.deactivate();
 assert.equal((await x.verify(x.request(await x.jwt()))).verified,false);
});
test('wrong algorithm is rejected even with a signed payload',async()=>{
 const x=await fixture();
 assert.equal((await x.verify(x.request(await x.jwt({}, {alg:'none'})))).verified,false);
});
test('no JWT header cannot establish an active user',async()=>{
 const x=await fixture();
 assert.equal((await x.verify(new Request('https://isolated.invalid'))).verified,false);
});
