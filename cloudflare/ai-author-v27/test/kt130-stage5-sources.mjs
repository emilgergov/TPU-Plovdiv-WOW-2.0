import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {stage5CaseEvidence,readStage5Evidence,stripRepeatedStage5Intro,needsStage5VoiceEdit} from '../src/kt130-stage5-context.mjs';
import {territorialContext} from '../src/kt130-territorial-context.mjs';
const approval={caseId:'KT130-SOURCE-TEST',evidenceRevision:7};
const ev={...approval,parcelIds:['12345.1.2']};
const spatial={parcelIds:ev.parcelIds,geometryVerified:true,intersectionsVerified:true,pdf1Current:false,
 parcels:[{id:'12345.1.2',verifiedZoneIntersections:[{kind:'ЗЗ',legalRegime:'ЗБР',code:'BG0001493',name:'Централен Балкан – буфер',area_m2:48.5}]}]};
const utility='Водоснабдяването е от съществуващия водопровод. Електроснабдяването е от съществуваща мрежа. Отпадъчните води се отвеждат в уличната канализация.';
const root={KT80WorkflowState:{caseCycleId:approval.caseId,intake:{archive_name:'Контролна преписка',document_texts:[{source:'уведомление.pdf',text:'Дълъг начален материал. '.repeat(1300)+utility}]}}};
const packet=stage5CaseEvidence(root,approval,ev,spatial);
assert(packet.sourceTexts[0].truncated);
assert(packet.utilityExcerpts.some(x=>x.text.includes('уличната канализация')),'Utility tail survives source text budget');
assert(!packet.utilityExcerpts.some(x=>x.verified));
const input={...approval,parcelIds:ev.parcelIds,completeCaseEvidence:packet};
const parsed=readStage5Evidence(input);
assert.deepEqual(parsed.zoneCodes,['BG0001493']);
assert.equal(parsed.gis.spatial.pdf1Current,false);
assert.equal(parsed.gis.spatial.parcels[0].verifiedZoneIntersections[0].kind,'ЗЗ');
for(const bad of [{...packet,caseId:'FOREIGN'},{...packet,evidenceRevision:8},{...packet,parcelIds:['54321.2.1']},{...packet,gis:{...packet.gis,spatial:{...spatial,parcels:[{id:'54321.2.1'}]}}}])assert.throws(()=>readStage5Evidence({...input,completeCaseEvidence:bad}));
assert.throws(()=>stage5CaseEvidence(root,{...approval,evidenceRevision:8},ev,spatial));
assert.deepEqual(readStage5Evidence({...input,completeCaseEvidence:undefined}).zoneCodes,[]);
assert.deepEqual(readStage5Evidence({...input,completeCaseEvidence:{...packet,gis:{...packet.gis,spatial:{...spatial,geometryVerified:false}}}}).zoneCodes,[]);
const archive=await territorialContext(parsed.zoneCodes);
assert.equal(archive.sources.length,3);
assert(archive.sources.every(x=>x.sourceIntegrityVerified&&!x.applicabilityVerified&&!x.currentVersionCertified));
assert(archive.sources.find(x=>x.id==='designation').passages[0].text.includes('8.13.'));
assert(archive.sources.find(x=>x.id==='amendment').passages[0].text.includes('ЗАПОВЕД № РД-644'));
assert(!archive.sources.find(x=>x.id==='amendment').passages[0].text.includes('ЗАПОВЕД № РД-645'));
assert(archive.sources.find(x=>x.id==='objectives').selectionLimited);
assert.equal((await territorialContext(['BG0000001'])).sources.length,0);
assert.equal((await territorialContext(['BG0000001'])).missing.length,1);
const intro='На основание чл. 2, ал. 2 от Наредбата за ОС уведомявам следното:\n\n';
assert.equal(stripRepeatedStage5Intro(intro+utility),utility);
assert.equal(stripRepeatedStage5Intro(utility+'\n\n'+intro),utility+'\n\n'+intro.trimEnd());
assert(needsStage5VoiceEdit('Следва да се издаде писмо съгласно потвърденото направление.'));
assert(!needsStage5VoiceEdit('От представената документация се установява: '+utility));
for(const phrase of [
 'Проектно предложение:',
 'На основание чл. 2, ал. 2 се издава писмо за инвестиционното предложение.',
 'Писмото следва да съдържа указания към възложителя.',
 'Настоящият проект на административен документ е оформен за последваща експертна проверка.',
 'Пресичане с буферна зона на защитена зона с подаден код.',
 'За буферната защитена зона е подадено официално наименование.',
 'Предвидени са електроснабдяване и водоснабдяване от уличен водопровод.',
 'На основание чл. 2, ал. 2 от Наредбата за условията и реда за извършване на оценка на въздействието върху околната среда.'
])assert(needsStage5VoiceEdit(phrase),'Editorial defect must trigger the existing bounded repair: '+phrase);
assert(!needsStage5VoiceEdit('Имотът попада в защитена зона с официално наименование „Контролна зона – буфер“.'));
assert(!needsStage5VoiceEdit('Електроснабдяването е от съществуваща електрическа мрежа. Водоснабдяването е от уличен водопровод.'));
assert.equal(stripRepeatedStage5Intro('На основание чл. 2, ал. 2 от Наредбата за ОС се констатира следното:\n\n'+utility),utility);

const direction='ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС';
const reason='Проверени са конкретните характеристики по наличните документи и съответните нормативни предпоставки, като изводът остава проект за експертна преценка.';
const stage4=['ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — '+reason,'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — '+reason,'ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — '+reason,'ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — '+reason,'ВОДЕЩО ПРЕДЛОЖЕНИЕ: Писмо за начина на процедиране.',direction].join('\n');
const body={...input,task:'draft_stage5_document',requestId:'KT130-SOURCE-TEST-REQUEST',stage4Version:1,projectOnly:true,expertConfirmed:true,confirmedStage4Text:stage4,selectedPanelLine:direction,documentTitle:'Писмо по чл. 2, ал. 2 от Наредбата за ОС',incomingReference:'ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',subject:'Контролна едноетажна сграда в ПИ 12345.1.2',scope:'Контролна жилищна дейност по предоставените данни.'};
const env={OPENAI_API_KEY:'test',AI_AUTHOR_ACCESS_TOKEN:'test-access',KT123_TEST_LEGACY_MODE:'true'};
const request=data=>new Request('https://example.test/stage5-document',{method:'POST',headers:{Authorization:'Bearer test-access','Content-Type':'application/json'},body:JSON.stringify(data)});
const savedFetch=globalThis.fetch;let calls=0;
globalThis.fetch=async(url,options)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');calls++;
 const req=JSON.parse(options.body),context=JSON.parse(req.input[1].content),facts=context.caseSources||context;
 assert(facts.caseEvidence.utilityExcerpts.some(x=>x.text.includes('уличната канализация')));
 assert.equal(facts.territorialSources.sources.length,3);
 assert(facts.legalTextsExact.some(x=>x.reference==='чл. 2'&&x.quotationFromArchive));
 assert.equal(facts.selectedDirection,direction);
 const text=calls===1?'Проектно предложение:\n\nНа основание чл. 2, ал. 2 се издава писмо за контролната сграда. Писмото следва да съдържа указания към възложителя. Настоящият проект на административен документ е оформен за последваща експертна проверка. '+utility:intro+'От представената документация се установява: '+utility;
 return new Response(JSON.stringify({output:[{content:[{type:'output_text',text}]}]}));
};
try{
 const preview=await worker.fetch(request({...body,sourcePreviewOnly:true}),env);
 assert.equal(preview.status,200);
 const previewData=await preview.json();
 assert.equal(previewData.providerCalled,false);assert.equal(calls,0,'Source inspection never calls provider');
 assert.equal(previewData.sourceReceipt.packetPresent,true);
 assert.equal(previewData.sourceReceipt.documentCount,1);
 assert.equal(previewData.sourceReceipt.territorialSources.length,3);
 assert(previewData.sourceReceipt.utilityTopics.includes('Водоснабдяване'));
 assert.equal(previewData.draft,undefined);
 const bad=await worker.fetch(request({...body,completeCaseEvidence:{...packet,caseId:'FOREIGN'}}),env);
 assert.equal(bad.status,409);assert.equal(calls,0);
 const response=await worker.fetch(request(body),env),result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,2,'Only detected narrator voice invokes one editorial repair');
 assert.equal((result.draft.match(/уведомявам следното/giu)||[]).length,1);
 assert(!needsStage5VoiceEdit(result.draft));
 assert.equal(result.projectOnly,true);assert.equal(result.documentIssued,false);
 assert.equal(result.sourceReceipt.schema,'KT130_STAGE5_SOURCES_V2');
 assert.equal(result.selectedPanelLine,direction);
 assert.equal(body.confirmedStage4Text,stage4,'Confirmed expert source unchanged');
}finally{globalThis.fetch=savedFetch;}
console.log('PASS KT130 Stage5 source transport, late utility passages, case/revision/parcel isolation, primary territorial texts, one intro and bounded institutional edit; no real provider calls');
