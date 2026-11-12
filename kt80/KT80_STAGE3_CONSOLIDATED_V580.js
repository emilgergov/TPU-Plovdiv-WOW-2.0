/* КТ80 V58.0 — етап 3: същият ГИС двигател като №15, два входа.
   Предварителната ориентация НЕ е определена процедура; без доказана геометрия няма PDF1. */
(function(root){'use strict';
const $=id=>document.getElementById(id),text=(s)=>String(s??'').replace(/\s+/gu,' ').trim();
const stage=document.querySelector('.kt80-stage-panel[data-panel="3"]'),origin=$('kt80FreeGISScreen');
if(!stage||!origin)return;
const gis=document.querySelector('.kt80-free-gis');
if(!gis)return;
let lastKey='',openGeneration=0,lastNotified='',report=null,mode='initial';
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
const banner=el('section','kt80-v580-legal');
banner.setAttribute('role','region');banner.setAttribute('aria-label','Предварителна нормативна ориентация');
banner.append(el('strong','kt80-v580-label','ПРЕДВАРИТЕЛНА НОРМАТИВНА ОРИЕНТАЦИЯ'));
const headline=el('h3','','Работна хипотеза за процедурата'),basis=el('p','kt80-v580-basis','');
const task=el('p','kt80-v580-task','');
const note=el('p','kt80-v580-note','Ориентация по предмет и обхват, която не определя окончателна процедура. Окончателната квалификация се извършва в етап №4.');
banner.append(headline,basis,task,note);
const intro=stage.querySelector('h2');intro?.insertAdjacentElement('afterend',banner);
const inline=el('div','kt80-v580-gis-inline');inline.id='kt80V580GisInline';
const fallback=el('section','kt80-v580-fallback');fallback.id='kt80V580Fallback';fallback.hidden=true;
const result=el('p','kt80-v580-fallback-note',''),sources=el('div','kt80-v580-evidence'),buttons=el('div','kt80-v580-buttons');
fallback.append(el('h3','','МЕСТОПОЛОЖЕНИЕ · НЕОБХОДИМО УТОЧНЯВАНЕ'),result,sources,buttons);
const provide=el('button','','Въведи проверен идентификатор');provide.type='button';
const request=el('button','','Подготви искане · резултат №2');request.type='button';
const candidate=el('button','','Провери пространствените ориентири');candidate.type='button';
buttons.append(candidate,provide,request);
const caseForm=stage.querySelector('.kt80-parcel-intake');
caseForm?.insertAdjacentElement('afterend',fallback);
fallback.insertAdjacentElement('afterend',inline);
const originalTitle=gis.querySelector('h3')?.textContent||'';
const overview=el('section','kt80-v580-passport');
const status=el('p','','Анализът се зарежда при отваряне на етап №3.');
const proof=el('details','','');proof.append(el('summary','','Източници и проверка'));
const proofBody=el('div','','');proof.append(proofBody);overview.append(status,proof);
inline.insertAdjacentElement('afterend',overview);
const dialog=document.createElement('dialog');dialog.className='kt80-v580-dialog';
const panel=el('div','kt80-v580-dialog-panel');
panel.append(el('strong','','WOW · ПРЕДВАРИТЕЛНА НОРМАТИВНА ОРИЕНТАЦИЯ'));
const dialogText=el('p','',''),close=el('button','','Разбрах · към пространствения анализ');close.type='button';
panel.append(dialogText,close);dialog.append(panel);document.body.append(dialog);
close.addEventListener('click',()=>dialog.close());
function legal(){
 const subject=text($('kt80SubjectText')?.value),scope=text($('kt80ScopeText')?.value);
 const confirmed=!!$('kt80SubjectConfirmation')?.checked&&!!$('kt80ScopeConfirmation')?.checked;
 const combined=(subject+' '+scope).toLocaleLowerCase('bg');
 const works=/(изграждан|строителств|реконструкц|ремонт|съоръжен|инсталац|склад|производств|сондаж|кабел|път|инфраструктур|трас)/iu.test(combined);
 const specific=/(отпадъчн|заустван|производств|мощност|съоръжен|изграждан)/iu.test(combined);
 const title=confirmed&&subject?(works?'Работна хипотеза: проверка за приложимост на реда по ЗООС и ЗБР':'Работна хипотеза: проверка на приложимите режими по ЗООС и ЗБР'):'Работна хипотеза: необходима е експертна проверка на предмета и обхвата';
 const message=confirmed?
 'Основание: потвърдените предмет и обхват. '+(specific?'Проверяват се приложимостта на приложения №1 и №2 към ЗООС и относимите хипотези на Наредбата за ОС.':'Проверява се правната квалификация по характера, параметрите и местоположението на предложението.')+' Няма автоматично избрана процедура.':
 'Предметът и обхватът не са едновременно потвърдени. Предложение: потвърдете данните или уточнете липсите; не се прави окончателен процедурен извод.';
 return {title,message,confirmed,subject,scope};
}
function locationEvidence(){
 const facts=[];
 const sections=root.KT80KT52Draft?.sections||[];
 for(const s of sections)for(const i of s.items||[]){
  if(!/местополож|локац|землищ|адрес|имот|териториал/iu.test(s.label+' '+i.label))continue;
  for(const f of i.evidence||[]){
   if(!f.excerpt||f.verified===false&&f.stage==='ИЗКЛЮЧЕН')continue;
   facts.push({text:text(f.excerpt).slice(0,300),file:text(f.file)||'Неустановен документ',page:f.page||null});
  }
 }
 const pages=root.KT80WorkflowState?.intake?.page_text_index||[];
 if(!facts.length)for(const p of pages){
  const full=text(p.text);const m=full.match(/(?:ЕКАТТЕ\s*[:№-]?\s*\d{5}|(?:гр\.|с\.)\s*[А-Я][А-Яа-я -]{2,45}|община\s+[А-Я][А-Яа-я -]{2,40}|местност\s*[„"][^”"]+|УПИ\s*[IVXLCDM\d-]+(?:\s*кв\.\s*\d+)?)/gu)||[];
  for(const hit of m.slice(0,3))facts.push({text:hit,file:text(p.file)||'Преписка',page:p.page||null});
  if(facts.length>=9)break;
 }
 return facts.slice(0,9);
}
function proofUpdate(ids,mode){
 proofBody.replaceChildren();
 const rows=[['Режим',mode],['Идентификатори',ids.length?ids.join('; '):'НЯМА ПОТВЪРДЕНИ'],['Геометрия','Само след успешен отговор на пълната ГИС база'],['ПИ MASTER','Проверен индекс; липсата на запис не е доказателство за непопадане'],['ЗЗ/ЗТ','Констатации само след съответната пространствена проверка'],['Процедура','Не се определя в етап №3']];
 for(const [a,b] of rows){const p=el('p');p.append(el('strong','',a+': '),document.createTextNode(b));proofBody.append(p)}
}
function renderFallback(){
 fallback.hidden=false;inline.hidden=true;overview.hidden=false;mode='context';if($('kt80PDF1'))$('kt80PDF1').disabled=true;
 const parsed=root.V26ParcelEditor?.normalize($('kt80ParcelInput')?.value||'');
 const uncertain=[...(parsed?.invalid||[]),...(parsed?.uncertain||[])];
 result.textContent='Не е установен достатъчно надежден комплект кадастрални идентификатори. Точни имотни пресичания, площи и PDF1 не могат да бъдат удостоверени.'+(uncertain.length?' За проверка: '+uncertain.join('; ')+'.':'');
 const clues=locationEvidence();sources.replaceChildren();
 if(clues.length){
  sources.append(el('strong','','Извлечени пространствени ориентири · за експертна проверка'));
  for(const f of clues){const p=el('p','','„'+f.text+'“ — '+f.file+(f.page?' · стр. '+f.page:''));sources.append(p)}
 }else sources.append(el('p','','Не са разпознати надеждни пространствени ориентири. Предложение: изискайте данни за местоположение и кадастрална индивидуализация.'));
 const input=$('kt80ParcelInput');if(input)input.readOnly=false;
 if(caseForm)caseForm.classList.add('kt80-v580-fallback-entry');
 status.textContent='Контекстна констатация — няма проверена имотна геометрия. Резервният маршрут е активен.';
 proofUpdate([], 'Контекстно установяване / доказателствена липса');
 root.KT80Stage3Result=Object.freeze({status:'LOCATION_GAP',parcelVerified:false,ids:[],clues:clues.map(x=>Object.freeze({...x})),needsAdditionalInformation:true,procedureHypothesis:legal().title});
 document.dispatchEvent(new CustomEvent('kt80:location-gap',{detail:{count:clues.length}}));
}
function validIds(){
 const raw=$('kt80ParcelInput')?.value||'';
 const p=root.V26ParcelEditor?.normalize(raw);
 return p&&p.ids.length>0&&p.ids.length<=100&&!p.invalid.length&&!p.uncertain.length?p.ids:[];
}
function entered(){
 if(mode==='free')return;
 const l=legal();headline.textContent=l.title;basis.textContent=l.message;
 task.textContent='Пространствена задача: '+(validIds().length?'автоматичен имотен ГИС анализ и проверка по ЗЗ/ЗТ.':'контекстно установяване на местоположението и подготовка на уточняване при съществена липса.');
 const k=l.subject+'|'+l.scope;
 if(lastNotified!==k){lastNotified=k;dialogText.textContent=l.title+'. '+l.message+' Пространствената проверка е констативна и не замества правната преценка.';if(!dialog.open)dialog.showModal()}
 gis.querySelector('h3').textContent='3. Имоти · пространствен анализ по преписката';
 inline.append(gis);inline.hidden=false;fallback.hidden=true;overview.hidden=false;
 const intake=stage.querySelector('.kt80-parcel-intake');if(intake)intake.classList.remove('kt80-v580-fallback-entry');
 const ids=validIds();
 const controls=gis.querySelector('.kt80-gis-intake-compact');
 if(controls)controls.hidden=true;
 const prior=stage.querySelector('.kt80-case-gis-action');if(prior)prior.hidden=true;
 const extra=stage.querySelector('.kt80-case-gis-note');if(extra)extra.hidden=true;
 const normalize=$('kt80ParcelNormalize');if(normalize)normalize.hidden=true;
 if(!ids.length){renderFallback();return}
 mode='case';
 const normalized=ids.join('; ');
 const key=normalized+'|'+l.subject+'|'+l.scope;
 if(lastKey===key&&root.KT80FreeGISResults?.ids?.join('; ')===normalized){status.textContent='Намерени имоти: '+ids.length+'. Прегледайте проверките на общия ГИС резултат.';proofUpdate(ids,'ГИС по идентификатори');return}
 lastKey=key;const generation=++openGeneration;
 const caseInput=$('kt80ParcelInput');if(caseInput.value!==normalized){caseInput.value=normalized;caseInput.dispatchEvent(new Event('input',{bubbles:true}))}
 const free=$('kt80GISFreeInput');if(free)free.value=normalized;
 $('kt80ParcelNormalize')?.click();
 status.textContent='Автоматично стартираме проверката за '+ids.length+' имота чрез общия ГИС двигател на №15.';if($('kt80PDF1'))$('kt80PDF1').disabled=true;
 proofUpdate(ids,'Автоматична проверка по имотни идентификатори');
 const work=root.KT80Busy?.start('ГИС анализ на имотите от преписката…');
 const workDeadline=Date.now()+18000;
 let workComplete=false;
 const finishWork=()=>{if(workComplete)return;workComplete=true;root.KT80Busy?.finish(work)};
 try{$('kt80FindParcels')?.click()}catch(e){status.textContent='Неуспешен старт на ГИС: '+String(e.message||e);lastKey='';finishWork()}
 root.KT80Stage3Result=Object.freeze({status:'GIS_REQUESTED',parcelVerified:false,ids:[...ids],procedureHypothesis:l.title,needsAdditionalInformation:false});
 const monitor=()=>{
  if(generation!==openGeneration||mode!=='case'){finishWork();return}
  const live=root.KT80FreeGISResults,matched=live?.ids?.join('; ')==normalized;
  if(matched&&live.results?.length===ids.length){
   const missing=live.results.filter(r=>r.status!=='Намерен'||!(r.geojson?.features||[]).length);
   status.textContent=missing.length?'За '+missing.length+' имота няма потвърдена геометрия. Пространствените заключения остават ограничени.':'Геометрията е намерена за '+ids.length+' имота. Крайният контрол на пресичанията се извършва от общия ГИС/PDF1 механизъм.';if($('kt80PDF1'))$('kt80PDF1').disabled=!!missing.length;
   root.KT80Stage3Result=Object.freeze({status:missing.length?'INCOMPLETE_GIS':'GIS_RETURNED',parcelVerified:false,geometryAvailable:!missing.length,spatialVerificationPending:true,ids:[...ids],needsAdditionalInformation:!!missing.length,procedureHypothesis:l.title});
   finishWork();return;
  }
  if(Date.now()>=workDeadline){status.textContent='ГИС заявката все още не е приключила. Проверете съобщенията за наличност на ГИС базата; резултатите не се приемат за потвърдени.';lastKey='';finishWork();return}
  setTimeout(monitor,500);
 };
 setTimeout(monitor,400);
}
function restoreFreeGIS(){
 mode='free';openGeneration++;
 gis.querySelector('h3').textContent=originalTitle;
 origin.append(gis);if($('kt80PDF1'))$('kt80PDF1').disabled=false;gis.querySelector('.kt80-gis-intake-compact')?.removeAttribute('hidden');
 const controls=gis.querySelector('.kt80-gis-intake-compact');if(controls)controls.hidden=false;
 inline.hidden=true;fallback.hidden=true;
}
function setManual(){
 fallback.hidden=false;
 const section=stage.querySelector('.kt80-parcel-intake');section?.classList.add('kt80-v580-fallback-entry');
 const input=$('kt80ParcelInput');input?.focus();
}
provide.addEventListener('click',setManual);
candidate.addEventListener('click',()=>{
 const fs=locationEvidence();
 if(!fs.length){result.textContent='Контекстният преглед не откри надежден идентификатор. Предложение: подгответе конкретно искане за местоположение.';return}
 result.textContent='Извлечени са '+fs.length+' пространствени ориентира, изведени с източник. Не е извършено обратно търсене на имоти по ЕКАТТЕ, защото такъв индекс още не е валидиран.';
});
request.addEventListener('click',()=>{
 const c=(root.KT80RouteCatalog||[]).find(x=>Number(x.id)===2);
 if(c&&typeof root.KT80DashboardOpenCandidate==='function'){root.KT80DashboardOpenCandidate(c)}
 else result.textContent='Предложено действие: резултат №2 — мотивирано искане за допълнителна информация. Изберете резултат №2 от началния екран.';
});
function changed(){if(mode!=='case'&&mode!=='context')return;lastKey='';++openGeneration;root.KT80Stage3Result=null;status.textContent='Идентификаторите са променени. Пространствените резултати се проверяват наново.';const ids=validIds();if(ids.length&&!stage.hidden){setTimeout(()=>{if(!stage.hidden)entered()},250)}else if(!ids.length)renderFallback()}
$('kt80ParcelInput')?.addEventListener('input',changed);
document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===3){mode='case';entered()}else if(mode==='case'||mode==='context')restoreFreeGIS()});
document.addEventListener('kt80:case-reset',()=>{lastKey='';lastNotified='';openGeneration++;mode='initial';root.KT80Stage3Result=null;restoreFreeGIS()});
root.KT80Stage3=Object.freeze({open:entered,restoreFreeGIS,getResult:()=>root.KT80Stage3Result||null});
})(window);