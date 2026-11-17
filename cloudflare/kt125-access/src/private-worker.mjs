/* KT125 private request boundary. Intentionally NOT imported into the
 * stable R6 Worker or published under GitHub Pages. A private Access
 * application and D1 binding are required before a deployment can work.
 */
import {createKT125CloudflareAccessVerifier,kt125CloudflareAccessConfigReady}
 from "./cloudflare-access-verifier.mjs";
import {authorizeKT125CaseRequest,kt125PublicDenialResponse} from "./server-guard.mjs";
import {issueKT125Grant,revokeKT125Grant} from "./grant-commands.mjs";
import {recordKT125SecurityEvent} from "./security-audit.mjs";
import {readKT125Management,readKT125CaseGrants,kt125ManagementPrincipal} from "./management-read.mjs";
import {renderKT125PrivatePage,kt125PrivateHtmlResponse} from "./private-admin-page.mjs";
import {disableKT125User} from "./user-lifecycle.mjs";
import {enrollKT125Staff} from "./staff-enrollment.mjs";
import {activateKT125Staff} from "./staff-activation.mjs";
import {renderKT125GrantManagement} from "./grant-admin-page.mjs";

const json=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
const deny=()=>kt125PublicDenialResponse();
const pathId="[A-Za-z0-9_-]{1,160}";
const accessRoute=new RegExp("^/kt125/cases/("+pathId+")/access$");
const grantsRoute=new RegExp("^/kt125/cases/("+pathId+")/grants$");
const revokeRoute=new RegExp("^/kt125/cases/("+pathId+")/grants/("+pathId+")$");
const managementRoute=/^\/kt125\/admin\/(users|cases|audit)$/;
const privatePanelRoute=/^\/kt125\/admin\/panel\/(overview|users|roles|cases|audit)$/;
const enrollUserRoute=/^\/kt125\/admin\/users\/enroll$/;
const activateUserRoute="/kt125/enrollment/activate";
const disableUserRoute=new RegExp("^/kt125/admin/users/("+pathId+")/disable$");
const manageGrantsRoute=new RegExp("^/kt125/cases/("+pathId+")/manage$");
const issueFormRoute=new RegExp("^/kt125/cases/("+pathId+")/grants/form$");
const revokeFormRoute=new RegExp("^/kt125/cases/("+pathId+")/grants/("+pathId+")/revoke$");

function validPrivateMutationOrigin(request,env){
 try{
  const expected=new URL(env.KT125_PRIVATE_ORIGIN);
  const actual=new URL(request.url);
  if(expected.protocol!=="https:"||expected.origin!==env.KT125_PRIVATE_ORIGIN||
     expected.origin!==actual.origin)return false;
  if(request.headers.get("Origin")!==expected.origin)return false;
  const site=request.headers.get("Sec-Fetch-Site");
  if(site&&site!=="same-origin")return false;
  return true;
 }catch{return false}
}
export function createKT125PrivateHandler({getVerifier,clock=()=>Date.now(),uuid=()=>crypto.randomUUID(),auditEvent=recordKT125SecurityEvent}={}){
 return {async fetch(request,env){
  if(!env?.KT125_DB||!kt125CloudflareAccessConfigReady(env))
   return json({error:"Служебният достъп не е конфигуриран."},503);
  const url=new URL(request.url);
  if(url.search)return deny();
  const access=url.pathname.match(accessRoute);
  const issue=url.pathname.match(grantsRoute);
  const revoke=url.pathname.match(revokeRoute);
  const management=url.pathname.match(managementRoute);
  const privatePanel=url.pathname.match(privatePanelRoute);
  const disableUser=url.pathname.match(disableUserRoute);
  const enrollUser=enrollUserRoute.test(url.pathname);
  const activateUser=url.pathname===activateUserRoute;
  const manageGrants=url.pathname.match(manageGrantsRoute);
  const issueForm=url.pathname.match(issueFormRoute);
  const revokeForm=url.pathname.match(revokeFormRoute);
  if(!access&&!issue&&!revoke&&!management&&!privatePanel&&!disableUser&&!enrollUser&&!activateUser&&!manageGrants&&!issueForm&&!revokeForm)return json({error:"Неизвестен служебен маршрут."},404);

  const verifier=typeof getVerifier==="function"?getVerifier(env):
    createKT125CloudflareAccessVerifier({
     teamDomain:env.KT125_ACCESS_TEAM_DOMAIN,audience:env.KT125_ACCESS_AUD
    });
  if(manageGrants&&request.method==="GET"){
   const result=await readKT125CaseGrants({request,verifier,db:env.KT125_DB,caseId:manageGrants[1]});
   if(!result.ok)return deny();
   const actor=await kt125ManagementPrincipal({request,verifier,db:env.KT125_DB});
   if(!actor)return deny();
   const allowed=actor.role==="expert"&&actor.userId===result.data.ownerId;
   const html=renderKT125GrantManagement({...result.data,canChange:allowed});
   return kt125PrivateHtmlResponse(html);
  }
  if((issueForm||revokeForm)&&request.method==="POST"){
   if(!validPrivateMutationOrigin(request,env))return deny();
   if(!/^application\/x-www-form-urlencoded(?:\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
    return json({error:"Невалиден формат на заявката."},415);
   if(Number(request.headers.get("content-length")||0)>1500)return json({error:"Заявката е твърде голяма."},413);
   let data;
   try{
    const raw=await request.text();
    if(raw.length>1500)return json({error:"Заявката е твърде голяма."},413);
    data=new URLSearchParams(raw);
   }catch{return json({error:"Невалидна заявка."},400)}
   const fields=[...data.keys()];
   const isIssue=Boolean(issueForm);
   const expected=isIssue?"GRANT":"REVOKE";
   const onlyKnown=fields.every(k=>isIssue?["grantee","action","confirm"].includes(k):k==="confirm");
   if(!onlyKnown||data.getAll("confirm").length!==1||data.get("confirm")!==expected)
    return json({error:"Липсва изрично потвърждение."},400);
   const caseId=isIssue?issueForm[1]:revokeForm[1];
   if(isIssue){
    const actions=data.getAll("action");
    const allowedActions=new Set(["case.read","case.review","case.edit","case.confirm","document.generate"]);
    if(data.getAll("grantee").length!==1||!data.get("grantee")||
      !/^[A-Za-z0-9_-]{1,160}$/.test(data.get("grantee"))||
      actions.length<1||actions.length>5||new Set(actions).size!==actions.length||
      !actions.every(a=>allowedActions.has(a)))
     return json({error:"Невалидно упълномощаване."},400);
    const nowMs=clock();
    const result=await issueKT125Grant({request,verifier,db:env.KT125_DB,
     caseId,granteeId:data.get("grantee"),actions,
     notBeforeMs:nowMs,expiresAtMs:nowMs+7*24*60*60*1000,
     nowMs,uuid});
    if(!result.ok)return deny();
   }else{
    const result=await revokeKT125Grant({request,verifier,db:env.KT125_DB,
     caseId,grantId:revokeForm[2],nowMs:clock(),uuid});
    if(!result.ok)return deny();
   }
   return new Response(null,{status:303,headers:{
    Location:"/kt125/cases/"+caseId+"/manage","Cache-Control":"no-store"
   }});
  }
  if(activateUser&&request.method==="GET"){
   return kt125PrivateHtmlResponse(`<!doctype html><html lang="bg"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>WOW — потвърждаване на служебна регистрация</title></head>
    <body style="font:16px Verdana,Arial,sans-serif;background:#0b271d;color:#fff;padding:2rem;max-width:720px;margin:auto">
    <h1>Потвърждаване на служебната регистрация</h1>
    <p>Продължете само ако вече сте поканени от упълномощен администратор. Удостоверяването се извършва от Cloudflare Access.</p>
    <form method="post" action="/kt125/enrollment/activate">
    <label><input type="checkbox" name="confirm" required value="ACTIVATE"> Потвърждавам, че използвам своя служебен профил</label>
    <p><button type="submit">Активирай моя профил</button></p></form></body></html>`);
  }
  if(activateUser&&request.method==="POST"){
   if(!validPrivateMutationOrigin(request,env))return deny();
   if(!/^application\\/x-www-form-urlencoded(?:\\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
    return json({error:"Невалиден формат на заявката."},415);
   if(Number(request.headers.get("content-length")||0)>100)return json({error:"Заявката е твърде голяма."},413);
   let data;
   try{
    const raw=await request.text();
    if(raw.length>100)return json({error:"Заявката е твърде голяма."},413);
    data=new URLSearchParams(raw);
   }catch{return json({error:"Невалидна заявка."},400)}
   if([...data.keys()].length!==1||data.getAll("confirm").length!==1||
      data.get("confirm")!=="ACTIVATE")return json({error:"Изисква се изрично потвърждение."},400);
   const result=await activateKT125Staff({request,verifier,db:env.KT125_DB,nowMs:clock(),uuid});
   if(!result.ok)return deny();
   return kt125PrivateHtmlResponse(`<!doctype html><html lang="bg"><head><meta charset="utf-8">
    <title>WOW — профилът е активиран</title></head><body>
    <h1>Служебният профил е активиран.</h1><p>Можете да продължите към разрешените Ви преписки.</p></body></html>`);
  }
  if(enrollUser&&request.method==="POST"){
   if(!validPrivateMutationOrigin(request,env))return deny();
   if(!/^application\\/x-www-form-urlencoded(?:\\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
    return json({error:"Невалиден формат на заявката."},415);
   if(Number(request.headers.get("content-length")||0)>600)return json({error:"Заявката е твърде голяма."},413);
   let data;
   try{
    const raw=await request.text();
    if(raw.length>600)return json({error:"Заявката е твърде голяма."},413);
    data=new URLSearchParams(raw);
   }catch{return json({error:"Невалидна заявка."},400)}
   if([...data.keys()].length!==3||["subject","role","confirm"].some(k=>data.getAll(k).length!==1)||
      data.get("confirm")!=="ENROLL")
    return json({error:"Необходимо е изрично потвърждение."},400);
   const result=await enrollKT125Staff({
    request,verifier,db:env.KT125_DB,providerSubject:data.get("subject"),
    role:data.get("role"),nowMs:clock(),uuid
   });
   if(!result.ok)return deny();
   return new Response(null,{status:303,headers:{
    Location:"/kt125/admin/panel/users","Cache-Control":"no-store"
   }});
  }
  if(disableUser&&request.method==="POST"){
   if(!validPrivateMutationOrigin(request,env))return deny();
   if(!/^application\/x-www-form-urlencoded(?:\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
    return json({error:"Невалиден формат на заявката."},415);
   if(Number(request.headers.get("content-length")||0)>200)return json({error:"Заявката е твърде голяма."},413);
   let confirmation;
   try{
    const raw=await request.text();
    if(raw.length>200)return json({error:"Заявката е твърде голяма."},413);
    const params=new URLSearchParams(raw);
    if([...params.keys()].length!==1||params.get("confirm")!=="DEACTIVATE")
     return json({error:"Необходимо е изрично потвърждение."},400);
    confirmation=true;
   }catch{return json({error:"Невалидна заявка."},400)}
   if(!confirmation)return deny();
   const result=await disableKT125User({
    request,verifier,db:env.KT125_DB,targetUserId:disableUser[1],
    nowMs:clock(),uuid
   });
   if(!result.ok)return deny();
   return new Response(null,{status:303,headers:{
    Location:"/kt125/admin/panel/users","Cache-Control":"no-store"
   }});
  }
  if(privatePanel&&request.method==="GET"){
   if(privatePanel[1]==="overview"||privatePanel[1]==="roles"){
    const actor=await kt125ManagementPrincipal({request,verifier,db:env.KT125_DB});
    if(!actor||!["egmaster","administrator"].includes(actor.role))return deny();
    return kt125PrivateHtmlResponse(renderKT125PrivatePage({section:privatePanel[1]}));
   }
   const result=await readKT125Management({
    request,verifier,db:env.KT125_DB,section:privatePanel[1]
   });
   if(!result.ok)return deny();
   return kt125PrivateHtmlResponse(renderKT125PrivatePage(result.data));
  }
  if(management&&request.method==="GET"){
   const result=await readKT125Management({
    request,verifier,db:env.KT125_DB,section:management[1]
   });
   if(!result.ok)return deny();
   return json(result.data);
  }
  if(issue&&request.method==="GET"){
   const result=await readKT125CaseGrants({
    request,verifier,db:env.KT125_DB,caseId:issue[1]
   });
   if(!result.ok)return deny();
   return json(result.data);
  }
  if(access&&request.method==="GET"){
   const permission=await authorizeKT125CaseRequest({
    request,identityVerifier:verifier,db:env.KT125_DB,action:"case.read",
    caseId:access[1],nowMs:clock()
   });
   const logged=await auditEvent({db:env.KT125_DB,action:"case.read",
    outcome:permission.allowed?"allowed":"denied",
    reason:permission.allowed?"GRANTED":"ACCESS_DENIED",
    caseId:access[1],nowMs:clock(),uuid});
   if(!permission.allowed)return deny();
   if(!logged)return json({error:"Защитният журнал не е достъпен."},503);
   return json({allowed:true,caseId:access[1],action:"case.read"});
  }
  if((issue&&request.method==="POST")||(revoke&&request.method==="DELETE")){
   if(!validPrivateMutationOrigin(request,env)){
    await auditEvent({db:env.KT125_DB,action:issue?"case.delegate":"grant.revoke",
     outcome:"denied",reason:"INVALID_ORIGIN",caseId:(issue||revoke)[1],nowMs:clock(),uuid});
    return deny();
   }
   if(typeof env.KT125_DB.batch!=="function")
    return json({error:"Регистърът не е готов за транзакции."},503);
   if(issue){
    if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
     return json({error:"Невалиден формат на заявката."},415);
    if(Number(request.headers.get("content-length")||0)>4096)
     return json({error:"Заявката е твърде голяма."},413);
    let body;
    try{
     const raw=await request.text();
     if(raw.length>4096)return json({error:"Заявката е твърде голяма."},413);
     body=JSON.parse(raw);
    }catch{return json({error:"Невалидна заявка."},400)}
    if(!body||Array.isArray(body)||typeof body!=="object")return json({error:"Невалидна заявка."},400);
    const result=await issueKT125Grant({request,verifier,db:env.KT125_DB,
     caseId:issue[1],granteeId:body.granteeId,actions:body.actions,
     notBeforeMs:body.notBeforeMs,expiresAtMs:body.expiresAtMs,
     nowMs:clock(),uuid});
    if(!result.ok){
     await auditEvent({db:env.KT125_DB,action:"case.delegate",outcome:"denied",
      reason:"UNAUTHORIZED_MUTATION",caseId:issue[1],nowMs:clock(),uuid});
     return deny();
    }
    return json({grantId:result.grantId},201);
   }
   const result=await revokeKT125Grant({request,verifier,db:env.KT125_DB,
     caseId:revoke[1],grantId:revoke[2],nowMs:clock(),uuid});
   if(!result.ok){
    await auditEvent({db:env.KT125_DB,action:"grant.revoke",outcome:"denied",
     reason:"UNAUTHORIZED_MUTATION",caseId:revoke[1],nowMs:clock(),uuid});
    return deny();
   }
   return json({revoked:true,grantId:result.grantId});
  }
  return json({error:"Методът не е разрешен."},405);
 }};
}
export default createKT125PrivateHandler();
