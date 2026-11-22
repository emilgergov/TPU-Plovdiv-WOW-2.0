
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
 const raw=tile.getAttribute('data-kt80-index')||tile.getAttribute('data-panel-id');
 const id=Number(raw);
 if(!Number.isInteger(id)||id<1||id===13||id===14||id===15)return;
 setTimeout(function(){
   const overlay=document.getElementById('overlay');
   if(!overlay?.classList.contains('open')||typeof window.KT134ShowPanel02Entry!=='function')return;
   const entry=(window.KT80RouteCatalog||[]).find(c=>Number(c.id)===id)||{id,legal:''};
   window.KT134ShowPanel02Entry(entry);
 },25);
},true);
})();