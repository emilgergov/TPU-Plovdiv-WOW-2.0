'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const [,,sourcePath,outputPath]=process.argv;
if(!sourcePath||!outputPath)throw Error('Pass protected Worker source path and candidate output path');
let original=fs.readFileSync(sourcePath,'utf8');
// Cloudflare GET /scripts may return an RFC 7578 module envelope rather than bare JS.
// Unpack only a single JS entry module, without logging private source.
const first=original.split(/\r?\n/,1)[0];
if(first.startsWith('--')&&first.length<180){
 const parts=original.split(first);
 const modules=[];
 for(const part of parts){
  const trimmed=part.replace(/^\r?\n/,'');
  const separator=trimmed.includes('\r\n\r\n')?'\r\n\r\n':'\n\n';
  const offset=trimmed.indexOf(separator);
  if(offset<0)continue;
  const headers=trimmed.slice(0,offset);
  if(!/Content-Disposition:/i.test(headers)||/name="metadata"/i.test(headers))continue;
  const body=trimmed.slice(offset+separator.length).replace(/\r?\n$/,'');
  modules.push(body);
 }
 assert.equal(modules.length,1,'Protected gateway must expose precisely one JS module');
 original=modules[0];
 console.log('Cloudflare multipart gateway module extracted for read-only verification');
}

const canonical=original.match(/\bexport\s+default\b/g)||[];
const groups=[...original.matchAll(/\bexport\s*\{([^}]+)\}\s*;?/g)];
const matches=groups.flatMap(g=>g[1].split(',').map(x=>x.trim()).filter(x=>/\bas\s+default\b/.test(x)).map(x=>({group:g,entry:x,ident:(x.match(/^([A-Za-z_$][\w$]*)\s+as\s+default$/)||[])[1]})));
assert.ok(original.length>200&&original.length<10000,'Unexpected protected gateway length');
assert.ok(canonical.length===1&&matches.length===0 || canonical.length===0&&matches.length===1&&matches[0].ident,'Unsupported original KT133 module export; no modification allowed');
let converted;
if(canonical.length===1){converted=original.replace(/\bexport\s+default\b/,'const __kt133Core =');}
else{
  const {group,entry,ident}=matches[0];
  const remaining=group[1].split(',').map(x=>x.trim()).filter(x=>x&&x!==entry);
  converted=original.replace(group[0], 'const __kt133Core = '+ident+';'+(remaining.length?'export{'+remaining.join(',')+'};':''));
}
assert.notEqual(converted,original);
const overlay=`
/* KT133 approved visual additions. Original functional gateway above is unchanged. */
export default {
 async fetch(request,env,ctx) {
  const u=new URL(request.url);
  const assets={
   '/__kt133_approved_visuals.css':['https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/1cfc6aa561ad4fbec57a7d2219d3b2aa455a9a26/kt80/KT133_APPROVED_VISUALS.css','text/css; charset=utf-8'],
   '/__kt133_approved_visuals.js':['https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/1cfc6aa561ad4fbec57a7d2219d3b2aa455a9a26/kt80/KT133_APPROVED_VISUALS.js','text/javascript; charset=utf-8']
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
