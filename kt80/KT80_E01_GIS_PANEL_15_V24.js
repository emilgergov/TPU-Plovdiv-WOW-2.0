/* KT80 V24 — №15 independent GIS workbench. Reuse existing single GIS/PI/PDF1 machinery. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e}
function init(){
 const screen=$('kt80FreeGISScreen'),gis=document.querySelector('.kt80-free-gis'),caseInput=$('kt80ParcelInput');
 if(!screen||!gis||!caseInput)return;
 // Move the original working elements, not clones: original listeners and references stay valid.
 screen.append(gis);
 gis.setAttribute('aria-label','№15 — Свободна ГИС справка за имоти и режими');
 const heading=gis.querySelector('h3');if(heading)heading.textContent='№15 · Свободна ГИС справка за имоти и режими';
 const intro=gis.querySelector('p');if(intro)intro.textContent='Самостоятелен преглед на имоти, защитени зони и защитени територии. Без преписка или избор на процедура.';
 const find=$('kt80FindParcels');
 const top=el('section','kt80-gis-intake-compact');top.setAttribute('aria-label','Въвеждане и проверка на имоти');
 const form=el('div','kt80-gis-intake-row');
 const label=el('label','','Поземлени имоти');label.htmlFor='kt80GISFreeInput';
 const input=document.createElement('textarea');input.id='kt80GISFreeInput';input.rows=2;input.placeholder='56784.13.102; 56784.13.105';
 input.value=caseInput.value;
 const check=el('button','','Провери имотите');check.type='button';check.id='kt80GISFreeCheck';
 check.addEventListener('click',()=>{
  const notice=$('kt80GISFreeCheckStatus');
  const result=root.V26ParcelEditor?.normalize(input.value);
  if(!result){if(notice)notice.textContent='Модулът за проверка не е зареден.';return}
  const valid=result.ids.length>0&&result.ids.length<=100&&!result.invalid.length&&!result.uncertain.length;
  if(!valid){
   const issues=[result.invalid.length?'Невалидни: '+result.invalid.join(', '):'',result.uncertain.length?'За уточняване: '+result.uncertain.join(', '):'',!result.ids.length?'Не са разпознати имоти.':'',result.ids.length>100?'Над 100 имота.':''].filter(Boolean);
   if(notice)notice.textContent='Проверката откри проблем: '+issues.join(' · ');
   notice?.setAttribute('data-check','invalid');return;
  }
  const normalized=result.ids.join('; ');
  input.value=normalized;
  if(caseInput.value!==normalized){
   caseInput.value=normalized;
   caseInput.dispatchEvent(new Event('input',{bubbles:true}));
  }
  if(notice){notice.textContent='Проверени '+result.ids.length+' имота: '+result.ids.join(' · ')+(result.changes.length?' · Корекции: '+result.changes.join('; '):'')+'. За ГИС резултати натиснете „Намери имотите“.';notice.setAttribute('data-check','valid')}
 });
 const controls=el('div','kt80-gis-intake-actions');controls.append(check,find);
 form.append(label,input,controls);
 const helper=el('div','kt80-gis-intake-foot');helper.id='kt80GISFreeCheckStatus';helper.setAttribute('aria-live','polite');
 helper.textContent='Един или повече кадастрални идентификатори · разделете със запетая или точка и запетая.';
 top.append(form,helper);
 heading?.after(top);
 // Allow the main free-entry input to feed the existing, tested normalization/GIS handlers.
 let syncing=false;
 input.addEventListener('input',()=>{
  if(syncing)return;syncing=true;caseInput.value=input.value;
  caseInput.dispatchEvent(new Event('input',{bubbles:true}));syncing=false;
 });
 caseInput.addEventListener('input',()=>{
  if(syncing)return;syncing=true;input.value=caseInput.value;syncing=false;
 });
 const ready=$('kt80FullGISReady'),status=$('kt80GISStatus'),backup=gis.querySelector('.kt80-gis-backup');
 const index=$('v26LocalIndexMount');
 const topStatuses=el('div','kt80-gis-compact-status');
 for(const e of [ready,status])if(e)topStatuses.append(e);
 top.after(topStatuses);
 if(backup){backup.classList.add('kt80-gis-backup-compact');topStatuses.append(backup)}
 if(index){index.classList.add('kt80-gis-index-compact');topStatuses.append(index)}
 // Large map is the principal element. The selection list becomes a small row beneath it.
 const layout=gis.querySelector('.kt80-gis-layout');
 if(layout){layout.classList.add('kt80-gis-layout-v24');
  const map=$('kt80GISMapWrap'),list=$('kt80GISResults');
  if(map&&list){
   const spatial=el('section','kt80-gis-spatial-v24');
   const spatialTitle=el('h4','','Пространствени данни');spatial.append(spatialTitle);
   const detail=map.querySelector('.kt80-gis-detail');
   if(detail){const repeated=detail.querySelector(':scope > strong');if(repeated)repeated.remove();spatial.append(detail)}
   const profile=gis.querySelector('.kt80-pi-master-profile');
   if(profile){profile.classList.add('kt80-pi-master-compact');const lead=profile.querySelector(':scope > p');if(lead){lead.textContent='Проверени атрибути от ПИ MASTER; наличието на данни само по себе си не удостоверява пресичане.'}spatial.append(profile)}
   layout.append(list,spatial);
  }
 }
 const pdf=gis.querySelector('.kt80-pdf1-note');
 if(pdf){pdf.classList.add('kt80-pdf1-v24');const expl=pdf.querySelector('p:not([id])');
  if(expl)expl.textContent='ГИС анализ на проверените имоти и пресичания. Данните се сверяват преди изготвяне.';
 }
 // Stage 3 remains procedure-led and can invoke exactly the same underlying GIS engine.
 const stage=document.querySelector('.kt80-stage-panel[data-panel="3"]');
 if(stage){
  const h=stage.querySelector('h2');if(h)h.textContent='3. Имоти · Автоматизиран ПИ/ГИС анализ';
  const p=stage.querySelector('p');if(p)p.textContent='Имотите се извличат от преписката, проверяват се и се подават към общия ПИ/ГИС MASTER. Експертът може да коригира идентификаторите преди потвърждение.';
  const title=$('kt80ParcelTitle');if(title)title.textContent='Имотите по преписката · проверка и корекция';
  const desc=stage.querySelector('.kt80-parcel-intake > p');if(desc)desc.textContent='Автоматично разпознати или коригирани идентификатори за конкретната преписка.';
  const label=stage.querySelector('label[for="kt80ParcelInput"]');if(label)label.textContent='Идентификатори от преписката';
  // Initiate the common lookup for procedure-led work, without duplicating a free-GIS screen.
  const action=el('button','kt80-case-gis-action','Провери пространствените данни по преписката');
  action.type='button';action.addEventListener('click',()=>{
   if(input.value!==caseInput.value){input.value=caseInput.value}
   find.click();
   const state=$('kt80CaseGISStatus');if(state)state.textContent='Стартирана е общата ГИС справка. За подробната карта използвайте инструмент №15.';
  });
  const confirmation=$('kt80ParcelsConfirmation')?.closest('label');
  const note=el('p','kt80-case-gis-note','За самостоятелна ГИС справка и карта използвайте инструмент №15.');
  const state=el('p','kt80-case-gis-note');state.id='kt80CaseGISStatus';state.setAttribute('role','status');
  if(confirmation)confirmation.before(action,note,state);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
