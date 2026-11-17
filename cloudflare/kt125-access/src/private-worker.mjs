/* KT125 private request boundary. Intentionally NOT imported into the
 * stable R6 Worker or published under GitHub Pages. A private Access
 * application and D1 binding are required before a deployment can work.
 */
import {createKT125CloudflareAccessVerifier,kt125CloudflareAccessConfigReady}
 from "./cloudflare-access-verifier.mjs";
import {authorizeKT125CaseRequest,kt125PublicDenialResponse} from "./server-guard.mjs";
const json=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
const deny=()=>kt125PublicDenialResponse();
const ident=v=>typeof v==="string"&&/^[a-zA-Z0-9_-]{1,160}$/.test(v);
export function createKT125PrivateHandler({getVerifier}={}){
 return {async fetch(request,env){
  if(!env?.KT125_DB||!kt125CloudflareAccessConfigReady(env))
   return json({error:"Служебният достъп не е конфигуриран."},503);
  const url=new URL(request.url);
  if(request.method!=="GET")return json({error:"Методът не е разрешен."},405);
  const match=url.pathname.match(/^\/kt125\/cases\/([A-Za-z0-9_-]{1,160})\/access$/);
  if(!match)return json({error:"Неизвестен служебен маршрут."},404);
  if(url.search)return deny(); // Never mix case identity with query overrides.
  const verifier=typeof getVerifier==="function"?getVerifier(env):
    createKT125CloudflareAccessVerifier({
     teamDomain:env.KT125_ACCESS_TEAM_DOMAIN,audience:env.KT125_ACCESS_AUD
    });
  const permission=await authorizeKT125CaseRequest({
   request,identityVerifier:verifier,db:env.KT125_DB,action:"case.read",
   caseId:match[1],nowMs:Date.now()
  });
  if(!permission.allowed)return deny();
  // Permission check only: no personal, case or administrative data is returned.
  return json({allowed:true,caseId:match[1],action:"case.read"});
 }};
}
export default createKT125PrivateHandler();
