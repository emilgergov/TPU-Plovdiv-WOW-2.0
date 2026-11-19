// Preview binds the already-deployed password service; it declares no new DO.
import candidate from '../src/local-auth/worker.mjs';
const origin='https://kt131-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
export default {async fetch(request,env,ctx){
 if(new URL(request.url).origin!==origin)return new Response('Недостъпен тестов адрес.',{status:404});
 if(new URL(request.url).pathname==='/kt131/readiness'){
  const headers=new Headers({'Content-Type':'application/json',Origin:origin,'X-KT126-Case':'11111111-1111-4111-8111-111111111111','X-KT126-Session':'invalid'});
  headers.set('Cloudflare-Workers-Version-Overrides','tpu-plovdiv-ai-author-v27="'+env.KT131_AUTHOR_VERSION+'"');
  const response=await env.KT128_AUTHOR.fetch(new Request('https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/subject-improve',{method:'POST',headers,body:'{"caseId":"11111111-1111-4111-8111-111111111111"}'}));
  return Response.json({preview:true,authorVersionConfirmed:response.headers.get('X-KT131-Preview')==='editor-style-v1',invalidSessionDenied:response.status===403},{headers:{'Cache-Control':'no-store'}});
 }
 const response=await candidate.fetch(request,env,ctx),headers=new Headers(response.headers);headers.set('X-KT131-Preview','editor-style-v1');
 if(response.headers.get('Content-Type')?.includes('text/html')){
  const html=(await response.text()).replace(/<body([^>]*)>/i,'<body$1><aside style="padding:8px 16px;background:#d9b771;color:#103d2c;font:14px Verdana;text-align:center">КТ131 · ТЕСТОВА ВЕРСИЯ · Използвайте съществуващия си профил и преписка.</aside>');headers.delete('Content-Length');return new Response(html,{status:response.status,headers});
 }
 return new Response(response.body,{status:response.status,headers});
}};
