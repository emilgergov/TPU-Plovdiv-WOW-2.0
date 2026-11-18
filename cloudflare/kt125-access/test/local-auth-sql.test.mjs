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
import {createLocalHandler} from '../src/local-auth/worker.mjs';
import {hashPassword,verifyPassword} from '../src/local-auth/password.mjs';
import {localConfig,purposeToken,SESSION_COOKIE,SESSION_MS,cookie,LOCAL_SCHEMA} from '../src/local-auth/common.mjs';
import {findAccount,identity,setup} from '../src/local-auth/store.mjs';
import {decideLocal,renewLocal} from '../src/local-auth/admin.mjs';
import {sendNotification,sendResetNotification,deliverSmtp} from '../src/local-auth/mail.mjs';
import {readKT125AccessRequests} from '../src/access-requests.mjs';
import {requestReset,usableReset,completeReset,resetProof} from '../src/local-auth/recovery.mjs';
import {disableKT125User,enableKT125User} from '../src/user-lifecycle.mjs';
let localNow=now,moduleCalls=0;
const env={KT125_DB:db,KT125_LOCAL_ENABLED:'true',KT125_LOCAL_ORIGIN:origin,KT125_REQUEST_ORGANIZATION:'riosv',KT125_AUTH_SECRET:'a'.repeat(64)};
const smtpEnv={...env,KT125_SMTP_HOST:'smtp.example.invalid',KT125_SMTP_PORT:'587',KT125_SMTP_FROM:'sender@example.invalid',KT125_SMTP_USER:'sender@example.invalid',KT125_SMTP_PASSWORD:'smtp-fixture-secret'};
const handler=createLocalHandler({clock:()=>localNow,uuid,passwordHash:hashPassword,passwordVerify:verifyPassword,moduleFetch:async(url,options)=>{moduleCalls++;assert(url.startsWith('https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/2652e375cf90f03570a77158335ef364d4a48a5f/'));assert(!options.headers.Cookie);return new Response('<html>Existing module<a id="kt125AccessLauncher" href="old-preview.html">Администратор</a></html>',{headers:{'Content-Type':'text/html'}})}});
const password='A long local password phrase!';
const reg=(un,email)=>({username:un,email,name:'Пробен експерт',note:'Незадължителна забележка',password,password_confirm:password,confirm:'REGISTER'});
const post=(path,body,auth='',headers={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.10',...(auth?{Cookie:auth}:{}),...headers},body:new URLSearchParams(body)});
const get=(path,auth='',headers={})=>new Request(origin+path,{headers:{...(auth?{Cookie:auth}:{}),...headers}});
const sessionCookie=response=>response.headers.getSetCookie().find(c=>c.startsWith(SESSION_COOKIE+'='))?.split(';')[0]||'';
const login=(un,more={})=>post('/auth/login',{username:un,password,account:'',activation:'',...more});
const decide=(requestId,more={})=>decideLocal({...args(),requestId,decision:'approve',role:'expert',now:localNow,...more});
async function signup(un,email){query({mode:'query',sql:'DELETE FROM kt125_local_limits'});const r=await handler.fetch(post('/auth/register',reg(un,email)),env);assert.equal(r.status,303);return findAccount(db,un);}
try{
 for(const f of ['001_private_access.sql','002_security_events.sql','003_staff_activation.sql'])query({mode:'script',sql:readFileSync(new URL('../schema/'+f,import.meta.url),'utf8')});
 seedUser('manager','manager-sub');seedUser('other-manager','other-manager-sub','egmaster','other-org');
 assert.equal((await handler.fetch(get('/auth/register'),{...env,KT125_LOCAL_ENABLED:'false'})).status,503);
 assert.equal((await handler.fetch(get('/auth/register'),env)).status,200);
 assert.equal(query({mode:'query',sql:"SELECT name FROM sqlite_master WHERE name='kt125_local_accounts'"}).length,0,'GET never creates schema');
 assert.equal((await handler.fetch(post('/auth/register',reg('expert1','expert1@example.invalid'),'',{Origin:'null'}),env)).status,403);
 await setup(db);
 const first=await signup('expert1','expert1@example.invalid');assert(first);
 assert(first.password_hash.startsWith('scrypt$32768$8$3$'));assert(!first.password_hash.includes(password));
 assert.equal(count('kt125_users'),2,'A registration never grants a user or role');
 assert.equal((await handler.fetch(post('/auth/register',reg('expert1','expert1@example.invalid')),env)).status,409);
 assert.equal(count('kt125_access_requests'),1,'Duplicate registration rolls the request back');
 assert.equal((await handler.fetch(login('expert1'),env)).status,403);
 const request1=query({mode:'query',sql:"SELECT request_id FROM kt125_local_accounts WHERE username='expert1'"})[0].request_id;
 for(const more of [{...args('otherManager')},{role:'egmaster'},{request:request('forged')}])assert.equal((await decide(request1,more)).ok,false);
 // A stale manager cannot change the account, request, mail or audit partially.
 hook=()=>query({mode:'query',sql:"UPDATE kt125_users SET active=0 WHERE user_id='manager'"});
 assert.equal((await decide(request1)).ok,false);assert.equal(count('kt125_local_outbox'),0);
 query({mode:'query',sql:"UPDATE kt125_users SET active=1 WHERE user_id='manager'"});
 const approved=await decide(request1);assert.equal(approved.ok,true);assert.equal((await decide(request1)).ok,false);
 assert.equal(count('kt125_users'),2,'Approval waits for the emailed first-login link');
 assert.equal((await handler.fetch(login('expert1'),env)).status,403,'No email possession bypass');
 assert.equal((await sendNotification(env,approved.mailId)).pending,true);assert.equal(query({mode:'query',sql:'SELECT state FROM kt125_local_outbox'})[0].state,'queued');
 let delivered,mailCount=0;
 const deliver=async(_,message)=>{mailCount++;delivered=message;return {state:'accepted'}};
 assert.equal((await sendNotification(smtpEnv,approved.mailId,{deliver,now:localNow})).ok,true);assert.equal(mailCount,1);
 assert(!delivered.text.includes(password));assert(!delivered.text.includes('Незадължителна забележка'));
 const link=new URL(delivered.text.match(/https:\/\/[^\s]+/)[0]);
 const enter={account:link.searchParams.get('account'),activation:link.searchParams.get('token')};
 assert.equal((await handler.fetch(login('expert1',{...enter,password:'incorrect'}),env)).status,401);
 assert.equal((await handler.fetch(login('expert1',{...enter,activation:'x'.repeat(43)}),env)).status,403);
 assert.equal((await sendNotification(smtpEnv,approved.mailId,{deliver,now:localNow})).ok,false);assert.equal(mailCount,1,'No duplicate send after acceptance');
 const activated=await handler.fetch(login('expert1',enter),env);assert.equal(activated.status,303);let session=sessionCookie(activated);assert(session);
 assert(activated.headers.getSetCookie()[0].includes('HttpOnly'));assert(activated.headers.getSetCookie()[0].includes('Secure'));
 assert.equal(count('kt125_users'),3);assert.equal((await handler.fetch(get('/member',session),env)).status,200);
 assert.equal((await handler.fetch(get('/kt125/admin/panel/users',session),env)).status,403);
 assert.equal((await handler.fetch(get('/kt125/admin/panel/users','',{'Cf-Access-Jwt-Assertion':'manager','X-Role':'egmaster'}),env)).status,403);
 const account=await findAccount(db,'expert1');
 query({mode:'query',sql:"INSERT INTO kt125_cases(case_id,organization_id,owner_id,status,created_at_ms,updated_at_ms) VALUES('owned-case','riosv',?,'active',?,?)",args:[account.user_id,now,now]});
 assert.equal((await handler.fetch(get('/kt125/cases/owned-case/access',session),env)).status,200);
 assert.equal((await handler.fetch(get('/module/',session),env)).status,303);
 const expertModule=await handler.fetch(get('/module/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',session),env);assert.equal(expertModule.status,200);assert(!(await expertModule.text()).includes('kt125AccessLauncher'));assert.equal(moduleCalls,1);
 assert.equal((await handler.fetch(get('/module/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html'),env)).status,303);assert.equal(moduleCalls,1);
 localNow++;
 assert.equal((await disableKT125User({...args(),targetUserId:account.user_id,nowMs:localNow})).ok,true,'An active case must not prevent deactivation');
 assert.equal(query({mode:'query',sql:"SELECT owner_id,status FROM kt125_cases WHERE case_id='owned-case'"})[0].owner_id,account.user_id);
 assert.equal(count('kt125_local_sessions'),0,'Database trigger revokes existing sessions immediately');
 assert.equal((await handler.fetch(get('/kt125/cases/owned-case/access',session),env)).status,403);
 assert.equal((await handler.fetch(login('expert1'),env)).status,403,'Correct password cannot bypass deactivation');
 localNow++;
 assert.equal((await enableKT125User({...args(),targetUserId:account.user_id,nowMs:localNow})).ok,true);
 assert.equal((await handler.fetch(get('/member',session),env)).status,303,'Reactivation never revives old sessions');
 const again=await handler.fetch(login('expert1'),env);assert.equal(again.status,303);session=sessionCookie(again);
 assert.equal(mailCount,1,'Ordinary password login never sends an email/code');
 localNow+=SESSION_MS+1;assert.equal((await handler.fetch(get('/member',session),env)).status,303);
 const afterExpiry=await handler.fetch(login('expert1'),env);assert.equal(afterExpiry.status,303);session=sessionCookie(afterExpiry);
 assert.equal((await handler.fetch(post('/auth/logout',{},session),env)).status,303);assert.equal((await handler.fetch(get('/member',session),env)).status,303);
 // Renewing a never-used approval invalidates the previous mail link.
 const second=await signup('expert2','expert2@example.invalid');const req2=query({mode:'query',sql:'SELECT request_id FROM kt125_local_accounts WHERE account_id=?',args:[second.account_id]})[0].request_id;
 const ap2=await decide(req2);const beforeRenew=await findAccount(db,'expert2');const oldLink=await purposeToken(env,'activate',beforeRenew);
 const renewed=await renewLocal({...args(),requestId:req2,now:localNow,uuid});assert.equal(renewed.ok,true);
 assert.equal((await handler.fetch(login('expert2',{account:second.account_id,activation:oldLink}),env)).status,403);
 const afterRenew=await findAccount(db,'expert2');const newLink=await purposeToken(env,'activate',afterRenew);
 assert.notEqual(oldLink,newLink);
 localNow+=8*86400000;assert.equal((await handler.fetch(login('expert2',{account:second.account_id,activation:newLink}),env)).status,403,'Initial link expires, not the registered profile');localNow-=8*86400000;
 assert.equal((await handler.fetch(login('expert2',{account:second.account_id,activation:newLink}),env)).status,303);
 const user2=(await findAccount(db,'expert2')).user_id;
 const secondSession=sessionCookie(await handler.fetch(login('expert2'),env));
 assert.equal((await handler.fetch(get('/kt125/cases/owned-case/access',secondSession),env)).status,403,'Own registration does not grant other experts cases');
 // Same mailbox migration is explicit and still requires the mailed link + password.
 seedUser('legacy-expert','legacy-sub','expert');
 query({mode:'query',sql:"INSERT INTO kt125_staff_profiles(user_id,organization_id,identity_provider,email,display_name) VALUES('legacy-expert','riosv',?,'legacy@example.invalid','Legacy')",args:[issuer]});
 const legacy=await signup('legacy','legacy@example.invalid');const lr=query({mode:'query',sql:'SELECT request_id FROM kt125_local_accounts WHERE account_id=?',args:[legacy.account_id]})[0].request_id;
 assert.equal((await decide(lr)).ok,false,'No duplicate legacy user');
 assert.equal((await decide(lr,{decision:'link',existingUserId:'manager'})).ok,false,'No privilege escalation by email claims');
 assert.equal((await decide(lr,{decision:'link',existingUserId:'legacy-expert'})).ok,true);
 const readyLegacy=await findAccount(db,'legacy'),legacyProof=await purposeToken(env,'activate',readyLegacy),usersBefore=count('kt125_users');
 assert.equal((await handler.fetch(login('legacy',{account:legacy.account_id,activation:legacyProof}),env)).status,303);
 assert.equal((await findAccount(db,'legacy')).user_id,'legacy-expert');assert.equal(count('kt125_users'),usersBefore);
 // Only the actual EGMASTER can explicitly link their own signed Access email.
 const owner=await signup('owner-login',principals.manager.email);const ownerRequest=query({mode:'query',sql:'SELECT request_id FROM kt125_local_accounts WHERE account_id=?',args:[owner.account_id]})[0].request_id;
 assert.equal((await decide(ownerRequest,{decision:'link',existingUserId:'manager',...args('otherManager')})).ok,false);
 assert.equal((await decide(ownerRequest,{decision:'link',existingUserId:'manager'})).ok,true);
 const ownerAccount=await findAccount(db,'owner-login');const ownerLogin=await handler.fetch(login('owner-login',{account:owner.account_id,activation:await purposeToken(env,'activate',ownerAccount)}),env);
 assert.equal(ownerLogin.status,303);const ownerSession=sessionCookie(ownerLogin);
 assert.equal((await handler.fetch(get('/kt125/admin/panel/users',ownerSession),env)).status,200,'Admin panel also works through our own authenticated session');
 const ownerModule=await handler.fetch(get('/module/vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html',ownerSession),env);const ownerModuleHtml=await ownerModule.text();assert(ownerModuleHtml.includes('href="/kt125/admin/panel/overview"'));assert(!ownerModuleHtml.includes('old-preview'));
 const adminHtml=await (await handler.fetch(get('/kt125/admin/panel/users',ownerSession),env)).text();assert(!adminHtml.includes('scrypt$'));assert(!adminHtml.includes(password));
 // SMTP uses verified TLS and no file/URL attachments; uncertain sends are not retried.
 let options,message;
 const sent=await deliverSmtp(smtpEnv,{to:'staff@example.invalid',subject:'Approved',text:'Body',messageId:'<fixture@example.invalid>'},{createTransport:o=>{options=o;return {sendMail:async m=>{message=m;return {accepted:['staff@example.invalid']}},close(){}}}});
 assert.equal(sent.state,'accepted');assert.equal(options.requireTLS,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(options.tls.minVersion,'TLSv1.2');assert(message.disableFileAccess&&message.disableUrlAccess);
 assert.equal((await deliverSmtp(smtpEnv,{},{createTransport:()=>({sendMail:async()=>{throw Object.assign(Error('secret should not escape'),{code:'ETIMEDOUT',command:'DATA'})},close(){}})})).state,'uncertain');
 // Password recovery never reveals mailbox existence or bypasses active approval.
 query({mode:'query',sql:'DELETE FROM kt125_local_limits'});
 assert.equal((await handler.fetch(get('/auth/admin'),env)).status,200);
 assert.equal((await handler.fetch(post('/auth/admin',{username:'owner-login',password,account:'',activation:''}),env)).headers.get('location'),'/kt125/admin/panel/overview');
 assert.equal((await handler.fetch(post('/auth/admin',{username:'expert2',password,account:'',activation:''}),env)).status,403);
 assert.equal((await handler.fetch(get('/auth/admin',ownerSession),env)).headers.get('location'),'/kt125/admin/panel/overview');
 assert.equal((await handler.fetch(get('/auth/admin',secondSession),env)).status,403);
 const previousSession=sessionCookie(await handler.fetch(login('expert1'),env));
 assert.equal((await handler.fetch(post('/auth/forgot',{email:'expert1@example.invalid'}),env)).status,503);
 assert.equal(count('kt125_local_resets'),0,'No reset silently queued before SMTP is available');
 const unknownReset=await handler.fetch(post('/auth/forgot',{email:'absent@example.invalid'}),smtpEnv);
 const knownReset=await handler.fetch(post('/auth/forgot',{email:'expert1@example.invalid'}),smtpEnv);
 assert.equal(knownReset.status,unknownReset.status);assert.equal(knownReset.headers.get('location'),unknownReset.headers.get('location'));
 const reset=query({mode:'query',sql:'SELECT * FROM kt125_local_resets'})[0];assert(reset);let resetMail,resetSends=0;
 const resetSend=await sendResetNotification(smtpEnv,reset.reset_id,{now:localNow,deliver:async(_env,m)=>{resetSends++;resetMail=m;return {state:'accepted'}}});assert.equal(resetSend.ok,true);
 await sendResetNotification(smtpEnv,reset.reset_id,{now:localNow,deliver:async()=>{resetSends++;return {state:'accepted'}}});assert.equal(resetSends,1);
 assert(!resetMail.text.includes(password));const proof=await resetProof(smtpEnv,reset);assert(resetMail.text.includes(proof));
 assert(!JSON.stringify(reset).includes(proof),'Complete bearer proof is never stored in the database');
 const resetBody={reset_id:reset.reset_id,reset_token:proof,password:'A replacement password phrase!',password_confirm:'A replacement password phrase!'};
 const resetLink='/auth/reset?request='+reset.reset_id+'&token='+proof;
 assert.equal((await handler.fetch(get(resetLink),env)).status,200);assert.equal(query({mode:'query',sql:'SELECT used_at_ms FROM kt125_local_resets'})[0].used_at_ms,null,'GET never consumes emailed links');
 assert.equal((await handler.fetch(post('/auth/reset',resetBody,'',{Origin:'https://attacker.invalid'}),env)).status,403);
 assert.equal((await handler.fetch(post('/auth/reset',{...resetBody,reset_token:'x'.repeat(43)}),env)).status,403);
 assert.equal((await handler.fetch(post('/auth/reset',{...resetBody,password_confirm:'different phrase!'}),env)).status,400);
 const resetDone=await handler.fetch(post('/auth/reset',resetBody),env);assert.equal(resetDone.status,303);assert.equal(resetDone.headers.get('location'),'/auth/reset-done');
 assert.equal((await handler.fetch(get('/member',previousSession),env)).status,303);
 assert.equal((await handler.fetch(login('expert1'),env)).status,401);
 const newLogin=await handler.fetch(login('expert1',{password:resetBody.password}),env);assert.equal(newLogin.status,303);
 assert.equal((await handler.fetch(get('/kt125/cases/owned-case/access',sessionCookie(newLogin)),env)).status,200,'Password reset retains case identity');
 assert.equal((await handler.fetch(post('/auth/reset',resetBody),env)).status,403,'Single use even with correct password');
 localNow+=21*60000;
 const expiring=await requestReset({db,config:localConfig(env),email:'expert1@example.invalid',now:localNow,uuid});
 const expires=query({mode:'query',sql:'SELECT * FROM kt125_local_resets WHERE reset_id=?',args:[expiring]})[0];const expiresProof=await resetProof(env,expires);
 localNow+=31*60000;
 assert.equal((await handler.fetch(post('/auth/reset',{...resetBody,reset_id:expiring,reset_token:expiresProof}),env)).status,403);
 const racing=await requestReset({db,config:localConfig(env),email:'expert1@example.invalid',now:localNow,uuid});
 const racingRaw=query({mode:'query',sql:'SELECT * FROM kt125_local_resets WHERE reset_id=?',args:[racing]})[0];
 const verifiedReset=await usableReset({db,config:localConfig(env),env,resetId:racing,proof:await resetProof(env,racingRaw),now:localNow});assert(verifiedReset);
 const hashBefore=(await findAccount(db,'expert1')).password_hash;
 hook=()=>query({mode:'query',sql:'UPDATE kt125_users SET active=0,updated_at_ms=? WHERE user_id=?',args:[localNow,account.user_id]});
 assert.equal(await completeReset({db,config:localConfig(env),row:verifiedReset,passwordHash:await hashPassword('Another replacement phrase!'),now:localNow,uuid}),false);
 assert.equal((await findAccount(db,'expert1')).password_hash,hashBefore,'Concurrent deactivation prevents password mutation');
 assert.equal(await requestReset({db,config:localConfig(env),email:'expert1@example.invalid',now:localNow+21*60000,uuid}),null);
 assert.equal(query({mode:'query',sql:"SELECT owner_id FROM kt125_cases WHERE case_id='owned-case'"})[0].owner_id,account.user_id);
 // Metadata and roles never come from browser headers; rate limit survives handler recreation.
 query({mode:'query',sql:'DELETE FROM kt125_local_limits'});
 for(let i=0;i<10;i++)assert.equal((await handler.fetch(login('unknown'),env)).status,401);
 assert.equal((await handler.fetch(login('unknown'),env)).status,429);
 console.log('PASS LOCAL97: real scrypt, own registration/approval/email proof/login, SQL atomicity, immediate disable of case owner, fresh reactivation, session expiry, case/admin isolation, legacy/owner migration, private admin entrance, single-use password recovery/expiry/replay/disable races and SMTP TLS semantics.');
}finally{rmSync(directory,{recursive:true,force:true})}
