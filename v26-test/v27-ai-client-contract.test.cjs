/* V27.2: browser AI client -> authenticated Worker response contract, no real network or secrets. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/v27-ai-author.js','utf8');
const payload={mode:'expert',facts:{subject:'Тестов обект',parcelIds:['56784.13.102']}};
const goodDraft='[[CHARACTERIZATION]]\nТестов факт.\n[[LEGAL]]\nПравна проверка.\n[[PROCEDURE]]\nПроцедура.\n[[IMPACTS]]\nВъздействия.';
let calls=[];
let status=200,body={reviewRequired:true,draft:goodDraft};
const context=vm.createContext({window:{},AbortController,setTimeout,clearTimeout,fetch:async(url,opts)=>{
 calls.push({url,opts});
 return {ok:status>=200&&status<300,status,json:async()=>body};
}});
vm.runInContext(source,context);
(async()=>{
 const client=context.window.V27AIAuthor;
 assert.equal(await client.generate(payload,'test-token'),goodDraft);
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/workers\\.dev\\/author$/);
 assert.equal(calls[0].opts.method,'POST');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer test-token');
 assert.equal(calls[0].opts.cache,'no-store');
 assert.deepEqual(JSON.parse(calls[0].opts.body),payload);
 status=502;body={error:'AI provider request failed',providerStatus:503};
 await assert.rejects(()=>client.generate(payload,'test-token'),/HTTP 502/);
 status=200;body={reviewRequired:true,draft:''};
 await assert.rejects(()=>client.generate(payload,'test-token'),/невалиден AI отговор/);
 body={reviewRequired:false,draft:goodDraft};
 await assert.rejects(()=>client.generate(payload,'test-token'),/невалиден AI отговор/);
 const count=calls.length;
 await assert.rejects(()=>client.generate(payload,''),/токен/);
 assert.equal(calls.length,count,'No request allowed without token');
 console.log('V27.2 browser-to-Worker client contract PASS: authenticated POST, valid AI text, fail-closed errors');
})().catch(e=>{console.error(e);process.exitCode=1});
