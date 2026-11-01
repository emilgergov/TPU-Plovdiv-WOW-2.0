const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
const code=fs.readFileSync(__dirname+'/../cloudflare/ai-author-v27/src/early-subject.js','utf8');
const {validateEarlyInput,handleEarlySubject}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const input={task:'subject_title',schema:'V27_EARLY_SUBJECT_V1',parcelIds:['56784.13.102'],facts:[{id:'D001F001',kind:'subject',value:'Склад',quote:'Склад',file:'notice.txt'}]};
assert.equal(validateEarlyInput(input).facts.length,1);
assert.equal(validateEarlyInput({...input,parcelIds:['INVALID']}),null);
assert.equal(validateEarlyInput({...input,facts:[]}),null);
let req=new Request('https://example.org/subject',{method:'POST',headers:{Authorization:'Bearer wrong'},body:JSON.stringify(input)});
let response=await handleEarlySubject(req,{OPENAI_API_KEY:'test',AI_AUTHOR_ACCESS_TOKEN:'secret'});
assert.equal(response.status,401);
req=new Request('https://example.org/subject',{method:'POST',headers:{Authorization:'Bearer secret'},body:JSON.stringify({...input,parcelIds:['BAD']})});
response=await handleEarlySubject(req,{OPENAI_API_KEY:'test',AI_AUTHOR_ACCESS_TOKEN:'secret'});
assert.equal(response.status,400);
console.log('V27.1 P4 early AI server contract: PASS (no paid API calls)');
})().catch(e=>{console.error(e);process.exitCode=1});
