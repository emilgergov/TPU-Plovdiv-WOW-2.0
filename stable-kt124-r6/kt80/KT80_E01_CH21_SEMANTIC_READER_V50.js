/* KT80 CH2.1 V50 — contextual technical evidence extraction from already-read local documents.
 * Read-only augmentation: no alteration of OCR, V27.35, ZIP or existing approved dossier facts.
 * Classifications are review candidates, never verified fact or procedural qualification.
 */
(function(root){'use strict';
const norm=s=>String(s||'').replace(/\s+/gu,' ').trim();
const low=s=>norm(s).toLocaleLowerCase('bg');
const TOPICS=[
 ['activity',/(?:основен ремонт|текущ ремонт|реконструкция|изграждане|модернизация|подмяна|рехабилитация|преустройство|инвестиционно предложение|трафопост)/iu],
 ['capacity',/(?:мощност|капацитет|натоварване|трансформатор|сечение|дължина|напрежение|прекъсвач|максимална|проектна|номинална|(?:\d[\d.,]*\s*(?:kW|кВт|kVA|кВА|MW|МВт|kV|кВ|V|волта|mm²|мм²|мм|m|метра)\b))/iu],
 ['area',/(?:\b(?:площ|квадратура|поземлен имот|имот с идентификатор|територия|граница|урегулиран|УПИ|парцела)\b|\b\d{5}\.\d+\.\d+\b)/iu],
 ['electricity',/(?:електрическ|електрозахран|кабел|трафопост|трансформатор|табло|мтран|прекъсвач|заземяване|килия|напрежение|съоръжения\s+20|защит[аи]\s+от\s+пренапрежение)/iu],
 ['water_supply',/(?:водоснабдяване|водопровод|водоизточник|сондаж|кладенец)/iu],
 ['wastewater',/(?:отпадъчни\s+води|канализац|заустван|изгребн|пречиствателна)/iu],
 ['access',/(?:транспортен\s+достъп|пътен\s+достъп|подход\s+към)/iu],
 ['emissions',/(?:емиси[и-я]|замърсител[иа]|прахови|шум)/iu],
 ['waste',/(?:отпадъци|строителни\s+отпадъци|опасни\s+отпадъци)/iu]
];
const SECTION_MARK=/(?:^|\s)(?:\d{1,2}(?:\.\d{1,3}){0,2}\.\s+|[IVX]{1,4}\.\s+)/;
const BLANK_GUIDANCE=/^(?:моля\s+)?(?:посочете|опишете|представете|попълва\s+се|попълнете|данни\s+за|информация\s+за|описание\s+на|при\s+необходимост|изисква\s+се|например)(?=\s|[.:;]|$)/iu;
const GENERIC_FORM=/(?:отбележете\s+с\s+[xх]|изберете\s+един|попълва\s+се\s+от|ако\s+е\s+приложимо|задължително\s+се\s+посочват)/iu;
const REAL_VERBS=/(?:предвижда\s+се|не\s+се\s+предвижда|ще\s+се|ще\s+бъде|извършва\s+се|подменя\s+се|монтира\s+се|изгражда\s+се|съществуващ[а-я]*|изпълнен[а-я]*\s+е|достига\s+максимална|проектна\s+мощност|за\s+ремонт|основен\s+ремонт|реконструкция)/iu;
const NUMBER_UNIT=/(?:\d[\d\s.,]{0,12}\s*(?:квт|kw|ква|kva|мвт|mw|кв|kv|мм²|mm²|мм|метра|m|кв\.\s*м|m²|%))/iu;
const UNIT=/(\d{1,7}(?:[.,]\d{1,4})?)\s*(кВт|kW|кВА|kVA|МВт|MW|кВ|kV|мм²|mm²|м²|m²|%)/giu;
const UNITS={kw:'kW',квт:'kW',kva:'kVA',ква:'kVA',mw:'MW',мвт:'MW',kv:'kV',кв:'kV', 'мм²':'mm²','mm²':'mm²','м²':'m²','m²':'m²','%':'%'};
function classify(sentence){
 const text=norm(sentence);
 if(!text)return 'EMPTY';
 if(BLANK_GUIDANCE.test(text)||GENERIC_FORM.test(text))return 'FORM_INSTRUCTION';
 if(text.length<20)return 'HEADING_OR_FRAGMENT';
 if(/^(?:\d+(?:\.\d+)*\.?\s*)?(?:мощност|капацитет|напрежение|водоснабдяване|заустване|отпадъци|емисии)\s*[:;]?\s*$/iu.test(text))return 'HEADING_OR_FRAGMENT';
 return REAL_VERBS.test(text)||NUMBER_UNIT.test(text)?'CANDIDATE_ASSERTION':'CONTEXT_ONLY';
}
function chunks(text){
 const lines=String(text||'').split(/\r?\n/g);
 const pieces=[];
 for(const line of lines){
  const l=norm(line);
  if(!l)continue;
  if(l.length>1200)for(const x of l.match(/.{1,700}(?:\s|$)/gu)||[l])pieces.push(norm(x));
  else pieces.push(l);
 }
 return pieces;
}
function extractParameters(text){
 const values=[];for(const m of text.matchAll(UNIT)){
  const n=Number(m[1].replace(',','.'));if(!Number.isFinite(n))continue;
  const unit=UNITS[m[2].toLocaleLowerCase('bg')]||m[2];
  values.push({value:n,unit,original:m[0]});
 }
 return values.slice(0,20);
}
function readerState(file,records){return records.find(f=>f.file===file)?.state||'UNKNOWN'}
function build(intake,audit,opts={}){
 const entries=Array.isArray(intake?.page_text_index)?intake.page_text_index:[];
 const records=Array.isArray(audit?.records)?audit.records:[];
 const entriesByKey=new Map(),warnings=[];
 // Source corpus: already extracted PDF pages. Non-PDF dossiers retain existing V15 excerpts.
 for(const entry of entries){
  if(!entry||!entry.file||!Number.isInteger(entry.page)||entry.page<1)continue;
  const filename=String(entry.file),state=readerState(filename,records);
  const lines=chunks(entry.text);
  for(let lineNumber=0;lineNumber<lines.length;lineNumber++){
   const sentence=lines[lineNumber];if(sentence.length<20||sentence.length>900)continue;
   const key=classify(sentence);
   if(key==='FORM_INSTRUCTION'){warnings.push({type:'FORM_INSTRUCTION',file:filename,page:entry.page,snippet:sentence.slice(0,120)});continue}
   if(key!=='CANDIDATE_ASSERTION')continue;
   const topics=TOPICS.filter(([,rule])=>rule.test(sentence)).map(([name])=>name);
   if(!topics.length)continue;
   const params=extractParameters(sentence);
   const fingerprint=filename+'|'+entry.page+'|'+low(sentence);
   if(entriesByKey.has(fingerprint))continue;
   entriesByKey.set(fingerprint,{
    file:filename,page:entry.page,excerpt:sentence.slice(0,700),topics,
    readerStatus:state,parameters:params,
    classification:'CANDIDATE_ASSERTION',verified:false,requiresExpertReview:true,
    source:'PDF_PAGE_TEXT',lineIndex:lineNumber
   });
  }
 }
 const findings=[...entriesByKey.values()].slice(0,280);
 const counts={};for(const [name] of TOPICS)counts[name]=findings.filter(x=>x.topics.includes(name)).length;
 const distinctParams=[];
 const seen=new Set();
 for(const f of findings)for(const p of f.parameters){
  const key=f.file+'|'+f.page+'|'+p.unit+'|'+p.value+'|'+f.excerpt;
  if(!seen.has(key)){seen.add(key);distinctParams.push({...p,file:f.file,page:f.page,excerpt:f.excerpt,readerStatus:f.readerStatus,verified:false})}
 }
 const flagged=records.filter(f=>f.state==='REVIEW_REQUIRED'||f.state==='NOT_READ'||f.state==='UNSUPPORTED');
 return Object.freeze({schema:'KT80-CH21-CONTEXT-READER-V50',caseName:intake?.archive_name||null,
  documentsWithPageText:new Set(entries.map(x=>x.file)).size,pagesAnalyzed:entries.length,
  findings,parameters:distinctParams.slice(0,160),topicCounts:counts,
  ignoredFormInstructions:warnings.length, flaggedFiles:flagged.map(x=>({file:x.file,state:x.state})),
  status:entries.length?'ПРЕДВАРИТЕЛЕН СЪДЪРЖАТЕЛЕН АНАЛИЗ':'НЯМА PDF СТРАНИЦИ ЗА АНАЛИЗ',
  verified:false,canDetermineProcedure:false,
  limitation:'Четецът анализира само вече извлечения текст по PDF страници; OCR, техническите единици, таблиците, контекстът и качеството на прочита изискват проверка. Не се извеждат автоматично правни заключения.'
 });
}
function elem(tag,value,cls){const x=document.createElement(tag);if(value!==undefined)x.textContent=value;if(cls)x.className=cls;return x}
function render(analysis){
 const host=document.getElementById('kt80CH21Reader');if(!host)return;
 host.replaceChildren();
 host.append(elem('h3','Ч2.1 · Интелигентен анализ на съдържанието'));
 host.append(elem('p','Анализирани PDF страници: '+analysis.pagesAnalyzed+' · Кандидат-твърдения: '+analysis.findings.length+' · Извлечени числови параметри: '+analysis.parameters.length+' · Отхвърлени формулярни инструкции: '+analysis.ignoredFormInstructions+'.','kt80-ch21-summary'));
 host.append(elem('p',analysis.limitation,'kt80-ch21-notice'));
 const details=document.createElement('details');details.className='kt80-ch21-details';
 details.append(elem('summary','Извлечени технически параметри и местоположение в оригиналите'));
 if(!analysis.parameters.length)details.append(elem('p','Не са намерени надеждни числови кандидат-параметри в наличния текст. Това не доказва липса на параметри.'));
 for(const p of analysis.parameters.slice(0,60)){
  const row=elem('div',undefined,'kt80-ch21-row');
  row.append(elem('span',p.original+' · '+p.file+' · стр. '+p.page+' · НЕПОТВЪРДЕНО','kt80-ch21-source'));
  const open=elem('button','◉ Оригинал · стр. '+p.page,'kt80-ch2-open');open.type='button';
  open.addEventListener('click',()=>root.KT80DossierOriginals?.openOriginal?.(p.file,p.page));row.append(open);details.append(row);
 }
 host.append(details);
 const groups=document.createElement('details');groups.className='kt80-ch21-details';
 groups.append(elem('summary','Контекстни откъси по източник и страница'));
 for(const f of analysis.findings.slice(0,90)){
  const row=elem('div',undefined,'kt80-ch21-row');
  row.append(elem('p',f.excerpt));
  row.append(elem('p','Теми: '+f.topics.join(', ')+' · '+f.file+' · стр. '+f.page+' · '+(f.readerStatus==='TEXT_EXTRACTED'?'🟢 ПРОЧЕТЕН':'🟡/🔴 ЗА ДОПЪЛНИТЕЛНА ПРОВЕРКА'),'kt80-ch21-source'));
  const open=elem('button','◉ Към PDF страница','kt80-ch2-open');open.type='button';
  open.addEventListener('click',()=>root.KT80DossierOriginals?.openOriginal?.(f.file,f.page));row.append(open);groups.append(row);
 }
 host.append(groups);
}
root.KT80CH21Reader=Object.freeze({build,render,classify,extractParameters});
})(window);
