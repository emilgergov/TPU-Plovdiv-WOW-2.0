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

// A previous approved overlay may already be live. Rebuild from its preserved core,
// rather than stacking a second HTMLRewriter or injecting duplicate scripts.
const overlayMarker='/* KT133 approved visual additions. Original functional gateway above is unchanged. */';
if(original.includes(overlayMarker)){
 assert.equal(original.split(overlayMarker).length,2,'Unexpected repeated KT133 overlays');
 const retained=original.slice(0,original.indexOf(overlayMarker)).trimEnd();
 assert.ok(retained.includes('const __kt133Core ='),'Existing gateway core is not recognizable');
 original=retained.replace('const __kt133Core =','export default');
 console.log('Existing KT133 visual overlay unwrapped for safe replacement');
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
   '/__kt133_institutional_word.mjs':['https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/dba97a465a88243b7de609ad2c3559323cf3aa81/vt03/kt80/integration/kt119-institutional-word.mjs','text/javascript; charset=utf-8'],
   '/__kt133_approved_visuals.css':['https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/20b6727a9e64da4fad0fbd698958e64da1ae32de/kt80/KT133_APPROVED_VISUALS.css','text/css; charset=utf-8'],
   '/__kt133_approved_visuals.js':['https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/20b6727a9e64da4fad0fbd698958e64da1ae32de/kt80/KT133_APPROVED_VISUALS.js','text/javascript; charset=utf-8']
  };
  if(Object.prototype.hasOwnProperty.call(assets,u.pathname) && request.method==='GET'){
   const [target,mime]=assets[u.pathname];
   const remote=await fetch(target,{cf:{cacheEverything:true,cacheTtl:300}});
   if(!remote.ok)return new Response('Visual asset unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
   return new Response(remote.body,{status:200,headers:{'Content-Type':mime,'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'}});
  }
  const isKt134DeepStage=/^[1-5]$/.test(u.searchParams.get('kt134-stage')||'');
  const response=await __kt133Core.fetch(request,env,ctx);
  if(request.method==='GET'&&response.status===200&&
      u.pathname==='/module/vt03/kt80/integration/kt119-docx-generator.mjs'&&
      /javascript|ecmascript/.test(response.headers.get('content-type')||'')){
   const source=await response.clone().text();
   const signature=' function buildWord(approved,stage4){';
   const start=source.indexOf(signature);
   const end=source.indexOf('     return contents;',start);
   if(start!==-1&&end!==-1){
    const titleStart=source.indexOf('     const chosen=',start);
    const titleEnd=source.indexOf('     const contents=',titleStart);
    if(titleStart>start&&titleEnd>titleStart&&titleEnd<end){
     const render='import {renderInstitutionalWord} from "/__kt133_institutional_word.mjs";'+String.fromCharCode(10)+
      source.slice(0,start)+signature+String.fromCharCode(10)+source.slice(titleStart,titleEnd)+
      '     return renderInstitutionalWord({templateBytes,codec:window.fflate,text:approved.text,title:docTitle,parseXml:xml=>new DOMParser().parseFromString(xml,"application/xml"),serializeXml:dom=>new XMLSerializer().serializeToString(dom)});'+
      source.slice(end+'     return contents;'.length);
     const headers=new Headers(response.headers);
     for(const name of ['Content-Length','Content-Encoding','ETag','Last-Modified'])headers.delete(name);
     headers.set('Cache-Control','private, no-store');
     return new Response(render,{status:200,headers});
    }
   }
  }
  // Apply feedback to the guarded source returned by the existing module gateway.
  const feedbackModule=u.pathname.startsWith('/module/')&&u.pathname.match(/(kt116-expert-approval-handoff|kt96-eg-ai-stage4-author)\\.mjs$/);
  if(request.method==='GET'&&feedbackModule&&response.status===200&&/javascript|ecmascript/.test(response.headers.get('content-type')||'')){
   let source=await response.clone().text();
   if(feedbackModule[1]==='kt116-expert-approval-handoff'){
    const message='Предложението е за предишна версия на данните. Изгответе нов проект с EG Автора в Етап 4 и го потвърдете.';
    source=source.replace("note.className='note';","note.className='note';note.setAttribute('role','status');")
     .replace("note.textContent='Данните по преписката са променени.'","note.textContent="+JSON.stringify(message))
     .replace('next.onclick=()=>{'+String.fromCharCode(10)+'  if(!approved||!current())return;',
      'next.onclick=()=>{if(!current()){note.textContent='+JSON.stringify(message)+';return;}if(!approved){note.textContent="Потвърдете предложената процедура, за да отворите Етап 5.";return;}');
   }else{
    source=source.replace('const permanent=bound?.verified===true&&str(bound?.caseId)?str(bound.caseId):null;',
      'const registeredCase=str(window.KT126Registry?.current?.()?.case_id);const permanent=registeredCase||(bound?.verified===true&&str(bound?.caseId)?str(bound.caseId):null);')
     .replace('EG Авторът подготвя проект','Обработва се… EG Авторът подготвя проект')
     .replace('status.textContent=reviewInfo+','status.textContent="Проектът е готов за експертен преглед. "+reviewInfo+');
   }
   const headers=new Headers(response.headers);
   for(const name of ['Content-Length','Content-Encoding','ETag','Last-Modified'])headers.delete(name);
   headers.set('Cache-Control','private, no-store');
   return new Response(source,{status:200,headers});
  }
  if(request.method!=='GET'||!/^\\/module(?:\\/|$)/.test(u.pathname)||
     !(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return response;
  return new HTMLRewriter()
   .on('head',{element(el){
     if(isKt134DeepStage)el.append('<style id="kt134-stage5-workspace">#kt117Stage5{--kt134-gold:#edcc83;--kt134-line:#c8a86a70;--kt134-surface:#103327;color:#fbefdc} #kt117Stage5 .kt117-context{padding:clamp(13px,2.2vw,26px);border:1px solid var(--kt134-line);border-radius:16px;background:radial-gradient(ellipse at 98% 0%,#52604460,transparent 58%),linear-gradient(140deg,#204b38,#0c2b21);box-shadow:0 12px 30px #0005} #kt117Stage5 .kt117-heading,#kt117Stage5 .kt117-main{font-family:Georgia,serif;color:var(--kt134-gold)} #kt117Stage5 .kt117-main{font-size:clamp(18px,2vw,26px)} #kt117Stage5 .kt122-stage5-grid{gap:12px} #kt117Stage5 :is(.kt122-stage5-left,.kt122-stage5-right){min-width:0;background:#0c2d22;border:1px solid var(--kt134-line);border-radius:12px;padding:14px;overflow-wrap:anywhere} #kt117Stage5 .kt117-actions{gap:9px;flex-wrap:wrap} #kt117Stage5 .kt117-decision-status{border-radius:10px} #kt117Stage5 .kt117-paper{box-shadow:0 12px 28px #061b17a0} @media(max-width:700px){#kt117Stage5 .kt122-stage5-grid{grid-template-columns:minmax(0,1fr)}} .kt83-preview-overlay .kt83-preview-dialog{background:linear-gradient(145deg,#1e4834,#102e24);border-radius:16px} .kt83-preview-overlay .kt83-help-top{border-bottom:1px solid #bf9e5a75;padding-bottom:10px} #kt83PreviewBody h3{font-family:Georgia,serif;color:#f4d28c}</style>',{html:true});
     if(u.searchParams.get('kt134-stage')==='5')el.append('<style id="kt134-stage5-preview">.kt83-preview-overlay:not([hidden]){background:radial-gradient(ellipse at 18% 20%,#284d37,#071d17 78%)!important}.kt83-preview-overlay .kt83-preview-dialog{border:1px solid #d9b675;box-shadow:0 20px 60px #0009;background:#12382a;color:#fff0d2}#kt83PreviewTitle{font-family:Georgia,serif;color:#f5d89c}</style>',{html:true});
     if(isKt134DeepStage)el.append('<style id="kt134-stage-cinematic">body[data-kt80-view="stage"]{background:radial-gradient(ellipse at 15% 55%,#23594488,transparent 55%),linear-gradient(145deg,#153a2e,#071e17 70%)!important}body[data-kt80-view="stage"] #kt80ScreenTitle{color:#f6d698;font-family:Georgia,serif!important;font-size:clamp(22px,2.4vw,34px)!important}body[data-kt80-view="stage"] .kt80-stage-panel{border-color:#89764c;border-radius:17px;background-color:#153d30}body[data-kt80-view="stage"] .kt80-stage-panel h2{color:#f6d698}</style>',{html:true});
     if(isKt134DeepStage)el.append('<style id="kt134-pending-stage-style">body{visibility:hidden!important}</style><script>setTimeout(function(){var e=document.getElementById("kt134-pending-stage-style");if(e)e.remove()},9000)</script>',{html:true});
     el.append('<link rel="stylesheet" href="/__kt133_approved_visuals.css?v=20261127no-flash" />',{html:true});
   }})
   .on('body',{element(el){
     if(isKt134DeepStage)el.append('<script>(function(){const params=new URLSearchParams(location.search);const preview=params.get("preview")==="cinematic";const stage5=preview&&params.get("kt134-stage")==="5";const destination="https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/kt134/dashboard"+(preview?"?preview=cinematic":"");function returnToDashboard(event){event.preventDefault();event.stopImmediatePropagation();location.assign(destination);}document.addEventListener("click",function(event){const target=event.target;if(target.closest?.("#kt80DashboardBack")||(stage5&&(target.closest?.("#kt83PreviewClose")||target.matches?.(".kt83-preview-overlay:not([hidden])"))))returnToDashboard(event);},true);if(stage5)document.addEventListener("keydown",function(event){if(event.key==="Escape"&&!document.querySelector(".kt83-help-overlay:not([hidden])")&&document.querySelector(".kt83-preview-overlay:not([hidden])"))returnToDashboard(event);},true);})();</script>',{html:true});
     el.append('<script defer src="/__kt133_approved_visuals.js?v=20261127no-flash"></script>',{html:true});
   }})
   .transform(response);
 }
};`;
const candidate=converted+'\n'+overlay+'\n';
fs.writeFileSync(outputPath,candidate);
assert.ok(candidate.startsWith(converted),'Original gateway was altered beyond export binding');
console.log('KT133 approved visual gateway patch generated, original protected gateway preserved, lengths',original.length,candidate.length);
