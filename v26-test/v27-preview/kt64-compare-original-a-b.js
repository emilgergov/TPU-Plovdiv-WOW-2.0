/* KT64 — compare the original KT42 requirements for the same actual intake
   under A and B; strictly read-only. Never generate replacement paragraphs. */
(function(root){'use strict';
const norm=v=>String(v??'').trim();
const usable=v=>!!norm(v)&&!/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|\[ЗА ПОПЪЛВАНЕ|\[ОТКЪС ОТ ПРЕПИСКАТА|НЯМА ДАННИ/iu.test(norm(v));
const verifiedSrc=v=>!!norm(v)&&!/^НЯМА ДАННИ$/iu.test(norm(v));
function compare(draft={}){
 const m=draft.metadata||{},p=draft.paragraphs||[],legal=m.legalParagraphs||[],impact=m.impactFindings||[],sources=m.legalFindingSources||[];
 const characters=Array.from({length:4},(_,i)=>usable(p[i]));
 const legalReady=Array.from({length:4},(_,i)=>usable(legal[i]));
 const impactReady=Array.from({length:5},(_,i)=>usable(impact[i]));
 const procedureReady=usable(m.procedureFinding);
 const caseIds=norm(m.parcelIds), subject=norm(m.subject);
 const checks=[
 {label:'4 индивидуални описателни абзаца',a:characters.every(Boolean),b:characters.every(Boolean),note:characters.filter(Boolean).length+'/4 налични'},
 {label:'Правни основания по КТ42',a:legalReady.slice(0,2).every(Boolean),b:legalReady.every(Boolean),note:legalReady.filter(Boolean).length+'/4 налични; А изисква 2, Б изисква 4'},
 {label:'5 направления на въздействие',a:impactReady.every(Boolean),b:impactReady.every(Boolean),note:impactReady.filter(Boolean).length+'/5 налични'},
 {label:'Индивидуален процедурен извод',a:procedureReady,b:procedureReady,note:procedureReady?'Има текст за експертна проверка':'Липсва потвърден текст'},
 {label:'Кадастрален идентификатор и предмет',a:/\b\d{5}\.\d+\.\d+\b/u.test(caseIds)&&!!subject,b:/\b\d{5}\.\d+\.\d+\b/u.test(caseIds)&&!!subject,note:'Имот(и): '+(caseIds||'липсват')+'; предмет: '+(subject||'липсва')}
 ];
 const sourceCount=sources.slice(0,4).filter(verifiedSrc).length;
 return {checks,caseIds,subject,sourceCount,legalReady,impactReady,
   aReady:checks.every(c=>c.a),bReady:checks.every(c=>c.b),
   caveat:'Тази проверка сравнява полета, не доказва достоверност на правни или фактически твърдения. Реалният сценарий се определя единствено от ГИС, а не от тази таблица.'};
}
function td(tr,value){const el=document.createElement('td');el.style='border-bottom:1px solid #d5e4da;padding:8px;vertical-align:top';el.textContent=value;tr.append(el);}
function render(result){
 let host=document.getElementById('kt64-compare-result');
 if(!host){host=document.createElement('section');host.id='kt64-compare-result';host.style='padding:12px;margin:12px 0;border:2px solid #8daf9c;border-radius:9px;background:#f7faf8;color:#173c2b;font:14px system-ui;line-height:1.5';document.getElementById('kt64Compare')?.insertAdjacentElement('afterend',host);}
 host.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='КТ64 — сравнение на един и същи вход: А срещу Б';host.append(heading);
 const desc=document.createElement('p');desc.textContent='Това са техническите изисквания на оригиналния КТ42. Входната преписка НЕ се променя.';host.append(desc);
 const table=document.createElement('table');table.style='border-collapse:collapse;width:100%;font-size:13px';
 const header=document.createElement('tr');for(const h of ['Проверка','А','Б','Действителни данни']){const th=document.createElement('th');th.textContent=h;th.style='text-align:left;background:#e6f0e9;padding:8px';header.append(th);}table.append(header);
 for(const r of result.checks){const tr=document.createElement('tr');td(tr,r.label);td(tr,r.a?'Налично':'Липсва');td(tr,r.b?'Налично':'Липсва');td(tr,r.note);table.append(tr);}
 host.append(table);
 const note=document.createElement('p');note.style='margin:8px 0 0';note.textContent='Доказателствени препратки в подадените данни: '+result.sourceCount+'/4 за Б. Оригиналният пакет КТ53 изисква документален източник за включване на индивидуални правни основания.';host.append(note);
 const warn=document.createElement('p');warn.style='font-weight:600';warn.textContent=result.caveat;host.append(warn);
 const info=document.createElement('p');info.style='color:#6c401a';info.textContent='КТ60 добавя отделна доказателствена бариера само при Б. Тя може да блокира преди КТ42. Това сравнение не я заобикаля и не стартира Word.';host.append(info);
 host.scrollIntoView({block:'nearest'});
}
function mount(){
 const proposal=document.getElementById('proposal');if(!proposal||document.getElementById('kt64Compare'))return;
 const btn=document.createElement('button');btn.id='kt64Compare';btn.type='button';
 btn.textContent='КТ64 · Сравни реалния вход към Word А и Б';
 btn.style='width:100%;margin:8px 0;padding:10px;border:1px solid #8ea99b;border-radius:8px;background:#e6efe9;color:#134b35;font-weight:700;cursor:pointer';
 proposal.insertAdjacentElement('beforebegin',btn);
 btn.addEventListener('click',()=>{
  try{
   if(root.V26TemplateWord?.layout!=='KT41_EXACT_KT35_KT39'||root.V26ExpertWord?.layout!=='KT41_EXACT_V27_R02')throw Error('Оригиналните Word генератори не са заредени.');
   const data=root.V26WordReview?.getWorkingDraft?.();if(!data)throw Error('Няма данни от текущата преписка.');
   render(compare(data));
  }catch(err){const p=document.getElementById('kt64-compare-result')||document.createElement('p');p.id='kt64-compare-result';p.textContent='КТ64: '+String(err?.message||err);btn.insertAdjacentElement('afterend',p);}
 });
}
root.KT64Compare=Object.freeze({compare,render,mount});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(window);
