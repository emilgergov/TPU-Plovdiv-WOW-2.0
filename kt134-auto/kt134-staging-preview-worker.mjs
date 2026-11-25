/**
 * KT134 isolated Cloudflare Worker UI smoke test, NOT the protected KT125 host.
 * No real dossiers or access to D1/R2 object contents via HTTP.
 * Visible Bulgarian disclaimer and synthetic UI only.
 */
import preview from './KT134_AUTO_VISUAL_DEMO.html';
const respond=(body,status=200,headers={})=>new Response(body,{status,headers:{
 'cache-control':'no-store, private','x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer','x-frame-options':'DENY',
 'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
 ...headers}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET'&&request.method!=='HEAD')return respond('Методът не е разрешен',405,{'allow':'GET, HEAD','content-type':'text/plain; charset=utf-8'});
  if(url.pathname==='/kt134/health'){
   const ok=!!env.DB?.prepare&&!!env.BUCKET?.get&&!!env.BUCKET?.put;
   return respond(JSON.stringify({
    module:'КТ134 — изолирана среда',mode:'synthetic_preview_only',
    bindings:{DB:!!env.DB?.prepare,BUCKET:!!env.BUCKET?.get},
    liveEG:false,liveGIS:false,liveDOCX:false,expertConfirmed:false,
    ready:ok
   }),ok?200:503,{'content-type':'application/json; charset=utf-8'});
  }
  if(url.pathname==='/'||url.pathname==='/kt134/preview'){
   return respond(preview,200,{'content-type':'text/html; charset=utf-8'});
  }
  return respond('Непознат адрес в тестовия модул',404,{'content-type':'text/plain; charset=utf-8'});
 }
};
