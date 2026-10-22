(()=>{'use strict';
const $=id=>document.getElementById(id);
const dossier=$('dossier'),inventory=$('inventory'),gis=$('runAnalysis'),pdf=$('downloadPdf'),map=$('downloadMap'),refs=$('referencesPdf'),word=$('proposalDraft');
if(!dossier||!inventory||!gis)return;
const css=document.createElement('style');css.textContent=`
.v26-recovery{background:#fff;border:1px solid #d4e2db;border-radius:14px;padding:18px;margin:0 0 16px;box-shadow:0 2px 8px #123b2510}.v26-recovery h2{margin:0 0 8px}.v26-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.v26-step{border:1px solid #d4e2db;border-radius:9px;background:#f6faf8;padding:11px;text-align:left;cursor:pointer;font:inherit;color:#164437;margin:0}.v26-step:hover{border-color:#176b50}.v26-step strong{display:block;font-size:.88rem}.v26-step small{display:block;color:#5d736a;margin-top:5px;font-size:.77rem}.v26-chip{display:inline-block;border:1px solid #b4d4c0;background:#e6f4e9;color:#23623d;border-radius:99px;padding:2px 7px;font-size:.72rem;font-weight:700}.v26-chip.pending{border-color:#e4c48c;background:#fff5e2;color:#7c531b}.v26-drop{border:2px dashed #7da996;border-radius:12px;padding:23px 16px;text-align:center;background:#f1f8f3;cursor:pointer;margin:12px 0;transition:background .15s}.v26-drop.active{background:#d5f1e1;border-color:#176b50}.v26-drop strong{display:block;color:#14543c}.v26-drop span{display:block;color:#58766b;font-size:.85rem;margin-top:5px}.v26-runstate{background:#eef4f0;border-left:4px solid #176b50;padding:10px;margin:12px 0;font-size:.87rem}.v26-runstate[aria-live]{white-space:pre-wrap}.v26-recovery .muted{margin:6px 0}.v26-stage-label{font-size:.78rem;font-weight:700;color:#3d6d58;letter-spacing:.04em;text-transform:uppercase}@media(max-width:750px){.v26-flow{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:450px){.v26-flow{grid-template-columns:1fr}}
`;document.head.append(css);
const shell=document.querySelector('main.wrap'),steps=shell?.querySelector('.steps');if(!shell)return;
const board=document.createElement('section');board.className='v26-recovery';board.innerHTML=`<h2>V26 · Одобрени програмни проверки и работен екран</h2><p class="muted">Зелен PASS = преминал автоматизиран тест на сървърния модул. Не означава, че операцията е изпълнена в този браузър. Екранните операции се потвърждават отделно.</p><div class="v26-flow" id="v26-flow"></div><div class="v26-runstate" id="v26-runstate" aria-live="polite">Готовност: очаква се преписка. Стъпките са видими; изпълнението се отчита само при реален резултат.</div>`;
if(steps)steps.after(board);else shell.prepend(board);
const entries=[
['ZIP преписка','inventory','Досие, опис, извличане','test_v26_dossier_intake.py'],
['Имотен състав','prepare','Водещи / съпътстващи','test_v26_workflow.py'],
['ГИС входове','check','Реални геометрии','test_v26_batch_analysis.py'],
['ГИС анализ','runAnalysis','Пресичания, План А/Б','test_zone_overlay.py'],
['Приложение №1','downloadPdf','Доказателствен PDF','test_v26_evidence_pdf.py'],
['ГИС карта','v26-map','Слоеве и КАДНУМ','test_v26_server_integration.py'],
['Документален анализ','referencesPdf','Приложение №2 (по избор)','test_v26_documentary_chain.py'],
['Word предложение','proposalDraft','Оригинален образец','test_v26_word_templates.py'],
['ZIP комплект','proposalDraft','Word + PDF приложения','test_v26_zip_appendix_acceptance.py']
];const flow=$('v26-flow');
for(const [name,id,desc,test] of entries){const b=document.createElement('button');b.type='button';b.className='v26-step';b.innerHTML='<span class="v26-chip">PASS · тест</span><strong></strong><small></small>';b.querySelector('strong').textContent=name;b.querySelector('small').textContent=desc;b.title='Тестова група: '+test;b.onclick=()=>{const el=$(id);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});if(el.tagName==='BUTTON')el.focus({preventScroll:true})}else if(name==='ZIP комплект'){word.scrollIntoView({behavior:'smooth',block:'center'})}};flow.append(b)}
const box=document.createElement('div');box.id='v26-drop';box.className='v26-drop';box.tabIndex=0;box.setAttribute('role','button');box.setAttribute('aria-label','Изберете или пуснете ZIP преписка');box.innerHTML='<strong>Пусни ZIP преписката тук</strong><span>Drag & Drop или натисни за избор на ZIP · без качване в GitHub</span>';dossier.parentElement.insertBefore(box,dossier);dossier.style.marginTop='6px';
box.onclick=()=>dossier.click();box.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dossier.click()}};
for(const evt of ['dragenter','dragover'])box.addEventListener(evt,e=>{e.preventDefault();box.classList.add('active')});
for(const evt of ['dragleave','drop'])box.addEventListener(evt,e=>{e.preventDefault();box.classList.remove('active')});
box.addEventListener('drop',e=>{const files=e.dataTransfer?.files;if(!files?.length)return;const file=files[0];if(!/\.zip$/i.test(file.name)){setStatus('Приемат се само ZIP архиви.');return}try{const dt=new DataTransfer();dt.items.add(file);dossier.files=dt.files;dossier.dispatchEvent(new Event('change',{bubbles:true}));setStatus('Избран ZIP: '+file.name+'. Натисни „Отбележи приложената преписка“ за реален опис.')}catch(err){setStatus('Браузърът не допуска автоматично задаване на файл. Използвай полето за избор.')}});
dossier.addEventListener('change',()=>{const f=dossier.files[0];box.querySelector('strong').textContent=f?'ZIP: '+f.name:'Пусни ZIP преписката тук';setStatus(f?'Избрана преписка. Описът още не е изпълнен.':'Очаква ZIP преписка.')});
function setStatus(t){$('v26-runstate').textContent=t}
inventory.addEventListener('click',()=>setStatus('Обработка на ZIP: заявен е опис към V26 API. Изчакай резултата под бутона.'));
$('check')?.addEventListener('click',()=>setStatus('Проверка на реалните геометрии: виж резултата в секция „Пространствени данни“.'));
gis.addEventListener('click',()=>setStatus('ГИС изчисление: заявка към V26 API. PASS от GitHub не е резултат за тази преписка.'));
document.addEventListener('v26:dossier-ready',()=>setStatus('ZIP описът е върнат от сървъра. Потвърди водещите имоти.'));
document.addEventListener('v26:gis-ready',e=>setStatus('ГИС резултатът е получен. Автоматичен план: '+($('plan')?.value||'неопределен')+'. Приложение №1 е налично.'));
document.addEventListener('v26:annex2',()=>setStatus('Приложение №2 е генерирано за текущата преписка.'));
document.addEventListener('v26:word',()=>setStatus('Word проектът е генериран. Можеш да изтеглиш комплекта при наличен ГИС PDF.'));
const note=document.createElement('p');note.className='muted';note.textContent='В GitHub Pages няма V26 Python API. Тук се виждат одобрените контролни точки и работните контроли; за сървърните действия е необходима V26 среда.';board.append(note);
})();