import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {presentationDefaults,validateDraft,presentationHtml,presentationHttp} from '../src/local-auth/presentation.mjs';
import {renderKT125PrivatePage} from '../src/private-admin-page.mjs';
const input=()=>{const f=new URLSearchParams();for(const key of ['subject','intro','date','time','venue','contact','development','cta'])f.set(key,presentationDefaults[key]);presentationDefaults.panels.forEach(([t,b],i)=>{f.set('title'+i,t);f.set('body'+i,b)});f.set('revision','0');f.set('new_emails','NEW@example.bg, new@example.bg');f.set('action','save');return f};
const f=input();f.append('recipient','staff@example.bg');assert.deepEqual(validateDraft(f).recipients,['staff@example.bg','new@example.bg']);
for(const change of [f=>f.set('new_emails','bad-address'),f=>f.append('subject','duplicate'),f=>f.set('revision','-1'),f=>f.set('subject','Injected\r\nBcc: other@example.bg')]){const v=input();change(v);assert.throws(()=>validateDraft(v));}
const html=presentationHtml({...presentationDefaults,intro:'<script>bad</script>'},'https://native.example.bg');assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(html.includes('https://native.example.bg/auth/register'));assert.equal((html.match(/border-left:3px/g)||[]).length,5);assert(html.includes('Поетапно развитие'));assert(!html.includes('Емил Гергов'));
const page=renderKT125PrivatePage({section:'presentation',presentationContent:'EDITOR'});assert(page.includes('href="/kt125/admin/panel/presentation" aria-current="page"'));assert(page.includes('EDITOR'));
const config={origin:'https://native.example.bg',org:'org'},env={KT125_DB:{prepare(){throw Error('Database must not run before access/origin checks')}}};
assert.equal((await presentationHttp({request:new Request(config.origin+'/kt125/admin/panel/presentation'),env,who:{role:'expert'},config,now:1})).status,403);
assert.equal((await presentationHttp({request:new Request(config.origin+'/kt125/admin/presentation/save',{method:'POST',headers:{Origin:'https://other.invalid'}}),env,who:{role:'administrator'},config,now:1})).status,403);
console.log('PASS KT127 menu, institutional five-panel invitation, recipient validation/deduplication, escaped preview, role/origin guards');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'presentation-test'},compatibilityDate:'2026-07-30'});
try{
 const db=await mf.getD1Database('DB');
 for(const sql of ["CREATE TABLE kt125_users(user_id TEXT,organization_id TEXT,active INTEGER,role TEXT)","CREATE TABLE kt125_local_accounts(organization_id TEXT,email TEXT,display_name TEXT,state TEXT)","CREATE TABLE kt125_staff_profiles(organization_id TEXT,email TEXT,display_name TEXT)","INSERT INTO kt125_users VALUES('admin','org',1,'administrator'),('other','org',1,'egmaster')","INSERT INTO kt125_local_accounts VALUES('org','staff@example.bg','Служител','approved')"])await db.prepare(sql).run();
 const base={env:{KT125_DB:db},who:{userId:'admin',role:'administrator'},config,now:100};
 const request=f=>new Request(config.origin+'/kt125/admin/presentation/save',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/x-www-form-urlencoded'},body:f});
 assert.equal((await presentationHttp({...base,request:request(input())})).status,303);
 const saved=await db.prepare('SELECT * FROM kt127_presentation_drafts').first();assert.equal(saved.revision,1);assert.deepEqual(JSON.parse(saved.recipients_json),['new@example.bg']);
 assert.equal((await presentationHttp({...base,request:request(input())})).status,400,'Stale revision must not replace saved draft');
 const edit=input();edit.set('revision','1');edit.set('intro','Променена покана');edit.set('action','preview');
 const update=await presentationHttp({...base,request:request(edit)});assert.equal(update.status,303);assert.equal(update.headers.get('Location'),'/kt125/admin/presentation/preview');
 const preview=await presentationHttp({...base,request:new Request(config.origin+'/kt125/admin/presentation/preview')});assert((await preview.text()).includes('Променена покана'));assert(preview.headers.get('Cache-Control').includes('no-store'));
 const other=await presentationHttp({...base,who:{userId:'other',role:'egmaster'},request:new Request(config.origin+'/kt125/admin/presentation/preview')});assert(!(await other.text()).includes('Променена покана'),'Draft belongs to administrator and organization');
 await db.prepare("UPDATE kt125_users SET active=0 WHERE user_id='admin'").run();edit.set('revision','2');assert.equal((await presentationHttp({...base,request:request(edit)})).status,400,'Concurrent revocation prevents draft writes');
 assert.equal((await db.prepare('SELECT revision FROM kt127_presentation_drafts').first()).revision,2);
 console.log('PASS KT127 D1: durable draft/recipient save, preview, no sending, stale-tab protection, administrator isolation and fresh role check');
}finally{await mf.dispose()}
