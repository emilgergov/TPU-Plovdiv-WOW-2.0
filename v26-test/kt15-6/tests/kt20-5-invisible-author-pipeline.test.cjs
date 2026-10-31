'use strict';
const assert=require('node:assert/strict');
const {prepareInvisibleDraft}=require('../v26-invisible-author-pipeline.cjs');
const input={dossierId:'EXAMPLE-1',editorialBrief:{schema:'KT15_8_EDITORIAL_BRIEF_V1',subject:'Складове и офиси'},gis:{confirmed:true,source:'Example GIS',findings:[{parcel:'56784.13.102',result:'outside'}]},normative:{confirmed:true,source:'Example reference',references:[{act:'ЗБР'}]}};
const draft={schema:'KT15_9_AI_AUTHOR_DRAFT_V1',classical:{construction:'Строителство',electricity:'Електро',water_supply:'Вода',wastewater:'Отпадъчни води'},expert:{text:'Самостоятелен мотивиран текст'},claims:[{text:'Примерен факт',source:'Примерна преписка',verified:true}],requiresReview:false,editorialTitle:{subject:'Изграждане на складове и офиси',heading:'Изграждане на складове и офиси в ПИ 56784.13.102'}};
(async()=>{
 let called=0;
 const provider=async messages=>{called++;assert.equal(messages[0].role,'system');return draft};
 const invalid=await prepareInvisibleDraft({...input,gis:{}},provider);
 assert.equal(invalid.stage,'evidence');assert.equal(called,0);
 const noProvider=await prepareInvisibleDraft(input,null);
 assert.equal(noProvider.stage,'provider');
 const ok=await prepareInvisibleDraft(input,provider);
 assert.equal(ok.ready,true);assert.equal(ok.requiresExpertApproval,true);assert.equal(ok.stage,'expert-review');
 assert.equal(called,1);
 const bad=await prepareInvisibleDraft(input,async()=>({...draft,requiresReview:true}));
 assert.equal(bad.stage,'validation');
 console.log('PASS KT20.5: invisible server AI pipeline rejects missing evidence and requires expert approval');
})().catch(e=>{console.error(e);process.exitCode=1});
