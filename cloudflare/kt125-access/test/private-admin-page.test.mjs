import assert from "node:assert/strict";
import {renderKT125PrivatePage,kt125PrivateHtmlResponse} from "../src/private-admin-page.mjs";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";

const risk=renderKT125PrivatePage({section:"users",items:[{
 user_id:'<script>alert("test")</script>',role:'"><img src=x onerror=alert(1)>',
 active:1,updated_at_ms:1794891600000
}]});
assert(!risk.includes('<script>'));
assert(!risk.includes('<img'));
assert(risk.includes('&lt;script&gt;'));
assert(risk.includes("Управление на достъпа"));
assert(risk.includes("Потребители"));
const validUser=renderKT125PrivatePage({section:"users",items:[
 {user_id:"expert-a",role:"expert",active:1,updated_at_ms:1794891600000}
]});
assert(validUser.includes('name="confirm" value="DEACTIVATE"'));
assert(validUser.includes('action="/kt125/admin/users/expert-a/disable"'));
assert(!risk.includes('action="/kt125/admin/users/%3Cscript'),"Invalid IDs cannot become action URLs");
assert(!risk.includes('/disable"'),"Invalid user IDs must not create deactivation forms");
assert(risk.includes('action="/kt125/admin/users/invite"'),"The name/email invitation form must be available");
assert(!risk.includes('name="subject"'),"The operator must not enter a provider subject");
const response=kt125PrivateHtmlResponse(risk);
assert.equal(response.headers.get("X-Frame-Options"),"DENY");
assert.equal(response.headers.get("cache-control"),"no-store, private");
assert.equal(response.headers.get("referrer-policy"),"same-origin",
 "Native HTML POST forms must retain their real Origin, without cross-origin referrer disclosure");
assert(response.headers.get("content-security-policy").includes("default-src 'none'"));
assert(response.headers.get("content-security-policy").includes("form-action 'self'"));
assert(!risk.includes("localStorage")&&!risk.includes("fetch("));
assert.throws(()=>renderKT125PrivatePage({section:"not-a-panel"}));

const team="https://testing.cloudflareaccess.com";
const env={KT125_ACCESS_TEAM_DOMAIN:team,
 KT125_ACCESS_AUD:"kt125-service-app-audience",KT125_DB:null};
const verifier={async verify(request){return request.headers.get("Cf-Access-Jwt-Assertion")==="verified"?
 {verified:true,issuer:team,subject:"sub-a"}:{verified:false}}};
function db(role="egmaster"){
 return {prepare(sql){return {bind(...args){return {
  async first(){
   if(sql.includes("FROM kt125_users WHERE identity_provider"))return {
    user_id:"mgr",organization_id:"riosv-plovdiv",role,active:1
   };
   return null;
  },
  async all(){
   if(sql.includes("FROM kt125_cases"))return {results:[{case_id:"case-123",
    owner_id:"expert-123",status:"active",created_at_ms:1,updated_at_ms:2,raw_dossier_text:"SECRET"}]};
   if(sql.includes("FROM kt125_users"))return {results:[{user_id:"expert-123",
    role:"expert",active:1,updated_at_ms:2,government_id:"SECRET"}]};
   if(sql.includes("FROM kt125_audit"))return {results:[{event_id:"event-1",
    action:"case.read",actor_id:"expert-123",outcome:"allowed",timestamp_ms:3,details_json:"SECRET"}]};
   return {results:[]};
  }
 }}}}};
}
const handler=createKT125PrivateHandler({getVerifier:()=>verifier,auditEvent:async()=>true});
const req=(path,token="verified")=>new Request("https://private.example.invalid"+path,{
 headers:{"Cf-Access-Jwt-Assertion":token}});
for(const section of ["overview","users","roles","cases","audit"]){
 let r=await handler.fetch(req("/kt125/admin/panel/"+section),{...env,KT125_DB:db()});
 assert.equal(r.status,200,section);
 assert.equal(r.headers.get("referrer-policy"),"same-origin",section);
 const html=await r.text();
 assert(html.includes("Управление на достъпа"));
 assert(!html.includes("SECRET"));
}
for(const section of ["overview","users","cases","audit"]){
 const r=await handler.fetch(req("/kt125/admin/panel/"+section),{...env,KT125_DB:db("expert")});
 assert.equal(r.status,403,section);
}
assert.equal((await handler.fetch(req("/kt125/admin/panel/audit"),{...env,KT125_DB:db("administrator")})).status,403);
assert.equal((await handler.fetch(req("/kt125/admin/panel/roles"),{...env,KT125_DB:db("administrator")})).status,200);
assert.equal((await handler.fetch(req("/kt125/admin/panel/users"),{...env,KT125_DB:db("administrator")})).status,200);
assert.equal((await handler.fetch(req("/kt125/admin/panel/users","spoof"),{...env,KT125_DB:db()})).status,403);
assert.equal((await handler.fetch(req("/kt125/admin/panel/users"),env)).status,503);
assert.equal((await handler.fetch(req("/kt125/admin/panel/invalid"),{...env,KT125_DB:db()})).status,404);
const api=await handler.fetch(req("/kt125/admin/users"),{...env,KT125_DB:db()});
assert.equal(api.status,200);
assert.equal((await api.json()).section,"users");
console.log("PASS KT125-VT02: protected HTML, escaped table fields, no scripts/cache, role-specific panels, authorization before content, no real records on public Pages.");

