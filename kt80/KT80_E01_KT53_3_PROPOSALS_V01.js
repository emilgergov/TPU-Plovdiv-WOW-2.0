/* KT81 — concise evidence-backed scope result, with direct one-step audit.
 * Provenance is retained; candidates are never silently turned into verified facts.
 * One expert acceptance applies the full suggested scope, not individual fragments.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let serial=0;
function node(tag,content,cls){
 const el=document.createElement(tag);
 if(content!==undefined)el.textContent=content;
 if(cls)el.className=cls;
 return el;
}
function reset(){
 serial++;
 const host=$('kt80RelevanceProposals');if(host)host.replaceChildren();
 const status=$('kt80RelevanceDecisionStatus');if(status)status.textContent='';
}
function buildDraft(start,actions){
 let draft=String(start||'').trimEnd();
 for(const a of actions){
  if(a.effect!=='append-scope'||!a.text)continue;
  if(!draft.includes(a.text))draft+=(draft?'\n\n':'')+a.text;
 }
 return draft;
}
function render(assessment){
 reset();
 const host=$('kt80RelevanceProposals'),status=$('kt80RelevanceDecisionStatus');
 if(!host||!assessment)return;
 const token=serial;
 const subject=$('kt80SubjectText'),scope=$('kt80ScopeText');
 const suggestions=root.KT80Relevance?.suggestions?.(assessment,subject?.value,scope?.value);
 if(!suggestions)return;
 const actions=(suggestions.actions||[]).filter(a=>a?.text&&a.effect==='append-scope');
 const initial=scope?.value||'', fixedSubject=subject?.value||'';
 if(status)status.textContent=actions.length?
  'Установено е относимо сведение за конкретизиране на проекта на обхват.':
  'Няма нова конкретна редакция, подкрепена от текущия предварителен филтър.';
 if(!actions.length)return;
 const draft=buildDraft(initial,actions);
 if(!draft||draft===initial.trimEnd())return;
 const card=node('section',undefined,'kt80-relevance-proposal kt81-comparison');
 card.append(node('h3','Какво предлагаме','kt81-result-heading'));
 const result=node('div',undefined,'kt81-proposed-result');
 result.append(node('p',initial.trim()||'','kt81-result-unchanged'));
 actions.forEach(a=>result.append(node('p',a.text,'kt81-result-added')));
 card.append(result);
 // Short reason is immediately understandable; full evidence is on-demand.
 const why=document.createElement('details');why.className='kt81-why';
 why.append(node('summary','Защо? · Мотиви и доказателства'));
 actions.forEach((a,i)=>{
  const section=node('section',undefined,'kt81-why-item');
  section.append(node('strong',actions.length>1?'Основание '+(i+1):'Мотив'));
  section.append(node('p',a.reason||'Предложението изисква проверка на източника.'));
  const src=a.source||{};
  const label=[src.file||'Източникът не е уточнен',src.page?'стр. '+src.page:''].filter(Boolean).join(' · ');
  section.append(node('p','Източник: '+label,'kt81-source-ref'));
  if(src.excerpt)section.append(node('blockquote',String(src.excerpt),'kt81-excerpt'));
  if(src.readerState&&src.readerState!=='TEXT_EXTRACTED')
   section.append(node('p','Статус: източникът изисква проверка в оригинала.','kt81-source-warning'));
  if(src.file&&src.page&&typeof root.KT80DossierOriginals?.openOriginal==='function'){
   const original=node('button','Отвори оригинала · стр. '+src.page,'kt81-original-link');original.type='button';
   original.addEventListener('click',()=>root.KT80DossierOriginals.openOriginal(src.file,src.page));
   section.append(original);
  }
  why.append(section);
 });
 card.append(why);
 const warning=node('p','Предложението е за експертна преценка. Не е автоматично потвърден факт или процедурен извод.','kt81-result-caution');
 card.append(warning);
 const controls=node('div',undefined,'kt80-relevance-proposal-controls kt81-result-actions');
 const apply=node('button','Приеми целия предложен обхват');
 const reject=node('button','Отхвърли предложението');
 apply.type=reject.type='button';
 const feedback=node('p','','kt80-relevance-proposal-feedback');
 controls.append(apply,reject);card.append(controls,feedback);host.append(card);
 function done(message){apply.disabled=true;reject.disabled=true;feedback.textContent=message;}
 reject.addEventListener('click',()=>{if(token!==serial)return;done('Предложението е отхвърлено. Обхватът не е променен.');});
 apply.addEventListener('click',()=>{
  if(token!==serial)return;
  if(!scope||!subject){feedback.textContent='Полето за обхват не е достъпно.';return;}
  if(!$('kt80SubjectConfirmation')?.checked||subject.value!==fixedSubject){
   feedback.textContent='Предметът не е фиксиран в изходното състояние. Извършете нов анализ.';return;
  }
  if(root.KT80WorkflowState?.routeConfirmed||root.KT80WorkflowState?.scopeConfirmed||$('kt80ScopeConfirmation')?.checked){
   feedback.textContent='Отменете окончателното потвърждение, преди да редактирате обхвата.';return;
  }
  if(scope.value!==initial){feedback.textContent='Обхватът е редактиран след анализа. Обновете предложението.';return;}
  scope.value=draft;
  scope.dispatchEvent(new Event('input',{bubbles:true}));
  const approval=$('kt80ScopeConfirmation');if(approval)approval.checked=false;
  done('Предложението е включено в проекта. Прегледайте текста и потвърдете окончателно.');
 });
}
root.KT80RelevanceActions=Object.freeze({render,reset,buildDraft});
document.addEventListener('kt80:case-reset',reset);
document.addEventListener('kt80:case-change',reset);
})(window);
