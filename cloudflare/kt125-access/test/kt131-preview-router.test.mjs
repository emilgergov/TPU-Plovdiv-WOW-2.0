import assert from 'node:assert/strict';
import router from '../preview/router-entry.mjs';
const origin='https://kt131-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
let calls=0;const env={KT131_NATIVE_VERSION:'11111111-1111-4111-8111-111111111111',KT131_NATIVE:{fetch:async request=>{calls++;assert.equal(request.url,origin+'/auth/login');assert.equal(request.headers.get('Cookie'),'opaque-test-cookie');assert.equal(request.headers.get('Origin'),'https://attacker.invalid','Do not normalize browser origin; native still rejects CSRF');assert.equal(request.headers.get('Cloudflare-Workers-Version-Overrides'),'tpu-plovdiv-kt125-local-auth="11111111-1111-4111-8111-111111111111"');return new Response('guarded',{status:403,headers:{'Cache-Control':'no-store'}})}}};
const response=await router.fetch(new Request(origin+'/auth/login',{headers:{Cookie:'opaque-test-cookie',Origin:'https://attacker.invalid','Cloudflare-Workers-Version-Overrides':'attacker="wrong"'}}),env);
assert.equal(response.status,403);assert.equal(calls,1);assert.equal(response.headers.get('Cache-Control'),'no-store');
assert.equal((await router.fetch(new Request('https://attacker.invalid/auth/login'),env)).status,404);assert.equal(calls,1);
console.log('PASS KT131 router: server-pinned version, preserved cookie/browser-origin guard, no foreign host, no secret/identity duplication.');
