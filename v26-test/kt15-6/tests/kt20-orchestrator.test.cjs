'use strict';
const assert=require('node:assert/strict');
const {assemble}=require('../v26-kt20-orchestrator.cjs');
const input={dossierId:'EXAMPLE-56784',editorialBrief:{schema:'KT15_8_EDITORIAL_BRIEF_V1',subject:'Складове и офиси'},gis:{confirmed:true,source:'Example GIS',findings:[{parcel:'56784.13.102',result:'outside'}]},normative:{confirmed:true,source:'Example reference',references:[{act:'ЗБР'}]}};
const draft={schema:'KT15_9_AI_AUTHOR_DRAFT_V1',classical:{construction:'Строителство',electricity:'Електро',water_supply:'Вода',wastewater:'Отпадъчни води'},expert:{text:'Самостоятелен мотивиран текст'},claims:[{text:'Примерно твърдение',source:'Примерна преписка',verified:true}],requiresReview:false,editorialTitle:{subject:'Изграждане на складове и офиси',heading:'Изграждане на складове и офиси в ПИ 56784.13.102, гр. Пловдив'}};
const approval={approved:true,dossierId:'EXAMPLE-56784',reviewer:'Test expert'};
let invoked=0;
const renderers={gisPdf:async()=>{invoked++;return Buffer.from('%PDF-1.4 sample')},normativePdf:async()=>{invoked++;return Buffer.from('%PDF-1.4 sample')},classicDocx:async slots=>{invoked++;assert.equal(slots.templatePolicy,'PRESERVE_ORIGINAL_A_B');return Buffer.from('PK\x03\x04sample')},expertDocx:async slots=>{invoked++;assert.equal(slots.overviewMapPolicy,'USE_CONFIRMED_GIS_MAP_ONLY');return Buffer.from('PK\x03\x04sample')}};
(async()=>{
 const rejected=await assemble(input,draft,{...approval,approved:false},renderers);
 assert.equal(rejected.ready,false);assert.equal(invoked,0);
 const incomplete=await assemble({...input,gis:{}},draft,approval,renderers);
 assert.equal(incomplete.stage,'evidence');assert.equal(invoked,0);
 const result=await assemble(input,draft,approval,renderers);
 assert.equal(result.ready,true);assert.equal(invoked,4);
 assert.equal(result.files.length,5);assert.equal(result.bytes.readUInt32LE(0),0x04034b50);
 console.log('PASS KT20: evidence to approved Word slots to four mock renderers to ZIP');
})().catch(err=>{console.error(err);process.exitCode=1});
