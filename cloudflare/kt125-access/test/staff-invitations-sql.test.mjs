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
try{
 for(const f of ['001_private_access.sql','002_security_events.sql','003_staff_activation.sql'])query({mode:'script',sql:readFileSync(new URL('../schema/'+f,import.meta.url),'utf8')});
 seedUser('manager','manager-sub');seedUser('admin','admin-sub','administrator');seedUser('other-manager','other-manager-sub','egmaster','other-org');
 // No migration or DDL is performed just to display an existing FIX92 registry.
 assert.deepEqual((await readKT125InvitationDirectory(args())).invitations,[]);
 // Fail before schema writes for invalid identities, roles, inputs or permissions.
 for(const more of [{role:'egmaster'},{role:'administrator'},{email:'*@example.invalid'},{email:'x@example.invalid\n'},
  {name:''},{name:'x\n'},{request:request('forged')},{request:request('outsider')},{email:'manager@example.invalid'}])
  assert.equal((await invite(undefined,more)).ok,false);
 assert.equal(query({mode:'query',sql:"SELECT name FROM sqlite_master WHERE name='kt125_staff_invitations'"}).length,0);
 const pending=await invite('STAFF@OFFICE.EXAMPLE.INVALID');assert.equal(pending.ok,true);
 assert.equal(count('kt125_users'),3,'Invitation must not grant a user or role');
 assert.equal(count('kt125_audit'),1);
 assert.equal((await invite()).ok,false,'Duplicate pending invitations cannot race');
 for(const who of ['outsider','foreign','noEmail','forged'])
  assert.equal((await acceptKT125Invitation(args(who))).ok,false,who);
 const hidden=await readKT125InvitationDirectory(args('otherManager'));
 assert.equal(hidden.ok,true);assert.equal(hidden.invitations.length,0);
 assert.equal((await readKT125InvitationDirectory(args('staff'))).ok,false);
 const accepted=await acceptKT125Invitation(args('staff'));assert.equal(accepted.ok,true);
 assert.equal(accepted.role,'expert');
 assert.deepEqual(query({mode:'query',sql:'SELECT role,active,activation_pending,provider_subject FROM kt125_users WHERE user_id=?',args:[accepted.userId]})[0],
  {role:'expert',active:1,activation_pending:0,provider_subject:'staff-sub'});
 assert.equal(query({mode:'query',sql:'SELECT display_name FROM kt125_staff_profiles WHERE user_id=?',args:[accepted.userId]})[0].display_name,'test1234');
 assert.equal((await acceptKT125Invitation(args('staff'))).ok,false,'No replay');
 assert.equal((await invite()).ok,false,'No second invitation for registered mailbox');
 query({mode:'query',sql:'UPDATE kt125_users SET active=0 WHERE user_id=?',args:[accepted.userId]});
 assert.equal((await acceptKT125Invitation(args('staff'))).ok,false,'No reactivation');
 assert.equal((await invite()).ok,false,'Suspended mailbox cannot be reinvited');
 // Old EGMASTER identity cannot be rebound to a new invitation even if mailbox differs.
 const selfOtherEmail=await invite('alias@example.invalid');assert.equal(selfOtherEmail.ok,true);
 principals.alias={...principals.manager,email:'alias@example.invalid'};
 assert.equal((await acceptKT125Invitation(args('alias'))).ok,false);
 // Expired and revoked invitations are not usable; a fresh invite needs explicit revoke.
 principals.expired={verified:true,issuer,subject:'expired-sub',email:'expired@example.invalid'};
 const expired=await invite('expired@example.invalid');
 assert.equal((await acceptKT125Invitation({...args('expired'),nowMs:now+8*86400000})).ok,false);
 assert.equal((await revokeKT125Invitation({...args('otherManager'),invitationId:expired.invitationId})).ok,false);
 assert.equal((await revokeKT125Invitation({...args(),invitationId:expired.invitationId})).ok,true);
 assert.equal((await acceptKT125Invitation(args('expired'))).ok,false);
 assert.equal((await invite('expired@example.invalid')).ok,true);
 // The inviter must still be active/authorized at the actual write, not only the earlier read.
 principals.race={verified:true,issuer,subject:'race-sub',email:'race@example.invalid'};
 await invite('race@example.invalid');
 hook=()=>query({mode:'query',sql:"UPDATE kt125_users SET active=0 WHERE user_id='manager'"});
 const before=count('kt125_users');
 assert.equal((await acceptKT125Invitation(args('race'))).ok,false);
 assert.equal(count('kt125_users'),before);
 query({mode:'query',sql:"UPDATE kt125_users SET active=1 WHERE user_id='manager'"});
 // An audit collision MUST roll back user creation, profile binding and invitation consumption.
 const event=query({mode:'query',sql:'SELECT event_id FROM kt125_audit LIMIT 1'})[0].event_id;
 const invitationCollision=['fresh-invite',event,'fresh-invite-request'];
 assert.equal((await invite('rollback@example.invalid',{uuid:()=>invitationCollision.shift()})).ok,false);
 assert.equal(query({mode:'query',sql:"SELECT COUNT(*) n FROM kt125_staff_invitations WHERE invitation_id='fresh-invite'"})[0].n,0);
 const collision=['fresh-user',event,'fresh-request'];
 assert.equal((await acceptKT125Invitation({...args('race'),uuid:()=>collision.shift()})).ok,false);
 assert.equal(query({mode:'query',sql:"SELECT COUNT(*) n FROM kt125_users WHERE user_id='fresh-user'"})[0].n,0);
 assert.equal(query({mode:'query',sql:"SELECT status FROM kt125_staff_invitations WHERE email='race@example.invalid'"})[0].status,'pending');
 assert.equal((await acceptKT125Invitation(args('race'))).ok,true,'Valid retry after complete rollback');
 // Stale manager role at invite write must not leave an invitation without an audit record.
 hook=()=>query({mode:'query',sql:"UPDATE kt125_users SET role='reviewer' WHERE user_id='manager'"});
 assert.equal((await invite('stale@example.invalid')).ok,false);
 assert.equal(query({mode:'query',sql:"SELECT COUNT(*) n FROM kt125_staff_invitations WHERE email='stale@example.invalid'"})[0].n,0);
 query({mode:'query',sql:"UPDATE kt125_users SET role='egmaster' WHERE user_id='manager'"});
 // Same mailbox in another organization cannot acquire a second pending binding.
 assert.equal((await invite('expired@example.invalid',{...args('otherManager')})).ok,false);
 // Runtime setup and standalone migration are compatible and idempotent.
 query({mode:'script',sql:readFileSync(new URL('../schema/004_email_invitations.sql',import.meta.url),'utf8')});
 await db.batch(KT125_INVITATION_SCHEMA.map(sql=>db.prepare(sql)));
 // Real handler: strict field allowlist, CSRF/origin, unsigned headers ignored.
 const handler=createKT125PrivateHandler({getVerifier:()=>verifier,clock:()=>now,uuid});
 const env={KT125_DB:db,KT125_PRIVATE_ORIGIN:origin,KT125_ACCESS_TEAM_DOMAIN:issuer,KT125_ACCESS_AUD:'kt125-testing-audience'};
 const post=(body,extra={},path='/kt125/admin/users/invite')=>new Request(origin+path,{method:'POST',headers:{
  Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/x-www-form-urlencoded','Cf-Access-Jwt-Assertion':'manager',...extra},body});
 const good='name=colleague&email=route%40example.invalid&role=reviewer&confirm=INVITE';
 assert.equal((await handler.fetch(post(good),env)).status,303);
 for(const body of [good+'&email=other%40example.invalid',good+'&subject=forged-sub',good+'&confirm=INVITE',good.replace('reviewer','administrator')])
  assert.notEqual((await handler.fetch(post(body),env)).status,303);
 assert.equal((await handler.fetch(post(good,{Origin:'https://attacker.invalid'}),env)).status,403);
 assert.equal((await handler.fetch(post(good,{'Cf-Access-Jwt-Assertion':'forged','Cf-Access-Authenticated-User-Email':'manager@example.invalid'}),env)).status,403);
 assert.equal((await handler.fetch(post('x'.repeat(1801)),env)).status,413);
 principals.route={verified:true,issuer,subject:'route-sub',email:'route@example.invalid'};
 const activation=new Request(origin+'/kt125/enrollment/activate',{method:'POST',headers:{Origin:origin,
  'Content-Type':'application/x-www-form-urlencoded','Cf-Access-Jwt-Assertion':'route'},body:'confirm=ACTIVATE'});
 assert.equal((await handler.fetch(activation,env)).status,200);
 const page=await handler.fetch(new Request(origin+'/kt125/admin/panel/users',{headers:{'Cf-Access-Jwt-Assertion':'manager'}}),env);
 const html=await page.text();assert.equal(page.status,200);assert(html.includes('test1234'));assert(html.includes('staff@office.example.invalid'));
 assert(!html.includes('name="subject"'));assert(!html.includes('(sub)'));
 const escaped=renderKT125PrivatePage({section:'users',invitations:[{invitation_id:'valid',display_name:'<img src=x>',email:'<script>',role:'expert',status:'pending',expires_at_ms:now}]});
 assert(!escaped.includes('<img'));assert(!escaped.includes('<script>'));
 assert.equal((await handler.fetch(new Request(origin+'/kt125/admin/panel/users',{headers:{'Cf-Access-Jwt-Assertion':'route'}}),env)).status,403);
 // Two newly invited experts retain the existing case isolation and scoped grants.
 const owner=await acceptKT125Invitation(args('expired'));assert.equal(owner.ok,true);
 const recipient=query({mode:'query',sql:"SELECT user_id FROM kt125_users WHERE provider_subject='race-sub'"})[0].user_id;
 for(const [caseId,ownerId] of [['case-one',owner.userId],['case-two',recipient]])
  query({mode:'query',sql:"INSERT INTO kt125_cases(case_id,organization_id,owner_id,status,created_at_ms,updated_at_ms) VALUES(?,'riosv',?,'active',?,?)",args:[caseId,ownerId,now,now]});
 const access=(who,caseId)=>handler.fetch(new Request(origin+'/kt125/cases/'+caseId+'/access',{headers:{'Cf-Access-Jwt-Assertion':who}}),env);
 assert.equal((await access('expired','case-one')).status,200);
 assert.equal((await access('race','case-two')).status,200);
 for(const who of ['race','manager','admin','route','forged'])assert.equal((await access(who,'case-one')).status,403,who);
 assert.equal((await access('expired','case-two')).status,403);
 const grant=await handler.fetch(new Request(origin+'/kt125/cases/case-one/grants',{method:'POST',headers:{
  Origin:origin,'Content-Type':'application/json','Cf-Access-Jwt-Assertion':'expired'},body:JSON.stringify({
   granteeId:recipient,actions:['case.read'],notBeforeMs:now,expiresAtMs:now+10000})}),env);
 assert.equal(grant.status,201);const grantId=(await grant.json()).grantId;
 assert.equal((await access('race','case-one')).status,200);
 const revoked=await handler.fetch(new Request(origin+'/kt125/cases/case-one/grants/'+grantId,{method:'DELETE',headers:{
  Origin:origin,'Cf-Access-Jwt-Assertion':'expired'}}),env);
 assert.equal(revoked.status,200);
 assert.equal((await access('race','case-one')).status,403);
 assert(count('kt125_security_events')>0,'Real security journal writes must succeed');
 console.log('PASS KT125 email invitations: real SQLite transactions, lazy additive setup, signed-email binding, roles, expiry, revoke, replay, suspension, cross-org isolation, stale manager, audit rollback, strict HTTP and escaped name/email UI.');
}finally{rmSync(directory,{recursive:true,force:true})}
