#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const p=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const previous=p('V27_27_KT77_03_PI_MASTER_R10_SMART_EDITOR.html');
const next=p('V27_27_KT77_03_R11_EDITOR_ZZT_ARCHIVE.html');
const append='\n<script src="v27-preview/kt77-r11-zzt-supplement.js?v=kt77-r11-01"></script>';
assert.equal(next.replace(append,''),previous,'R11 must not alter R10, R09, GIS, PI MASTER or approved generators');
const a=JSON.parse(p('kt77-r11-zzt-normative-supplement.json'));
assert.equal(a.schema,'kt77-r11-zzt-normative-supplement-v1');
assert.equal(a.policy.zt_never_automatically_reclassifies_ab,true);
assert.equal(a.policy.zt_never_overwrites_zz_expert_conclusion,true);
assert.equal(a.policy.classic_a_b_and_expert,'changes only after three-template controlled content approval');
assert.equal(a.sources.some(x=>x.id==='R11_ZZT_LAW'),true);
assert.equal(a.sources.some(x=>x.id==='R11_EEA_ZT_REGISTER'),true);
assert.equal(a.sources.some(x=>x.id==='R11_ZT_SVETI_DUH'),true);
const law=a.sources.find(x=>x.id==='R11_ZZT_LAW');
assert.equal(law.law_revision_verified,false,'historical official PDF must never be treated as legally up to date');
assert.equal(law.usage,'REFERENCE_WITH_CROSSCHECKED_2023_EDITION_PENDING_FULL_2026_LEGAL_CHAIN');
assert.equal(law.revision_evidence.legal_2026_full_chain_verified,false);
assert.equal(a.legal_verification_summary.document_generator_integration_authorized,false);
const site=a.sources.find(x=>x.id==='R11_ZT_SVETI_DUH');
assert.equal(site.official_area_ha,0.2883);
assert.match(site.area_change_order,/РД-629/);
assert.equal(site.regime_evidence.no_automatic_procedural_conclusion,true);
const node=p('kt77-r11-zzt-supplement.js');
assert(!node.includes('V26NormativeRegister.records.push'),'generator-facing normative records must stay unchanged');
assert(node.includes('legalConclusion:null'),'no generated legal conclusion');
assert(node.includes('scenario_override:null'),'no A/B scenario override');
(async()=>{
 const events=[],state={status:'ready',records:[]};
 const masterRows={
  '46989.205.218':{cadnum:'46989.205.218',zz:[{code:'BG0001031'}],zt:[{category:'Природна забележителност',name:'СВЕТИ ДУХ',area_m2:2878.449,percent:99.832}]},
  '56784.13.102':{cadnum:'56784.13.102',zz:[],zt:[]},
  '47086.6.15':{cadnum:'47086.6.15',zz:[],zt:[{category:'Защитена местност',name:'ТЕСТОВА ЗТ',area_m2:100,percent:10}]}
 };
 const win={V26NormativeRegister:state,KT77PiMasterIndex:{create:()=>({lookup:async id=>masterRows[id]?{status:'FOUND',profile:masterRows[id]}:{status:'NOT_IN_VALIDATED_CADASTRE'}})}};
 const document={baseURI:'https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/v26-test/',readyState:'complete',dispatchEvent:e=>events.push(e.type)};
 const fetch=async()=>({ok:true,json:async()=>a});
 class CustomEvent{constructor(type,detail){this.type=type;this.detail=detail.detail}}
 vm.runInNewContext(node,{window:win,document,fetch,CustomEvent,URL});
 await new Promise(r=>setTimeout(r,5));
 assert.equal(win.KT77R11ZZT.status,'ready');
 assert.equal(win.V26NormativeRegister.records.length,0,'existing legal register records mutated');
 assert(win.V26NormativeRegister.zztSupplement,'supplement missing');
 const result=await win.KT77R11ZZT.findingsForParcel('46989.205.218');
 assert.equal(result.zt.length,1);
 assert.equal(result.zz,1);
 assert.equal(result.zt[0].source_verification_required,false);
 assert.equal(result.legalConclusion,null);
 assert.equal(result.scenario_override,null);
 assert.equal(result.expert_text_change,null);
 assert.equal(result.zt[0].source_url.includes('areaID=97'),true);
 const none=await win.KT77R11ZZT.findingsForParcel('56784.13.102');
 assert.equal(none.zt.length,0);
 const onlyZT=await win.KT77R11ZZT.findingsForParcel('47086.6.15');
 assert.equal(onlyZT.zt.length,1);
 assert.equal(onlyZT.zz,0);
 assert.equal(onlyZT.scenario_override,null);
 assert.equal(onlyZT.legalConclusion,null);
 assert.equal(events.includes('kt77:zzt-supplement-ready'),true);
 console.log('PASS R11: official sources, safe archive adapter, matched SVETI DUH, no generated conclusions, no A/B reclassification, no modifications to R10/R09.');
})().catch(e=>{console.error(e);process.exitCode=1});