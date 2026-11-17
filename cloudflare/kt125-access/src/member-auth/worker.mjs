/** Separate public Worker for username/password users. NEVER deploy over the
 * Access-protected EGMASTER Worker. No client assertion/header grants a role. */
import {createMemberAuthProvider,memberAuthConfig} from './provider.mjs';
import {renderMemberPage} from './pages.mjs';
import {createKT125PrivateHandler} from '../private-worker.mjs';
import {SESSION_COOKIE,CHALLENGE_COOKIE,SESSION_MS,cookie,cookieValue,randomToken,digest,
 setupMemberStore,consumeAuthLimit,registrationInput,saveRegistrationChallenge,
 consumeRegistrationAttempt,markRegistrationVerified,verifiedRegistrationChallenge,
 queueVerifiedRegistration,usernameValue,passwordOK,findMemberAccount,memberCanEnter,
 createMemberSession,sessionIdentity,deleteMemberSession,deleteSubjectSessions,beginPasswordReset,finishPasswordReset} from './store.mjs';
const allowedPaths=new Set(['/auth/login','/auth/register','/auth/verify','/auth/complete','/auth/forgot','/auth/reset','/auth/logout','/auth/pending','/auth/recovery-sent']);
function configReady(env,request){
 try{const origin=new URL(env.KT125_MEMBER_ORIGIN);return env.KT125_MEMBER_ENABLED==='true'&&Boolean(env.KT125_DB)&&
  origin.protocol==='https:'&&origin.origin===env.KT125_MEMBER_ORIGIN&&new URL(request.url).origin===origin.origin&&
  /^[A-Za-z0-9_-]{1,160}$/.test(env.KT125_REQUEST_ORGANIZATION||'')&&Boolean(memberAuthConfig(env));}catch{return false}
}
const redirect=(path,cookies=[])=>{
 const headers=new Headers({Location:path,'Cache-Control':'no-store'});
 for(const c of cookies)headers.append('Set-Cookie',c);
 return new Response(null,{status:303,headers});
};
const deny=()=>renderMemberPage({view:'login',message:'Няма разрешен достъп до този служебен екран.',status:403});
const attachCookie=(response,value)=>{response.headers.append('Set-Cookie',value);return response};
function validPost(request,env){
 return request.headers.get('Origin')===env.KT125_MEMBER_ORIGIN&&
  (!request.headers.has('Sec-Fetch-Site')||request.headers.get('Sec-Fetch-Site')==='same-origin');
}
async function formData(request,fields){
 if(!/^application\/x-www-form-urlencoded(?:\s*;.*)?$/i.test(request.headers.get('Content-Type')||''))return null;
 if(Number(request.headers.get('Content-Length')||0)>16000)return null;
 try{
 const reader=request.body?.getReader();let raw='';if(reader){
  const decoder=new TextDecoder('utf-8',{fatal:true});let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();return null;}raw+=decoder.decode(value,{stream:true});}
  raw+=decoder.decode();
 }
 const p=new URLSearchParams(raw);if([...p.keys()].length!==fields.length||fields.some(k=>p.getAll(k).length!==1))return null;return p;}catch{return null}
}
export function createKT125MemberHandler({getProvider,clock=()=>Date.now(),uuid=()=>crypto.randomUUID(),newToken=randomToken}={}){
 return {async fetch(request,env){
  if(!configReady(env,request))return renderMemberPage({view:'unavailable',status:503});
  const provider=getProvider?getProvider(env):createMemberAuthProvider(env);
  const issuer=memberAuthConfig(env).issuer;
  if(provider.ready!==true||provider.issuer!==issuer)return renderMemberPage({view:'unavailable',status:503});
  const url=new URL(request.url),path=url.pathname,nowMs=clock(),db=env.KT125_DB;
  if(url.search&&(path!=='/auth/reset'||request.method!=='GET'||[...url.searchParams.keys()].length!==1||url.searchParams.getAll('token_hash').length!==1))return deny();
  if(path.startsWith('/kt125/admin')||path==='/kt125/bootstrap')return deny();
  if((path==='/'||path==='/kt125/enrollment/activate')&&request.method==='GET')return redirect('/auth/login');
  if(path==='/member'&&request.method==='GET'){
   const who=await sessionIdentity({request,db,issuer,nowMs});
   return who?renderMemberPage({view:'home',username:who.username,role:who.role}):redirect('/auth/login');
  }
  if(!allowedPaths.has(path)){
   if(!/^\/kt125\/cases\/[A-Za-z0-9_-]{1,160}(?:\/(?:access|manage|grants)(?:\/(?:form|[A-Za-z0-9_-]{1,160})(?:\/revoke)?)?)?$/.test(path))return new Response('Няма такъв екран.',{status:404,headers:{'Cache-Control':'no-store'}});
   const who=await sessionIdentity({request,db,issuer,nowMs});if(!who)return deny();
   const verifier={verify:async()=>who};
   return createKT125PrivateHandler({getVerifier:()=>verifier,identityConfigReady:()=>true,clock,uuid})
    .fetch(request,{...env,KT125_PRIVATE_ORIGIN:env.KT125_MEMBER_ORIGIN});
  }
  const view=path.slice('/auth/'.length);
  if(request.method==='GET'){
   if(view==='logout')return deny();
   if(view==='recovery-sent')return renderMemberPage({view:'login',message:'Ако има такъв регистриран профил, ще бъде изпратена връзка за възстановяване.'});
   if(view==='pending'){
    const token=cookieValue(request,CHALLENGE_COOKIE);let row;
    try{if(token)row=await db.prepare(`SELECT r.status FROM kt125_registration_challenges c JOIN kt125_member_accounts a ON a.identity_provider=c.verified_provider AND a.provider_subject=c.verified_subject JOIN kt125_access_requests r ON r.request_id=a.request_id WHERE c.token_hash=? AND c.used=1 AND c.expires_at_ms>?`).bind(await digest(token),nowMs).first()}catch{}
    if(!row)return redirect('/auth/login');
    if(row.status==='pending')return renderMemberPage({view:'pending'});
    return renderMemberPage({view:'login',message:row.status==='approved'?'Заявката е одобрена. Влезте с потребителското си име и парола.':'Заявката не е одобрена. За уточнения се свържете с администратора.'});
   }
   if(view==='verify'){
    const token=cookieValue(request,CHALLENGE_COOKIE);let challenge;
    try{if(token)challenge=await db.prepare('SELECT email FROM kt125_registration_challenges WHERE token_hash=? AND used=0 AND expires_at_ms>?').bind(await digest(token),nowMs).first()}catch{}
    return challenge?renderMemberPage({view,email:challenge.email}):redirect('/auth/register');
   }
   if(view==='complete'){
    let challenge;try{challenge=await verifiedRegistrationChallenge({db,token:cookieValue(request,CHALLENGE_COOKIE),issuer,nowMs})}catch{}
    return challenge?renderMemberPage({view,username:challenge.username}):redirect('/auth/register');
   }
   if(view==='reset'){
    const hash=url.searchParams.get('token_hash')||'';
    if(!/^[a-fA-F0-9]{64}$/.test(hash))return renderMemberPage({view:'forgot',message:'Връзката за възстановяване е невалидна.',status:400});
    return renderMemberPage({view,tokenHash:hash});
   }
   return renderMemberPage({view});
  }
  if(['pending','recovery-sent'].includes(view)||request.method!=='POST')return new Response(null,{status:405});
  if(!validPost(request,env))return deny();
  const fields={register:['name','username','email','password','password_confirm','note','confirm'],
   verify:['code'],complete:['username','confirm'],login:['username','password'],forgot:['username'],
   reset:['token_hash','password','password_confirm','confirm'],logout:[]};
  const data=await formData(request,fields[view]);
  if(!data)return renderMemberPage({view:view==='reset'?'forgot':view,message:'Проверете въведените данни.',status:400});
  try{
   await setupMemberStore(db);
   const ip=request.headers.get('CF-Connecting-IP')||'unavailable';
   const limit=view==='register'?3:20,windowMs=view==='register'?3600000:900000;
   if(!await consumeAuthLimit(db,'ip:'+view+':'+ip,limit,windowMs,nowMs))return renderMemberPage({view:'login',message:'Има твърде много опити. Изчакайте и опитайте отново.',status:429});
   // Cleanup only on mutations; no GET DDL or session renewal.
   await db.batch([
    db.prepare('DELETE FROM kt125_member_sessions WHERE expires_at_ms<=?').bind(nowMs),
    db.prepare('DELETE FROM kt125_registration_challenges WHERE expires_at_ms<?').bind(nowMs-86400000),
    db.prepare('DELETE FROM kt125_auth_limits WHERE window_start_ms<?').bind(nowMs-7*86400000)
   ]);
   if(view==='register'){
    const input=registrationInput(data);
    if(!input||data.get('confirm')!=='REGISTER')return renderMemberPage({view,message:'Проверете полетата. Паролата трябва да е поне 15 знака и двете пароли да съвпадат.',status:400});
    const result=await provider.signup(input.email,input.password);
    if(result.unavailable)return renderMemberPage({view,message:'Услугата за удостоверяване временно не е достъпна. Опитайте отново по-късно.',status:503});
    if(!result.ok)return renderMemberPage({view,message:'Регистрацията не е завършена. Проверете данните или използвайте възстановяване за съществуващ профил.',status:400});
    const token=newToken();
    await saveRegistrationChallenge({db,input,organizationId:env.KT125_REQUEST_ORGANIZATION,token,nowMs});
    return redirect('/auth/verify',[cookie(CHALLENGE_COOKIE,token,600)]);
   }
   if(view==='verify'){
    if(!/^[0-9]{6}$/.test(data.get('code')||''))return renderMemberPage({view,message:'Въведете шестцифрения код.',status:400});
    const token=cookieValue(request,CHALLENGE_COOKIE);
    const challenge=await consumeRegistrationAttempt({db,token,nowMs});
    if(!challenge)return renderMemberPage({view:'register',message:'Потвърждаването е изтекло или опитите са изчерпани.',status:400});
    const who=await provider.verifyRegistration(challenge.email,data.get('code'));
    if(who?.unavailable)return renderMemberPage({view,email:challenge.email,message:'Услугата за удостоверяване временно не е достъпна.',status:503});
    if(!who?.verified||who.issuer!==issuer||who.email!==challenge.email)return renderMemberPage({view,email:challenge.email,message:'Кодът не е приет. Проверете най-новото писмо.',status:400});
    if(!await markRegistrationVerified({db,challenge,who,nowMs}))return renderMemberPage({view:'register',message:'Потвърждаването не е записано.',status:503});
    if(!await queueVerifiedRegistration({db,challenge,who,nowMs,uuid}))return redirect('/auth/complete');
    return redirect('/auth/pending');
   }
   if(view==='complete'){
    if(data.get('confirm')!=='COMPLETE')return deny();
    const username=usernameValue(data.get('username')?.trim().toLowerCase());
    const challenge=await verifiedRegistrationChallenge({db,token:cookieValue(request,CHALLENGE_COOKIE),issuer,nowMs});
    if(!challenge||!username)return renderMemberPage({view:'register',message:'Потвърждаването е изтекло или потребителското име е невалидно.',status:400});
    const who={verified:true,issuer:challenge.verified_provider,subject:challenge.verified_subject,email:challenge.email};
    if(!await queueVerifiedRegistration({db,challenge:{...challenge,username},who,nowMs,uuid}))return renderMemberPage({view,username,message:'Заявката не е записана. Опитайте друго потребителско име. За съществуващ профил се свържете с администратора.',status:409});
    return redirect('/auth/pending');
   }
   if(view==='login'){
    const username=data.get('username')?.trim().toLowerCase(),password=data.get('password');
    if(!usernameValue(username)||typeof password!=='string'||!password||password.length>128)return renderMemberPage({view,message:'Невалидно потребителско име или парола.',status:401});
    if(!await consumeAuthLimit(db,'username:'+username,10,900000,nowMs))return renderMemberPage({view,message:'Има твърде много опити. Изчакайте и опитайте отново.',status:429});
    const account=await findMemberAccount(db,username);
    // A fixed nonexistent mailbox equalizes provider work; this endpoint sends no email.
    if(account?.reset_until_ms>nowMs)return renderMemberPage({view,message:'Паролата се променя. Опитайте отново след малко.',status:409});
    const who=await provider.login(account?.email||'missing-login@example.invalid',password);
    if(who?.unavailable)return renderMemberPage({view,message:'Услугата за удостоверяване временно не е достъпна. Опитайте отново по-късно.',status:503});
    if(!account||!who?.verified||who.issuer!==issuer||who.subject!==account.provider_subject||who.email!==account.email)return renderMemberPage({view,message:'Невалидно потребителско име или парола.',status:401});
    const user=await memberCanEnter({db,who,request,nowMs,uuid});
    if(!user){
     const state=await db.prepare('SELECT status FROM kt125_access_requests WHERE request_id=?').bind(account.request_id).first();
     if(state?.status==='pending')return renderMemberPage({view:'pending',status:403});
     return renderMemberPage({view,message:'Профилът няма активен разрешен достъп. Свържете се с администратора.',status:403});
    }
    await deleteMemberSession(db,cookieValue(request,SESSION_COOKIE));
    const token=await createMemberSession({db,who,nowMs,credentialVersion:account.credential_version,token:newToken()});
    if(!token)return renderMemberPage({view,message:'Входът не е завършен. Опитайте отново.',status:409});
    return redirect('/member',[cookie(SESSION_COOKIE,token,SESSION_MS/1000),cookie(CHALLENGE_COOKIE,'',0)]);
   }
   if(view==='logout'){
    await deleteMemberSession(db,cookieValue(request,SESSION_COOKIE));
    return redirect('/auth/login',[cookie(SESSION_COOKIE,'',0),cookie(CHALLENGE_COOKIE,'',0)]);
   }
   if(view==='forgot'){
    const username=data.get('username')?.trim().toLowerCase();
    if(usernameValue(username)&&!await consumeAuthLimit(db,'recovery:'+username,3,3600000,nowMs))return redirect('/auth/recovery-sent');
    const account=await findMemberAccount(db,username);
    if(account)await provider.recover(account.email);
    return redirect('/auth/recovery-sent');
   }
   if(view==='reset'){
    if(data.get('confirm')!=='RESET'||!passwordOK(data.get('password'))||data.get('password')!==data.get('password_confirm')||!/^[a-fA-F0-9]{64}$/.test(data.get('token_hash')||''))return renderMemberPage({view:'forgot',message:'Проверете връзката и новата парола.',status:400});
    let resetWho=null,version=null,who;
    try{
     who=await provider.resetPassword(data.get('token_hash'),data.get('password'),{beforeChange:async identity=>{
      if(!identity?.verified||identity.issuer!==issuer)throw Error('Invalid identity');
      resetWho=identity;version=await beginPasswordReset({db,who:identity,nowMs});
      await deleteSubjectSessions(db,identity);
     }});
    }finally{if(resetWho)await finishPasswordReset({db,who:resetWho,version})}

    if(!who?.verified||who.issuer!==issuer||!resetWho||resetWho.subject!==who.subject)return renderMemberPage({view:'forgot',message:'Връзката е невалидна или е изтекла.',status:400});
    await deleteSubjectSessions(db,who);
    return redirect('/auth/login',[cookie(SESSION_COOKIE,'',0)]);
   }
  }catch{return renderMemberPage({view:'login',message:'Услугата временно не е достъпна. Опитайте отново по-късно.',status:503})}
  return deny();
 }};
}
export default createKT125MemberHandler();
