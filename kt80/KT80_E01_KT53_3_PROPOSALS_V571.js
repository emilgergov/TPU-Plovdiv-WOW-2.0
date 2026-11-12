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
 const usable=(actions||[]).filter(a=>a?.effect==='append-scope'&&a.text);
 let draft=String(start||'').trimEnd();
 if(!usable.length)return draft;
 // Remove only exact, known KT53.1 boilerplate; never discard substantive
 // user-authored paragraphs or unverified source information.
 const paragraphs=draft.split(/\n\s*\n/u).map(p=>p.trim()).filter(Boolean);
 const clean=paragraphs.filter(p=>
  !/^Сведения за експертна проверка в оригиналните документи:\s*/iu.test(p)&&
  !/^Конкретните технически характеристики и видът на съпътстващите дейности се уточняват след проверка на изходните документи\.?$/iu.test(p)
 );
 if(clean.length!==paragraphs.length)draft=clean.join('\n\n');
 for(const a of usable)if(!draft.includes(a.text))draft+=(draft?'\n\n':'')+a.text;
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
 // Audit quality is independent of the prose quality: unknown source = review, never auto-accept.
 const verified=a=>Boolean(a?.source?.file && a?.source?.excerpt && (!a.source.readerState || a.source.readerState==='TEXT_EXTRACTED'));
 const eligible=actions.length>0&&actions.every(verified);
 const initial=scope?.value||'', fixedSubject=subject?.value||'';
 if(status)status.textContent=actions.length?
  'Предлагаме конкретизиране на проекта на обхват въз основа на относимо сведение.':
  'Предлагаме проверка и приемане на наличния проект на обхват; при липса на надеждни данни — конкретна проверка на основната дейност и техническите характеристики.';
 if(!actions.length){
  const guidance=node('section',undefined,'kt80-relevance-proposal kt81-comparison');
  guidance.append(node('h3','Експертна проверка на обхвата','kt81-result-heading'));
  const current=String(scope?.value||'').trim();
  guidance.append(node('p',current?
   'Запазете наличния проект на обхват като работна основа. Проверете дали включва конкретната основна дейност, обекта и доказаните технически характеристики; коригирайте само установените непълноти.':
   'Изградете проект на обхват от установените в преписката основна дейност и обект; ако те не са доказуеми, изискайте точното им описание от приложените първични документи.',
   'kt81-result-caution'));
  guidance.append(node('p','Причина: предварителният филтър не е открил нова достатъчно конкретна и проследима редакция. Това не означава, че дейността отсъства.','kt81-result-caution'));
  host.append(guidance);return;
 }
 const draft=buildDraft(initial,actions);
 if(!draft||draft===initial.trimEnd())return;
 const card=node('section',undefined,'kt80-relevance-proposal kt81-comparison kt82-secondary-suggestion');
 card.append(node('h3','Филтър за релевантност · предложение за обхвата','kt81-result-heading'));
 card.append(node('p','Алгоритмично предложение въз основа на преписката — не е редакция от EG автора.','kt81-result-caution'));
 const result=node('div',undefined,'kt81-proposed-result');
 const added=new Set(actions.map(a=>a.text));
 for(const para of draft.split(/\n\s*\n/u).filter(Boolean))result.append(node('p',para,added.has(para)?'kt81-result-added':'kt81-result-unchanged'));
 const detail=document.createElement('section');detail.className='kt82-proposal-detail';detail.append(result);
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
 detail.append(why);
 const warning=node('p','Предложението е за експертна преценка. Не е автоматично потвърден факт или процедурен извод.','kt81-result-caution');
 detail.append(warning);
 const controls=node('div',undefined,'kt80-relevance-proposal-controls kt81-result-actions');
 const apply=node('button','Приеми предложението');
 const reject=node('button','Отхвърли предложението');
 apply.type=reject.type='button';
 const feedback=node('p','','kt80-relevance-proposal-feedback');
 controls.append(apply,reject);detail.append(controls,feedback);card.append(detail);host.append(card);
 if(!eligible){apply.disabled=true;feedback.textContent='Предложение за проверка: няма достатъчно проследим източник за автоматично приемане. Можете да прецените и редактирате проекта ръчно.';}
 function done(message){apply.disabled=true;reject.disabled=true;feedback.textContent=message;}
 reject.addEventListener('click',()=>{if(token!==serial)return;done('Предложението е отхвърлено. Обхватът не е променен.');});
 apply.addEventListener('click',()=>{
  if(token!==serial)return;
  if(!eligible){feedback.textContent='Нужна е проверка на оригиналния източник преди приемане.';return;}
  if(!scope||!subject){feedback.textContent='Полето за обхват не е достъпно.';return;}
  if(!$('kt80SubjectConfirmation')?.checked||subject.value!==fixedSubject){
   feedback.textContent='Предметът не е фиксиран в изходното състояние. Извършете нов анализ.';return;
  }
  if(root.KT80WorkflowState?.routeConfirmed||root.KT80WorkflowState?.scopeConfirmed||$('kt80ScopeConfirmation')?.checked){
   feedback.textContent='Отменете окончателното потвърждение, преди да редактирате обхвата.';return;
  }
  if(scope.value!==initial){feedback.textContent='Обхватът е редактиран след анализа. Обновете предложението.';return;}
  scope.value=draft;
  scope.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new CustomEvent('kt80:editorial-accepted',{detail:{kind:'scope',text:draft,source:'Филтър за релевантност'}}));
  const approval=$('kt80ScopeConfirmation');if(approval)approval.checked=false;
  done('Предложението е включено в проекта. Прегледайте текста и потвърдете окончателно.');
 });
}
root.KT80RelevanceActions=Object.freeze({render,reset,buildDraft});
document.addEventListener('kt80:case-reset',reset);
document.addEventListener('kt80:case-change',reset);
})(window);
