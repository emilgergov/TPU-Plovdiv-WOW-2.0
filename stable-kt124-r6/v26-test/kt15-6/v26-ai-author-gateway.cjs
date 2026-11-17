/* KT19.5 — secure server-side AI author gateway; not deployable on GitHub Pages alone. */
'use strict';
const http=require('node:http');
const contract=require('./v26-ai-author-contract.js');
const prompt=require('./v26-ai-author-prompt.js');
const MAX_BYTES=1024*1024;
function reply(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));}
async function handle(req,res,options={}){
 if(req.method!=='POST'||req.url!=='/api/v26/author')return reply(res,404,{error:'Not found'});
 if(!options.authorized?.(req))return reply(res,401,{error:'Authentication required'});
 const provider=options.generate;
 if(typeof provider!=='function')return reply(res,503,{error:'AI provider not configured'});
 let raw='';
 try{
  for await(const chunk of req){raw+=chunk.toString('utf8');if(Buffer.byteLength(raw)>MAX_BYTES)return reply(res,413,{error:'Request too large'});}
  const input=JSON.parse(raw);
  const request=contract.prepareRequest(input);
  if(!request.ready)return reply(res,422,{error:'Incomplete verified evidence',issues:request.issues});
  const messages=prompt.messages(request);
  const draft=await provider(messages,{dossierId:request.dossierId});
  const validation=contract.validateDraft(request,draft);
  if(!validation.valid)return reply(res,422,{error:'AI draft failed validation',issues:validation.issues});
  if(!draft.editorialTitle||!contract.editorialTitleReview(request,draft).valid)return reply(res,422,{error:'AI subject and heading required'});
  return reply(res,200,{draft,validation,requiresExpertApproval:true});
 }catch(err){return reply(res,400,{error:'Invalid request or provider response'});}
}
function start(options={}){if(!options.authorized||!options.generate)throw Error('Configure authorization and AI provider before startup');return http.createServer((req,res)=>handle(req,res,options));}
module.exports={handle,start};
