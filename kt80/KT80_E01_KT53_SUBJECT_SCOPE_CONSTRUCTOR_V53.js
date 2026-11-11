/* WOW KT80 KT53 — one source for candidate subject + technical scope.
 * Deterministic reconstruction ONLY. No AI request is made or implied.
 * Expert may edit; explicit separate confirmation of subject & scope is mandatory.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const tidy=s=>String(s??'').replace(/\s+/gu,' ').trim();
const bad=/^(?:изграждането|изграждане)\s+на\s+(?:основен\s+ремонт|текущ\s+ремонт|реконструкция)\b/iu;
const labelType={major_repair:'Основен ремонт',current_repair:'Текущ ремонт',reconstruction:'Реконструкция',construction:'Изграждане'};
let current=null,manualSubject=false,manualScope=false,suspend=false;
function listSources(reconstruction){
 const out=[];for(const section of reconstruction?.sections||[])for(const item of section.items||[])
  for(const fact of item.evidence||[])out.push({...fact,rule:item.key,group:section.key});
 return out;
}
function proposition(reconstruction){
 const reasons=[...(reconstruction?.unresolved||[])];
 const facts=listSources(reconstruction);
 const major=(reconstruction?.suggestedActivityTypes||[]).filter(x=>labelType[x]);
 const invalidated=String(reconstruction?.subjectCandidate||'').startsWith('НЯМА НАДЕЖДЕН');
 const source=tidy(reconstruction?.subjectCandidate);
 const subject=invalidated?'':root.KT80KT52?.normalizeSubject?.(source)||source;
 const usableSubject=subject&&subject!=='НЯМА ДАННИ'&&!bad.test(subject);
 const subjectStatus=major.length===1&&!reconstruction?.activityTypeAmbiguous&&usableSubject?'КАНДИДАТ С ИЗТОЧНИЦИ':'НУЖДА ОТ ЕКСПЕРТНА РЕКОНСТРУКЦИЯ';
 if(major.length===0)reasons.push('Не е установен достатъчно надежден характер на основната дейност.');
 if(major.length>1)reasons.push('Има различни кандидати за основна намеса. Не се избира автоматично водещ.');
 if(!usableSubject)reasons.push('Няма годен кандидат за предмет от прочетеното.');
 // Do not force all dossier fields into a long title. Scope is a transparent list of
 // candidate activities, not a claim that every mention is planned, confirmed work.
 const blocks=[];
 const evidenceMap={};
 for(const section of reconstruction?.sections||[]){
  const lines=[];
  for(const item of section.items||[]){
   const sources=(item.evidence||[]).filter(x=>x.excerpt&&x.file);
   if(!sources.length)continue;
   const distinct=[...new Set(sources.map(x=>x.file+(x.page?' · стр. '+x.page:'')))];
   lines.push('• '+item.label+' — открити са '+sources.length+' непотвърдени откъса; източник: '+distinct.slice(0,3).join('; ')+(distinct.length>3?' и още '+(distinct.length-3):'')+'.');
   evidenceMap[item.key]=sources.map(x=>({file:x.file,page:x.page,excerpt:x.excerpt,readerState:x.readerState}));
  }
  if(lines.length)blocks.push(section.label+':\n'+lines.join('\n'));
 }
 const parameters=(reconstruction?.confirmedParameters||[]);
 if(parameters.length){
  blocks.push('Експертно проверени технически стойности:\n'+parameters.slice(0,12).map(x=>
   '• '+x.original+' — '+x.file+(x.page?' · стр. '+x.page:'')+'; категория: '+(x.label||x.role||'неизяснена')+'.').join('\n'));
 }
 const scope=blocks.length?blocks.join('\n\n'):'НЯМА ДОСТАТЪЧНО ДОКАЗАТЕЛСТВА ЗА АВТОМАТИЧНО ПРЕДЛОЖЕНИЕ ЗА ОБХВАТ';
 const unsupported=!facts.length;
 if(unsupported)reasons.push('Няма проверими извлечени факти с оригинален документ.');
 return Object.freeze({schema:'KT80-KT53-SUBJECT-SCOPE-V53',
  subject:usableSubject?subject:'',subjectStatus,
  scope:unsupported?'':scope,
  evidence:evidenceMap,sourceCount:facts.length,
  unresolved:[...new Set(reasons)],expertConfirmed:false,aiGenerated:false,
  evidenceReliability:'НЕПОТВЪРДЕНИ КАНДИДАТ-ДОКАЗАТЕЛСТВА',
  noAutoLegalDecision:true});
}
function promptStatus(msg){const p=$('kt80KT53Status');if(p)p.textContent=msg;}
function fill(p,{force=false}={}){
 current=p;
 const subject=$('kt80SubjectText'),scope=$('kt80ScopeText');
 if(!subject||!scope)return;
 suspend=true;
 if(force||!manualSubject){subject.value=p.subject||'';manualSubject=false}
 if(force||!manualScope){scope.value=p.scope||'';manualScope=false}
 suspend=false;
 // Any reconstructed candidate invalidates both prior approvals.
 const checkbox=$('kt80ScopeConfirmation');if(checkbox)checkbox.checked=false;
 const prior=$('kt80SubjectConfirmation');if(prior)prior.checked=false;
 const sources=$('kt80KT53Evidence');
 if(sources){
  sources.replaceChildren();
  const para=document.createElement('p');
  para.textContent='Доказателствени откъси: '+p.sourceCount+' · Статус: '+p.evidenceReliability+'. Документите с експертно игнориране и изключените технически стойности не се използват.';
  sources.append(para);
  for(const [key,values] of Object.entries(p.evidence)){
   const line=document.createElement('details');const summary=document.createElement('summary');
   summary.textContent=key+' · '+values.length+' откъса';line.append(summary);
   for(const item of values.slice(0,20)){
    const div=document.createElement('div');div.className='kt80-kt53-evidence-line';
    const text=document.createElement('p');text.textContent='„'+item.excerpt+'“ · '+item.file+(item.page?' · стр. '+item.page:'')+' · '+item.readerState;div.append(text);
    if(item.page){const open=document.createElement('button');open.type='button';open.className='kt80-ch2-open';open.textContent='◉ Оригинал · стр. '+item.page;
      open.addEventListener('click',()=>root.KT80DossierOriginals?.openOriginal?.(item.file,item.page));div.append(open)}
    line.append(div);
   }
   sources.append(line);
  }
 }
 promptStatus('КТ53 · '+p.subjectStatus+' · '+p.unresolved.length+' въпроса за експертен контрол. Няма извикване на AI услуга.');
 const warning=$('kt80KT53Warnings');if(warning)warning.textContent=p.unresolved.length?'За проверка: '+p.unresolved.join(' | '):'Няма допълнителни алгоритмични сигнали. Всеки факт остава за експертна проверка.';
}
function construct({force=false}={}){
 const r=root.KT80KT52Draft;if(!r){promptStatus('Няма реконструкция от прочетена преписка. Въведете предмета и обхвата ръчно след проверка на документите.');return null}
 const p=proposition(r);fill(p,{force});return p;
}
function edited(kind){if(suspend)return;if(kind==='subject')manualSubject=true;else manualScope=true;}
function validate(){
 const subject=tidy($('kt80SubjectText')?.value),scope=tidy($('kt80ScopeText')?.value);
 if(!subject||!scope)return {ok:false,reason:'И предметът, и обхватът са задължителни за преминаване.'};
 if(bad.test(subject))return {ok:false,reason:'Логически неправилно съединяване „изграждане на основен ремонт“. Коригирайте вида на дейността.'};
 if(scope==='НЯМА ДОСТАТЪЧНО ДОКАЗАТЕЛСТВА ЗА АВТОМАТИЧНО ПРЕДЛОЖЕНИЕ ЗА ОБХВАТ')return {ok:false,reason:'Автоматично липсва обхват. Експертът трябва да въведе доказателствено основан текст.'};
 if(!$('kt80ScopeConfirmation')?.checked)return {ok:false,reason:'Потвърдете и обхвата като експерт след проверка на оригиналите.'};
 return {ok:true,subject,scope,sourceCount:current?.sourceCount||0,expertConfirmed:true};
}
function statusReset(){
 current=null;manualSubject=false;manualScope=false;
 const scope=$('kt80ScopeText');if(scope)scope.value='';
 const check=$('kt80ScopeConfirmation');if(check)check.checked=false;
 const evidence=$('kt80KT53Evidence');if(evidence)evidence.replaceChildren();
 promptStatus('КТ53 · След обработка на преписката ще бъде предложен предмет и отделен обхват.');
 const warning=$('kt80KT53Warnings');if(warning)warning.textContent='';
}
function init(){
 $('kt80SubjectText')?.addEventListener('input',()=>edited('subject'));
 $('kt80ScopeText')?.addEventListener('input',()=>edited('scope'));
 document.addEventListener('kt80:case-reset',statusReset);
 root.KT80KT53=Object.freeze({proposition,construct,fill,validate,reset:statusReset,edited,getCurrent:()=>current});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
