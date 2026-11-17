'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('v26-test/v27-preview/kt67-1-ai-content-contract.js','utf8'),sandbox);
const api=sandbox.window.KT67AIContent;
const ids=['36676.129.457'];
const chars=[
'В имот 36676.129.457 се разглежда инвестиционно предложение, чието конкретно строително решение следва да се установи от документите по преписката.',
'Електроснабдяването на предвиждания обект изисква проверка на представените схеми и параметри на присъединяване към наличната инфраструктура.',
'Водоснабдяването следва да се разгледа въз основа на представените проектни данни, без предположение за конкретен водоизточник или техническа схема.',
'Отпадъчните води следва да бъдат предмет на проверка в преписката за начина на събиране, отвеждане и съответствието с предвиденото ползване.'
];
const legal=Array.from({length:4},(_,i)=>'Правната констатация '+(i+1)+' се изготвя като проект, като приложимостта на конкретните норми и действителната им редакция подлежат на отделна експертна проверка по интегрирания нормативен архив.');
const procedure=[
'Преценката за приложимата процедура следва да отчете предмета на предложението, ГИС резултатите и представените технически характеристики, а не само установеното пространствено пресичане.',
'Проектният процедурен извод изисква сверяване на правните основания и индивидуалните данни по преписката, преди компетентният орган да се произнесе по същество.'
];
const impacts=Array.from({length:6},(_,i)=>'Направление '+(i+1)+': възможните въздействия трябва да се разгледат спрямо доказаните пространствени данни, целите на опазване и особеностите на конкретното инвестиционно предложение, без категоричен недоказан извод.');
const draft=(withConclusion=false)=>'[[CHARACTERIZATION]]\n'+chars.join('\n\n')+'\n\n[[LEGAL]]\n'+legal.join('\n\n')+'\n\n[[PROCEDURE]]\n'+procedure.join('\n\n')+'\n\n[[IMPACTS]]\n'+impacts.join('\n\n')+(withConclusion?'\n\n[[CONCLUSION]]\nПроектна констатация, която подлежи на редакция от компетентен експерт преди подписване.':'');
const build=(d,ctx={})=>api.plan(d,{gisScenario:'Б',parcelIds:ids,...ctx});
for(const legacy of [false,true]){
 const result=build(draft(legacy));
 assert.equal(result.schema,'KT67_AI_CONTENT_V1');
 assert.equal(result.readyForIntegration,true,JSON.stringify(result.issues));
 assert.equal(result.expert.characterization.length,4);
 assert.equal(result.expert.legal.length,4);
 assert.equal(result.expert.impacts.length,6);
 assert.equal(result.classic.impactsProject.length,5);
 assert.equal(result.classic.characterization[0],chars[0]);
 assert.equal(result.expert.draft.includes('[[CONCLUSION]]'),false);
 assert.equal(result.provenance.legalStatus,'draft_requires_expert_review');
 assert.equal(result.provenance.verifiedProvisionCount,0);
 assert(result.warnings.some(x=>x.includes('правните')));
 assert.equal(result.reviewRequired,true);
}
const extendedProcedure=[
 'Наличието на пресичане със защитена зона налага анализ на вероятните преки и косвени въздействия съобразно конкретния характер на дейностите.',
 'Функционалните връзки, инженерната инфраструктура и възможните кумулативни ефекти следва да се съобразят при последващата експертна преценка.',
 'За да се формира мотивирано произнасяне, следва да бъдат проверени отделните нормативни предпоставки и относимите документи.',
 'Проектният извод остава предмет на експертна редакция и следва да отчете конкретните потвърдени факти преди административното подписване.'
];
const longDraft=draft().replace(procedure.join('\n\n'),extendedProcedure.join('\n\n'));
const merged=build(longDraft);
assert.equal(merged.readyForIntegration,true,JSON.stringify(merged.issues));
assert.equal(merged.expert.procedure.length,2);
assert.equal(merged.classic.procedureProject,extendedProcedure[3]);
for(const passage of extendedProcedure)assert(merged.expert.draft.includes(passage),'Lost AI-authored procedure argument');
assert.equal(merged.expert.procedure[0],extendedProcedure.slice(0,-1).join(' '),'Procedure reasoning order must be unchanged');
assert(!merged.expert.draft.includes('[[CONCLUSION]]'));
const split=draft().replace(chars.join('\n\n'),chars.join(' '));
assert(build(split).issues.some(x=>x.code==='CHARACTERIZATION_COUNT'), 'Do not split arbitrary AI sentences into 4');
const malicious=draft().replace('36676.129.457','56784.13.102');
assert(build(malicious).issues.some(x=>x.code==='UNKNOWN_PARCEL'));
const repeated=draft().replace(legal[3],legal[0]);
assert(build(repeated).issues.some(x=>x.code==='DUPLICATE_PARAGRAPH'));
assert.throws(()=>api.parse(draft()+'\n\n[[LEGAL]]\nПовторен раздел'),/раздела|дублирани/);
assert.throws(()=>api.parse(draft().replace(legal[2], 'НЯМА ДАННИ')),/самостоятелен заместител/);
assert(build(draft(),{sourceFacts:[{status:'source_matched',file:'Преписка.pdf',value:'тест'}]}).provenance.verifiedFactCount===1);
assert.equal(build(draft(),{verifiedLegalSources:[{verification:'article_verified',source:'Нормативен архив',provisionText:'Тестов пълен текст'}]}).provenance.verifiedProvisionCount,1);
console.log('KT67-1 PASS: four/five input compatibility, four intact characterization paragraphs, full expert sections, provenance, no auto-approval, invalid-case rejection.');
