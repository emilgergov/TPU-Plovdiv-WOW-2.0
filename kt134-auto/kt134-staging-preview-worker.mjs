/**
 * KT134 isolated Cloudflare Worker UI smoke test, NOT the protected KT125 host.
 * No real dossiers or access to D1/R2 object contents via HTTP.
 * Visible Bulgarian disclaimer and synthetic UI only.
 */
import preview from './KT134_AUTO_VISUAL_DEMO.html';
const safeEqual=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length<32)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
};
const respond=(body,status=200,headers={})=>new Response(body,{status,headers:{
 'cache-control':'no-store, private','x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer','x-frame-options':'DENY',
 'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
 ...headers}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/kt134/internal-storage-smoke'){
   // The dedicated 256-bit token exists only inside this staging Worker and
   // the GitHub Actions job that provisioned it. This endpoint is never used
   // for author/reviewer calls or real administrative records.
   const expected=env.KT134_SMOKE_TOKEN;
   const provided=request.headers.get('X-KT134-Smoke-Token');
   if(!safeEqual(expected,provided))
    return respond('Нямате достъп',403,{'content-type':'text/plain; charset=utf-8'});
   if(request.method!=='GET')return respond('Методът не е разрешен',405,{'allow':'GET'});
   try{
    if(!env.DB?.prepare||!env.BUCKET?.head)throw Error('Missing isolated storage');
    const row=await env.DB.prepare('SELECT 1 AS isolated_d1_ok').first();
    // HEAD is non-mutating; the intentionally impossible probe key must not
    // exist. Do not enumerate or read any private R2 objects.
    const probe=await env.BUCKET.head('kt134-ci-probe/never-created-object');
    if(Number(row?.isolated_d1_ok)!==1||probe!==null)throw Error('Storage verification failed');
    return respond(JSON.stringify({mode:'isolated_storage_readonly',
      d1Query:'verified',r2Head:'verified_not_found',
      productionTouched:false,dossierRead:false,realEG:false}),
      200,{'content-type':'application/json; charset=utf-8'});
   }catch{
    return respond(JSON.stringify({error:'Изолираната проверка на D1/R2 не успя'}),
      503,{'content-type':'application/json; charset=utf-8'});
   }
  }
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
