import {requestReset,usableReset,completeReset} from './recovery.mjs';
import {smtpConfig} from './mail.mjs';
import {page} from './pages.mjs';
const passwordValid=pw=>typeof pw==='string'&&pw.length>=15&&pw.length<=128&&!pw.includes('\0');
import {localConfig,SESSION_MS,cookie,username,rateLimit,purposeToken,equalToken,id} from './common.mjs';
import {setup,registration,register,findAccount,activate,createSession,identity,logout} from './store.mjs';
import {createKT125PrivateHandler} from '../private-worker.mjs';
const redirect=(location,setCookie)=>new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store',...(setCookie?{'Set-Cookie':setCookie}:{})}});
async function readForm(request,fields){
 if(!/^application\/x-www-form-urlencoded(?:\s*;.*)?$/i.test(request.headers.get('Content-Type')||'')||Number(request.headers.get('Content-Length')||0)>16000)return null;
 try{const reader=request.body?.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let raw='',size=0;
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();return null;}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
 const data=new URLSearchParams(raw);return [...data.keys()].length===fields.length&&fields.every(k=>data.getAll(k).length===1)?data:null;}catch{return null}
}
export function createLocalHandler({clock=()=>Date.now(),uuid=()=>crypto.randomUUID(),passwordHash,passwordVerify,moduleFetch=fetch}={}){
 return {async fetch(request,env,ctx){
  const config=localConfig(env);if(!config||new URL(request.url).origin!==config.origin)return page({view:'unavailable',status:503});
  const kdf=env.KT125_PASSWORDS?.getByName('password-kdf');
  if((!passwordHash||!passwordVerify)&&!kdf)return page({view:'unavailable',status:503});
  const doHash=passwordHash||((pw)=>kdf.hash(pw)),doVerify=passwordVerify||((pw,hash)=>kdf.verify(pw,hash));
  const url=new URL(request.url),path=url.pathname,db=env.KT125_DB,now=clock();
  const known=new Set(['/','/auth/login','/auth/register','/auth/submitted','/auth/activate','/auth/logout','/auth/forgot','/auth/reset','/auth/reset-sent','/auth/reset-done','/auth/admin','/member']);
  // No credential query parameters on ordinary routes; the mail link is the only exception.
  if(url.search&&!['/auth/activate','/auth/reset'].includes(path)&&!path.startsWith('/module/'))return page({message:'Невалиден адрес.',status:400});
  if(request.method==='GET'&&known.has(path)){
   if(path==='/')return redirect('/auth/login');
   if(path==='/auth/activate'){
    if([...url.searchParams.keys()].length!==2||url.searchParams.getAll('account').length!==1||url.searchParams.getAll('token').length!==1||!id(url.searchParams.get('account'))||!/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('token')||''))return page({message:'Невалидна връзка за първоначален вход.',status:400});
    return page({account:url.searchParams.get('account'),activation:url.searchParams.get('token')});
   }
   if(path==='/auth/admin'){
    const who=await identity({db,request,config,now});
    return !who?page({adminLogin:true}):['egmaster','administrator'].includes(who.role)?redirect('/kt125/admin/panel/overview'):page({message:'Административният панел е достъпен само за администратор.',status:403});
   }
   if(path==='/auth/reset'){
    if([...url.searchParams.keys()].length!==2||url.searchParams.getAll('request').length!==1||url.searchParams.getAll('token').length!==1||!id(url.searchParams.get('request'))||!/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('token')||''))return page({message:'Невалидна връзка за възстановяване.',status:400});
    return page({view:'reset',resetId:url.searchParams.get('request'),resetToken:url.searchParams.get('token')});
   }
   if(path==='/auth/reset-sent')return page({view:'reset-sent'});
   if(path==='/auth/reset-done')return page({view:'reset-done'});
   if(path==='/auth/register')return page({view:'register'});
   if(path==='/auth/submitted')return page({view:'submitted'});
   if(path==='/auth/forgot')return page({view:'forgot',mailReady:Boolean(smtpConfig(env))});
   if(path==='/auth/logout')return redirect('/auth/login');
   if(path==='/member'){
    const who=await identity({db,request,config,now});return who?page({view:'home',user:who}):redirect('/auth/login',cookie('',0));
   }
   return page();
  }
  if(request.method==='POST'&&['/auth/register','/auth/login','/auth/logout','/auth/forgot','/auth/reset','/auth/admin'].includes(path)){
   if(request.headers.get('Origin')!==config.origin||(request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'))return page({message:'Заявката е отказана.',status:403});
   const fields=path==='/auth/register'?['name','username','email','password','password_confirm','note','confirm']:['/auth/login','/auth/admin'].includes(path)?['username','password','account','activation']:path==='/auth/forgot'?['email']:path==='/auth/reset'?['reset_id','reset_token','password','password_confirm']:[];
   const data=await readForm(request,fields);if(!data)return page({message:'Проверете въведените данни.',status:400});
   try{
    await setup(db);
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    if(!await rateLimit(db,'ip:'+path+':'+ip,path==='/auth/register'?3:20,path==='/auth/register'?3600000:900000,now))return page({message:'Твърде много опити. Изчакайте и опитайте отново.',status:429});
    if(path==='/auth/forgot'){
     if(!smtpConfig(env))return page({view:'forgot',mailReady:false,message:'Служебната поща още се свързва. Възстановяването ще бъде достъпно след включването ѝ.',status:503});
     const email=data.get('email')||'';
     if(await rateLimit(db,'reset-email:'+email.trim().toLowerCase(),3,3600000,now)){
      const resetId=await requestReset({db,config,email,now,uuid});
      if(resetId&&env.KT125_LOCAL_AUTH){const sending=env.KT125_LOCAL_AUTH.sendResetNotification(resetId).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(sending);else await sending;}
     }
     return redirect('/auth/reset-sent');
    }
    if(path==='/auth/reset'){
     const pw=data.get('password');
     if(!passwordValid(pw)||pw!==data.get('password_confirm'))return page({view:'reset',resetId:data.get('reset_id'),resetToken:data.get('reset_token'),message:'Паролите трябва да съвпадат и да са поне 15 знака.',status:400});
     const row=await usableReset({db,config,env,resetId:data.get('reset_id'),proof:data.get('reset_token'),now});
     if(!row)return page({view:'forgot',mailReady:Boolean(smtpConfig(env)),message:'Връзката е невалидна, изтекла или вече използвана.',status:403});
     const encoded=await doHash(pw);
     if(!await completeReset({db,config,row,passwordHash:encoded,now,uuid}))return page({message:'Промяната не е разрешена. Поискайте нова връзка.',status:403});
     return redirect('/auth/reset-done',cookie('',0));
    }
    if(path==='/auth/logout'){await logout(db,request);return redirect('/auth/login',cookie('',0));}
   if(path==='/auth/register'){
     const input=registration(data),pw=data.get('password');
     if(!input||!passwordValid(pw)||pw!==data.get('password_confirm')||data.get('confirm')!=='REGISTER')return page({view:'register',message:'Проверете данните и съвпадението на паролите. Паролата е поне 15 знака.',status:400});
     const encoded=await doHash(pw);
     if(!await register({db,config,input,passwordHash:encoded,now,uuid}))return page({view:'register',message:'Заявката не е записана. Възможно е вече да има заявка за това име или имейл.',status:409});
     return redirect('/auth/submitted');
    }
    const name=data.get('username')?.trim().toLowerCase(),pw=data.get('password');
    if(!username(name)||typeof pw!=='string'||!pw||pw.length>128)return page({message:'Невалидно потребителско име или парола.',status:401});
    if(!await rateLimit(db,'username:'+name,10,900000,now))return page({message:'Твърде много опити. Изчакайте и опитайте отново.',status:429});
    const account=await findAccount(db,name);
    const valid=await doVerify(pw,account?.password_hash);
    if(!valid||!account||account.organization_id!==config.org)return page({message:'Невалидно потребителско име или парола.',status:401});
    if(account.state!=='approved')return page({message:account.state==='pending'?'Заявката Ви още очаква одобрение.':'Профилът няма разрешен достъп.',status:403});
    if(path==='/auth/admin'&&!['egmaster','administrator'].includes(account.approved_role))return page({adminLogin:true,message:'Този профил няма административни права.',status:403});
    if(account.activated_at_ms===null){
     const provided=data.get('activation');
     if(data.get('account')!==account.account_id||!account.activation_nonce||account.activation_expires_ms<=now||!equalToken(provided,await purposeToken(env,'activate',account)))return page({message:'За първоначалния вход отворете връзката в писмото за одобрение. След това ще влизате само с име и парола.',status:403});
     if(!await activate({db,config,account,now,uuid}))return page({message:'Първоначалният вход не е завършен. Обърнете се към администратора.',status:403});
    }
    // Fresh read/epoch check inside INSERT prevents a stale password proof from
    // re-entering while an administrator disables the user or changes rights.
    await logout(db,request);
    const session=await createSession({db,account,now});
    return session?redirect(path==='/auth/admin'?'/kt125/admin/panel/overview':'/member',cookie(session,SESSION_MS/1000)):page({message:'Профилът няма активен достъп.',status:403});
   }catch{return page({message:'Входът временно не е достъпен. Опитайте отново по-късно.',status:503})}
  }
  const who=await identity({db,request,config,now});
  if(!who)return path.startsWith('/module/')?redirect('/auth/login',cookie('',0)):page({message:'Няма разрешен достъп.',status:403});
  if(path.startsWith('/module/')){
   if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
   if(path==='/module/')return redirect('/module/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html');
   // Fixed read-only source; never proxy caller-supplied origins or credentials.
   const rel=path.slice('/module/'.length);
   if(!rel||rel.includes('..')||/%(?:2e|2f|5c)/i.test(rel)||!/^[-a-zA-Z0-9_./ ()]+$/.test(rel))return new Response(null,{status:404});
   const upstream=new URL('https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/2652e375cf90f03570a77158335ef364d4a48a5f/'+rel);
   try{
    const response=await moduleFetch(upstream.href,{method:request.method,redirect:'manual',headers:{Accept:request.headers.get('Accept')||'*/*'}});
    if(!response.ok||response.redirected)return new Response('Работният екран временно не е достъпен.',{status:502});
    const ext=rel.split('.').pop().toLowerCase(),types={html:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',mjs:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',geojson:'application/geo+json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',woff:'font/woff',woff2:'font/woff2',pdf:'application/pdf',zip:'application/zip',txt:'text/plain; charset=utf-8'};
    const headers=new Headers({'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'});
    let body=request.method==='HEAD'?null:response.body;
    if(request.method!=='HEAD'&&ext==='html'){
     const html=await response.text();
     body=html.replace(/<a id="kt125AccessLauncher"[^>]*>[^<]*<\/a>/g,['egmaster','administrator'].includes(who.role)?'<a id="kt125AccessLauncher" href="/kt125/admin/panel/overview" target="_blank" rel="noopener">⚙ Администратор</a>':'');
    }
    return new Response(body,{status:response.status,headers});
   }catch{return new Response('Работният екран временно не е достъпен.',{status:502})}
  }
  if(path.startsWith('/kt125/')){
   const verifier={verify:async()=>who};
   return createKT125PrivateHandler({getVerifier:()=>verifier,identityConfigReady:()=>true,clock,uuid}).fetch(request,{...env,KT125_PRIVATE_ORIGIN:config.origin});
  }
  return new Response('Няма такъв екран.',{status:404});
 }};
}
export default createLocalHandler();
