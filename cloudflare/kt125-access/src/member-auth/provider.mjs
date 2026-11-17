/** Passwords and registration OTPs are processed by Supabase Auth, not D1.
 * Uses only a low-privilege publishable/anon key. Never a service-role key.
 * All identities are resolved by the pinned provider's /user endpoint. */
import {normalizeKT125Email} from '../identity-email.mjs';
export function memberAuthConfig(env){
 try{
  const url=new URL(env.KT125_AUTH_URL);
  if(url.protocol!=='https:'||url.origin!==env.KT125_AUTH_URL||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname))return null;
  const key=env.KT125_AUTH_PUBLIC_KEY;
  let publicKey=typeof key==='string'&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if(!publicKey&&typeof key==='string'){
   try{const part=key.split('.')[1];const claims=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));publicKey=claims.role==='anon'}catch{}
  }
  if(!publicKey)return null;
  return {url:url.origin,issuer:url.origin+'/auth/v1',key};
 }catch{return null}
}
export function createMemberAuthProvider(env,{fetcher=fetch}={}){
 const config=memberAuthConfig(env);
 async function call(path,{method='POST',body,token}={}){
  if(!config)return {ok:false,status:503};
  try{
   const headers={apikey:config.key,'Content-Type':'application/json'};
   if(token)headers.Authorization='Bearer '+token;
   const res=await fetcher(config.url+'/auth/v1'+path,{method,headers,
    ...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(15000)});
   if(!res.ok||res.redirected)return {ok:false,status:res.status};
   const raw=await res.text();if(raw.length>64000)return {ok:false};
   return {ok:true,data:raw?JSON.parse(raw):{}};
  }catch{return {ok:false,status:503}}
 }
 async function identity(session,email){
  // Do not trust token payloads, signup metadata, cookies or the returned role.
  if(typeof session?.access_token!=='string'||session.access_token.length>16000)return null;
  const result=await call('/user',{method:'GET',token:session.access_token});
  if(!result.ok&&(result.status===429||result.status>=500))return {unavailable:true};
  const u=result.data;
  if(!result.ok||typeof u?.id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(u.id)||
   !u.email_confirmed_at||!Number.isFinite(Date.parse(u.email_confirmed_at))||
   !normalizeKT125Email(u.email)||normalizeKT125Email(u.email)!==normalizeKT125Email(email))return null;
  return {verified:true,issuer:config.issuer,subject:u.id,email:normalizeKT125Email(u.email)};
 }
 return {
  ready:Boolean(config),issuer:config?.issuer,
  async signup(email,password){
   const out=await call('/signup',{body:{email,password}});
   // Fail closed if email confirmation was disabled in the provider project.
   return {ok:out.ok&&!out.data?.access_token,unavailable:out.status===429||out.status>=500};
  },
  async verifyRegistration(email,code){
   const out=await call('/verify',{body:{email,token:code,type:'signup'}});
   if(!out.ok&&(out.status===429||out.status>=500))return {unavailable:true};
   return out.ok?identity(out.data,email):null;
  },
  async login(email,password){
   const out=await call('/token?grant_type=password',{body:{email,password}});
   if(!out.ok&&(out.status===429||out.status>=500))return {unavailable:true};
   return out.ok?identity(out.data,email):null;
  },
  async recover(email){return call('/recover',{body:{email}})},
  async resetPassword(tokenHash,password,{beforeChange}={}){
   const verified=await call('/verify',{body:{token_hash:tokenHash,type:'recovery'}});
   if(!verified.ok)return null;
   const email=verified.data?.user?.email;
   const who=await identity(verified.data,email);if(!who?.verified)return null;
   // Invalidate local sessions before changing the password. An unavailable
   // local registry prevents the password change rather than preserving old sessions.
   try{if(typeof beforeChange!=='function')return null;await beforeChange(who)}catch{return null}
   const updated=await call('/user',{method:'PUT',token:verified.data.access_token,body:{password}});
   return updated.ok?who:null;
  }
 };
}
