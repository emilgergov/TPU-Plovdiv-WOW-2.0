import candidate from '../../ai-author-v27/src/worker.js';
export default {async fetch(request,env,ctx){
 const response=await candidate.fetch(request,env,ctx),headers=new Headers(response.headers);
 headers.set('X-WOW-Release','V27.36-KT131');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
