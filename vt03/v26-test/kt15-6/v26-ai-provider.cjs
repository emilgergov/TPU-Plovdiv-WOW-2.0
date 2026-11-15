/* KT19.6 — server-only OpenAI-compatible Chat Completions adapter. Never bundle into GitHub Pages. */
'use strict';
function createProvider({apiKey=process.env.V26_AI_API_KEY,model=process.env.V26_AI_MODEL,endpoint=process.env.V26_AI_ENDPOINT,fetchImpl=globalThis.fetch}={}){
 if(!apiKey||!model||!endpoint)throw Error('Missing server-only V26 AI configuration');
 const url=new URL(endpoint);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('HTTPS AI endpoint required');
 if(typeof fetchImpl!=='function')throw Error('Fetch implementation required');
 return async function generate(messages){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetchImpl(url.toString(),{method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},body:JSON.stringify({model,messages,temperature:0.2,response_format:{type:'json_object'}}),signal:controller.signal});
   if(!response.ok)throw Error('AI provider HTTP '+response.status);
   const data=await response.json();
   const content=data?.choices?.[0]?.message?.content;
   if(typeof content!=='string'||content.length>200000)throw Error('Invalid AI response');
   return JSON.parse(content);
  }finally{clearTimeout(timer);}
 };
}
module.exports={createProvider};
