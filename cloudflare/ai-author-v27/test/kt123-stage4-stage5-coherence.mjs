import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const savedFetch=globalThis.fetch;
const env={OPENAI_API_KEY:'mock-openai',AI_AUTHOR_ACCESS_TOKEN:'test-access-token'};
const direction='ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС';
const lines=[
 'ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставени са установените характеристики и относимите категории по приложение № 1; не е установено съответствие с правните критерии.',
 'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Съпоставени са установените характеристики и относимите категории по приложение № 2; не е установено съответствие с правните критерии.',
 'ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — Установените характеристики не изпълняват проверените предпоставки на ал. 1 по документирания предмет на преписката.',
 'ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — Проверени са предпоставките на ал. 2 въз основа на предмета, обхвата и конкретните потвърдени данни по преписката.'
];
const stage4=[...lines,'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Мотивирано писмо за начина на процедиране.',direction,'ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Изборът следва от действителните данни по настоящата преписка.'].join('\n');
const body=confirmedStage4Text=>({
 task:'draft_stage5_document',caseId:'test-kt123-case',requestId:'kt123-request-01',stage4Version:1,
 evidenceRevision:'revision-01',projectOnly:true,expertConfirmed:true,
 confirmedStage4Text,selectedPanelLine:direction,documentTitle:'Писмо по чл. 2, ал. 2 от Наредбата за ОС',
 incomingReference:'ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',subject:'Складове за промишлени стоки и офиси, разположени в поземлен имот с идентификатор 56784.13.102',
 scope:'Складова и офисна дейност в посочения имот',parcelIds:['56784.13.102']
});
const request=stage4Text=>new Request('https://example.test/stage5-document',{method:'POST',
 headers:{Authorization:'Bearer test-access-token','Content-Type':'application/json'},body:JSON.stringify(body(stage4Text))});
let providerCalls=0;let produced='Въз основа на потвърдените данни за складовата и офисната дейност в посочения имот се установява, че предложението не попада в приложение № 2 към ЗООС. Съобразени са приложимите разпоредби и извършената експертна нормативна преценка.';
globalThis.fetch=async(_url,opts)=>{providerCalls++;assert.equal(opts.headers.Authorization,'Bearer mock-openai');return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:produced}]}]}),{status:200})};
try{
 // The selected panel 01 is supported by all four individually verified rows.
 const ok=await worker.fetch(request(stage4),env);
 assert.equal(ok.status,200,JSON.stringify(await ok.clone().json()));
 assert.equal((await ok.json()).projectOnly,true);
 assert.equal(providerCalls,1);
 // An unrelated note about an alternative with uncertain proof must not
 // override the explicit, confirmed Annex 2 conclusion.
 const contextNote=stage4+'\nЗАЩО НЕ АЛТЕРНАТИВИТЕ: При друга хипотеза с липсващи факти приложимостта би останала НЕОПРЕДЕЛЕНА, но това не е нормативният извод за настоящата преписка.';
 const okAlternative=await worker.fetch(request(contextNote),env);
 assert.equal(okAlternative.status,200,JSON.stringify(await okAlternative.clone().json()));
 assert.equal(providerCalls,2);
 // The expert cannot confirm panel 01 with a truly indeterminate Annex 2 row.
 const conflict=stage4.replace('ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА','ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: НЕОПРЕДЕЛЕНА');
 const blocked=await worker.fetch(request(conflict),env);
 assert.equal(blocked.status,422);
 const diag=await blocked.json();
 assert.equal(diag.error,'STAGE4_LEGAL_MATRIX_CONFLICT');
 assert(diag.findings.some(x=>x.test==='A2'&&x.actual==='НЕОПРЕДЕЛЕНА'));
 assert.equal(providerCalls,2,'contradictory Stage4 must not incur a paid AI request');
 // If panel 01 is confirmed, a request for extra information is not an admissible substitute.
 produced='Необходимо е да представите допълнителна информация, включваща точна технология, капацитет и техническа документация, за да се прецени приложимостта на нормативната категория за настоящата преписка.';
 const wrongAct=await worker.fetch(request(stage4),env);
 assert.equal(wrongAct.status,422);
 assert.equal((await wrongAct.json()).error,'STAGE5_DIRECTION_CONFLICT');
 console.log('PASS: KT123 Stage4/5 legal matrix consistency, no cross-paragraph false positive, correct administrative action, fail closed.');
}finally{globalThis.fetch=savedFetch}
