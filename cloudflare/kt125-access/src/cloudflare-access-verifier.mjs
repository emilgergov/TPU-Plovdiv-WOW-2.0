/* KT125: Cloudflare Access JWT verification for a SEPARATE PRIVATE Worker.
 * This is not the EG AI password and is not used in the public WOW shell.
 * Only a valid RS256 signature on a token with the configured issuer,
 * audience, subject and time window establishes identity.
 * The user role is subsequently loaded from the private D1 registry.
 */
const decoder=new TextDecoder();
const ascii=new TextEncoder();
const MAX_TOKEN_LENGTH=16000;
const MAX_JWKS_BYTES=150000;
const jwksCache=new Map();
const decode64=value=>{
 if(typeof value!=="string"||!/^[A-Za-z0-9_-]+$/.test(value))throw Error("Bad token encoding");
 const binary=atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
};
const parse64json=value=>JSON.parse(decoder.decode(decode64(value)));
const validHost=raw=>{
 if(typeof raw!=="string")return null;
 const value=raw.trim().replace(/\/+$/,"");
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(value))return null;
 return value.toLowerCase();
};
const deny=()=>({verified:false});
/** @param {Object} settings expects Access issuer URL & application AUD tag */
export function createKT125CloudflareAccessVerifier({
 teamDomain,audience,fetchFn=fetch,cryptoImpl=crypto,clock=()=>Date.now()
}={}){
 const issuer=validHost(teamDomain);
 const aud=typeof audience==="string"&&/^[a-zA-Z0-9_-]{10,160}$/.test(audience)?audience:null;
 return {async verify(request){
  if(!issuer||!aud||!request?.headers||typeof fetchFn!=="function")return deny();
  const raw=request.headers.get("Cf-Access-Jwt-Assertion");
  if(typeof raw!=="string"||raw.length>MAX_TOKEN_LENGTH)return deny();
  const parts=raw.split(".");
  if(parts.length!==3||parts.some(x=>!x))return deny();
  try{
   const header=parse64json(parts[0]);
   const payload=parse64json(parts[1]);
   if(header?.alg!=="RS256"||header?.typ&&header.typ!=="JWT"||
       typeof header.kid!=="string"||header.kid.length<4||header.kid.length>256)return deny();
   const current=Math.floor(clock()/1000);
   if(!Number.isFinite(current)||!Number.isSafeInteger(payload.iat)||
     !Number.isSafeInteger(payload.exp)||payload.exp<=current||
     payload.exp<=payload.iat||payload.iat>current+60||
     payload.nbf!=null&&(!Number.isSafeInteger(payload.nbf)||payload.nbf>current+60)||
     payload.iss!==issuer||!(typeof payload.aud==="string"?payload.aud===aud:
       Array.isArray(payload.aud)&&payload.aud.includes(aud))||
     typeof payload.sub!=="string"||!payload.sub.trim()||payload.sub.length>256)return deny();
   const certsUrl=issuer+"/cdn-cgi/access/certs";
   const cacheKey=issuer;
   let certs=jwksCache.get(cacheKey);
   if(!certs||certs.expires<=clock()||!certs.keys.some(x=>x.kid===header.kid)){
    const response=await fetchFn(certsUrl,{method:"GET",redirect:"manual",cache:"no-store"});
    if(response?.status!==200||response.redirected)return deny();
    const size=Number(response.headers?.get?.("content-length")||0);
    if(size>MAX_JWKS_BYTES)return deny();
    const body=await response.text();
    if(body.length>MAX_JWKS_BYTES)return deny();
    const doc=JSON.parse(body);
    const keys=Array.isArray(doc.keys)?doc.keys.filter(k=>k.kty==="RSA"&&k.alg!=="HS256"&&
      typeof k.kid==="string"&&typeof k.n==="string"&&typeof k.e==="string"):[];
    if(!keys.length)return deny();
    certs={keys,expires:clock()+5*60*1000};
    jwksCache.set(cacheKey,certs);
   }
   const jwk=certs.keys.find(k=>k.kid===header.kid);
   if(!jwk)return deny();
   const key=await cryptoImpl.subtle.importKey("jwk",{
    kty:"RSA",n:jwk.n,e:jwk.e,ext:true,key_ops:["verify"],alg:"RS256"
   },{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
   const verified=await cryptoImpl.subtle.verify("RSASSA-PKCS1-v1_5",key,
     decode64(parts[2]),ascii.encode(parts[0]+"."+parts[1]));
   if(!verified)return deny();
   return {verified:true,issuer,subject:payload.sub};
  }catch{return deny()}
 }};
}
export function kt125CloudflareAccessConfigReady(env){
 return Boolean(validHost(env?.KT125_ACCESS_TEAM_DOMAIN)&&
  typeof env?.KT125_ACCESS_AUD==="string"&&
  /^[a-zA-Z0-9_-]{10,160}$/.test(env.KT125_ACCESS_AUD));
}
