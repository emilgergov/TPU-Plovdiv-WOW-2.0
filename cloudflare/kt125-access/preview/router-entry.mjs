// No secrets, database binding or authentication code in the test router.
// The unchanged native session/case checks run inside the pinned native version.
export default {async fetch(request,env){
 if(new URL(request.url).origin!=='https://kt131-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev')return new Response('Недостъпен тестов адрес.',{status:404});
 const headers=new Headers(request.headers);
 headers.set('Cloudflare-Workers-Version-Overrides','tpu-plovdiv-kt125-local-auth="'+env.KT131_NATIVE_VERSION+'"');
 return env.KT131_NATIVE.fetch(new Request(request,{headers}));
}};
