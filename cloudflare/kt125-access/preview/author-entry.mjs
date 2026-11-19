import candidate from '../../ai-author-v27/src/worker.js';
const preview='https://kt131-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const production='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
export default {async fetch(request,env,ctx){
 // Only the exact test origin is normalized; the unchanged case/session RPC
 // still runs before the server credential is supplied to the author.
 if(request.headers.get('Origin')===preview){const headers=new Headers(request.headers);headers.set('Origin',production);request=new Request(request,{headers});}
 const response=await candidate.fetch(request,env,ctx),headers=new Headers(response.headers);
 headers.set('X-KT131-Preview','editor-style-v1');return new Response(response.body,{status:response.status,headers});
}};
