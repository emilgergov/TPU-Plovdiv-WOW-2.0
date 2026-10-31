'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const gateway=require('../v26-ai-author-gateway.cjs');
function request(body,method='POST',url='/api/v26/author'){const r=Readable.from([JSON.stringify(body)]);r.method=method;r.url=url;return r;}
function response(){return {status:0,headers:{},body:'',writeHead(status,headers){this.status=status;this.headers=headers;},end(value){this.body=value;}};}
const base={dossierId:'case-56784',editorialBrief:{schema:'KT15_8_EDITORIAL_BRIEF_V1',subject:'Складове и офиси'},gis:{confirmed:true,source:'GIS',findings:[{parcel:'56784.13.102',result:'outside'}]},normative:{confirmed:true,source:'Normative',references:[{act:'ЗБР'}]}};
const draft={schema:'KT15_9_AI_AUTHOR_DRAFT_V1',classical:{construction:'Строителство',electricity:'Електро',water_supply:'Вода',wastewater:'Отпадъчни води'},expert:{text:'Мотивиран проект'},claims:[{text:'Складове',source:'Уведомление',verified:true}],requiresReview:false,editorialTitle:{subject:'Изграждане на складове и офиси',heading:'Изграждане на складове и офиси в ПИ 56784.13.102, гр. Пловдив'}};
(async()=>{
 let calls=0;
 const options={authorized:req=>req.headers?.authorization==='Bearer test',generate:async()=>{calls++;return draft;}};
 let req=request(base),res=response();await gateway.handle(req,res,options);assert.equal(res.status,401);assert.equal(calls,0);
 req=request({...base,gis:{} });req.headers={authorization:'Bearer test'};res=response();await gateway.handle(req,res,options);assert.equal(res.status,422);assert.equal(calls,0);
 req=request(base);req.headers={authorization:'Bearer test'};res=response();await gateway.handle(req,res,options);assert.equal(res.status,200);assert.equal(calls,1);assert.equal(JSON.parse(res.body).requiresExpertApproval,true);
 req=request(base);req.headers={authorization:'Bearer test'};res=response();await gateway.handle(req,res,{...options,generate:async()=>({...draft,editorialTitle:{subject:'Складове',heading:'Складове ПИ 56784.13.102 и ПИ 56784.13.102'}})});assert.equal(res.status,422);
 console.log('PASS KT19.5 gateway: auth, evidence, provider and editorial gates');
})().catch(err=>{console.error(err);process.exitCode=1;});
