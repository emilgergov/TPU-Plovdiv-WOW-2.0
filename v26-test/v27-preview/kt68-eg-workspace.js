/* KT68 EK01-EK06, EK08. Presentation-only enhancement: locked generators untouched. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const style=document.createElement('style');
style.textContent=`
/* Preserve all open workflow elements and existing IDs/handlers. */
body>main>aside .v26-step-label{background:#eaf3ed!important;color:#174a34!important;border:0!important;border-left:4px solid #387f5c!important;border-radius:8px!important;padding:10px 11px!important;font-size:13px!important;letter-spacing:.01em;margin:10px 0 4px!important;box-shadow:0 1px 0 #d5e4d9}
body>main>aside button:not(.secondary):not(:disabled),body>main>aside button.kt68-primary:not(:disabled){background:#176548!important;color:#fff!important;border:1px solid #176548!important;box-shadow:0 1px 2px #083b261f}
body>main>aside button.secondary:not(.kt68-primary){background:#f0f6f2!important;color:#24583e!important;border:1px solid #bfd5c7!important;box-shadow:none!important}
body>main>aside button.kt68-primary{background:#176548!important;color:#fff!important;border:1px solid #176548!important}
body>main>aside button:hover:not(:disabled){filter:brightness(.94)}
body>main>aside .v26-step-label.kt68-current{outline:2px solid #68a583;outline-offset:1px}
.kt68-brand{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 5px;margin-top:12px;border-top:1px solid #d9e5dd;color:#456052;font-size:11px;text-align:center;line-height:1.5}
.kt68-brand strong{background:#176548;color:#fff;border-radius:5px;padding:3px 7px;letter-spacing:.05em}
.kt68-modal-shade{position:fixed;inset:0;z-index:100000;background:rgba(8,34,25,.62);display:flex;justify-content:center;align-items:center;padding:20px}
.kt68-modal{background:white;color:#15352b;width:min(100%,490px);padding:24px;border-radius:14px;box-shadow:0 16px 48px #0004;border-top:5px solid #176548;line-height:1.55}
.kt68-modal h2{margin:0 0 12px;color:#124333;font-size:20px}
.kt68-modal p{margin:0 0 16px;font-size:14px}
.kt68-modal .kt68-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.kt68-modal button{min-height:40px;padding:8px 16px}
.kt68-modal button.kt68-cancel{background:#e8f2ea;color:#24583e}
.kt68-mapbar{position:absolute;top:64px;left:12px;right:auto;z-index:6;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;background:rgba(255,255,255,.92);border-radius:8px;box-shadow:0 1px 3px #0002;max-width:calc(100% - 220px)}
.kt68-mapbar button{font-size:12px;padding:6px 10px;background:#176548}
.kt68-mapbar .kt68-hint{font-size:11px;color:#28523f}
.kt68-map-expanded{position:fixed!important;inset:12px!important;z-index:9998!important;min-height:0!important;max-height:none!important;height:auto!important;width:auto!important;background:white!important;border:3px solid #176548!important;border-radius:10px!important;padding:10px!important;box-shadow:0 0 0 500vmax rgba(0,0,0,.65)!important;display:flex!important;flex-direction:column!important}
.kt68-map-expanded #map{flex:1 1 auto!important;min-height:0!important;height:100%!important}
.kt68-map-expanded .controls{flex:0 0 auto}
.kt68-map-expanded .caption{flex:0 0 auto}
.kt68-map-expanded .kt68-mapbar{flex:0 0 auto;top:66px;left:16px;max-width:calc(100% - 220px)}
body.kt68-map-is-expanded{overflow:hidden!important}
.kt68-info{margin:5px 8px;padding:7px 10px;background:#f1f7f3;border-left:3px solid #317852;border-radius:6px;color:#174b36;font-size:12px}
.kt68-technical{display:block;font-size:11px;overflow-wrap:anywhere;color:#65786c;margin:4px 0 0}
@media(max-width:760px){.kt68-map-expanded{inset:4px!important}.kt68-modal{padding:17px}.kt68-mapbar{padding:3px}}
`;
document.head.append(style);
const topTitle=document.querySelector('#v26-wow341>summary');if(topTitle)topTitle.textContent=topTitle.textContent.replace(/AI Автор/gi,'EG автор');
const steps=[...document.querySelectorAll('aside .v26-step-label')];
const names=['1. Преписка и имоти','2. Предмет на предложението','3. ГИС анализ','4. Нормативни документи','5. Проекти на становища'];
steps.forEach((x,i)=>{if(i<5)x.textContent=names[i]});
const input=$('casefile');if(input){input.accept='.zip,.pdf,.docx,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.webp,.txt,application/zip,application/pdf,image/*';input.setAttribute('aria-label','Избери преписка: ZIP, PDF, Word или изображение')}
const drop=$('zipDrop');if(drop){drop.setAttribute('aria-label','Пуснете ZIP, PDF, Word или изображение');const strong=drop.querySelector('strong');if(strong)strong.textContent='Пуснете преписката тук';}
const zipName=$('zipName');if(zipName&&zipName.textContent.includes('архив'))zipName.textContent='Няма избран файл';
const extract=$('extract');if(extract)extract.textContent='Обработи преписката';
const proposal=$('proposal');if(proposal){proposal.textContent='Тест - чл.2, ал.2 от НОС';proposal.classList.add('kt68-primary')}
const reset=$('reset');if(reset)reset.textContent='Изчисти данните';
const gisPdf=$('v26pdf');if(gisPdf){
 gisPdf.textContent='Изготви ГИС справка (PDF)';
 gisPdf.classList.add('kt68-primary');
 gisPdf.setAttribute('title','Изготвя задължителния PDF1 въз основа на намерените имоти и пространствения анализ.');
}
const zoomFit=$('fit');if(zoomFit)zoomFit.textContent='Центрирай';
const map=$('map')?.closest('.map');
if(map){
 const bar=document.createElement('div');bar.className='kt68-mapbar';
 const fullscreen=document.createElement('button');fullscreen.type='button';fullscreen.textContent='⛶ На цял екран';fullscreen.setAttribute('aria-pressed','false');
 fullscreen.onclick=()=>{const expanded=map.classList.toggle('kt68-map-expanded');document.body.classList.toggle('kt68-map-is-expanded',expanded);fullscreen.textContent=expanded?'↙ Затвори целия екран':'⛶ На цял екран';fullscreen.setAttribute('aria-pressed',String(expanded))};
 const legend=document.createElement('span');legend.className='kt68-hint';legend.textContent=''; // Original map caption already has the legend; no duplicate.
 bar.append(fullscreen,legend);map.insertBefore(bar,map.querySelector('svg'));
 const details=$('details'),info=document.createElement('div');info.className='kt68-info';info.textContent='Изберете имот за пространствените данни.';const z=$('zoneStatus');if(z)z.after(info);
 if(details){const refresh=()=>{const v=(details.textContent||'').trim();if(v&&!v.includes('Изберете намерен'))info.textContent=v.slice(0,320)};new MutationObserver(refresh).observe(details,{subtree:true,childList:true,characterData:true});refresh()}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&map.classList.contains('kt68-map-expanded'))fullscreen.click()});
}
// Replace human-facing branding only, never API identifiers, validation messages or generator contracts.
const branded=['AI автор','AI проект','AI чернова','AI помощник','Продължи с AI'];
const translate=t=>t.replace(/AI автор/g,'EG автор').replace(/AI проект/g,'EG проект').replace(/AI чернова/g,'EG работен проект').replace(/AI помощник/g,'EG помощник').replace(/Продължи с AI/g,'Продължи с EG');
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||p.closest('script,style,pre,code,#status,#intakeResult'))return NodeFilter.FILTER_REJECT;return branded.some(x=>n.textContent.includes(x))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.textContent=translate(n.textContent));
const aside=document.querySelector('body>main>aside');if(aside){const foot=document.createElement('div');foot.className='kt68-brand';foot.innerHTML='<strong>EG</strong><span>Експертен анализ · ТПУ Пловдив<br>Разработен от Емил Гергов с професионалния опит и съдействието на колегите и с подкрепата на съвременните технологии.</span>';aside.append(foot)}
function confirmPackage(){return new Promise(resolve=>{
 const shade=document.createElement('div');shade.className='kt68-modal-shade';
 const panel=document.createElement('div');panel.className='kt68-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','kt68DialogTitle');
 const title=document.createElement('h2');title.id='kt68DialogTitle';title.textContent='EG · Тест по чл. 2, ал. 2 от НОС';
 const p=document.createElement('p');p.textContent='ТЕСТОВ РЕЖИМ — само за предварително експертно филтрирани преписки, при които е обоснован отрицателен извод за необходимостта от процедура по глава втора от Наредбата за ОС. Classic A/Б и Expert използват предварително зададен краен извод: AI авторът НЕ извършва независима процедурна квалификация. При потвърдени имоти и водещ имот, завършен ГИС PDF1, нормативен PDF2, потвърден предмет, наличен AI автор и успешно преминали проверки се подготвя ZIP с класически Word проект, експертен Word проект, ГИС PDF1, нормативен PDF2 и README. Ако обстоятелствата не подкрепят този извод или данните/проверките са недостатъчни, не използвайте тестовия генератор. Всички файлове са работни проекти за експертен преглед, не официални административни актове.';
 const buttons=document.createElement('div');buttons.className='kt68-actions';const cancel=document.createElement('button');cancel.className='kt68-cancel';cancel.textContent='Отказ';const ok=document.createElement('button');ok.textContent='Продължи';
 const done=v=>{shade.remove();resolve(v)};cancel.onclick=()=>done(false);ok.onclick=()=>done(true);shade.onmousedown=e=>{if(e.target===shade)done(false)};
 shade.onkeydown=e=>{if(e.key==='Escape')done(false)};buttons.append(cancel,ok);panel.append(title,p,buttons);shade.append(panel);document.body.append(shade);ok.focus();
 })}
window.KT68UI=Object.freeze({confirmPackage});
})();
