import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {inviteKT125Staff,acceptKT125Invitation,revokeKT125Invitation,readKT125InvitationDirectory,KT125_INVITATION_SCHEMA} from '../src/staff-invitations.mjs';
import {createKT125PrivateHandler} from '../src/private-worker.mjs';
import {renderKT125PrivatePage} from '../src/private-admin-page.mjs';
const directory=mkdtempSync(join(tmpdir(),'kt125-invitations-'));
const dbFile=join(directory,'registry.sqlite');
const python=`import json,sqlite3,sys
q=json.load(sys.stdin)
c=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON')
try:
 if q['mode']=='script':
  c.executescript(q['sql']);print('{}')
 elif q['mode']=='batch':
  c.execute('BEGIN IMMEDIATE');out=[]
  for s in q['items']:
   r=c.execute(s['sql'],s['args']);out.append({'meta':{'changes':max(0,r.rowcount)}})
  c.commit();print(json.dumps(out))
 else:
  r=c.execute(q['sql'],q.get('args',[]));out=[dict(x) for x in r.fetchall()];c.commit();print(json.dumps(out))
except Exception as e:
 c.rollback();print(json.dumps({'error':str(e)}));sys.exit(1)
finally:c.close()
`;
function query(q){
 const p=spawnSync('python3',['-c',python,dbFile],{input:JSON.stringify(q),encoding:'utf8'});
 const out=JSON.parse(p.stdout||'{}');if(p.status!==0)throw Error(out.error||p.stderr);return out;
}
let hook=null;
const db={prepare(sql){const stmt={sql,args:[],bind(...args){return {...stmt,args,
 async first(){return query({mode:'query',sql,args})[0]||null},
 async all(){return {results:query({mode:'query',sql,args})}},
 async run(){const r=query({mode:'batch',items:[{sql,args}]})[0];return {...r,success:true}}};}};return stmt;},async batch(items){
 if(hook&&items.some(s=>s.sql.includes('INSERT INTO kt125_audit'))){const h=hook;hook=null;h();}
 return query({mode:'batch',items});
}};
const now=1794891600000,origin='https://office.example.invalid',issuer='https://testing.cloudflareaccess.com';
let sequence=0;const uuid=()=>`email-id-${++sequence}`;
const principals={manager:{verified:true,issuer,subject:'manager-sub',email:'manager@example.invalid'},
 admin:{verified:true,issuer,subject:'admin-sub',email:'admin@example.invalid'},
 otherManager:{verified:true,issuer,subject:'other-manager-sub',email:'other-manager@example.invalid'},
 staff:{verified:true,issuer,subject:'staff-sub',email:'staff@office.example.invalid'},
 outsider:{verified:true,issuer,subject:'outsider-sub',email:'outsider@example.invalid'},
 noEmail:{verified:true,issuer,subject:'staff-sub'},
 foreign:{verified:true,issuer:'https://foreign.cloudflareaccess.com',subject:'staff-sub',email:'staff@office.example.invalid'}};
const verifier={async verify(r){return principals[r.headers.get('Cf-Access-Jwt-Assertion')]||{verified:false}}};
const request=(who='manager')=>new Request(origin+'/',{headers:{'Cf-Access-Jwt-Assertion':who}});
const args=(who='manager')=>({request:request(who),verifier,db,nowMs:now,uuid});
function seedUser(user,subject,role='egmaster',org='riosv'){
 query({mode:'query',sql:'INSERT INTO kt125_users(user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms) VALUES(?,?,?,?,?,1,?,?)',args:[user,org,issuer,subject,role,now,now]});
}
const count=table=>query({mode:'query',sql:`SELECT COUNT(*) n FROM ${table}`})[0].n;
const invite=(email='staff@office.example.invalid',more={})=>inviteKT125Staff({...args(),name:'test1234',email,role:'expert',...more});
import {createKT125MemberHandler} from '../src/member-auth/worker.mjs';
import {createMemberAuthProvider,memberAuthConfig} from '../src/member-auth/provider.mjs';
import {SESSION_COOKIE,CHALLENGE_COOKIE,SESSION_MS,digest,cookie,randomToken,setupMemberStore,createMemberSession,sessionIdentity,beginPasswordReset,finishPasswordReset,findMemberAccount} from '../src/member-auth/store.mjs';
import {linkKT125ExistingMember} from '../src/member-auth/link-existing.mjs';
import {sendKT125InvitationMail} from '../src/invitation-mail.mjs';
import {readKT125AccessRequests,decideKT125AccessRequest} from '../src/access-requests.mjs';
const authUrl='https://kt125-test.supabase.co',memberIssuer=authUrl+'/auth/v1';
const env={KT125_DB:db,KT125_MEMBER_ENABLED:'true',KT125_MEMBER_ORIGIN:origin,KT125_REQUEST_ORGANIZATION:'riosv',KT125_AUTH_URL:authUrl,KT125_AUTH_PUBLIC_KEY:'sb_publishable_fixture'};
let memberNow=now,verifyCalls=0,loginCalls=0,signupCalls=0,recoveryCalls=0;
const managedUsers=new Map();
const provider={ready:true,issuer:memberIssuer,
 async signup(email,password){signupCalls++;if(!managedUsers.has(email))managedUsers.set(email,{email,password,subject:uuid(),confirmed:false});return {ok:true}},
 async verifyRegistration(email,code){verifyCalls++;const u=managedUsers.get(email);if(!u||code!=='123456'||u.confirmed)return null;u.confirmed=true;return {verified:true,issuer:memberIssuer,subject:u.subject,email}},
 async login(email,password){loginCalls++;const u=managedUsers.get(email);return u&&u.confirmed&&u.password===password?{verified:true,issuer:memberIssuer,subject:u.subject,email}:null},
 async recover(){recoveryCalls++;return {ok:true}},
 async resetPassword(hash,password,{beforeChange}){const u=managedUsers.get('expert1@example.invalid');if(hash!=='a'.repeat(64))return null;const who={verified:true,issuer:memberIssuer,subject:u.subject,email:u.email};await beforeChange(who);u.password=password;return who}
};
const handler=createKT125MemberHandler({getProvider:()=>provider,clock:()=>memberNow,uuid});
const authCookie=(response,name)=>response.headers.getSetCookie().find(c=>c.startsWith(name+'='))?.split(';')[0]||'';
const post=(path,data,auth='',headers={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.10',...(auth?{Cookie:auth}:{}),...headers},body:new URLSearchParams(data)});
const get=(path,auth='',headers={})=>new Request(origin+path,{headers:{...(auth?{Cookie:auth}:{}),...headers}});
const password='A long registration passphrase!';
const signup=(username,email,more={})=>({name:'Пробен експерт',username,email,password,password_confirm:password,note:'Служебна забележка',confirm:'REGISTER',...more});
async function register(username,email){
 const response=await handler.fetch(post('/auth/register',signup(username,email)),env);
 assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'/auth/verify');
 const registration=authCookie(response,CHALLENGE_COOKIE);assert(registration);
 const verified=await handler.fetch(post('/auth/verify',{code:'123456'},registration),env);
 return {registration,response:verified};
}
try{
 for(const f of ['001_private_access.sql','002_security_events.sql','003_staff_activation.sql'])query({mode:'script',sql:readFileSync(new URL('../schema/'+f,import.meta.url),'utf8')});
 seedUser('manager','manager-sub');seedUser('other-manager','other-manager-sub','egmaster','other-org');
 assert.equal((await handler.fetch(get('/auth/register'),{...env,KT125_MEMBER_ENABLED:'false'})).status,503);
 assert.equal((await handler.fetch(get('/auth/register'),env)).status,200);
 assert.equal(query({mode:'query',sql:"SELECT name FROM sqlite_master WHERE name='kt125_member_accounts'"}).length,0,'GET never runs schema');
 assert.equal((await handler.fetch(post('/auth/register',signup('x','x@example.invalid')),env)).status,400);
 assert.equal((await handler.fetch(post('/auth/register',signup('member0','x@example.invalid'),'',{Origin:'null'}),env)).status,403);
 assert.equal((await handler.fetch(post('/auth/register',signup('member0','x@example.invalid'),'',{Origin:'https://foreign.invalid'}),env)).status,403);
 // Reset IP budget consumed by intentionally invalid local input.
 query({mode:'query',sql:'DELETE FROM kt125_auth_limits'});
 const first=await handler.fetch(post('/auth/register',signup('expert1','expert1@example.invalid')),env);
 assert.equal(first.status,303);assert.equal(count('kt125_access_requests'),0,'Unverified registrations never reach the review queue');
 assert.equal(count('kt125_users'),2,'No active user from signup');
 let reg=authCookie(first,CHALLENGE_COOKIE);
 assert(first.headers.getSetCookie()[0].includes('HttpOnly'));assert(first.headers.getSetCookie()[0].includes('Secure'));assert(first.headers.getSetCookie()[0].includes('SameSite=Lax'));
 assert.equal((await handler.fetch(post('/auth/verify',{code:'999999'},reg),env)).status,400);
 const verified=await handler.fetch(post('/auth/verify',{code:'123456'},reg),env);
 assert.equal(verified.status,303);assert.equal(verified.headers.get('Location'),'/auth/pending');
 assert.equal((await handler.fetch(get('/auth/pending',reg),env)).status,200);
 assert.equal(count('kt125_access_requests'),1);assert.equal(count('kt125_users'),2);
 assert.equal((await handler.fetch(post('/auth/verify',{code:'123456'},reg),env)).status,400,'OTP/challenge cannot replay');
 const rows=query({mode:'query',sql:'SELECT * FROM kt125_registration_challenges'});
 assert(!JSON.stringify(rows).includes(password));assert(!JSON.stringify(rows).includes('123456'),'No password or code stored in D1');
 const account=await findMemberAccount(db,'expert1');assert.equal(account.email,'expert1@example.invalid');
 const login=()=>post('/auth/login',{username:'expert1',password});
 assert.equal((await handler.fetch(login(),env)).status,403,'Correct password is insufficient before manager approval');
 const decision=await decideKT125AccessRequest({...args(),requestId:account.request_id,decision:'approve',role:'expert'});
 assert.equal(decision.ok,true);assert.equal(count('kt125_users'),2,'Approval does not fabricate authentication');
 const codeCalls=verifyCalls;
 const logged=await handler.fetch(login(),env);assert.equal(logged.status,303);assert.equal(logged.headers.get('Location'),'/member');
 let session=authCookie(logged,SESSION_COOKIE);assert(session);assert.equal(verifyCalls,codeCalls,'Password login must never request or verify another code');
 assert.equal(count('kt125_users'),3,'First approved password login accepts the invitation once');
 assert.equal((await handler.fetch(get('/member',session),env)).status,200);
 assert.equal((await handler.fetch(get('/kt125/admin/panel/users',session,{'Cf-Access-Jwt-Assertion':'manager'}),env)).status,403);
 assert.equal((await handler.fetch(get('/kt125/admin/panel/users','',{'Cf-Access-Jwt-Assertion':'manager'}),env)).status,403,'Cloudflare header spoofing is ignored on the public Worker');
 const me=managedUsers.get('expert1@example.invalid');
 const ownUser=query({mode:'query',sql:'SELECT user_id FROM kt125_users WHERE identity_provider=? AND provider_subject=?',args:[memberIssuer,me.subject]})[0].user_id;
 query({mode:'query',sql:"INSERT INTO kt125_cases(case_id,organization_id,owner_id,status,created_at_ms,updated_at_ms) VALUES('my-case','riosv',?,'active',?,?)",args:[ownUser,now,now]});
 assert.equal((await handler.fetch(get('/kt125/cases/my-case/access',session),env)).status,200);
 assert.equal((await handler.fetch(get('/kt125/cases/my-case/access','',{'Cf-Access-Jwt-Assertion':'manager'}),env)).status,403);
 const secondLogin=await handler.fetch(post('/auth/login',{username:'expert1',password},session),env);
 assert.equal(secondLogin.status,303);const rotated=authCookie(secondLogin,SESSION_COOKIE);assert.notEqual(rotated,session);
 assert.equal((await handler.fetch(get('/member',session),env)).status,303,'Old browser session is rotated on fresh login');session=rotated;
 query({mode:'query',sql:'UPDATE kt125_users SET active=0 WHERE user_id=?',args:[ownUser]});
 assert.equal((await handler.fetch(get('/member',session),env)).status,303,'Deactivation is checked on every request');
 assert.equal((await handler.fetch(login(),env)).status,403,'Password cannot reactivate a disabled user');
 query({mode:'query',sql:'UPDATE kt125_users SET active=1 WHERE user_id=?',args:[ownUser]});
 memberNow=now+SESSION_MS+1;
 assert.equal((await handler.fetch(get('/member',session),env)).status,303,'Absolute session expiry is enforced');
 const relogged=await handler.fetch(login(),env);assert.equal(relogged.status,303);session=authCookie(relogged,SESSION_COOKIE);assert.equal(verifyCalls,codeCalls);
 const resetBody={token_hash:'a'.repeat(64),password:'Another long password phrase!',password_confirm:'Another long password phrase!',confirm:'RESET'};
 assert.equal((await handler.fetch(post('/auth/reset',resetBody),env)).status,303);
 assert.equal((await handler.fetch(get('/member',session),env)).status,303,'Password recovery revokes existing sessions');
 assert.equal((await handler.fetch(login(),env)).status,401,'Old password is refused');
 const afterReset=await handler.fetch(post('/auth/login',{username:'expert1',password:resetBody.password}),env);assert.equal(afterReset.status,303);session=authCookie(afterReset,SESSION_COOKIE);
 assert.equal((await handler.fetch(post('/auth/logout',{},session),env)).status,303);
 assert.equal((await handler.fetch(get('/member',session),env)).status,303);
 // Stale password proof cannot establish a session across a concurrent password reset.
 const who={verified:true,issuer:memberIssuer,subject:me.subject,email:me.email};
 const beforeReset=await findMemberAccount(db,'expert1');
 const version=await beginPasswordReset({db,who,nowMs:memberNow});
 assert.equal(await createMemberSession({db,who,nowMs:memberNow,credentialVersion:beforeReset.credential_version}),null);
 await finishPasswordReset({db,who,version});
 assert.equal(await createMemberSession({db,who,nowMs:memberNow,credentialVersion:beforeReset.credential_version}),null);
 // Username race: preserve verified email proof; changing name needs no second OTP.
 query({mode:'query',sql:'DELETE FROM kt125_auth_limits'});
 const collision=await register('expert1','expert2@example.invalid');assert.equal(collision.response.status,303);assert.equal(collision.response.headers.get('Location'),'/auth/complete');
 const afterVerifyCalls=verifyCalls;
 const completed=await handler.fetch(post('/auth/complete',{username:'expert2',confirm:'COMPLETE'},collision.registration),env);
 assert.equal(completed.status,303);assert.equal(verifyCalls,afterVerifyCalls);
 const secondAccount=await findMemberAccount(db,'expert2');
 assert.equal((await decideKT125AccessRequest({...args('otherManager'),requestId:secondAccount.request_id,decision:'approve',role:'expert'})).ok,false);
 assert.equal((await decideKT125AccessRequest({...args(),requestId:secondAccount.request_id,decision:'reject',role:'expert'})).ok,true);
 assert.equal((await handler.fetch(post('/auth/login',{username:'expert2',password}),env)).status,403);
 assert.equal((await handler.fetch(post('/auth/forgot',{username:'expert1'}),env)).status,303);assert.equal(recoveryCalls,1);
 assert.equal((await handler.fetch(post('/auth/forgot',{username:'missing'}),env)).status,303);assert.equal(recoveryCalls,1,'No email for an unknown profile');
 // Explicit migration retains the old expert UUID, ownership, role and Access identity.
 query({mode:'query',sql:'DELETE FROM kt125_auth_limits'});
 seedUser('legacy-expert','legacy-sub','expert');
 query({mode:'query',sql:"INSERT INTO kt125_staff_profiles(user_id,organization_id,identity_provider,email,display_name) VALUES('legacy-expert','riosv',?,'legacy@example.invalid','Legacy expert')",args:[issuer]});
 query({mode:'query',sql:"INSERT INTO kt125_cases(case_id,organization_id,owner_id,status,created_at_ms,updated_at_ms) VALUES('legacy-case','riosv','legacy-expert','active',?,?)",args:[now,now]});
 const legacy=await register('legacy','legacy@example.invalid');assert.equal(legacy.response.headers.get('Location'),'/auth/pending');
 const legacyAccount=await findMemberAccount(db,'legacy');
 const directory=await readKT125AccessRequests(args());assert.equal(directory.items.find(r=>r.request_id===legacyAccount.request_id).existing_user_id,'legacy-expert');
 assert.equal((await decideKT125AccessRequest({...args(),requestId:legacyAccount.request_id,decision:'approve',role:'expert'})).ok,false,'A normal approval must not duplicate a legacy profile');
 const linking=(more={})=>linkKT125ExistingMember({...args(),nowMs:memberNow,requestId:legacyAccount.request_id,targetUserId:'legacy-expert',...more});
 assert.equal((await linking({...args('otherManager')})).ok,false);
 assert.equal((await linking({targetUserId:'manager'})).ok,false,'Never link a manager through public signup');
 const userCount=count('kt125_users');
 const previousEvent=query({mode:'query',sql:'SELECT event_id FROM kt125_audit LIMIT 1'})[0].event_id;
 const failedIds=['migration-invite',previousEvent,'migration-request'];
 assert.equal((await linking({uuid:()=>failedIds.shift()})).ok,false);
 assert.equal((await findMemberAccount(db,'legacy')).linked_user_id,null,'Audit failure rolls the whole link back');
 const linked=await linking();assert.equal(linked.ok,true);assert.equal(count('kt125_users'),userCount);
 assert.equal((await linking()).ok,false,'Migration cannot replay');
 const legacyLogin=await handler.fetch(post('/auth/login',{username:'legacy',password}),env);assert.equal(legacyLogin.status,303);
 const legacySession=authCookie(legacyLogin,SESSION_COOKIE);
 assert.equal((await handler.fetch(get('/kt125/cases/legacy-case/access',legacySession),env)).status,200,'Old case ownership remains usable with the new password login');
 assert.equal((await handler.fetch(get('/kt125/cases/my-case/access',legacySession),env)).status,403);
 assert.equal(query({mode:'query',sql:"SELECT owner_id FROM kt125_cases WHERE case_id='legacy-case'"})[0].owner_id,'legacy-expert');
 let emailPayload;
 assert.equal((await sendKT125InvitationMail({...args(),nowMs:memberNow,invitationId:linked.invitationId,env:{KT125_PRIVATE_ORIGIN:origin,KT125_MEMBER_ORIGIN:origin,KT125_MEMBER_ISSUER:memberIssuer,KT125_MAIL_FROM:'sender@example.invalid',KT125_MAIL_TRANSPORT:'resend',KT125_MAIL_API_KEY:'test'},fetcher:async(url,options)=>{emailPayload=JSON.parse(options.body);return new Response(JSON.stringify({id:'migration-message'}),{status:200})}})).ok,true);
 assert(emailPayload.text.includes('/auth/login'));assert(!emailPayload.text.includes(password));assert(emailPayload.text.includes('Съществуващият Ви служебен профил е запазен'));
 // Failed verification is bounded even if the caller rotates IP addresses.
 query({mode:'query',sql:'DELETE FROM kt125_auth_limits'});
 const failed=await handler.fetch(post('/auth/register',signup('expert3','expert3@example.invalid')),env);const failCookie=authCookie(failed,CHALLENGE_COOKIE);
 const beforeAttempts=verifyCalls;
 for(let n=0;n<7;n++)assert.equal((await handler.fetch(post('/auth/verify',{code:'000000'},failCookie,{'CF-Connecting-IP':'192.0.2.'+(30+n)}),env)).status,400);
 assert.equal(verifyCalls-beforeAttempts,5,'Only five attempts per registration challenge');
 // Rate limits survive handler recreation; invalid/missing Origin never reaches the provider.
 query({mode:'query',sql:'DELETE FROM kt125_auth_limits'});
 for(let n=0;n<10;n++)assert.equal((await handler.fetch(post('/auth/login',{username:'missing',password}),env)).status,401);
 const beforeLimit=loginCalls;
 assert.equal((await createKT125MemberHandler({getProvider:()=>provider,clock:()=>memberNow,uuid}).fetch(post('/auth/login',{username:'missing',password}),env)).status,429);assert.equal(loginCalls,beforeLimit);
 const bad=new Request(origin+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'x'.repeat(16001)});
 assert.equal((await handler.fetch(bad,env)).status,400);
 // Real provider adapter trusts /user, not token strings or signup response roles.
 assert.equal(memberAuthConfig({...env,KT125_AUTH_URL:'https://attacker.invalid'}),null);
 assert.equal(memberAuthConfig({...env,KT125_AUTH_PUBLIC_KEY:'sb_secret_not_allowed'}),null);
 const providerCalls=[];let confirmed=true;
 const real=createMemberAuthProvider(env,{fetcher:async(url,options)=>{
  providerCalls.push({url,options});assert(url.startsWith(authUrl+'/auth/v1/'));assert.equal(options.redirect,'manual');
  if(url.endsWith('/user')&&options.method==='GET')return new Response(JSON.stringify({id:'external-user',email:'external@example.invalid',email_confirmed_at:confirmed?'2026-01-01T00:00:00Z':null}),{status:200});
  return new Response(JSON.stringify({access_token:'not-locally-trusted',user:{role:'administrator',email:'wrong@example.invalid'}}),{status:200});
 }});
 const signed=await real.login('external@example.invalid',password);assert.equal(signed.email,'external@example.invalid');assert.equal(signed.subject,'external-user');assert.equal(signed.role,undefined);
 const outage=createMemberAuthProvider(env,{fetcher:async()=>new Response('',{status:503})});
 assert.equal((await outage.login('external@example.invalid',password)).unavailable,true);
 const refused=createMemberAuthProvider(env,{fetcher:async()=>new Response('',{status:400})});
 assert.equal(await refused.login('external@example.invalid',password),null);
 confirmed=false;assert.equal(await real.login('external@example.invalid',password),null);
 assert.equal((await real.signup('external@example.invalid',password)).ok,false,'Project with confirmation disabled fails closed');
 assert(!JSON.stringify(query({mode:'query',sql:'SELECT * FROM kt125_member_accounts'})).includes(password));
 console.log('PASS PASSWORD96: managed credentials, one registration OTP, real SQLite approval gates, username race, session rotation/expiry/reset/disable, case/admin isolation, public POST limits, no credentials in D1.');
}finally{rmSync(directory,{recursive:true,force:true})}
