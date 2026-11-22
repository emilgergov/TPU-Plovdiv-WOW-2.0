'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const [,,sourcePath,outputPath]=process.argv;
if(!sourcePath||!outputPath)throw Error('Pass protected Worker source path and candidate output path');
const original=fs.readFileSync(sourcePath,'utf8');
const canonical=original.match(/\\bexport\\s+default\\b/g)||[];
const minified=[...original.matchAll(/\\bexport\\s*\\{\\s*([A-Za-z_$][\\w$]*)\\s+as\\s+default\\s*\\}\\s*;?/g)];
assert.ok(original.length>200&&original.length<10000,'Unexpected protected gateway length');
assert.ok(canonical.length===1&&minified.length===0 || canonical.length===0&&minified.length===1,'Unsupported original KT133 module export; no modification allowed');
const converted=canonical.length===1?
  original.replace(/\\bexport\\s+default\\b/,'const __kt133Core ='):
  original.replace(minified[0][0], 'const __kt133Core = '+minified[0][1]+';');
assert.notEqual(converted,original);
const overlay=`
/* KT133 approved visual additions. Original functional gateway above is unchanged. */
export default {
 async fetch(request,env,ctx) {
  const u=new URL(request.url);
  const assets={
   '/__kt133_approved_visuals.css':['https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/kt80/KT133_APPROVED_VISUALS.css','text/css; charset=utf-8'],
   '/__kt133_approved_visuals.js':['https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/kt80/KT133_APPROVED_VISUALS.js','text/javascript; charset=utf-8']
  };
  if(Object.prototype.hasOwnProperty.call(assets,u.pathname) && request.method==='GET'){
   const [target,mime]=assets[u.pathname];
   const remote=await fetch(target,{cf:{cacheEverything:true,cacheTtl:300}});
   if(!remote.ok)return new Response('Visual asset unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
   return new Response(remote.body,{status:200,headers:{'Content-Type':mime,'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'}});
  }
  const response=await __kt133Core.fetch(request,env,ctx);
  if(request.method!=='GET'||!/^\\/module(?:\\/|$)/.test(u.pathname)||
     !(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return response;
  return new HTMLRewriter()
   .on('head',{element(el){el.append('<link rel="stylesheet" href="/__kt133_approved_visuals.css?v=20261123" />',{html:true});}})
   .on('body',{element(el){el.append('<script defer src="/__kt133_approved_visuals.js?v=20261123"></script>',{html:true});}})
   .transform(response);
 }
};`;
const candidate=converted+'\n'+overlay+'\n';
fs.writeFileSync(outputPath,candidate);
assert.ok(candidate.startsWith(converted),'Original gateway was altered beyond export binding');
console.log('KT133 approved visual gateway patch generated, original protected gateway preserved, lengths',original.length,candidate.length);
