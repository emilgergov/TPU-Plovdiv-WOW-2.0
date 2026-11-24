// KT134 isolated Cloudflare Access JWT verifier. No secrets or deployment.
// The issuer and audience are injected by the protected server environment.
// Verifies signatures using pinned Cloudflare Access JWKS; NEVER trusts a
// browser-provided "active" flag, decoded-but-unverified JWT, or plain header.
const decoder=new TextDecoder();
const clean=x=>String(x??'').trim();
function decode64(value){
 if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length%4===1)throw Error('Невалидно кодиране');
 const base=value.replace(/-/g,'+').replace(/_/g,'/');
 const pad='='.repeat((4-base.length%4)%4);
 const bin=atob(base+pad);return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
function jsonPart(value){
 const text=decoder.decode(decode64(value));
 const o=JSON.parse(text);
 if(!o||typeof o!=='object'||Array.isArray(o))throw Error('Невалиден JWT JSON');
 return o;
}
const DENIED='Неуспешно удостоверяване на достъпа';
export function createCloudflareAccessVerifier({
 issuer,audience,getPublicKeys,resolveActiveUser,
 nowSeconds=()=>Math.floor(Date.now()/1000),subtle=crypto.subtle,skewSeconds=30
}={}){
 if(!/^https:\/\/[^/]+$/u.test(clean(issuer))||!clean(audience)||
  typeof getPublicKeys!=='function'||typeof resolveActiveUser!=='function')
  throw Error('Липсват удостоверени настройки за Cloudflare Access');
 return async function authenticateRequest(request){
  try {
   const jwt=clean(request?.headers?.get('CF-Access-Jwt-Assertion'));
   const parts=jwt.split('.');
   if(parts.length!==3)throw Error('JWT не е с три части');
   const head=jsonPart(parts[0]),claims=jsonPart(parts[1]);
   if(head.alg!=='RS256'||!clean(head.kid)||head.typ&&head.typ!=='JWT')throw Error('Недопустим JWT');
   if(claims.iss!==issuer||
    !(typeof claims.aud==='string'&&claims.aud===audience||
      Array.isArray(claims.aud)&&claims.aud.includes(audience)))throw Error('Невалидна област на удостоверяване');
   const now=nowSeconds();
   if(!Number.isFinite(now)||!Number.isFinite(claims.exp)||claims.exp<=now-skewSeconds||
    !Number.isFinite(claims.nbf)&&claims.nbf!==undefined||
    claims.nbf!==undefined&&claims.nbf>now+skewSeconds||
    claims.iat!==undefined&&(!Number.isFinite(claims.iat)||claims.iat>now+skewSeconds))
    throw Error('Изтекъл или невалиден JWT');
   if(!clean(claims.sub))throw Error('Липсва самоличност');
   const rawKeys=await getPublicKeys();
   const keys=Array.isArray(rawKeys)?rawKeys:rawKeys?.keys;
   if(!Array.isArray(keys))throw Error('Неизвестни публични ключове');
   const matching=keys.filter(k=>k.kid===head.kid&&k.kty==='RSA'&&
    (!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
   if(matching.length!==1)throw Error('Липсва еднозначен публичен ключ');
   const jwk=matching[0];
   const key=await subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
   const signed=new TextEncoder().encode(parts[0]+'.'+parts[1]);
   const ok=await subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(parts[2]),signed);
   if(ok!==true)throw Error('Невалиден подпис');
   // Never authorize merely because Cloudflare Access JWT is valid.
   // The KT125 active-user lookup is authoritative, and the ACL is checked later.
   const user=await resolveActiveUser({subject:claims.sub,claims});
   if(!user?.active||!clean(user.userId))throw Error('Потребителят не е активен');
   return Object.freeze({verified:true,userId:clean(user.userId),subject:claims.sub});
  } catch {
   return Object.freeze({verified:false,error:DENIED});
  }
 };
}
