'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const base='v26-test/v27-preview/';
const html=fs.readFileSync(base+'KT76_05_R2_LEGAL_RETRY_TEST.html','utf8');
const locked=fs.readFileSync(base+'KT76_05_UNIFIED_ZIP_TEST.html','utf8');
assert(!locked.includes('kt7605RetryAuthor'),'prior tested route stays unchanged');
assert(html.includes('kt7605RetryAuthor=async()=>'));
assert(html.includes('if(!newLegal.ok)throw Error('));
assert(html.includes('KT7605UnifiedQA.verify(kt7604.blob'));
for(const [i,m] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())if(m[1].trim())new vm.Script(m[1],{filename:'kt76-05-r2-'+i+'.js'});
const a=html.indexOf('// KT76-05 R2 — a legal-QA failure');
const b=html.indexOf("if(!kt6722Legal.ok)throw Error('КТ67-2.2:",a);
assert(a>0&&b>a);
const block=html.slice(a,b);
const fn=new Function('input','const {kt7605RetryAuthor,window,found,workingDraft,kt60QualityEvidence,console,setStatus}=input;'+
 'let v27AiDraft="original",kt60={scenario:"Б"},kt67Plan={expert:{}};'+
 'let kt6722Legal={ok:false,issues:[{code:"UNSUPPORTED_CATEGORICAL_OS",section:"PROCEDURE"}]};'+
 'return (async()=>{'+block+'return {v27AiDraft,kt60,kt67Plan,kt6722Legal};})();');
function input(candidate,legalPass){
 let attempts=0;
 return {input:{
 kt7605RetryAuthor:async()=>{attempts++;return candidate;},
 window:{KT603Evidence:{build:({aiDraft})=>({scenario:'Б',aiDraft})},
 KT67AIContent:{plan:d=>({readyForIntegration:true,expert:{draft:d}})},
 KT6722LegalQuality:{inspect:()=>({ok:legalPass,issues:legalPass?[]:[{code:'UNSUPPORTED_CATEGORICAL_OS',section:'PROCEDURE'}]})},
 V27VerifiedContext:{legal:()=>({sources:[]})},V26NormativeRegister:{}},
 found:[{input:'36676.129.457'}],workingDraft:{},kt60QualityEvidence:{facts:[]},
 console:{info:()=>{}},setStatus:()=>{}
 },getAttempts:()=>attempts};
}
(async()=>{
 const ok=input('fresh individual re-authored text',true);
 const pass=await fn(ok.input);
 assert.equal(pass.v27AiDraft,'fresh individual re-authored text');
 assert.equal(pass.kt60.aiDraft,'fresh individual re-authored text');
 assert.equal(pass.kt67Plan.expert.draft,'fresh individual re-authored text');
 assert(pass.kt6722Legal.ok);assert.equal(ok.getAttempts(),1);
 const reject=input('unverified legal conclusion',false);
 await assert.rejects(()=>fn(reject.input),/повторното AI авторство също не премина контрола/);
 assert.equal(reject.getAttempts(),1);
 console.log('KT76-05 R2 PASS: full AI legal revalidation, strict fail closed, one retry, stable original route');
})().catch(e=>{console.error(e);process.exitCode=1});
