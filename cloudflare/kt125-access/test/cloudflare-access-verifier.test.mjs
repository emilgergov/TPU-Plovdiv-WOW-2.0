import assert from "node:assert/strict";
import {generateKeyPairSync,createSign,webcrypto} from "node:crypto";
import {createKT125CloudflareAccessVerifier,kt125CloudflareAccessConfigReady} from "../src/cloudflare-access-verifier.mjs";
const issuer="https://kt125-test-team.cloudflareaccess.com";
const audience="app-audience-kt125-012345";
const kid="kt125-key-001";
const now=1794891600000;
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const exported=publicKey.export({format:"jwk"});
const base=x=>Buffer.from(x).toString("base64url");
const jwt=(payload={},header={})=>{
 const h=base(JSON.stringify({alg:"RS256",kid,typ:"JWT",...header}));
 const p=base(JSON.stringify({iss:issuer,aud:[audience],iat:Math.floor(now/1000)-60,
  exp:Math.floor(now/1000)+3600,sub:"subject-123",...payload}));
 const signer=createSign("RSA-SHA256");signer.update(h+"."+p);signer.end();
 return h+"."+p+"."+signer.sign(privateKey).toString("base64url");
};
let calls=0;
const fetchFn=async url=>{
 assert.equal(url,issuer+"/cdn-cgi/access/certs");
 calls++;
 return new Response(JSON.stringify({keys:[{kty:"RSA",kid,n:exported.n,e:exported.e,alg:"RS256"}]}),{
  status:200,headers:{"Content-Type":"application/json"}});
};
const verifier=createKT125CloudflareAccessVerifier({
 teamDomain:issuer,audience,fetchFn,cryptoImpl:webcrypto,clock:()=>now
});
const req=token=>new Request("https://private.example.invalid/kt125/cases/a/access",
 {headers:token?{"Cf-Access-Jwt-Assertion":token}:{}});
assert.equal((await verifier.verify(req())).verified,false);
const token=jwt();
const accepted=await verifier.verify(req(token));
assert.deepEqual(accepted,{verified:true,issuer,subject:"subject-123"});
assert.equal((await verifier.verify(req(token))).verified,true);
assert.equal(calls,1,"JWKS should be cached for valid traffic");
const fail=async token=>assert.equal((await verifier.verify(req(token))).verified,false);
await fail(jwt({aud:["a-wrong-app-audience"]}));
await fail(jwt({iss:"https://other.cloudflareaccess.com"}));
await fail(jwt({exp:Math.floor(now/1000)-1}));
await fail(jwt({nbf:Math.floor(now/1000)+500}));
await fail(jwt({iat:Math.floor(now/1000)+500}));
await fail(jwt({sub:""}));
await fail(jwt({}, {alg:"HS256"}));
await fail(jwt({}, {kid:"another-kid"}));
await fail(token.slice(0,-3)+"abc");
await fail("a.b.c");
const fake=jwt().split(".");
const spoof=base(JSON.stringify({alg:"none",kid,typ:"JWT"}))+"."+fake[1]+"."+fake[2];
await fail(spoof);
const noKeys=createKT125CloudflareAccessVerifier({
 teamDomain:issuer,audience,fetchFn:async()=>new Response("{}",{status:200}),
 cryptoImpl:webcrypto,clock:()=>now
});
assert.equal((await noKeys.verify(req(jwt({}, {kid:"missing-kid"})))).verified,false);
assert.equal(kt125CloudflareAccessConfigReady({
 KT125_ACCESS_TEAM_DOMAIN:issuer,KT125_ACCESS_AUD:audience
}),true);
assert.equal(kt125CloudflareAccessConfigReady({
 KT125_ACCESS_TEAM_DOMAIN:"https://attacker.example.com",KT125_ACCESS_AUD:audience
}),false);
console.log("PASS KT125 Cloudflare Access: RS256 signature, aud/iss/sub/time gates, JWKS cache, missing/mismatched/expired/forged JWT denied.");
