/* KT19.6 — standalone server entry; must run behind authenticated HTTPS reverse proxy. */
'use strict';
const {start}=require('./v26-ai-author-gateway.cjs');
const {createProvider}=require('./v26-ai-provider.cjs');
const secret=process.env.V26_GATEWAY_TOKEN;
if(!secret||secret.length<32)throw Error('Set a strong server-only V26_GATEWAY_TOKEN');
const generate=createProvider();
const server=start({generate,authorized:req=>{
 const header=req.headers.authorization||'';
 const supplied=header.startsWith('Bearer ')?header.slice(7):'';
 const crypto=require('node:crypto');
 const a=Buffer.from(supplied),b=Buffer.from(secret);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}});
const port=Number(process.env.PORT||8080);
server.listen(port,'127.0.0.1',()=>console.log('V26 AI gateway listening on localhost:'+port));
