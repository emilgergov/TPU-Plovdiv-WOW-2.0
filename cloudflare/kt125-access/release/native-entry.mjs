import candidate from '../src/local-auth/service.mjs';
export {LocalAuthService,PasswordKdf} from '../src/local-auth/service.mjs';
export default {async fetch(request,env,ctx){
 const response=await candidate.fetch(request,env,ctx),headers=new Headers(response.headers);
 headers.set('X-WOW-Release','V27.36-KT131');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
