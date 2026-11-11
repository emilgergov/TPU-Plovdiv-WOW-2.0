/* KT80 CH2 V44 — preliminary, source-traceable dossier evidence passport.
 * Consumes V26 intake and IP MASTER V15; does not make legal decisions or verify claims.
 * All excerpts remain candidates, not proven facts. */
(function(root){'use strict';
const TOPICS=[
 ['activity','Предмет и основна дейност'],
 ['construction','Строителство, оборудване и съпътстващи дейности'],
 ['capacity','Капацитет и технически параметри'],
 ['area','Териториален обхват и площ'],
 ['water_supply','Водоснабдяване'],
 ['wastewater','Отпадъчни води и заустване'],
 ['electricity','Електрозахранване'],
 ['access','Транспортен достъп'],
 ['emissions','Емисии и въздействия'],
 ['waste','Отпадъци']
];
const t=x=>String(x??'').replace(/\s+/gu,' ').trim();
const norm=x=>t(x).toLocaleLowerCase('bg');
const reviewIssues=new Map();
const reviewHistory=[];
let currentPassport=null;
const evidenceId=(topic,document,excerpt)=>JSON.stringify([topic,document,excerpt]);
function reportIssue(id,record){
 reviewIssues.set(id,{...record,id,status:'ИЗКЛЮЧЕНО ОТ АВТОМАТИЧНИ ИЗВОДИ',time:new Date().toISOString()});
 if(typeof root.KT80InvalidateEvidenceConclusions==='function')root.KT80InvalidateEvidenceConclusions();
 if(currentPassport)render(currentPassport);
}
function ignoreEvidence(id,record){
 const prior=reviewIssues.get(id);
 const current={...record,id,status:'ЕКСПЕРТНО ИГНОРИРАН',decision:'EXPERT_IGNORED',excludedFromAI:true,expertResponsibility:true,actor:'ЕКСПЕРТ (локална сесия)',time:new Date().toISOString()};
 reviewIssues.set(id,current);reviewHistory.push({previous:prior||null,current:{...current}});
 if(typeof root.KT80InvalidateEvidenceConclusions==='function')root.KT80InvalidateEvidenceConclusions();
 if(currentPassport)render(currentPassport);
}
function issues(){return [...reviewIssues.values()].map(x=>({...x}))}
function history(){return reviewHistory.map(x=>({...x,current:{...x.current}}))}
function isExcluded(topic,document,excerpt){const x=reviewIssues.get(evidenceId(topic,document,excerpt));return !!(x&&x.excludedFromAI)}
function usableEvidence(topic){const field=currentPassport?.topics.find(x=>x.key===topic);return (field?.sources||[]).filter(x=>!isExcluded(topic,x.document,x.excerpt)).map(x=>({...x}))}
function resetIssues(){reviewIssues.clear();reviewHistory.length=0;currentPassport=null;}

function polarity(text){
 const x=norm(text);
 const neg=/(?:не се предвижда|няма да|не се изгражда|не се използва|не е предвидено|не са предвидени|не се осъществява|без заустване)/u.test(x);
 const pos=/(?:предвижда се|ще се|се изгражда|ще бъде|ще има|се осигурява|ще се използва|осъществява се|заустване във|заустване в)/u.test(x);
 return neg&&!pos?'negative':pos&&!neg?'positive':'unspecified';
}
function build(intake,ip,audit){
 const files=Array.isArray(audit?.records)?audit.records:[];
 const byFile=new Map(files.map(x=>[x.file,x]));
 const fields=Array.isArray(ip?.fields)?ip.fields:[];
 const pages=Array.isArray(intake?.page_text_index)?intake.page_text_index:[];
 function pageCandidate(document,excerpt){
  const sample=norm(excerpt);
  if(sample.length<28)return null;
  const hint=sample.slice(0,Math.min(75,sample.length));
  const match=pages.find(p=>p.file===document&&norm(p.text).includes(hint));
  return match?.page||null;
 }
 const byTopic=new Map(fields.map(x=>[x.key,x]));
 const topics=TOPICS.map(([key,label])=>{
  const field=byTopic.get(key);
  const unique=new Map();
  for(const e of field?.evidence||[]){
   const excerpt=t(e.excerpt),document=t(e.document)||'НЕУСТАНОВЕН ДОКУМЕНТ';
   if(!excerpt)continue;
   const id=document+'|'+norm(excerpt);
   if(!unique.has(id))unique.set(id,{document,excerpt,kind:t(e.kind),polarity:polarity(excerpt),readStatus:byFile.get(document)?.state||'UNKNOWN',page:pageCandidate(document,excerpt),verified:false,issueId:evidenceId(key,document,excerpt)});
  }
  const sources=[...unique.values()].slice(0,16);
  const documents=[...new Set(sources.map(x=>x.document))];
  const coverage=root.KT80EvidenceCoverage?.summarize(audit,documents)||null;
  const coverageLabel=coverage?root.KT80EvidenceCoverage.statusLabel(coverage,sources.length>0):(sources.length?'ИМА ОТКЪСИ · НЕПОТВЪРДЕНИ':'НЯМА ДАННИ В ИЗВЛЕЧЕНОТО');
  // Do not treat different statements as contradictions merely because there are multiple texts.
  // Opposite explicit assertions across excerpts are only a candidate for expert review.
  const possibleOpposition=sources.some(x=>x.polarity==='positive')&&sources.some(x=>x.polarity==='negative');
  return {key,label,status:sources.length?'ИМА ОТКЪСИ · НЕПОТВЪРДЕНИ':'НЯМА ДАННИ',
    sources,documentCount:documents.length,possibleOpposition,coverage,coverageLabel,
    reviewRequired:possibleOpposition||sources.some(x=>x.readStatus!=='TEXT_EXTRACTED'),
    verified:false};
 });
 const unread=files.filter(x=>x.state==='UNSUPPORTED'||x.state==='NOT_READ');
 const caution=files.filter(x=>x.state==='REVIEW_REQUIRED');
 const possibleConflicts=topics.filter(x=>x.possibleOpposition);
 const dossierConflicts=(intake?.dossier_analysis?.findings||[]).filter(x=>x.conflict===true);
 const semanticFlags=(intake?.semantic_review?.flags||[]).filter(x=>x.kind==='conflict');
 const leading=intake?.classification?.leading_candidates||[];
 const notice={blocked:unread.length>0,unread:unread.map(x=>({file:x.file,reason:x.readerStatus})),review:caution.map(x=>x.file),
  missingTopics:topics.filter(x=>!x.sources.length).map(x=>x.label),leadingParcelCandidates:leading.length,
  pageTraceVerified:false,pageCandidateCount:topics.reduce((n,x)=>n+x.sources.filter(y=>y.page!==null).length,0)};
 return Object.freeze({
  schema:'KT80-CH2-EVIDENCE-PASSPORT-V44',caseName:t(intake?.archive_name),generatedFrom:'V26 IN + IP MASTER V15 + Ч1',
  topics,fileInventory:files.map(x=>({file:x.file,state:x.state,reason:x.readerStatus||''})),filesCount:files.length,withEvidence:topics.filter(x=>x.sources.length).length,missingTopics:notice.missingTopics.length,
  uniqueExcerpts:topics.reduce((n,x)=>n+x.sources.length,0),unreadCount:unread.length,ocrReviewCount:caution.length,
  reviewFlags:{oppositePhrasing:possibleConflicts.map(x=>x.label),existingDossierConflicts:dossierConflicts.map(x=>({topic:x.key,status:x.status})),semantic:semanticFlags.map(x=>x.label)},
  limitations:notice,
  status:unread.length?'НЕПЪЛНА ПРЕПИСКА':caution.length||!leading.length?'ЗА ЕКСПЕРТНА ПРОВЕРКА':'ПРЕДВАРИТЕЛНО ИЗВЛЕЧЕНО',
  requiredStatement:'Откъсите са кандидат-доказателства. Няма автоматично потвърдени факти, прецизна страницова проследимост или окончателна правна квалификация.',
  acceptedForAutomaticProcedure:false
 });
}
function node(tag,text,css){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(css)e.className=css;return e}
function addOriginalButton(parent,file,page,label){
 const btn=node('button',label||('◉ Оригинал'+(page?' · стр. '+page:'')),'kt80-ch2-open');btn.type='button';
 btn.title='Отвори първичния документ за проверка';
 btn.addEventListener('click',()=>{if(root.KT80DossierOriginals?.openOriginal)root.KT80DossierOriginals.openOriginal(file,page||null);});
 parent.append(btn);
}
function render(result){
 currentPassport=result;
 const host=document.getElementById('kt80CH2Passport');if(!host)return;
 host.replaceChildren();host.append(node('h3','Ч2 · Доказателствен паспорт на преписката'));
 host.append(node('p','Теми с откъси: '+result.withEvidence+'/'+result.topics.length+' · Изходни откъси: '+result.uniqueExcerpts+
 ' · Непрочетени файлове: '+result.unreadCount+' · За OCR/документна проверка: '+result.ocrReviewCount+'.','kt80-ch2-summary'));
 host.append(node('p',result.requiredStatement,'kt80-ch2-warning'));
 if(reviewIssues.size){const ignored=[...reviewIssues.values()].filter(x=>x.decision==='EXPERT_IGNORED').length;
 host.append(node('p','ДОКАЗАТЕЛСТВЕН КОНТРОЛ: '+reviewIssues.size+' изключени/оспорени откъса, от които '+ignored+' експертно игнорирани. AI няма право да ги използва в следващи изводи. Старият кандидат за предмет е обезсилен до нов анализ или изрично самостоятелно експертно формулиране.','kt80-ch2-critical'));}

 if(result.unreadCount)host.append(node('p','КРИТИЧНО: Има непрочетени материали. Не може да се приема, че предметът и обхватът са пълно доказани.','kt80-ch2-critical'));
 if(result.limitations.leadingParcelCandidates===0)host.append(node('p','Няма автоматично установен водещ ПИ. Това не доказва, че ИП няма териториален обхват; проверете вида на преписката и документите.','kt80-ch2-warning'));
 if(result.reviewFlags.oppositePhrasing.length||result.reviewFlags.existingDossierConflicts.length||result.reviewFlags.semantic.length){
  const d=document.createElement('details');d.className='kt80-ch2-alert';d.open=true;
  d.append(node('summary','Сигнали за експертна проверка на противоречия'));
  for(const x of result.reviewFlags.oppositePhrasing)d.append(node('p','Потенциално противоположни формулировки: '+x+' — сравнете оригиналните документи.'));
  for(const x of result.reviewFlags.existingDossierConflicts)d.append(node('p','Съществуващ анализ: '+x.topic+' · '+x.status));
  for(const x of result.reviewFlags.semantic)d.append(node('p','Семантичен сигнал: '+x));
  host.append(d);
 }
 for(const item of result.topics){
  const wrap=node('div',undefined,'kt80-ch2-topic-wrap');
  const quick=node('div',undefined,'kt80-ch2-topic-header');
  const d=document.createElement('details');d.className='kt80-ch2-topic';
  d.append(node('summary',item.label+' · '+item.coverageLabel+' · '+item.sources.length+' откъса'));
  if(item.coverage){const cover=node('p',root.KT80EvidenceCoverage.brief(item.coverage),'kt80-coverage-detail');d.append(cover)}
  quick.append(d);
  if(item.sources.length){
   const known=item.sources.find(x=>result.fileInventory.some(f=>f.file===x.document));
   if(known)addOriginalButton(quick,known.document,known.page,'◉ Към източника'+(known.page?' · стр. '+known.page:''));
  }else{
   const toggle=node('button','⌕ Провери документи','kt80-ch2-open kt80-ch2-check');toggle.type='button';
   const suggestions=node('div',undefined,'kt80-ch2-missing-files');suggestions.hidden=true;
   suggestions.append(node('p','НЯМА ДАННИ означава, че не е открит надежден откъс по темата. Не е установен конкретен източник. Проверете оригиналите, без да приемате липса на дейност.'));
   if(!result.fileInventory.length)suggestions.append(node('p','Няма зареден документен инвентар.'));
   for(const f of result.fileInventory){
    const row=node('div',undefined,'kt80-ch2-missing-row');
    row.append(node('span',f.file+' · '+(f.state==='TEXT_EXTRACTED'?'прочетен':f.state==='REVIEW_REQUIRED'?'за проверка':'непрочетен')));
    addOriginalButton(row,f.file,null,'◉ Отвори');
    suggestions.append(row);
   }
   toggle.setAttribute('aria-expanded','false');
   toggle.addEventListener('click',()=>{suggestions.hidden=!suggestions.hidden;toggle.setAttribute('aria-expanded',String(!suggestions.hidden))});
   quick.append(toggle);wrap.append(quick,suggestions);
  }
  if(item.sources.length)wrap.append(quick);
  if(!item.sources.length)d.append(node('p','НЯМА ДАННИ в извлеченото. Липсата на откъс не означава отсъствие на дейност или въздействие.'));
  for(const src of item.sources){
   const card=node('div',undefined,'kt80-ch2-evidence');
   const sourceLabel=src.readStatus==='TEXT_EXTRACTED'?'🟢 ПРОЧЕТЕН (извлечен текст)':src.readStatus==='REVIEW_REQUIRED'?'🟡 ЗА ПРОВЕРКА (OCR или частичен прочит)':src.readStatus==='NOT_READ'||src.readStatus==='UNSUPPORTED'?'🔴 НЕПРОЧЕТЕН':'◌ НЕУСТАНОВЕН СТАТУС НА ИЗТОЧНИКА';
   const head=node('div','Източник: '+src.document+(src.page?' · стр. '+src.page+' (предварително установена)':' · страница: НЯМА ДАННИ')+' · '+sourceLabel,'kt80-ch2-source');
   const flagged=reviewIssues.get(src.issueId);
   card.append(head,node('p','„'+src.excerpt+'“'));
   if(flagged){
    card.append(node('p',flagged.decision==='EXPERT_IGNORED'?'🔴 ЕКСПЕРТНО ИГНОРИРАН — изключен от AI доказателствата. Отговорност за това изключване: експертът.':'🔴 ОСПОРЕН ПРОЧИТ — откъсът не може да бъде използван като доказателство.','kt80-ch2-critical'));
    if(flagged.corrected)card.append(node('p','Експертно предложен верен текст (неинтегриран): „'+flagged.corrected+'“','kt80-ch2-correction'));
    card.append(node('p','Причина: '+flagged.reason,'kt80-ch2-correction'));
   }
   addOriginalButton(card,src.document,src.page);
   const flag=node('button',flagged?'✎ Редакция на сигнала':'⚑ Проблем с прочита','kt80-ch2-open kt80-ch2-flag');
   flag.type='button';flag.setAttribute('aria-expanded','false');
   const edit=node('div',undefined,'kt80-ch2-correction-editor');edit.hidden=true;
   const hint=node('p','Сравнете с оригинала. Посочете проблема; при възможност въведете вярното изписване. Първичният документ и извлеченият OCR текст не се променят.','kt80-ch2-footnote');
   const reason=node('textarea',undefined,'kt80-ch2-reason');reason.rows=2;reason.placeholder='Каква е грешката в прочита?';reason.setAttribute('aria-label','Причина за оспорване');reason.value=flagged?.reason||'';
   const correction=node('textarea',undefined,'kt80-ch2-corrected');correction.rows=3;correction.placeholder='Коректен откъс от оригинала (по избор)';correction.setAttribute('aria-label','Коригиран текст от оригинала');correction.value=flagged?.corrected||'';
   const submit=node('button','Запиши проблем · блокирай изводите','kt80-ch2-open kt80-ch2-flag');submit.type='button';
   const feedback=node('p','', 'kt80-ch2-footnote');
   submit.addEventListener('click',()=>{
    if(!t(reason.value)){feedback.textContent='Необходимо е да опишете проблема с прочита.';return}
    reportIssue(src.issueId,{topic:item.key,document:src.document,page:src.page,original:src.excerpt,reason:t(reason.value).slice(0,1000),corrected:t(correction.value).slice(0,3000)});
   });
   const ignore=node('button','Експертно игнориране','kt80-ch2-open kt80-ch2-ignore');ignore.type='button';
   const note=node('p','Изрично експертно решение: посоченият откъс ще бъде изключен от автоматичните доказателства. Първичният файл се запазва. Старият AI проект се обезсилва; не се приема автоматично за достоверен.','kt80-ch2-footnote');
   ignore.addEventListener('click',()=>{
    if(!t(reason.value)){feedback.textContent='Посочете причина за експертното игнориране.';return}
    ignoreEvidence(src.issueId,{topic:item.key,document:src.document,page:src.page,original:src.excerpt,reason:t(reason.value).slice(0,1000),corrected:t(correction.value).slice(0,3000)});
   });
   edit.append(hint,reason,correction,submit,ignore,note,feedback);
   flag.addEventListener('click',()=>{edit.hidden=!edit.hidden;flag.setAttribute('aria-expanded',String(!edit.hidden))});
   card.append(flag,edit);d.append(card);
  }
  if(item.possibleOpposition)d.append(node('p','ВЪЗМОЖНО ПРОТИВОРЕЧИЕ — установени са утвърдителна и отрицателна формулировка; необходим е контекстен преглед.','kt80-ch2-critical'));
  host.append(wrap);
 }
 const footer=node('p','Проследимост до документ и откъс: налична. Предварително намерени PDF страници: '+result.limitations.pageCandidateCount+'. Страниците, таблиците, приложенията, редакциите и точността на OCR все още изискват експертна проверка.','kt80-ch2-footnote');
 host.append(footer);
}
function reset(){resetIssues();const host=document.getElementById('kt80CH2Passport');if(host){host.replaceChildren();host.textContent='Доказателственият паспорт ще се изгради след обработка на преписката.'}}
root.KT80CH2Evidence=Object.freeze({build,render,reset,issues,history,isExcluded,usableEvidence,ignoreEvidence,hasBlockingIssues:()=>reviewIssues.size>0});
document.addEventListener('kt80:case-reset',reset);
})(window);
