/* KT80 KT51 / V51: contextual technical-parameter QA. Additive to accepted V50.
   No inferred official facts; only original excerpts, preliminary role, duplicate flags,
   expert review decisions and direct original-page links. Session-local only. */
(function(root){'use strict';
const tidy=s=>String(s??'').replace(/\s+/gu,' ').trim();
const lower=s=>tidy(s).toLocaleLowerCase('bg');
const weak=/(?:може\s+да|например|при\s+необходимост|ориентировъчно|приблизително|следва\s+да\s+се\s+посочи)/iu;
const proposal=/(?:проектн[а-я]*|заявен[а-я]*|предвижда\s+се|ще\s+се|предвиден[а-я]*|нов[а-я]*|за\s+изграждане|за\s+монтаж)/iu;
const existing=/(?:съществуващ[а-я]*|доставян[а-я]*|наличн[а-я]*|настоящ[а-я]*|в\s+момента|преди\s+ремонт|стар[а-я]*|демонтаж)/iu;
const replace=/(?:подмен[а-я]*|замен[а-я]*|ремонт|реконструкц)/iu;
const categoryByUnit={'kW':'Активна мощност','kVA':'Привидна мощност','MW':'Активна мощност','kV':'Напрежение','mm²':'Сечение','m²':'Площ','%':'Процент / натоварване'};
const titleByRole={existing:'СЪЩЕСТВУВАЩО / ИЗХОДНО',project:'ПРОЕКТНО / ПРЕДВИДЕНО',replacement:'РЕМОНТ / ПОДМЯНА',ambiguous:'НЕИЗЯСНЕН КОНТЕКСТ'};
let current=null;
const decisions=new Map();
const auditTrail=[];
function identifier(p){return JSON.stringify([p.file,p.page,p.value,p.unit,tidy(p.excerpt)])}
function context(excerpt,original){
 const t=tidy(excerpt),idx=t.indexOf(original),span=idx>=0?t.slice(Math.max(0,idx-130),Math.min(t.length,idx+original.length+90)):t.slice(0,240);
 // Split distinct clauses so the old and proposed values in the same sentence do not
 // accidentally inherit each other's role. Ambiguous clauses still remain unverified.
 const clauses=t.split(/(?<=[,;])\s*(?=(?:а\s+|при\s+|заявена|проектна|съществуваща|доставяна))|\s+—\s+/iu);
 const clause=clauses.find(part=>part.includes(original))||span;
 const hasExisting=existing.test(clause),hasProject=proposal.test(clause),hasReplacement=replace.test(clause);
 const role=hasExisting&&hasProject?'ambiguous':hasProject?'project':hasExisting?'existing':hasReplacement?'replacement':'ambiguous';
 return {role,label:titleByRole[role],localContext:clause.slice(0,260),hasMixedTense:hasExisting&&hasProject,caution:weak.test(clause),requiresReview:true};
}
function evaluate(reader,audit){
 const source=Array.isArray(reader?.parameters)?reader.parameters:[];
 const records=Array.isArray(audit?.records)?audit.records:[];
 const entries=source.map(p=>{
  const c=context(p.excerpt,p.original),key=identifier(p),file=records.find(r=>r.file===p.file);
  const compound=p.unit==='kV'?p.excerpt.match(/(\d{1,3}(?:[.,]\d+)?)\s*\/\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:kV|кВ)/iu):null;
  return {...p,...c,id:key,type:categoryByUnit[p.unit]||'Непозната мерна единица',
    compoundDesignation:compound?compound[0]:null,
    readerState:file?.state||p.readerStatus||'UNKNOWN',
    reviewStatus:decisions.get(key)?.status||'НЕПОТВЪРДЕНО',duplicateGroup:null,
    evidenceExcluded:decisions.get(key)?.status==='EXPERT_REJECTED',
    verified:false};
 });
 // Group equal numbers only within same physical quantity and file; repetitions are
 // review warnings and never merged across pages/contexts automatically.
 const bins=new Map();
 for(const p of entries){const k=[p.file,p.unit,p.value].join('|');if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p)}
 let duplicateGroups=0;
 for(const [key,b] of bins){if(b.length>1){duplicateGroups++;for(const p of b)p.duplicateGroup=key}}
 const counts={existing:0,project:0,replacement:0,ambiguous:0};
 for(const p of entries)counts[p.role]++;
 const risk=entries.filter(p=>p.caution||p.hasMixedTense||p.readerState!=='TEXT_EXTRACTED'||p.duplicateGroup).length;
 return Object.freeze({schema:'KT80-CH21-PARAMETER-QA-V51',caseName:reader?.caseName||null,
  total:entries.length,entries,counts,duplicateGroups,riskCount:risk,
  excludedCount:entries.filter(p=>p.evidenceExcluded).length,
  confirmedCount:entries.filter(p=>decisions.get(p.id)?.status==='EXPERT_CONFIRMED').length,
  warning:'Контекстът (съществуващо/проектно) е автоматична хипотеза, не потвърден факт. При смесен текст се изисква преглед на оригинала. Съвпадащи стойности не се сумират и не се считат за отделни съоръжения.',
  automaticLegalUse:false});
}
function element(tag,value,cls){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n}
function recordDecision(p,status,reason){
 const explanation=tidy(reason);
 if(!explanation)return false;
 const event={id:p.id,decision:status,reason:explanation.slice(0,1200),file:p.file,page:p.page,original:p.original,excerpt:p.excerpt,at:new Date().toISOString(),actor:'ЕКСПЕРТ (локална сесия)'};
 decisions.set(p.id,{status,reason:event.reason,at:event.at});
 auditTrail.push(event);
 if(typeof root.KT80InvalidateEvidenceConclusions==='function')root.KT80InvalidateEvidenceConclusions();
 if(root.KT80CH21Draft){current=evaluate(root.KT80CH21Draft,root.KT80DossierAudit);render(current)}
 return true;
}
function render(qa){
 current=qa;const host=document.getElementById('kt80CH21ParameterQA');if(!host)return;host.replaceChildren();
 host.append(element('h3','КТ51 · Контрол на техническите параметри'));
 host.append(element('p','Параметри: '+qa.total+' · Проектни кандидати: '+qa.counts.project+' · Съществуващи кандидати: '+qa.counts.existing+' · Смесен/неясен контекст: '+qa.counts.ambiguous+' · Повторения за преглед: '+qa.duplicateGroups+' групи.','kt80-ch21-summary'));
 host.append(element('p',qa.warning,'kt80-ch21-notice'));
 const main=document.createElement('details');main.className='kt80-ch21-details';
 main.append(element('summary','Контекст на всеки параметър · проверка по страница'));
 const ordered=[...qa.entries].sort((a,b)=>a.file.localeCompare(b.file,'bg')||a.page-b.page||a.type.localeCompare(b.type,'bg'));
 if(!ordered.length)main.append(element('p','Няма извлечени параметри. Липсата не доказва отсъствие на технически данни.'));
 for(const p of ordered){
  const row=element('section',undefined,'kt80-param-review-row');
  const chosen=decisions.get(p.id);
  row.append(element('strong',p.original+' · '+p.type+' · '+p.label,'kt80-param-review-title'));
  row.append(element('p',p.file+' · стр. '+p.page+' · '+(p.readerState==='TEXT_EXTRACTED'?'🟢 ПРОЧЕТЕН':'🟡/🔴 ПРИ ПРОЧИТ С РИСК')+' · '+(chosen?'ЕКСПЕРТ: '+(chosen.status==='EXPERT_CONFIRMED'?'ПОТВЪРДЕН':'ИЗКЛЮЧЕН'):'НЕПОТВЪРДЕН'),'kt80-ch21-source'));
  row.append(element('p','Контекст: „'+p.localContext+'“'));
  if(p.duplicateGroup)row.append(element('p','⚠ Повторение на същата числова стойност в този файл. Не е доказано дали представлява отделен параметър.','kt80-param-warning'));
  if(p.compoundDesignation)row.append(element('p','⚠ Съставно означение '+p.compoundDesignation+'. Извлечената '+p.original+' е само една част от обозначението; не я използвайте самостоятелно за извод.','kt80-param-warning'));
  if(p.hasMixedTense)row.append(element('p','⚠ В един откъс има съществуващи и проектни характеристики — ролята на тази стойност не може да бъде определена сигурно.','kt80-param-warning'));
  const open=element('button','◉ Оригинал · стр. '+p.page,'kt80-ch2-open');open.type='button';
  open.addEventListener('click',()=>root.KT80DossierOriginals?.openOriginal?.(p.file,p.page));row.append(open);
  const editor=document.createElement('details');editor.className='kt80-param-expert';
  editor.append(element('summary',chosen?'Експертно решение · '+chosen.status:'Експертно решение за стойността'));
  const note=element('textarea',undefined,'kt80-param-reason');note.placeholder='Причина и съпоставка с оригиналния документ';note.rows=2;note.value=chosen?.reason||'';
  const confirm=element('button','✓ Потвърди след проверка','kt80-ch2-open');confirm.type='button';
  const ignore=element('button','⚑ Експертно изключване','kt80-ch2-open kt80-ch2-ignore');ignore.type='button';
  const feedback=element('p','','kt80-ch21-source');
  confirm.addEventListener('click',()=>{if(!recordDecision(p,'EXPERT_CONFIRMED',note.value))feedback.textContent='Задължителна е конкретна причина от проверката.'});
  ignore.addEventListener('click',()=>{if(!recordDecision(p,'EXPERT_REJECTED',note.value))feedback.textContent='Посочете причина за изключването.'});
  editor.append(element('p','Решението е локално и проследимо за сесията; оригиналният документ и OCR текст остават непроменени.'),note,confirm,ignore,feedback);
  row.append(editor);main.append(row);
 }
 host.append(main);
}
function reset(){current=null;decisions.clear();auditTrail.length=0;const h=document.getElementById('kt80CH21ParameterQA');if(h){h.replaceChildren();h.textContent='Контролът на параметрите се създава след обработка на преписката.'}}
function trail(){return auditTrail.map(x=>({...x}))}
function allowed(){return (current?.entries||[]).filter(x=>decisions.get(x.id)?.status==='EXPERT_CONFIRMED').map(x=>({...x}))}
root.KT80ParameterQA=Object.freeze({evaluate,render,reset,context,recordDecision,trail,allowed});
document.addEventListener('kt80:case-reset',reset);
})(window);
