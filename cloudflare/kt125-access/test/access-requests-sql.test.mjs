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
import {submitKT125AccessRequest,readKT125AccessRequests,decideKT125AccessRequest,renderKT125AccessRequest} from '../src/access-requests.mjs';
import {sendKT125InvitationMail} from '../src/invitation-mail.mjs';
try{
 for(const f of ['001_private_access.sql','002_security_events.sql','003_staff_activation.sql'])query({mode:'script',sql:readFileSync(new URL('../schema/'+f,import.meta.url),'utf8')});
 seedUser('manager','manager-sub');seedUser('admin','admin-sub','administrator');seedUser('other-manager','other-manager-sub','egmaster','other-org');
 const submit=(more={})=>submitKT125AccessRequest({...args('staff'),organizationId:'riosv',name:'Пробен експерт',email:principals.staff.email,note:'Организация: тест\nЖелая експертен достъп.',...more});
 assert.equal((await readKT125AccessRequests(args())).ok,true);
 assert.equal(query({mode:'query',sql:"SELECT name FROM sqlite_master WHERE name='kt125_access_requests'"}).length,0,'GET never writes schema');
 for(const more of [{email:'other@example.invalid'},{request:request('forged')},{organizationId:'unknown'},{name:''},{note:'x'.repeat(1001)},{note:'bad\u0000'}])assert.equal((await submit(more)).ok,false);
 const pending=await submit();assert.equal(pending.ok,true);
 assert.equal(count('kt125_users'),3,'A request grants no role');
 assert.equal(count('kt125_staff_invitations'),0);
 assert.equal((await submit()).ok,false,'Duplicate requests blocked');
 assert.equal((await readKT125AccessRequests(args('staff'))).ok,false);
 assert.equal((await readKT125AccessRequests(args('otherManager'))).items.length,0);
 const decide=(more={})=>decideKT125AccessRequest({...args(),requestId:pending.requestId,decision:'approve',role:'expert',...more});
 for(const more of [{role:'egmaster'},{role:'administrator'},{request:request('staff')},{request:request('otherManager')},{request:request('forged')}])assert.equal((await decide(more)).ok,false);
 hook=()=>query({mode:'query',sql:"UPDATE kt125_users SET active=0 WHERE user_id='manager'"});
 assert.equal((await decide()).ok,false,'Stale manager cannot approve');
 assert.equal(count('kt125_staff_invitations'),0);
 query({mode:'query',sql:"UPDATE kt125_users SET active=1 WHERE user_id='manager'"});
 const approved=await decide();assert.equal(approved.ok,true);
 assert.equal((await decide()).ok,false,'Approval cannot replay');
 assert.equal(count('kt125_users'),3,'Approval only creates invitation');
 assert.equal(query({mode:'query',sql:'SELECT status FROM kt125_access_requests'})[0].status,'approved');
 assert.equal(query({mode:'query',sql:'SELECT state FROM kt125_invitation_mail'})[0].state,'queued');
 // Email is server-controlled, exact recipient and frozen content; absence/failure never says sent.
 const mailEnv={KT125_PRIVATE_ORIGIN:origin,KT125_MAIL_TRANSPORT:'resend',KT125_MAIL_FROM:'noreply@example.invalid',KT125_MAIL_API_KEY:'test-key'};
 let calls=0,lastPayload,lastKey;
 const mail=(more={})=>sendKT125InvitationMail({...args(),invitationId:approved.invitationId,env:mailEnv,fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'manual');lastPayload=JSON.parse(options.body);lastKey=options.headers['Idempotency-Key'];return new Response(JSON.stringify({id:'provider-id'}),{status:200})},...more});
 assert.equal((await mail({env:{}})).code,'MAIL_NOT_CONFIGURED');assert.equal(calls,0);
 assert.equal((await mail({...args('otherManager')})).ok,false);assert.equal(calls,0);
 assert.equal((await mail({...args('staff')})).ok,false);assert.equal(calls,0);
 assert.equal((await mail()).ok,true);assert.equal(calls,1);
 assert.deepEqual(lastPayload.to,[principals.staff.email]);assert(lastPayload.text.includes(origin+'/kt125/enrollment/activate'));
 assert(!lastPayload.text.includes('Организация: тест'),'Private note must not enter outgoing message');
 assert.equal(lastKey,'kt125-invitation/'+approved.invitationId);
 assert.equal((await mail()).ok,false);assert.equal(calls,1,'Accepted email cannot send twice');
 assert.equal((await acceptKT125Invitation(args('staff'))).ok,true,'Existing activation remains authoritative');
 // Reject creates neither invitation nor mail; identity/role/notes never enter audit details.
 principals.second={verified:true,issuer,subject:'second-sub',email:'second@example.invalid'};
 const second=await submit({...args('second'),email:principals.second.email});assert.equal(second.ok,true);
 const before=count('kt125_staff_invitations');
 assert.equal((await decide({requestId:second.requestId,decision:'reject'})).ok,true);
 assert.equal(count('kt125_staff_invitations'),before);
 assert.equal((await decide({requestId:second.requestId})).ok,false,'Reject is final');
 const details=query({mode:'query',sql:'SELECT details_json FROM kt125_audit'}).map(r=>r.details_json).join('');assert(!details.includes('Организация: тест'));assert(!details.includes('staff@'));
 // An audit collision rolls back decision, invitation, and mail atomically.
 principals.third={verified:true,issuer,subject:'third-sub',email:'third@example.invalid'};
 const third=await submit({...args('third'),email:principals.third.email});
 const event=query({mode:'query',sql:'SELECT event_id FROM kt125_audit LIMIT 1'})[0].event_id;
 const collision=['unique-invitation',event,'unique-audit-request'];
 assert.equal((await decide({requestId:third.requestId,uuid:()=>collision.shift()})).ok,false);
 assert.equal(count('kt125_staff_invitations'),before);
 assert.equal(query({mode:'query',sql:'SELECT status FROM kt125_access_requests WHERE request_id=?',args:[third.requestId]})[0].status,'pending');
 const retry=await decide({requestId:third.requestId});assert.equal(retry.ok,true);
 assert.equal((await mail({invitationId:retry.invitationId,fetcher:async()=>new Response('',{status:403})})).ok,false);
 assert.equal(query({mode:'query',sql:'SELECT state FROM kt125_invitation_mail WHERE invitation_id=?',args:[retry.invitationId]})[0].state,'failed');
 assert.equal((await mail({invitationId:retry.invitationId,nowMs:now+24*3600000})).ok,false,'No resend past idempotency window');
 assert.equal((await mail({invitationId:retry.invitationId,nowMs:now+360000})).ok,true,'Explicit retry within window succeeds');
 // Real HTTP boundary, duplicate fields, null/foreign Origin and mismatched mailbox.
 const handler=createKT125PrivateHandler({getVerifier:()=>verifier,clock:()=>now,uuid});
 const env={KT125_DB:db,KT125_PRIVATE_ORIGIN:origin,KT125_ACCESS_TEAM_DOMAIN:issuer,KT125_ACCESS_AUD:'test-audience',KT125_REQUEST_ORGANIZATION:'riosv'};
 principals.http={verified:true,issuer,subject:'http-sub',email:'http@example.invalid'};
 const post=(body,more={})=>new Request(origin+'/kt125/enrollment/request',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','Cf-Access-Jwt-Assertion':'http',...more},body});
 const body='name=HTTP&email=http%40example.invalid&note=hello&confirm=REQUEST';
 for(const extra of [{Origin:'null'},{Origin:'https://evil.invalid'}])assert.equal((await handler.fetch(post(body,extra),env)).status,403);
 assert.equal((await handler.fetch(post(body+'&email=evil%40example.invalid'),env)).status,400);
 assert.equal((await handler.fetch(post(body.replace('http%40','other%40')),env)).status,409);
 const receipt=()=>new Request(origin+'/kt125/enrollment/request/received',{headers:{'Cf-Access-Jwt-Assertion':'http'}});
 assert.equal((await handler.fetch(receipt(),env)).status,404,'Receipt cannot assert an unrecorded request');
 assert.equal((await handler.fetch(post(body),env)).status,303);
 assert.equal((await handler.fetch(receipt(),env)).status,200);
 assert.equal((await handler.fetch(post(body),env)).status,409);
 const get=new Request(origin+'/kt125/enrollment/request',{headers:{'Cf-Access-Jwt-Assertion':'http'}});
 const form=await handler.fetch(get,env);assert.equal(form.status,200);assert.equal(form.headers.get('referrer-policy'),'same-origin');
 const html=await form.text();assert(html.includes('name="note"'));assert(html.includes('readonly'));assert(html.includes('wide-field'));
 assert.equal((await handler.fetch(get,{...env,KT125_REQUEST_ORGANIZATION:undefined})).status,503);
 assert.equal((await handler.fetch(new Request(origin+'/kt125/admin/panel/users',{headers:{'Cf-Access-Jwt-Assertion':'http'}}),env)).status,403);
 const escaped=renderKT125PrivatePage({section:'users',accessRequests:[{request_id:'valid',display_name:'<img>',email:'<script>',note:'<svg onload=bad>',status:'pending'}]});
 assert(!escaped.includes('<svg'));assert(!escaped.includes('<img>'));assert(escaped.includes('Забележка'));
 const confirmation=await renderKT125AccessRequest({message:'<script>'}).text();assert(confirmation.includes('&lt;script&gt;'));
 console.log('PASS REQUEST95: real SQLite request/review/invitation/outbox atomicity, replay and role isolation, mail failures/retries and strict HTTP.');
}finally{rmSync(directory,{recursive:true,force:true})}
