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
/* A source-aware editorial brief, not a substitute for semantic AI or expert approval.
   Explicitly distinguishes reported project intentions from established facts. */
function brief(subjectCandidates){
 const prepared=prepare(subjectCandidates);
 const title=clean(prepared.subject);
 const topics=prepared.editorialPlan;
 const descriptions=topics.map(section=>{
  const entries=section.facts;
  const sources=[...new Set(entries.flatMap(e=>e.sources))];
  const note=entries.length===0?'НЯМА ДАННИ':entries.length>1?'Няколко сведения — необходима е смислова съпоставка':'Едно извлечено сведение — необходима е проверка в документа';
  return {topic:section.topic,heading:section.heading,
   reported:entries.map(e=>({excerpt:e.text,sources:e.sources,verified:e.verified})),
   sources,editorialNote:note,approvedText:null};
 });
 const checks=[
  ...prepared.review.map(r=>({topic:r.topic,issue:r.reason,sources:r.sources})),
  ...prepared.findings.filter(f=>!f.verified).map(f=>({topic:f.topic,issue:'Непотвърден извлечен откъс',sources:f.sources}))
 ];
 return {schema:'KT15_8_EDITORIAL_BRIEF_V1',
  subject:title||'[ЗА ЕКСПЕРТНА ПРОВЕРКА — предмет на ИП]',
  purpose:'Основа за самостоятелно професионално редактиране, не готов текст за Word.',
  classical:{style:'Кратък, каноничен административен стил; четири абзаца, само проверени факти.',paragraphs:null},
  expert:{style:'Свързано експертно изложение с отделна аргументация, без механично повтаряне на четирите абзаца.',sections:descriptions},
  checks,readyForWord:false};
}
/* Controlled prose for independently verified, explicitly approved case facts.
   This does not claim to perform generative expert/legal reasoning. */
function composeApproved(input){
 const data=input||{}, facts=Array.isArray(data.facts)?data.facts:[];
 const allowed=new Set(TOPICS), selected=Object.fromEntries(TOPICS.map(t=>[t,[]]));
 const blocked=[];
 for(const fact of facts){
  if(!fact||!allowed.has(fact.topic))continue;
  const value=clean(fact.approvedText),source=clean(fact.source);
  if(fact.verified!==true||fact.approved!==true||!source||!value){
   blocked.push({topic:fact.topic,reason:'Липсва изрично потвърждение, проверен източник или одобрен текст'});continue;
  }
  if(/\[|\]|ПРЕДСТОИ|НЯМА ДАННИ/i.test(value)){
   blocked.push({topic:fact.topic,reason:'Недопустим заместител вместо фактическо изложение'});continue;
  }
  if(!selected[fact.topic].some(x=>norm(x.text)===norm(value)))selected[fact.topic].push({text:value,source});
 }
 const join=items=>items.map(x=>x.text.replace(/[;,.\s]+$/,'')).join('. ')+(items.length?'.':'');
 const para=topic=>join(selected[topic]);
 const classical={
  construction:para('construction'),
  electricity:para('electricity'),
  waterSupply:para('water_supply'),
  wastewater:para('wastewater')
 };
 const expertSections=TOPICS.filter(t=>selected[t].length).map(topic=>({
  topic,heading:LABELS[topic],text:para(topic),sources:[...new Set(selected[topic].map(x=>x.source))]
 }));
 const complete=Object.values(classical).every(Boolean);
 return {schema:'KT15_8_APPROVED_PROSE_V1',classical,expertSections,blocked,
  complete,readyForWord:complete&&blocked.length===0,
  warning:'Текстът е съставен само от изрично одобрени формулировки; не представлява автоматична експертна или правна преценка.'};
}
const api=Object.freeze({prepare,brief,composeApproved});root.V26EditorialAnalysis=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
