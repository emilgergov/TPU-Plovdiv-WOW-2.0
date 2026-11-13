/* КТ82 V58.7 — универсално предложение за предмет и обхват.
   Обхваща сигнал, жалба, искане, заявление и обща кореспонденция.
   За инвестиционно предложение използва заключения еталон №2, без да го променя.
   Само извлечен текст с произход; предложението не замества експертно потвърждение. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const clean=x=>String(x??'').replace(/\s+/gu,' ').trim();
const test=(r,x)=>r.test(x);
const TYPES={
 SIGNAL:{name:'Сигнал',subject:'Предмет на сигнала',scope:'Обстоятелства и искане по сигнала'},
 COMPLAINT:{name:'Жалба',subject:'Предмет на жалбата',scope:'Оспорвани обстоятелства и искане'},
 REQUEST:{name:'Искане',subject:'Предмет на искането',scope:'Искана административна дейност'},
 APPLICATION:{name:'Заявление',subject:'Предмет на заявлението',scope:'Искана услуга или действие'},
 CORRESPONDENCE:{name:'Кореспонденция',subject:'Предмет на преписката',scope:'Съдържание и искане'}
};
function classify(intake){
 const docs=(intake?.document_texts||[]).filter(d=>clean(d.text));
 const beginning=docs.map(d=>String(d.text).slice(0,1900)).join('\n');
 const filenames=(intake?.files||[]).map(x=>x.filename).join(' ');
 const head=beginning.slice(0,650);
 const expanded=clean(head+' '+filenames);
 let type='CORRESPONDENCE';
 // Start with the documentary genre, NOT incidental terms mentioned later in the dossier.
 if(test(/(?:^|\n)\s*(?:с\s*и\s*г\s*н\s*а\s*л|сигнал)\s*(?:\n|относно|за|$)|\bсигнал\s+относно\b/imu,beginning)||test(/сигнал/iu,filenames))type='SIGNAL';
 else if(test(/(?:^|\n)\s*жалба(?:\s|:|$)|жалба\s+относно/imu,beginning)||test(/жалба/iu,filenames))type='COMPLAINT';
 else if(test(/(?:^|\n)\s*заявление(?:\s|:|$)|заявявам(?:\s|:|$)/imu,beginning)||test(/заявлени/iu,filenames))type='APPLICATION';
 else if(test(/(?:^|\n)\s*искане(?:\s|:|$)|моля\s+да(?:\s|$)/imu,head)||test(/искане/iu,filenames))type='REQUEST';
 const investment=test(/(?:уведомление\s+за\s+инвестиционно\s+предложение|инвестиционното\s+предложение\s*[:„]|предмет\s+на\s+(?:инвестиционно(?:то)?\s+)?предложение|предвижда\s+се\s+(?:изграждане|строителство))/iu,beginning);
 if((type==='CORRESPONDENCE'||type==='REQUEST')&&investment)type='INVESTMENT';
 return Object.freeze({type,docs,source:docs[0]?.source||'',fromDocument:!!docs.length,hasHeading:!!expanded});
}
function lineAfter(text,re,maxLen=330){
 const m=String(text??'').match(re);if(!m)return '';
 return clean(m[1]||'').replace(/^[.:;\-–—\s]+|[.;:\s]+$/g,'').slice(0,maxLen);
}
function findSubject(text,type){
 const t=String(text||'');
 const about=lineAfter(t,/(?:^|\n)\s*(?:относно|ОТНОСНО)\s*[:–-]?\s*([^\n]+)/imu,270);
 const viaTitle=lineAfter(t,/(?:^|\n)\s*(?:предмет|касаещ|тема)\s*[:–-]\s*([^\n]+)/imu,270);
 if(type==='SIGNAL')return about?'Сигнал относно '+about:'Сигнал — установяване и проверка на изложените обстоятелства';
 if(type==='COMPLAINT')return about?'Жалба относно '+about:'Жалба — разглеждане на посочените обстоятелства';
 if(type==='REQUEST')return about?'Искане относно '+about:viaTitle?'Искане за '+viaTitle:'Искане — разглеждане на поисканото административно действие';
 if(type==='APPLICATION')return about?'Заявление относно '+about:'Заявление — разглеждане на заявената административна услуга';
 return about?'Административна преписка относно '+about:viaTitle?'Административна преписка относно '+viaTitle:'Административна преписка — установяване на предмета от постъпилата кореспонденция';
}
function findScope(text,type){
 const t=String(text||'');
 // An actual request is preferable to speculative technical facts.
 const asks=[...t.matchAll(/(?:^|\n)\s*(?:Моля|моля)\s+([^.\n]{14,480})(?:[.]|\n|$)/gmu)]
   .map(x=>clean(x[1])).filter(x=>!/(?:прилагам|приложение|благодаря)/iu.test(x));
 const request=asks.length?'Да '+asks[0].replace(/^да\s+/iu,'').replace(/[.;:]$/u,'')+'.':'';
 if(request)return request;
 const generic={SIGNAL:'Проверка на изложените в сигнала обстоятелства и подготовка на мотивиран отговор.',COMPLAINT:'Преглед на оспорените обстоятелства и определяне на приложимия административен ред.',REQUEST:'Изясняване на поисканото действие, допустимостта и компетентността на административния орган.',APPLICATION:'Проверка на заявената услуга, основанията и необходимите документи.',CORRESPONDENCE:'Уточняване на административния въпрос и необходимото последващо действие.'};
 return generic[type]||generic.CORRESPONDENCE;
}
function propose(intake){
 const d=classify(intake);
 if(d.type==='INVESTMENT')return Object.freeze({type:d.type,preserveInvestment:true,source:d.source});
 const text=d.docs.map(x=>x.text).join('\n');
 return Object.freeze({type:d.type,category:TYPES[d.type].name,source:d.source||'ПРЕПИСКАТА — източник не е уточнен',
 subject:findSubject(text,d.type),scope:findScope(text,d.type),
 evidence:!!text,provisional:true,preserveInvestment:false});
}
root.KT82UniversalDossier=Object.freeze({classify,propose,apply});
let active=null;
function updateTitles(type){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="2"]');
 if(!stage)return;
 const isIP=type==='INVESTMENT';
 const n=TYPES[type]||TYPES.CORRESPONDENCE;
 stage.querySelectorAll('h2,h3,h4,label,strong').forEach(el=>{
  if(el.children.length)return;
  const value=clean(el.textContent);
  if(value==='Предмет на инвестиционното предложение'||value==='Предмет на сигнала'||value==='Предмет на жалбата'||value==='Предмет на искането'||value==='Предмет на заявлението'||value==='Предмет на преписката'){
   if(!el.dataset.kt82OriginalText)el.dataset.kt82OriginalText='Предмет на инвестиционното предложение';
   el.textContent=isIP?el.dataset.kt82OriginalText:n.subject;
  }
  if(value==='Предмет и обхват на инвестиционното предложение'||value==='Предмет и обхват на преписката')el.textContent=isIP?'Предмет и обхват на инвестиционното предложение':'Предмет и обхват на преписката';
 });
 // Main heading from the selected step does not decide or constrain the subject.
 const labels={2:'2. Предмет и обхват на преписката',3:'3. Имоти и пространствен анализ',4:'4. Нормативна и процедурна преценка',5:'5. Административен маршрут'};
 for(const [number,label] of Object.entries(labels)){
  const step=document.querySelector('.kt80-step[data-step="'+number+'"]');
  if(!step)continue;
  if(!step.dataset.kt82OriginalTitle)step.dataset.kt82OriginalTitle=step.textContent;
  step.textContent=isIP?step.dataset.kt82OriginalTitle:label;
 }
 const screenTitle=$('kt80ScreenTitle');
 if(!isIP&&screenTitle&&/предмет и обхват на инвестиционното предложение/iu.test(screenTitle.textContent))screenTitle.textContent=labels[2];
 if(isIP&&screenTitle&&screenTitle.textContent===labels[2])screenTitle.textContent=labels[2].replace('на преписката','на инвестиционното предложение');
 const heading=document.querySelector('h2.kt80-stage-title');
 if(heading&&!isIP&&/инвестиционното предложение/i.test(heading.textContent))heading.textContent='2. Предмет и обхват на преписката';
 const panelHeading=stage.querySelector(':scope > h2');if(panelHeading)panelHeading.textContent=isIP?'2. Предмет и обхват на инвестиционното предложение':'2. Предмет и обхват на преписката';
 const note=stage.querySelector('.kt82-universal-note')||document.createElement('p');
 note.className='kt82-universal-note';
 note.style.cssText='font:400 13px/1.5 "Segoe UI",Arial,sans-serif;color:#e3e7dc;margin:8px 0 12px;border-left:3px solid #b9ba88;padding:7px 12px;background:#163f31;border-radius:3px';
 note.textContent=isIP?'':'Вид документ: '+n.name+'. Предметът и обхватът са предложения, извлечени от преписката. Експертът може да ги редактира и трябва да ги потвърди отделно.';
 note.hidden=isIP;
 if(!note.isConnected){const where=stage.querySelector(':scope > h2')||stage.firstElementChild;where?.after(note)}
 const hint=$('kt80SubjectHint');if(hint&&!isIP)hint.textContent='Предложение за '+n.name.toLocaleLowerCase('bg')+' — проверете оригиналния документ и потвърдете.';
}
function apply(intake){
 const p=propose(intake);active=p;
 root.KT82UniversalStage2Result=p;
 updateTitles(p.type);
 if(p.preserveInvestment)return p;
 const subject=$('kt80SubjectText'),scope=$('kt80ScopeText'),cs=$('kt80SubjectConfirmation'),cc=$('kt80ScopeConfirmation');
 if(cs)cs.checked=false;if(cc)cc.checked=false;
 if(subject){subject.readOnly=false;subject.value=p.subject;subject.dispatchEvent(new Event('input',{bubbles:true}))}
 if(scope){scope.value=p.scope;scope.dispatchEvent(new Event('input',{bubbles:true}))}
 root.KT80ScopeLock?.sync?.();
 return p;
}
function reset(){active=null;root.KT82UniversalStage2Result=null;updateTitles('INVESTMENT')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.addEventListener('kt80:case-reset',reset);document.addEventListener('kt80:case-change',reset)});
else {document.addEventListener('kt80:case-reset',reset);document.addEventListener('kt80:case-change',reset)}
})(window);