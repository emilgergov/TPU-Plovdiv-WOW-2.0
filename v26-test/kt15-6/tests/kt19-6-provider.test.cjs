'use strict';
const assert=require('node:assert/strict');
const {createProvider}=require('../v26-ai-provider.cjs');
assert.throws(()=>createProvider({apiKey:'',model:'',endpoint:''}),/Missing/);
assert.throws(()=>createProvider({apiKey:'secret',model:'test',endpoint:'http://example.com/api'}),/HTTPS/);
(async()=>{
 let called=false;
 const generate=createProvider({apiKey:'test-secret',model:'test-model',endpoint:'https://example.com/v1/chat/completions',fetchImpl:async(url,options)=>{
  called=true;assert.equal(url,'https://example.com/v1/chat/completions');
  assert.equal(options.headers.authorization,'Bearer test-secret');
  assert.equal(JSON.parse(options.body).response_format.type,'json_object');
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({schema:'KT15_9_AI_AUTHOR_DRAFT_V1'})}}]})};
 }});
 const result=await generate([{role:'user',content:'Test'}]);
 assert(called);assert.equal(result.schema,'KT15_9_AI_AUTHOR_DRAFT_V1');
 console.log('PASS KT19.6: HTTPS provider configuration, no browser key, JSON response');
})().catch(e=>{console.error(e);process.exitCode=1});
