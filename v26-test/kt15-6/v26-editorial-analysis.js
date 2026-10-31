/* KT15.8.3: evidence-aware editorial preparation, NOT wired into Word output. */
(function(root){'use strict';
const TOPICS=['construction','electricity','water_supply','wastewater','access'];
const LABELS={construction:'Предмет и предвидени дейности',electricity:'Електроснабдяване',water_supply:'Водоснабдяване',wastewater:'Отпадъчни води',access:'Транспортен достъп'};
const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
const norm=x=>clean(x).toLocaleLowerCase('bg-BG').replace(/[„“"'.,;:!?()]/g,'');
function prepare(subjectCandidates){
 const candidates=Array.isArray(subjectCandidates)?subjectCandidates:[];
 const findings=[],byTopic=Object.fromEntries(TOPICS.map(t=>[t,[]]));
 const seen=new Map();
 function add(topic,text,source,section,verified){
  const value=clean(text),file=clean(source);
  if(!TOPICS.includes(topic)||!value||!file||value.length<20)return;
  if(/\[за попълване\]|\[за експертна проверка\]|_{3,}|\.{4,}/i.test(value))return;
  const key=topic+'|'+norm(value);
  if(seen.has(key)){const f=seen.get(key);if(!f.sources.includes(file))f.sources.push(file);f.verified=f.verified&&verified===true;return;}
  const f={topic,text:value,sources:[file],sections:section?[section]:[],verified:verified===true,reviewRequired:verified!==true};
  seen.set(key,f);byTopic[topic].push(f);findings.push(f);
 }
 for(const candidate of candidates){
  if(!candidate||!candidate.source)continue;
  for(const activity of candidate.activities||[])add('construction',activity,candidate.source,'summary/processes',false);
  for(const entry of candidate.infrastructure||[])add(entry.topic,entry.text,entry.source||candidate.source,entry.section,entry.verified===true);
 }
 const review=[];
 for(const topic of TOPICS){
  const list=byTopic[topic];
  if(!list.length){review.push({topic,reason:'НЯМА ДАННИ',sources:[]});continue;}
  const normalized=new Set(list.map(x=>norm(x.text)));
  if(normalized.size>1)review.push({topic,reason:'Няколко различни описания — необходима е смислова съпоставка',sources:[...new Set(list.flatMap(x=>x.sources))]});
 }
 const editorialPlan=TOPICS.map(topic=>({topic,heading:LABELS[topic],facts:byTopic[topic].map(f=>({text:f.text,sources:f.sources,verified:f.verified})),requiresReview:byTopic[topic].some(f=>f.reviewRequired)||!byTopic[topic].length}));
 return {schema:'KT15_8_EDITORIAL_EVIDENCE_V1',subject:candidates.find(x=>clean(x.title))?.title||'',findings,editorialPlan,review,readyForWord:false,reason:'Необходима е съдържателна редакция и експертно потвърждение; откъсите не са готов административен текст.'};
}
const api=Object.freeze({prepare});root.V26EditorialAnalysis=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
