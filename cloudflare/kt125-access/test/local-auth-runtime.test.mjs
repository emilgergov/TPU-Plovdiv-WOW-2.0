import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {Miniflare} from 'miniflare';
import {KT125_INVITATION_SCHEMA} from '../src/staff-invitations.mjs';
import {KT125_REQUEST_SCHEMA} from '../src/access-requests.mjs';
import {LOCAL_SCHEMA,purposeToken} from '../src/local-auth/common.mjs';
import {requestReset,resetProof} from '../src/local-auth/recovery.mjs';
import {localConfig} from '../src/local-auth/common.mjs';
import {decideLocal} from '../src/local-auth/admin.mjs';
const origin='https://office.example.invalid',now=Date.now();
const env={KT125_LOCAL_ENABLED:'true',KT125_LOCAL_ORIGIN:origin,KT125_REQUEST_ORGANIZATION:'riosv',KT125_AUTH_SECRET:'a'.repeat(64)};
const bundlePath=resolve(process.env.KT125_RUNTIME_BUNDLE||'../../../kt125-local-auth-worker.mjs');
const mf=new Miniflare({name:'local97',modules:true,modulesRoot:dirname(bundlePath),scriptPath:bundlePath,
 compatibilityDate:'2026-07-30',compatibilityFlags:['nodejs_compat'],bindings:env,
 durableObjects:{KT125_PASSWORDS:{className:'PasswordKdf',useSQLite:true}},d1Databases:{KT125_DB:'registry'},
 serviceBindings:{KT125_LOCAL_AUTH:{name:'local97',entrypoint:'LocalAuthService'}}});
try{
 const db=await mf.getD1Database('KT125_DB');
 const ddl=readFileSync(new URL('../schema/001_private_access.sql',import.meta.url),'utf8').replace(/--[^\n]*/g,'').replace('PRAGMA foreign_keys = ON;','');
 for(const sql of ddl.split(';').filter(s=>s.trim()))await db.prepare(sql).run();
 await db.prepare('ALTER TABLE kt125_users ADD COLUMN activation_pending INTEGER NOT NULL DEFAULT 0').run();
 for(const sql of [...KT125_INVITATION_SCHEMA,...KT125_REQUEST_SCHEMA,...LOCAL_SCHEMA])await db.prepare(sql).run();
 await db.prepare("INSERT INTO kt125_users(user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms) VALUES('owner','riosv','https://test.cloudflareaccess.com','owner-sub','egmaster',1,?,?)").bind(now,now).run();
 const password='Pine!River42';
 assert.equal(password.length,12);
 const send=(path,body,cookie='')=>mf.dispatchFetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',...(cookie?{Cookie:cookie}:{})},body:new URLSearchParams(body),redirect:'manual'});
 const started=performance.now();
 const tooShort=await send('/auth/register',{username:'runtime-user',name:'Runtime expert',email:'runtime@example.invalid',password:password.slice(0,11),password_confirm:password.slice(0,11),note:'Boundary test',confirm:'REGISTER'});
 assert.equal(tooShort.status,400,'Eleven-character registration is rejected');
 const registered=await send('/auth/register',{username:'runtime-user',name:'Runtime expert',email:'runtime@example.invalid',password,password_confirm:password,note:'Runtime test',confirm:'REGISTER'});
 assert.equal(registered.status,303,await registered.text());
 const account=await db.prepare("SELECT * FROM kt125_local_accounts WHERE username='runtime-user'").first();assert(account.password_hash.startsWith('scrypt$32768$8$3$'));
 const verifier={verify:async()=>({verified:true,issuer:'https://test.cloudflareaccess.com',subject:'owner-sub',email:'owner@example.invalid'})};
 const approved=await decideLocal({request:new Request(origin+'/'),verifier,db,requestId:account.request_id,decision:'approve',role:'expert'});assert.equal(approved.ok,true);
 const ready=await db.prepare('SELECT * FROM kt125_local_accounts WHERE account_id=?').bind(account.account_id).first();
 const proof=await purposeToken(env,'activate',ready);
 const login=await send('/auth/login',{username:'runtime-user',password,account:account.account_id,activation:proof});assert.equal(login.status,303,await login.text());
 const cookie=login.headers.getSetCookie()[0].split(';')[0];
 assert.equal((await mf.dispatchFetch(origin+'/member',{headers:{Cookie:cookie},redirect:'manual'})).status,200);
 const bound=await mf.getBindings();const smtpStatus=await bound.KT125_LOCAL_AUTH.getStatus();assert.equal(smtpStatus.configured,false);
 const runtimeEnv={...env,KT125_DB:db};
 assert.equal((await send('/auth/forgot',{email:'runtime@example.invalid'})).status,503);
 const resetId=await requestReset({db,config:localConfig(runtimeEnv),email:'runtime@example.invalid',now:Date.now(),uuid:()=>crypto.randomUUID()});assert(resetId);
 const reset=await db.prepare('SELECT * FROM kt125_local_resets WHERE reset_id=?').bind(resetId).first();
 const resetBody={reset_id:resetId,reset_token:await resetProof(runtimeEnv,reset),password:'Oak!Stream73',password_confirm:'Oak!Stream73'};
 assert.equal(resetBody.password.length,12);
 assert.equal((await send('/auth/reset',{...resetBody,password:resetBody.password.slice(0,11),password_confirm:resetBody.password.slice(0,11)})).status,400);
 assert.equal((await send('/auth/reset',resetBody)).status,303);
 assert.equal((await mf.dispatchFetch(origin+'/member',{headers:{Cookie:cookie},redirect:'manual'})).status,303);
 assert.equal((await send('/auth/reset',resetBody)).status,403);
 assert.equal((await send('/auth/login',{username:'runtime-user',password,account:'',activation:''})).status,401);
 const replacement=await send('/auth/login',{username:'runtime-user',password:resetBody.password,account:'',activation:''});assert.equal(replacement.status,303);
 const freshCookie=replacement.headers.getSetCookie()[0].split(';')[0];
 assert.equal((await mf.dispatchFetch(origin+'/member',{headers:{Cookie:freshCookie},redirect:'manual'})).status,200);
 await db.prepare('UPDATE kt125_users SET active=0,updated_at_ms=? WHERE user_id=?').bind(Date.now(),ready.user_id||(await db.prepare('SELECT user_id FROM kt125_local_accounts WHERE account_id=?').bind(account.account_id).first()).user_id).run();
 assert.equal((await mf.dispatchFetch(origin+'/member',{headers:{Cookie:freshCookie},redirect:'manual'})).status,303);
 console.log('PASS LOCAL97 workerd: actual D1, native scrypt through private SQLite Durable Object RPC, first password session, reset through native KDF with revoked old password/session and single-use link, revocation trigger and mail Service Binding. Elapsed ms:',Math.round(performance.now()-started));
}finally{await mf.dispose()}
