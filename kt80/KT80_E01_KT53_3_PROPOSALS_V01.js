/* KT80 KT53.3 — concise expert-facing proposals.
 * Only expert click applies a specific edit. No auto-confirmation or legal decision.
 * All evidence stays inspectable but collapsed by default.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let serial=0;
const text=(tag,value,cls)=>{
 const node=document.createElement(tag);if(value!==undefined)node.textContent=value;
 if(cls)node.className=cls;
 return node;
};
function reset(){
 serial++;
 const host=$('kt80RelevanceProposals');if(host)host.replaceChildren();
 const status=$('kt80RelevanceDecisionStatus');if(status)status.textContent='Няма активни предложения.';
}
function render(assessment){
 reset();
 const host=$('kt80RelevanceProposals'),status=$('kt80RelevanceDecisionStatus');
 if(!host||!assessment)return;
 const token=serial;
 const subject=$('kt80SubjectText'),scope=$('kt80ScopeText');
 const suggestions=root.KT80Relevance?.suggestions?.(assessment,subject?.value,scope?.value);
 if(!suggestions)return;
 const actions=suggestions.actions||[];
 if(status)status.textContent=actions.length?actions.length+' мотивирано предложение за обхвата · Предметът остава фиксиран.':'Няма предложена редакция на обхвата · Предметът остава фиксиран.';
 for(const action of actions){
  const card=text('section',undefined,'kt80-relevance-proposal');
  card.append(text('strong',action.action+' в '+action.target,'kt80-relevance-proposal-label'));
  card.append(text('p',action.text,'kt80-relevance-proposal-text'));
  card.append(text('p','Мотив: '+action.reason,'kt80-relevance-proposal-reason'));
  const source=action.source||{};
  const origin=source.file+(source.page?' · стр. '+source.page:'');
  const details=document.createElement('details');details.className='kt80-relevance-proposal-source';
  details.append(text('summary','Провери основанието · '+origin));
  details.append(text('p','„'+String(source.excerpt||'').slice(0,480)+(String(source.excerpt||'').length>480?'…':'')+'“'));
  if(source.readerState&&source.readerState!=='TEXT_EXTRACTED')details.append(text('p','Прочитът на източника изисква проверка в оригинала.'));
  if(source.page){
   const original=text('button','Оригинал · стр. '+source.page);original.type='button';original.className='kt80-ch2-open';
   original.addEventListener('click',()=>root.KT80DossierOriginals?.openOriginal?.(source.file,source.page));
   details.append(original);
  }
  card.append(details);
  const controls=document.createElement('div');controls.className='kt80-relevance-proposal-controls';
  const apply=text('button','Приеми предложението');apply.type='button';
  const reject=text('button','Отхвърли');reject.type='button';
  const feedback=text('p','','kt80-relevance-proposal-feedback');
  controls.append(apply,reject);card.append(controls,feedback);host.append(card);
  const initial=scope?.value;
  const fixedSubject=subject?.value;
  const finish=message=>{apply.disabled=true;reject.disabled=true;feedback.textContent=message};
  reject.addEventListener('click',()=>{if(token!==serial)return;finish('Отхвърлено от експерта. Текстът не е променен.')});
  apply.addEventListener('click',()=>{
   if(token!==serial)return;
   if(!scope||!subject){feedback.textContent='Липсва поле за редакцията.';return}
   if(root.KT80WorkflowState?.routeConfirmed||root.KT80WorkflowState?.scopeConfirmed||$('kt80ScopeConfirmation')?.checked){
    feedback.textContent='Обхватът или процедурата вече са потвърдени. Отменете потвърждението преди редакция.';return;
   }
   if(subject.value!==fixedSubject){feedback.textContent='Предметът е променен. Предложението за обхвата вече не е валидно. Повторете проверката при фиксиран предмет.';return}
   if(!$('kt80SubjectConfirmation')?.checked){feedback.textContent='Първо потвърдете предмета. Предложенията за обхвата се прилагат само при фиксиран предмет.';return}
   if(scope.value!==initial){feedback.textContent='Междувременно обхватът е редактиран. Реконструирайте анализа преди приемане.';return}
   if(action.effect!=='append-scope'){feedback.textContent='За това предложение е необходима ръчна редакция.';return}
   if(scope.value.includes(action.text)){finish('Сведението вече присъства в обхвата.');return}
   scope.value=scope.value.replace(/\s+$/u,'')+'\n\n'+action.text;
   scope.dispatchEvent(new Event('input',{bubbles:true}));
   const approval=$('kt80ScopeConfirmation');if(approval)approval.checked=false;
   finish('Включено в проекта на обхват. Проверете оригинала и потвърдете окончателно.');
  });
 }
 const tail=document.createElement('p');tail.className='kt80-relevance-proposal-tail';
 const parts=[];
 if(suggestions.excludedCount)parts.push(suggestions.excludedCount+' неподкрепени теми не са добавени като дейности');
 if(suggestions.gapCount)parts.push(suggestions.gapCount+' съществени въпроса остават за проверка');
 tail.textContent=parts.join(' · ')+(parts.length?'. ':'')+'Подробните основания са в разгъваемата проверка.';
 host.append(tail);
}
root.KT80RelevanceActions=Object.freeze({render,reset});
document.addEventListener('kt80:case-reset',reset);
document.addEventListener('kt80:case-change',reset);
})(window);
