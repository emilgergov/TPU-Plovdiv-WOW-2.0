import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const savedFetch=globalThis.fetch;
const env={OPENAI_API_KEY:'mock-openai',AI_AUTHOR_ACCESS_TOKEN:'test-access-token',KT123_TEST_LEGACY_MODE:'true'};
const direction='ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС';
const lines=[
 'ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставени са установените характеристики и относимите категории по приложение № 1; не е установено съответствие с правните критерии.',
 'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставени са установените характеристики и относимите категории по приложение № 2; не е установено съответствие с правните критерии.',
 'ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — Установените характеристики не изпълняват проверените предпоставки на ал. 1 по документирания предмет на преписката.',
 'ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — Проверени са предпоставките на ал. 2 въз основа на предмета, обхвата и конкретните потвърдени данни по преписката.'
];
const stage4=[...lines,'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Мотивирано писмо за начина на процедиране.',direction,'ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Изборът следва от действителните данни по настоящата преписка.'].join('\n');
const body=confirmedStage4Text=>({
 task:'draft_stage5_document',caseId:'11111111-1111-4111-8111-111111111111',requestId:'kt123-request-01',stage4Version:1,
 evidenceRevision:'revision-01',projectOnly:true,expertConfirmed:true,
 confirmedStage4Text,selectedPanelLine:direction,documentTitle:'Писмо по чл. 2, ал. 2 от Наредбата за ОС',
 incomingReference:'ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',subject:'Складове за промишлени стоки и офиси, разположени в поземлен имот с идентификатор 56784.13.102',
 scope:'Складова и офисна дейност в посочения имот',parcelIds:['56784.13.102']
});
const request=stage4Text=>new Request('https://example.test/stage5-document',{method:'POST',
 headers:{Authorization:'Bearer test-access-token','Content-Type':'application/json'},body:JSON.stringify(body(stage4Text))});
let providerCalls=0;let produced='Въз основа на потвърдените данни за складовата и офисната дейност в посочения имот се установява, че предложението не попада в приложение № 2 към ЗООС. Съобразени са приложимите разпоредби и извършената експертна нормативна преценка.';
globalThis.fetch=async(_url,opts)=>{providerCalls++;assert.equal(opts.headers.Authorization,'Bearer mock-openai');return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:produced}]}]}),{status:200})};

const caseId='11111111-1111-4111-8111-111111111111';
let externalNumber='АБ-12/03.10.2026',seen=[];
const guardedEnv={...env,KT126_REGISTRY:{getCaseContext:async args=>{seen.push(args);return {verified:true,caseId,externalNumber}}}};
const guarded=()=>new Request('https://example.test/stage5-document',{method:'POST',headers:{Origin:'https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev',Authorization:'Bearer test-access-token','Content-Type':'application/json','X-KT126-Case':caseId,'X-KT126-Session':'opaque-session'},body:JSON.stringify({...body(stage4),incomingReference:'ЧУЖД-НЕПОТВЪРДЕН-999'})});
try{
 const approved=await worker.fetch(guarded(),guardedEnv);assert.equal(approved.status,200,await approved.clone().text());const first=await approved.json();assert.equal(first.incomingReference,externalNumber);assert(first.draft.includes('с Деловоден № '+externalNumber));assert(!first.draft.includes('ЧУЖД-НЕПОТВЪРДЕН'));
 assert.equal(seen[0].action,'document.generate');assert.equal(seen[0].cookie,'opaque-session');
 externalNumber='';const omitted=await worker.fetch(guarded(),guardedEnv);assert.equal(omitted.status,200);const second=await omitted.json();assert.equal(second.incomingReference,'');assert(!second.draft.includes('ОВОС-ХХХХ'));assert(!second.draft.includes('Деловоден №'));assert(second.draft.includes('Във връзка с постъпилата документация,'));
 const paid=providerCalls;
 assert.equal((await worker.fetch(guarded(),env)).status,403,'No RPC binding: fail closed');
 assert.equal((await worker.fetch(guarded(),{...guardedEnv,KT126_REGISTRY:{getCaseContext:async()=>null}})).status,403,'Revoked permission: fail closed');
 assert.equal((await worker.fetch(guarded(),{...guardedEnv,KT126_REGISTRY:{getCaseContext:async()=>({verified:true,caseId:'other',externalNumber:'x'})}})).status,403,'Foreign case context: fail closed');
 const wrong=new Request(guarded(),{body:JSON.stringify({...body(stage4),caseId:'different'})});assert.equal((await worker.fetch(wrong,guardedEnv)).status,409);
 assert.equal(providerCalls,paid,'Denied requests never invoke the AI provider');
 console.log('PASS KT126 author: private RPC required, confirmed arbitrary external prefix retained, omitted number never fabricated, case mismatch and revoked access rejected before AI, unchanged legal direction');
}finally{globalThis.fetch=savedFetch}
