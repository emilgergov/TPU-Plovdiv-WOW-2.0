
/* kt134Panel02FlowRuntime */

(function(){
'use strict';
const overlay=document.getElementById('overlay'),dialog=overlay?.querySelector('.dialog');
if(!overlay||!dialog)return;
const svg=paths=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths+'</svg>';
const icons=[
 svg('<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M7 3v4M12 3v4"/>'),
 svg('<path d="M8 3h8l3 3v15H5V3h3Z"/><path d="M9 11h6M9 15h4"/><circle cx="17" cy="17" r="4"/>'),
 svg('<path d="M12 3v18M5 6h14M5 6l-3 6h6l-3-6ZM19 6l-3 6h6l-3-6ZM8 21h8"/>'),
 svg('<path d="M7 3h8l4 4v14H5V3h2Z"/><path d="M15 3v5h5M8 12h8M8 16h6"/>'),
 svg('<path d="M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>')
];
const steps=[
 ['ПРЕПИСКА','Получени документи и потвърдени факти'],
 ['ПРОВЕРКА НА ЛИПСИТЕ','Необходимите данни по приложимия ред'],
 ['ПРАВНО ОСНОВАНИЕ','По приложимия нормативен ред'],
 ['ПРОЕКТ НА ИСКАНЕ','Конкретни въпроси и документи'],
 ['ЕКСПЕРТНО РЕШЕНИЕ','Преглед, редакция и потвърждение']
];
const section=document.createElement('section');section.className='kt134-flow02';section.id='kt134Panel02Entry';
section.setAttribute('aria-label','Схема на процеса за панел №02');
const p=document.createElement('p');p.className='kt134-flow02-intro';p.textContent='Последователност на работа — от установените факти до проекта на изходящо писмо';section.append(p);
const chain=document.createElement('div');chain.className='kt134-flow02-steps';
steps.forEach((x,i)=>{const b=document.createElement('div');b.className='kt134-flow02-step';b.innerHTML='<div class="kt134-flow02-icon">'+icons[i]+'</div>';const strong=document.createElement('strong');strong.textContent=x[0];const small=document.createElement('small');small.textContent=x[1];if(i===2)small.id='kt134Flow02Legal';b.append(strong,small);chain.append(b)});section.append(chain);
const meta=document.createElement('div');meta.className='kt134-flow02-meta';
meta.innerHTML='<div class="kt134-flow02-result">'+svg('<path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v4h4M8 12h8M8 16h8"/>')+'<div><strong>КРАЕН РЕЗУЛТАТ</strong><span>Проект на изходящо писмо за предоставяне на допълнителна информация</span><div class="kt134-flow02-result-items"><span>Конкретно установени липси и необходими уточнения</span><span>Точно формулирани искания за сведения и документи</span><span>Мотивирано правно основание, адресат и приложим срок</span></div><em>Проектът подлежи на преглед, редакция и окончателно потвърждение от експерта; не се изпраща автоматично.</em></div></div>';
section.append(meta);
const actions=document.createElement('div');actions.className='kt134-flow02-actions';
const back=document.createElement('button');back.id='kt134Flow02Back';back.type='button';back.textContent='← Към панелите';
const enter=document.createElement('button');enter.id='kt134Flow02Enter';enter.type='button';enter.textContent='Отвори работния панел →';
actions.append(back,enter);section.append(actions);
const warn=dialog.querySelector('.warn');if(warn)warn.before(section);else dialog.append(section);
back.addEventListener('click',()=>{overlay.classList.remove('kt134-flow-mode');window.KT80DashboardHome?.();overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true')});
enter.addEventListener('click',()=>{overlay.classList.remove('kt134-flow-mode');const first=dialog.querySelector('.tabs button');if(first)first.focus();else document.getElementById('close')?.focus()});
window.KT134ShowPanel02Entry=function(c){
 overlay.classList.toggle('kt134-flow-mode',Number(c?.id)===2);
 if(Number(c?.id)===2){document.getElementById('kt134Flow02Legal').textContent=(c.legal?'Примерно: '+c.legal:'Определя се според преписката');}
};
})();

/* kt134OtherPanelFlowRuntime */

(function(){
'use strict';
const overlay=document.getElementById('overlay'),dialog=overlay?.querySelector('.dialog');
const original=window.KT134ShowPanel02Entry;
if(!overlay||!dialog||typeof original!=='function')return;
/* Кратък самостоятелен резултат за всеки панел; формулировките са интерфейсни,
   не автоматична квалификация, нормативна преценка или нов генератор. */
const catalog={
 1:{flow:['ПОСТЪПИЛИ ДАННИ','ПРОСТРАНСТВЕН КОНТЕКСТ','ПРАВНО ОСНОВАНИЕ','ПРЕЦЕНКА ПО ОС','ПРОЕКТ НА ПИСМО'],details:['Документи, предмет и местоположение','Данни за защитени зони и режими',null,'Проверка на приложимата хипотеза','Проект за преглед от експерта'],result:'Проект на писмо по чл. 2, ал. 2 от Наредбата за ОС',parts:['Установени факти и пространствени обстоятелства','Мотиви по относимата нормативна хипотеза','Адресат, заключение и реквизити']},
 3:{flow:['ПРЕПИСКА','НУЖДА ОТ СТАНОВИЩЕ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА ИСКАНЕ','ЕКСПЕРТЕН ПРЕГЛЕД'],details:['Потвърдени данни по случая','Конкретен въпрос към компетентен орган',null,'Изготвяне на проект на запитване','Редакция и потвърждение'],result:'Проект на писмо за институционално становище',parts:['Посочване на компетентния адресат','Конкретни въпроси и приложени материали','Мотиви, правно основание и срок при приложимост']},
 4:{flow:['УВЕДОМЛЕНИЕ','ПРЕДМЕТ И ОБХВАТ','ПРАВНО ОСНОВАНИЕ','УКАЗАНИЯ ПО ОВОС','ПРЕГЛЕД'],details:['Входни документи по преписката','Потвърден предмет и данни',null,'Действия според приложимия ред','Експертно потвърждение'],result:'Проект на писмо с указания по процедурата за ОВОС',parts:['Установени предпоставки и приложим ред','Необходими следващи действия и документи','Адресат, мотиви и приложими срокове']},
 5:{flow:['ДОКУМЕНТИ','ДАННИ ЗА ЗОНИТЕ','ПРАВНО ОСНОВАНИЕ','УКАЗАНИЯ ПО ОС','ПРЕГЛЕД'],details:['Постъпила документация','Доказани пространствени обстоятелства',null,'Процедурни действия по ОС','Експертно потвърждение'],result:'Проект на писмо с указания по процедурата за ОС',parts:['Факти и относимост към защитените зони','Приложим ред и изискуеми действия','Мотиви, адресат и документални изисквания']},
 6:{flow:['ДОКУМЕНТАЦИЯ','ОЦЕНКА НА ДАННИТЕ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА РЕШЕНИЕ','ЕКСПЕРТНА ПРЕЦЕНКА'],details:['Материали по преписката','Доказателства за възможни въздействия',null,'Структуриране на проект на акт','Преглед и потвърждение'],result:'Проект на решение за преценяване вероятната степен на отрицателно въздействие',parts:['Констатации и относим анализ','Мотиви и приложими условия','Проект на административен акт за експертно потвърждение']},
 7:{flow:['ИСКАНЕ ПО ОВОС','ПРОУЧВАНЕ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА РЕШЕНИЕ','ЕКСПЕРТНА ПРЕЦЕНКА'],details:['Представена информация по преписката','Обстоятелства и приложими критерии',null,'Преценяване на необходимостта от ОВОС','Преглед и потвърждение'],result:'Проект на решение за преценяване необходимостта от ОВОС',parts:['Установени факти и критерии','Мотивирана преценка и условия при приложимост','Проект на акт с необходимите реквизити']},
 8:{flow:['ДОКЛАД И МАТЕРИАЛИ','ПРОЦЕДУРНИ ДАННИ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА РЕШЕНИЕ','ЕКСПЕРТНА ПРЕЦЕНКА'],details:['Оценка и относимите приложения','Консултации, обсъждания и доказателства',null,'Изготвяне на проект на акт','Преглед и потвърждение'],result:'Проект на решение по ОВОС',parts:['Резултати от оценката и проведената процедура','Мотиви, мерки и условия при приложимост','Проект на акт за експертно потвърждение']},
 9:{flow:['ПРЕПИСКА','ОСНОВАНИЕ ЗА ПРЕКРАТЯВАНЕ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА АКТ','ПРЕГЛЕД'],details:['Хронология и документи','Проверка на конкретната предпоставка',null,'Надлежна форма според правния режим','Експертно потвърждение'],result:'Проект на документ за прекратяване на процедура',parts:['Конкретни фактически основания','Относими правни разпоредби и мотиви','Компетентен орган, адресат и съобщаване']},
 10:{flow:['ПЛАН ИЛИ ПРОГРАМА','ОБХВАТ И КОМПЕТЕНТНОСТ','ПРАВНО ОСНОВАНИЕ','УКАЗАНИЯ ПО ЕО','ПРЕГЛЕД'],details:['Входни данни и документи','Потвърдени характеристики',null,'Уточняване на необходимите действия','Експертно потвърждение'],result:'Проект на писмо за необходимите действия по ЕО',parts:['Установени обстоятелства за плана или програмата','Необходими процедурни действия и документи','Адресат, мотиви и приложим ред']},
 11:{flow:['ИСКАНЕ ПО ЕО','ДОКУМЕНТАЦИЯ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА РЕШЕНИЕ','ЕКСПЕРТНА ПРЕЦЕНКА'],details:['Постъпила преписка','Обхват и приложими критерии',null,'Преценяване на необходимостта от ЕО','Преглед и потвърждение'],result:'Проект на решение за преценяване необходимостта от ЕО',parts:['Установени обстоятелства и критерии','Мотиви и необходими условия при приложимост','Проект на административен акт']},
 12:{flow:['ДОКЛАД ПО ЕО','КОНСУЛТАЦИИ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА СТАНОВИЩЕ','ПРЕГЛЕД'],details:['Представени материали','Резултати от съгласувания и оценки',null,'Формулиране на становище','Експертно потвърждение'],result:'Проект на становище по ЕО',parts:['Анализ и резултати от процедурата','Мотиви, мерки и условия при приложимост','Проект на становище с реквизити']},
 16:{flow:['РЕЗУЛТАТИ ПО ПРЕПИСКАТА','СЪБИРАНЕ НА ФАЙЛОВЕ','ОСНОВАНИЕ И ПРАВА','КОМПЛЕКТОВАНЕ','АРХИВЕН ПАКЕТ'],details:['Документи, справки и създадени проекти','Версии и проследимост',null,'Проверка на комплекта','Експертен преглед'],result:'Подготвен архивен пакет по преписката',parts:['Документи и произведени резултати','Версии, идентификатори и проследимост','Разграничение между проекти и потвърдени документи']},
 17:{flow:['ПОСТЪПИЛА ЖАЛБА','КВАЛИФИКАЦИЯ','ПРАВНО ОСНОВАНИЕ','ИЗБОР НА ДЕЙСТВИЕ','ПРОЕКТ НА РЕЗУЛТАТ'],details:['Жалба, адресат и предмет','Оспорван акт, срок и компетентност',null,'Действие според конкретния ред','Експертен преглед и потвърждение'],result:'Проект на мотивирано процесуално действие по жалбата',parts:['Квалификация и факти по жалбата','Компетентност, срокове и относим ред','Проект на документ според установения изход']},
 18:{flow:['ПОСТЪПИЛ СИГНАЛ','ПРОВЕРКА НА ФАКТИ','ПРАВНО ОСНОВАНИЕ','СЛЕДВАЩО ДЕЙСТВИЕ','ПРОЕКТ НА РЕЗУЛТАТ'],details:['Предмет и съдържание на сигнала','Сведения и необходимост от проверка',null,'Проверка или уведомяване според случая','Експертно потвърждение'],result:'Проект на документ за действие или уведомяване по сигнал',parts:['Факти, констатации и установена компетентност','Приложим ред и необходима проверка','Мотивиран проект на последващо действие']},
 19:{flow:['ПОСТЪПИЛО ВЪЗРАЖЕНИЕ','ПРОЦЕДУРЕН ЕТАП','ПРАВНО ОСНОВАНИЕ','РАЗГЛЕЖДАНЕ','ПРОЕКТ НА ОТГОВОР'],details:['Текст и приложени документи','Допустимост и относимост към производството',null,'Анализ на изложените аргументи','Преглед и потвърждение'],result:'Проект на мотивиран отговор или друго относимо действие по възражението',parts:['Изложени искания и доказателства','Мотиви за приемане или неприемане на доводи','Документ според приложимата процедура']},
 20:{flow:['ПОСТЪПИЛ ДОКУМЕНТ','КОМПЕТЕНТЕН ОРГАН','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА ПРЕПРАЩАНЕ','ПОТВЪРЖДЕНИЕ'],details:['Предмет на сезирането','Проверка на компетентност',null,'Адресиране и комплектоване','Експертен преглед'],result:'Проект на писмо за препращане по компетентност',parts:['Посочване на компетентния орган','Основание за препращане и приложени документи','Уведомяване и срокове според приложимия ред']},
 21:{flow:['ПРЕПИСКА И ПОВОД','КОНТРОЛЕН КОНТЕКСТ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА УВЕДОМЛЕНИЕ','ЕКСПЕРТЕН ПРЕГЛЕД'],details:['Основание и налични материали','Предмет и етап на проверката',null,'Уточняване на адресат и съдържание','Преглед и потвърждение'],result:'Проект на уведомление във връзка с проверка',parts:['Предмет, основание и обхват на проверката','Необходими действия и информация за адресата','Проект на документ според правомощията']},
 22:{flow:['ПОСТЪПИЛО ПРЕДЛОЖЕНИЕ','ПРОВЕРКА НА СЪДЪРЖАНИЕ','ПРАВНО ОСНОВАНИЕ','РАЗГЛЕЖДАНЕ','ПРОЕКТ НА РЕЗУЛТАТ'],details:['Предложение и приложени данни','Компетентност и изискуем ред',null,'Мотивиране на последващото действие','Експертен преглед и потвърждение'],result:'Проект на решение или уведомяване по предложение',parts:['Съдържание и факти по предложението','Проверка на компетентност и приложим ред','Мотивирано действие и проект на документ']}
};
const icons=[
 '<path d="M3 5h18v15H3zM7 3v4M12 3v4M3 9h18"/>',
 '<path d="M6 3h9l4 4v14H6zM9 11h7M9 15h7M15 3v4h4"/>',
 '<path d="M12 3v18M5 6h14M5 6l-3 6h6zM19 6l-3 6h6zM8 21h8"/>',
 '<path d="M7 3h8l4 4v14H5V3zM15 3v5h5M8 12h8M8 16h7"/>',
 '<path d="M5 12l4 4L19 6M12 2a10 10 0 1 1-10 10A10 10 0 0 1 12 2z"/>'
];
const svg=paths=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths+'</svg>';
const section=document.createElement('section');section.className='kt134-flow02';section.id='kt134PanelGenericEntry';
section.setAttribute('aria-label','Схема на процеса');
const intro=document.createElement('p');intro.className='kt134-flow02-intro';
const steps=document.createElement('div');steps.className='kt134-flow02-steps';
const meta=document.createElement('div');meta.className='kt134-flow02-meta';
const result=document.createElement('div');result.className='kt134-flow02-result';
const resultIcon=document.createElement('span');resultIcon.innerHTML=svg('<path d="M5 3h10l4 4v14H5V3zM15 3v4h4M8 12h8M8 16h8"/>');
const resultBody=document.createElement('div');
const resultTitle=document.createElement('strong');resultTitle.textContent='КРАЕН РЕЗУЛТАТ';
const resultText=document.createElement('span');
const partBox=document.createElement('div');partBox.className='kt134-flow02-result-items';
const foot=document.createElement('em');foot.textContent='Съдържанието и приложимият ред се проверяват за конкретната преписка. Експертът редактира и потвърждава проекта; няма автоматично изпращане.';
resultBody.append(resultTitle,resultText,partBox,foot);
result.append(resultIcon,resultBody);meta.append(result);
const actions=document.createElement('div');actions.className='kt134-flow02-actions';
const back=document.createElement('button');back.type='button';back.textContent='← Към панелите';
const enter=document.createElement('button');enter.type='button';enter.textContent='Отвори работния панел →';
actions.append(back,enter);section.append(intro,steps,meta,actions);
const warn=dialog.querySelector('.warn');if(warn)warn.before(section);else dialog.append(section);
back.addEventListener('click',()=>{overlay.classList.remove('kt134-flow-mode','kt134-flow-other-mode');window.KT80DashboardHome?.();overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true')});
enter.addEventListener('click',()=>{overlay.classList.remove('kt134-flow-mode','kt134-flow-other-mode');const first=dialog.querySelector('.tabs button');if(first)first.focus();else document.getElementById('close')?.focus()});
window.KT134ShowPanel02Entry=function(c){
  original(c);
  overlay.classList.remove('kt134-flow-other-mode');
  const id=Number(c?.id),cfg=catalog[id];
  if(!cfg)return;
  overlay.classList.add('kt134-flow-mode','kt134-flow-other-mode');
  intro.textContent='Последователност на работа — '+c.title;
  steps.replaceChildren();
  cfg.flow.forEach((title,i)=>{
    const tile=document.createElement('div');tile.className='kt134-flow02-step';
    const emblem=document.createElement('div');emblem.className='kt134-flow02-icon';emblem.innerHTML=svg(icons[i]);
    const heading=document.createElement('strong');heading.textContent=title;
    const desc=document.createElement('small');
    desc.textContent=i===2?(c.legal?'Ориентировъчно: '+c.legal:'Прилага се провереното правно основание'):cfg.details[i];
    tile.append(emblem,heading,desc);steps.append(tile);
  });
  resultText.textContent=cfg.result;
  partBox.replaceChildren();
  cfg.parts.forEach(value=>{const item=document.createElement('span');item.textContent=value;partBox.append(item)});
};
window.KT133ApprovedFlowCatalog=catalog;
window.KT134FlowCatalogCount=Object.keys(catalog).length;
})();

/* KT133 bridge: hook ONLY dashboard route-tile clicks; never intercept Stage5 case handoff. */
(function(){
'use strict';
if(window.KT133VisualBridgeInstalled)return;
window.KT133VisualBridgeInstalled=true;
document.addEventListener('click',function(event){
 const tile=event.target?.closest?.('#kt80DashboardFive .kt80-dashboard-tile[data-kt80-kind="route"], #groups article.card');
 if(!tile)return;
 const raw=tile.getAttribute('data-panel-id') || tile.getAttribute('data-kt80-index') ||
   (tile.matches('#groups article.card') ? (tile.querySelector('.kind')?.textContent||'').match(/№\s*(\d+)/)?.[1] : null);
 const id=Number(raw);
 if(!Number.isInteger(id)||id<1||id===13||id===14||id===15)return;
 setTimeout(function(){
   const overlay=document.getElementById('overlay');
   if(!overlay?.classList.contains('open')||typeof window.KT134ShowPanel02Entry!=='function')return;
   const entry=(window.KT80RouteCatalog||[]).find(c=>Number(c.id)===id)||{id,legal:''};
   window.KT134ShowPanel02Entry(entry);
 },380);
},true);
})();
/* kt134FiveStageVisualRuntime — accepted visual-only code copied from approved reference */

/* Decorative, aria-hidden SVGs added to existing five navigation buttons. */
document.addEventListener('DOMContentLoaded',function(){
 const strokes={
  1:'<path d="M8 18h14l5 6h29v29H8z"/><path d="M8 20V12h19l6 6"/><circle cx="45" cy="44" r="11"/><path d="m53 52 9 9"/>',
  2:'<path d="M20 9H9v13M44 9h11v13M9 43v12h13M55 43v12H43"/><circle cx="32" cy="32" r="11"/><circle cx="32" cy="32" r="3"/>',
  3:'<path d="m9 44 14-7 16 5 16-7v17l-16 7-16-5-14 7z"/><path d="M23 37v17M39 42v17"/><path d="M32 6c-10 0-16 7-16 16 0 11 16 24 16 24s16-13 16-24C48 13 42 6 32 6z"/><circle cx="32" cy="22" r="5"/>',
  4:'<path d="M32 7v50M12 19h40M19 19 9 39h20L19 19zM45 19 35 39h20L45 19zM20 57h24"/><path d="M28 11h8"/>',
  5:'<circle cx="32" cy="46" r="5"/><path d="M32 40V10m0 0-8 9m8-9 8 9M32 36 13 23m0 0 2 9m-2-9 10-1M32 36l19-13m0 0-10-1m10 1-2 9"/><path d="M9 51h15m16 0h15"/>'
 };
 const motifs={
  1:'<g fill="none" stroke="currentColor" stroke-width="2"><path d="M12 85 26 25l51 7-15 66z" fill="currentColor" fill-opacity=".18"/><path d="M42 88 56 15l56 10-13 73z" fill="currentColor" fill-opacity=".35"/><path d="M65 39h34M62 49h30M60 59h29M58 69h28"/></g>',
  2:'<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 85c25-45 50-3 75-44s52-8 72-33M5 99c25-45 50-3 75-44s52-8 72-33M5 70c25-45 50-3 75-44s52-8 72-33"/><path d="m52 83 20-26 27 9 3 18-31 12z" fill="currentColor" fill-opacity=".2"/></g>',
  3:'<g fill="none" stroke="currentColor" stroke-width="2"><path d="M5 75 48 12l52 13 43-9M4 35l46 14 24 49 64-31M24 5l-8 91M88 5l-13 91M135 0l-20 100"/><path d="m58 48 34-3 10 30-35 9-13-21z" fill="currentColor" fill-opacity=".3"/></g>',
  4:'<g fill="none" stroke="currentColor" stroke-width="2"><path d="m21 89 10-57 42 4-9 57z" fill="currentColor" fill-opacity=".17"/><path d="m63 95 13-73 44 7-11 66z" fill="currentColor" fill-opacity=".22"/><path d="M80 47h28M78 57h28M76 67h27M74 77h24"/><text x="81" y="43" fill="currentColor" font-size="22">§</text></g>',
  5:'<g fill="none" stroke="currentColor" stroke-width="2"><rect x="46" y="8" width="66" height="20" rx="4"/><rect x="7" y="67" width="45" height="20" rx="4"/><rect x="98" y="67" width="45" height="20" rx="4"/><path d="M79 28v14m0 0-37 18m37-18 37 18"/><path d="m79 42-7 6 14 0z" fill="currentColor"/></g>'
 };
 function svg(body,view){const el=document.createElementNS('http://www.w3.org/2000/svg','svg');
 el.setAttribute('viewBox',view||'0 0 64 64');el.setAttribute('fill','none');el.setAttribute('stroke','currentColor');
 el.setAttribute('stroke-width','3');el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');
 el.setAttribute('aria-hidden','true');el.innerHTML=body;return el;}
 for(let i=1;i<=5;i++){
  const b=document.querySelector('#kt80DashboardFive .kt80-dashboard-tile[data-kt80-kind="step"][data-kt80-index="'+i+'"]');
  if(!b||b.querySelector('.kt134-stage-emblem'))continue;
  const emblem=svg(strokes[i]);emblem.setAttribute('class','kt134-stage-emblem');
  const motif=svg(motifs[i],'0 0 150 105');motif.setAttribute('class','kt134-stage-illustration');
  b.append(motif,emblem);
 }
});



/* KT133 public dashboard presentation patch. Original app model and route handling remain unchanged. */
(function(){
'use strict';
function normalize(){
  const candidates=document.querySelectorAll('summary,button,h3');
  for(const el of candidates){
    if(el.closest('#overlay'))continue;
    const t=el.textContent||'';
    if(!t.includes('Специализирани резултати и инструменти'))continue;
    if(!/(?:покажи|скрий)/iu.test(t))continue;
    const changed=t.replace(/покажи\s*22\s*[-–—]?\s*те\s*възможности/giu,'покажи възможностите')
      .replace(/скрий\s*списъка/giu,'скрий възможностите');
    if(changed!==t){
      // Preserve the original summary/button element and its click listeners.
      const textNodes=[...el.childNodes].filter(n=>n.nodeType===3);
      const node=textNodes.find(n=>(n.textContent||'').includes('22-те възможности'));
      if(node)node.textContent=node.textContent.replace(/покажи\s*22\s*[-–—]?\s*те\s*възможности/giu,'покажи възможностите');
      else el.textContent=changed;
    }
  }
  document.querySelectorAll('#kt80DashboardRoutes .kt80-dashboard-tile[data-kt80-index="13"],#kt80DashboardRoutes .kt80-dashboard-tile[data-kt80-index="14"]').forEach(e=>e.remove());
  const count=document.getElementById('kt80DashboardCount');
  if(count && /22\s+специализирани/.test(count.textContent||''))count.textContent='5 основни етапа + 20 специализирани панела';
}
function init(){
  normalize();
  const routes=document.getElementById('kt80DashboardRoutes');
  if(routes)new MutationObserver(normalize).observe(routes,{childList:true});
  for(const el of document.querySelectorAll('summary')){
    if((el.textContent||'').includes('Специализирани резултати и инструменти'))
      new MutationObserver(normalize).observe(el,{childList:true,characterData:true,subtree:true});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();

/* KT133 entrance bridge, dashboard click is animated: after the original route
   handler opens its protected dialog, show the accepted five-step entrance.
   The independent GIS panel 15 and retired IDs 13/14 are excluded. */
(function(){
'use strict';
function init(){
  const overlay=document.getElementById('overlay');
  if(!overlay)return;
  let last='';
  function show(id){
    id=Number(id);
    if(!Number.isInteger(id)||id<1||[13,14,15].includes(id))return;
    if(!overlay.classList.contains('open'))return;
    const title=document.getElementById('dialogTitle');
    if(!title || !new RegExp('№\\s*0?'+id+'(?:\\D|$)','u').test(title.textContent||''))return;
    const fn=window.KT134ShowPanel02Entry;
    if(typeof fn!=='function')return;
    const c=(window.KT80RouteCatalog||[]).find(x=>Number(x.id)===id);
    if(!c)return;
    const key=String(id);
    if(last===key && overlay.classList.contains('kt134-flow-mode'))return;
    fn(c);
    last=key;
  }
  document.addEventListener('click',event=>{
    const tile=event.target?.closest?.('#kt80DashboardRoutes .kt80-dashboard-tile[data-kt80-kind="route"]');
    if(!tile)return;
    const id=Number(tile.dataset.kt80Index);
    if(!Number.isInteger(id)||[13,14,15].includes(id))return;
    // Allow the existing 260ms navigation animation and original dialog handler to finish.
    setTimeout(()=>show(id),350);
    setTimeout(()=>show(id),700);
  },true);
  const title=document.getElementById('dialogTitle');
  if(title)new MutationObserver(()=>{
    const match=(title.textContent||'').match(/№\s*0?(\d{1,2})\b/u);
    if(match)show(Number(match[1]));
  }).observe(title,{childList:true,characterData:true,subtree:true});
  new MutationObserver(()=>{
    if(!overlay.classList.contains('open')){last='';return}
    const text=document.getElementById('dialogTitle')?.textContent||'';
    const match=text.match(/№\s*0?(\d{1,2})\b/u);
    if(match)show(Number(match[1]));
  }).observe(overlay,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();


/* KT133 real authenticated entrance adapter: presentation only.
   Existing modal actions, original route handlers and case state are preserved. */
(function(){
'use strict';
const icons=[
 '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M7 3v4M12 3v4"/>',
 '<path d="M7 3h8l4 4v14H5V3zM15 3v5h5M8 12h8M8 16h7"/>',
 '<path d="M12 3v18M5 6h14M5 6l-3 6h6l-3-6ZM19 6l-3 6h6l-3-6ZM8 21h8"/>',
 '<path d="M5 3h10l4 4v14H5V3zM15 3v4h4M8 12h8M8 16h8"/>',
 '<path d="M5 12l4 4L19 6M12 2a10 10 0 1 1-10 10A10 10 0 0 1 12 2z"/>'
];
const config02={
 flow:['ПРЕПИСКА','ПРОВЕРКА НА ЛИПСИТЕ','ПРАВНО ОСНОВАНИЕ','ПРОЕКТ НА ИСКАНЕ','ЕКСПЕРТНО РЕШЕНИЕ'],
 details:['Получени документи и потвърдени факти','Необходимите данни по приложимия ред',null,'Конкретни въпроси и документи','Преглед, редакция и потвърждение'],
 result:'Проект на изходящо писмо за предоставяне на допълнителна информация',
 parts:['Конкретно установени липси и необходими уточнения','Точно формулирани искания за сведения и документи','Мотивирано правно основание, адресат и приложим срок']
};
const add=(parent,tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;parent.append(el);return el;
};
function findLegacyModal(heading){
 let node=heading.parentElement;
 for(let n=0;node&&n<9;n++,node=node.parentElement){
  if(node===document.body)break;
  const text=node.textContent||'';
  if(text.length>5500)continue;
  if([...node.querySelectorAll('button')].some(b=>(b.textContent||'').includes('Отвори работния панел')))
   return node;
 }
 return null;
}
function findLegacyIntro(modal){
 // Never hide a wrapper that contains the original working-panel button.
 return [...modal.querySelectorAll('p,div')].find(el=>{
  const t=(el.textContent||'').trim();
  return t.startsWith('Тук експертът преглежда материалите') &&
   t.length<320 && !el.querySelector('button,a,[role="button"]');
 });
}
function hideOldSteps(modal){
 const blocks=[...modal.querySelectorAll('div,section,ul')].filter(el=>{
  const t=el.textContent||'';
  return t.length<900 && t.includes('Постъпила документация') &&
   t.includes('Проверка за липси') && t.includes('Искане за допълнителна информация') &&
   !t.includes('Отвори работния панел') &&
   !el.querySelector('button,a,[role="button"]');
 });
 if(blocks.length)blocks.sort((a,b)=>a.textContent.length-b.textContent.length)[0].classList.add('kt133-legacy-intro-hidden');
}
function enhance(heading){
 const idMatch=(heading.textContent||'').match(/^Панел\s*№\s*0?(\d{1,2})\s*[·:—-]/u);
 if(!idMatch)return;
 const id=Number(idMatch[1]);
 if([13,14,15].includes(id))return;
 const modal=findLegacyModal(heading);
 if(!modal || modal.querySelector('.kt133-approved-real-entrance'))return;
 const cfg=id===2?config02:window.KT133ApprovedFlowCatalog?.[id];
 if(!cfg || !Array.isArray(cfg.flow) || cfg.flow.length!==5)return;
 const intro=findLegacyIntro(modal);
 const section=document.createElement('section');
 section.className='kt133-approved-real-entrance';
 section.setAttribute('aria-label','Одобрена последователност на работния панел');
 add(section,'p','kt133-approved-intro','Последователност на работа — от установените факти до проекта на резултат');
 const chain=add(section,'div','kt133-approved-chain');
 cfg.flow.forEach((headingText,i)=>{
  const tile=add(chain,'div','kt133-approved-step');
  const symbol=add(tile,'span','kt133-approved-icon');
  symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[i]+'</svg>';
  add(tile,'strong','',headingText);
  add(tile,'small','',i===2?'Определя се според преписката':cfg.details[i]||'');
 });
 const result=add(section,'div','kt133-approved-result');
 add(result,'strong','','КРАЕН РЕЗУЛТАТ');
 add(result,'p','',cfg.result);
 const parts=add(result,'div','kt133-approved-parts');
 (cfg.parts||[]).forEach(part=>add(parts,'span','',part));
 add(result,'em','','Проектът се преглежда, редактира и потвърждава от експерта. Не се изпраща автоматично.');
 // Keep the original action button and its registered click handler intact.
 if(intro){intro.before(section);intro.classList.add('kt133-legacy-intro-hidden');}
 else {
  const btn=[...modal.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Отвори работния панел'));
  if(btn)btn.parentElement.before(section);else modal.append(section);
 }
 hideOldSteps(modal);
 // Functional safety: never leave the original action hidden by presentation-only styles.
 const originalAction=[...modal.querySelectorAll('button')].find(b=>
  (b.textContent||'').includes('Отвори работния панел'));
 if(originalAction){
  for(let p=originalAction;p&&p!==modal;p=p.parentElement)
   p.classList.remove('kt133-legacy-intro-hidden');
  originalAction.hidden=false;
  originalAction.removeAttribute('aria-hidden');
 }
 modal.classList.add('kt133-approved-entrance-container');
}
let running=false;
function reconcile(){
 if(running)return;running=true;
 try{
  // This caption may be dynamically rendered after the initial page load.
  for(const el of document.querySelectorAll('summary,button')){
   if(el.closest('.kt133-approved-real-entrance'))continue;
   const texts=[];const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   while(walker.nextNode())texts.push(walker.currentNode);
   for(const node of texts){
    if(!/Специализирани резултати и инструменти/.test(el.textContent||''))continue;
    const revised=(node.textContent||'')
     .replace(/покажи\s*22\s*[-–—]?\s*те\s*възможности/giu,'покажи възможностите')
     .replace(/скрий\s*списъка/giu,'скрий възможностите');
    if(revised!==node.textContent)node.textContent=revised;
   }
  }
  document.querySelectorAll('#kt80DashboardRoutes .kt80-dashboard-tile[data-kt80-index="13"],#kt80DashboardRoutes .kt80-dashboard-tile[data-kt80-index="14"]').forEach(el=>el.remove());
  document.querySelectorAll('h1,h2,h3,h4').forEach(enhance);
 }finally{running=false}
}
function init(){
 reconcile();
 // Watch added authenticated modal nodes and dynamic headings, not just the legacy #overlay.
 const observer=new MutationObserver(reconcile);
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
