/* WOW KT80 / KT52 V52 — read-only structured reconstruction of a proposed activity.
 * Inputs: IN reader, V15 evidence, V50 semantic reader, V51 parameter QA, CH2 expert exclusions.
 * Outputs are source-linked candidate facts, NOT confirmed project facts/legal procedure.
 * The original dossier and approved V49/UI/Classic/GIS workflows remain unchanged.
 */
(function(root){'use strict';
const clean=s=>String(s??'').replace(/\s+/gu,' ').trim();
const lc=s=>clean(s).toLocaleLowerCase('bg');
const RULES=[
 {id:'major_repair',group:'main_activity',label:'Основен ремонт',re:/(?:основен\s+ремонт|капитален\s+ремонт)/iu},
 {id:'current_repair',group:'main_activity',label:'Текущ ремонт',re:/текущ\s+ремонт/iu},
 {id:'reconstruction',group:'main_activity',label:'Реконструкция',re:/реконструкц/iu},
 {id:'construction',group:'main_activity',label:'Изграждане',re:/(?:предвижда\s+се\s+изграждане|изграждане\s+на\s+нов|ново\s+строителство|ще\s+се\s+изгради)/iu},
 {id:'replacement',group:'technical_scope',label:'Подмяна на съоръжения',re:/(?:подмян[а-я]*|замен[а-я]*|демонтаж\s+и\s+монтаж)/iu},
 {id:'installation',group:'technical_scope',label:'Монтаж и оборудване',re:/(?:монтаж|монтиране|монтират\s+се|инсталиране|вграден\s+трансформатор)/iu},
 {id:'electrical_equipment',group:'technical_scope',label:'Електрически съоръжения и инсталации',re:/(?:електрическ[а-я]*\s+съоръжен|електрооборудван|трафопост|трансформатор|мтран|кабелн[а-я]*|прекъсвач|защит[а-я]*\s+от\s+пренапрежен)/iu},
 {id:'water_connection',group:'engineering_links',label:'Водоснабдяване',re:/(?:водоснабдяван|водопроводн|водоизточник|сондаж)/iu},
 {id:'wastewater_connection',group:'engineering_links',label:'Отпадъчни води / заустване',re:/(?:отпадъчни\s+води|заустван|канализац|пречиствателн)/iu},
 {id:'electricity_connection',group:'engineering_links',label:'Електрическо присъединяване',re:/(?:присъединяван[а-я]*\s+към\s+елект|външно\s+електрозахран|електроснабдяван[а-я]*\s+от\s+мреж)/iu},
 {id:'access',group:'engineering_links',label:'Транспортен достъп',re:/(?:транспортен\s+достъп|пътен\s+достъп|нов\s+път|подход\s+към\s+имот)/iu},
 {id:'site',group:'location',label:'Териториално местоположение',re:/(?:имот\s+с\s+идентификатор|поземлен\s+имот|\bПИ\s+\d{5}\.|трафопост|местност|община|землището)/iu}
];
const BARE_FORM=/(?:^(?:посочете|опишете|представете|данни\s+за|информация\s+за|при\s+необходимост)|например|ако\s+е\s+приложимо|попълва\s+се\s+от)/iu;
const neg=/(?:не\s+се\s+предвижда|няма\s+да|не\s+се\s+изгражда|не\s+е\s+предвидено|без\s+заустване)/iu;
const existing=/(?:съществуващ[а-я]*|наличн[а-я]*|преди\s+ремонт|съществуващия|в\s+момента)/iu;
const planned=/(?:предвижда\s+се|ще\s+се|проектн[а-я]*|заявен[а-я]*|нов[а-я]*|за\s+монтаж)/iu;
const qualifier=/(?:предвиден[а-я]*|заявен[а-я]*|проектн[а-я]*|ще\s+се|предвижда\s+се|изпълнява\s+се)/iu;
const GROUPS=[
 ['main_activity','Основна дейност и характер на намесата'],
 ['technical_scope','Технически обхват и оборудване'],
 ['engineering_links','Инженерни връзки и обслужващи дейности'],
 ['location','Местоположение и териториален обхват']
];
function getIgnored(external){return (external||root.KT80CH2Evidence)?.issues?.()||[]}
function affectedByIgnored(file,excerpt,issues){
 const normalized=lc(excerpt);if(!normalized)return false;
 return issues.some(x=>{
  if(x.document!==file)return false;
  const origin=lc(x.original);return !!origin&&(normalized===origin||normalized.includes(origin)||(origin.length>=35&&origin.includes(normalized)));
 });
}
function determineTense(excerpt){
 const p=planned.test(excerpt),e=existing.test(excerpt),n=neg.test(excerpt);
 return n?'ОТРИЦАТЕЛНО ТВЪРДЕНИЕ — ЗА ПРОВЕРКА':p&&e?'СМЕСЕНО / НЕИЗЯСНЕНО':p?'ПРОЕКТНО — КАНДИДАТ':e?'СЪЩЕСТВУВАЩО — КАНДИДАТ':'НЕИЗЯСНЕНО';
}
function normalizeSubject(s){
 let title=clean(s);
 // Do NOT invent a title; only remove an obviously conflicting leading construction verb.
 title=title.replace(/^(?:изграждането|изграждане)\s+на\s+(?=основен\s+ремонт|текущ\s+ремонт|реконструкция)/iu,'');
 return title;
}
function factFromEvidence(key,text,file,page,state,kind){
 return {key,excerpt:clean(text).slice(0,900),file:file||'НЕУСТАНОВЕН ДОКУМЕНТ',
  page:Number.isInteger(page)&&page>0?page:null,sourceType:kind||'EXTRACTED',
  readerState:state||'UNKNOWN',stage:'НЕПОТВЪРДЕН КАНДИДАТ',verified:false};
}
function build(intake,ip,semantic,parameterQA,opts={}){
 const issues=getIgnored(opts.evidenceMaster);
 const rejectedParameters=(parameterQA?.entries||[]).filter(x=>x.evidenceExcluded);
 const evidence=[];
 const sourcePages=Array.isArray(intake?.page_text_index)?intake.page_text_index:[];
 const pageMatch=(file,excerpt)=>{
  const key=lc(excerpt).slice(0,70);if(key.length<25)return null;
  return sourcePages.find(p=>p.file===file&&lc(p.text).includes(key))?.page||null;
 };
 const seen=new Set();
 const push=(key,text,file,page,state,kind)=>{
  const f=factFromEvidence(key,text,file,page,state,kind);
  // Reject a source span containing an explicitly excluded technical value,
  // rather than silently re-introducing that value through another topic.
  const conflictsWithRejected=rejectedParameters.some(p=>p.file===f.file &&
    (p.page===null||f.page===null||p.page===f.page) &&
    p.excerpt && (lc(p.excerpt)===lc(f.excerpt)||lc(f.excerpt).includes(lc(p.excerpt))));
  if(!f.excerpt||BARE_FORM.test(f.excerpt)||affectedByIgnored(f.file,f.excerpt,issues)||conflictsWithRejected)return;
  const fingerprint=[f.key,f.file,lc(f.excerpt)].join('|');
  if(seen.has(fingerprint))return;
  seen.add(fingerprint);evidence.push(f);
 };
 for(const s of semantic?.findings||[]){
  for(const rule of RULES){
   if(rule.re.test(s.excerpt))push(rule.id,s.excerpt,s.file,s.page,s.readerStatus,'PDF_PAGE');
  }
 }
 const files=opts.audit?.records||[];
 for(const topic of ip?.fields||[]){
  for(const src of topic.evidence||[]){
   const state=files.find(f=>f.file===src.document)?.state||'UNKNOWN';
   const p=pageMatch(src.document,src.excerpt);
   for(const rule of RULES)if(rule.re.test(src.excerpt)){
    push(rule.id,src.excerpt,src.document,p,state,'IP_MASTER_SOURCE');
   }
  }
 }
 // Prefer complete, source-backed facts; never treat a filename or generic template title as factual evidence.
 const byRule=new Map();
 for(const r of RULES)byRule.set(r.id,[]);
 for(const f of evidence)byRule.get(f.key)?.push(f);
 const sections=GROUPS.map(([key,label])=>({
  key,label,items:RULES.filter(r=>r.group===key).map(r=>{
   const facts=byRule.get(r.id)||[];
   return {key:r.id,label:r.label,status:facts.length?'ИМА НЕПОТВЪРДЕНИ ОТКЪСИ':'НЯМА ДАННИ В ИЗВЛЕЧЕНОТО',
    evidence:facts, count:facts.length,verified:false}
  })
 }));
 const priority=['major_repair','current_repair','reconstruction','construction'];
 const types=priority.filter(k=>(byRule.get(k)||[]).length);
 // Negative or mixed-temporal assertions cannot establish the nature of the proposal.
 const reliableTypeCandidates=types.filter(k=>byRule.get(k).some(f=>!neg.test(f.excerpt)&&determineTense(f.excerpt)!=='СЪЩЕСТВУВАЩО — КАНДИДАТ'));
 const isMixed=reliableTypeCandidates.length>1;
 const sourceTitle=ip?.proposedSubject&&ip.proposedSubject!=='НЯМА ДАННИ'?ip.proposedSubject:(intake?.subject_candidates||[]).map(x=>typeof x==='string'?x:x?.title).find(Boolean)||'';
 const subjectCandidate=sourceTitle?normalizeSubject(sourceTitle):'НЯМА ДАННИ';
 const technical=Array.isArray(parameterQA?.entries)?parameterQA.entries:[];
 const approved=(opts.parameterMaster||root.KT80ParameterQA)?.allowed?.()||[];
 const rejectedIds=new Set(technical.filter(x=>x.evidenceExcluded).map(x=>x.id));
 const parameterCandidates=technical.filter(x=>!rejectedIds.has(x.id)).map(x=>({
  id:x.id,file:x.file,page:x.page,original:x.original,value:x.value,unit:x.unit,
  role:x.role,roleStatus:x.label,context:x.localContext,reviewStatus:x.reviewStatus,
  compoundDesignation:x.compoundDesignation||null,verified:false
 }));
 const confirmedParameters=approved.filter(x=>!rejectedIds.has(x.id)).map(x=>({...x}));
 const outstanding=[
  ...(issues.length?['Има оспорени/игнорирани доказателства; повторната оценка трябва да изключи съответните откъси.']:[]),
  ...(rejectedParameters.length?['Има експертно изключени технически стойности и свързаните с тях откъси се изключват от реконструкцията.']:[]),
  ...(isMixed?['Едновременно са засечени различни видове основна намеса; необходим е контекстен експертен преглед.']:[]),
  ...(files.some(x=>x.state==='UNSUPPORTED'||x.state==='NOT_READ')?['Има непрочетени материали. Преписката не може да бъде приета за изчерпателно анализирана.']:[]),
  ...(files.some(x=>x.state==='REVIEW_REQUIRED')?['Има документи с OCR/частичен прочит. Необходимо е сравнение с оригиналите.']:[]),
  ...(!reliableTypeCandidates.length?['Видът на основната намеса не е надеждно установен.']:[]),
  ...(parameterCandidates.some(x=>x.role==='ambiguous'||x.compoundDesignation)?['Част от техническите параметри са с неясен контекст или съставни означения.']:[])
 ];
 return Object.freeze({
  schema:'KT80-KT52-PROJECT-RECONSTRUCTION-V52',caseName:intake?.archive_name||null,
  sections,sourceCount:evidence.length,sourceDocuments:[...new Set(evidence.map(x=>x.file))],
  suggestedActivityTypes:reliableTypeCandidates,activityTypeAmbiguous:isMixed,
  subjectCandidate,subjectCandidateVerified:false,
  parameterCandidates,confirmedParameters,
  unresolved:outstanding,
  expertConfirmed:false,mayDetermineProcedure:false,mayGenerateFinalSubject:false,
  disclaimer:'Това е предварителна реконструкция от извлечените документи. Само експертът може да потвърди предмета и обхвата. Няма автоматична процедура, правна квалификация или факт без оригинален източник.'
 });
}
function elem(tag,value,cls){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n}
function render(data){
 const host=document.getElementById('kt80KT52Reconstruction');if(!host)return;
 host.replaceChildren();host.append(elem('h3','КТ52 · Реконструкция на инвестиционното намерение'));
 host.append(elem('p',data.disclaimer,'kt80-ch21-notice'));
 host.append(elem('p','Кандидат-факти: '+data.sourceCount+' · Документи с откъси: '+data.sourceDocuments.length+
  ' · Основна намеса: '+(data.suggestedActivityTypes.join(', ')||'НЕУСТАНОВЕНА')+
  ' · Технически параметри за проверка: '+data.parameterCandidates.length+'.','kt80-ch21-summary'));
 host.append(elem('p','Предварителен кандидат за предмет (НЕПРИЕТ): '+data.subjectCandidate,'kt80-kt52-candidate'));
 if(data.unresolved.length){
  const note=document.createElement('details');note.className='kt80-kt52-uncertainty';note.open=true;
  note.append(elem('summary','Неизяснени обстоятелства и ограничения ('+data.unresolved.length+')'));
  for(const item of data.unresolved)note.append(elem('p','⚠ '+item));host.append(note);
 }
 for(const section of data.sections){
  const details=document.createElement('details');details.className='kt80-kt52-section';
  details.append(elem('summary',section.label));
  for(const item of section.items){
   const topic=document.createElement('details');topic.className='kt80-kt52-topic';
   topic.append(elem('summary',item.label+' · '+item.status+' · '+item.count+' откъса'));
   if(!item.count)topic.append(elem('p','Липса на извлечен откъс, а не доказана липса на дейност.'));
   for(const fact of item.evidence.slice(0,25)){
    const line=elem('div',undefined,'kt80-kt52-fact');
    line.append(elem('p','„'+fact.excerpt+'“'));
    line.append(elem('p',fact.file+(fact.page?' · стр. '+fact.page:' · страница НЕУСТАНОВЕНА')+' · '+determineTense(fact.excerpt)+' · '+fact.readerState,'kt80-ch21-source'));
    if(fact.page){const b=elem('button','◉ Към оригинала · стр. '+fact.page,'kt80-ch2-open');b.type='button';b.addEventListener('click',()=>root.KT80DossierOriginals?.openOriginal?.(fact.file,fact.page));line.append(b)}
    topic.append(line);
   }
   details.append(topic);
  }
  host.append(details);
 }
 const list=document.createElement('details');list.className='kt80-kt52-section';
 list.append(elem('summary','Технически параметри и допустимост за последващо конструиране'));
 list.append(elem('p','Кандидати за преглед: '+data.parameterCandidates.length+' · Изрично експертно потвърдени: '+data.confirmedParameters.length+
 ' · Изключените стойности не се използват. Другите стойности остават само кандидати.'));
 host.append(list);
}
root.KT80KT52=Object.freeze({build,render,normalizeSubject,determineTense,affectedByIgnored});
})(window);
