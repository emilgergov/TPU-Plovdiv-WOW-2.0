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
  if(!access&&!issue&&!revoke&&!management&&!privatePanel)return json({error:"Неизвестен служебен маршрут."},404);

  const verifier=typeof getVerifier==="function"?getVerifier(env):
    createKT125CloudflareAccessVerifier({
     teamDomain:env.KT125_ACCESS_TEAM_DOMAIN,audience:env.KT125_ACCESS_AUD
    });
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
