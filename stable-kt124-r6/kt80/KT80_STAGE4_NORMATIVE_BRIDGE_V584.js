/* WOW KT81 V58.4 — evidence-safe normative bridge: CONTEXT / FULL GIS / PDF1.
   Retains expert modifications. Never upgrades archival records into verified geometry.
   This is NOT the final authority/legal determination. */
(function(root){'use strict';
function boot(){
 const $=id=>document.getElementById(id),panel=document.querySelector('.kt80-stage-panel[data-panel="4"]'),
 notes=$('kt80LegalNotes'),authority=$('kt80Authority'),checked=$('kt80LawConfirmed'),
 pdfStatus=$('kt80PDF1Status'),pdfButton=$('kt80PDF1'),parcel=$('kt80ParcelInput');
 if(!panel||!notes||!authority||!checked)return;
 const clean=s=>String(s??'').replace(/\s+/gu,' ').trim();
 const norm=s=>clean(s).toLocaleLowerCase('bg');
 const node=(tag,contents,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(contents!==undefined)e.textContent=contents;return e};
 const intro=panel.querySelector(':scope > h2');if(intro)intro.hidden=true;
 const description=panel.querySelector(':scope > p');if(description)description.hidden=true;
 const proposal=node('section',undefined,'kt83-normative-panel');proposal.id='kt83NormativePanel';
 proposal.append(node('h3','Предварителна нормативна преценка'));
 const mode=node('p','','kt83-proof-state');
 const paragraphs=node('div',undefined,'kt83-proposal-rows');
 const deficiencies=node('p','','kt83-deficiencies');
 proposal.append(mode,paragraphs,deficiencies);
 const detail=node('details',undefined,'kt83-evidence-detail');
 detail.append(node('summary','Правни основания и доказателствена проследимост'));
 const detailsBody=node('div');detail.append(detailsBody);proposal.append(detail);
 const action=node('div',undefined,'kt83-action');
 const accept=node('button','Пренеси предложението в правната преценка');
 accept.type='button';
 const refreshButton=node('button','Актуализирай по ГИС резултатите');refreshButton.type='button';
 action.append(accept,refreshButton);proposal.append(action);
 panel.insertBefore(proposal,authority.previousElementSibling||authority);
 const legalLabel=notes.previousElementSibling;
 if(legalLabel?.tagName==='LABEL')legalLabel.textContent='Проект на правна преценка · редакция от експерта';
 notes.rows=5;notes.placeholder='Работното предложение се зарежда автоматично. Можете да го редактирате и допълните.';
 let authored='',dirty=false,replacing=false, pdf={ready:false,ids:[],stamp:0},lastSignature='',lastDraft='';
 const parsedIds=()=>{
  const p=root.V26ParcelEditor?.normalize(parcel?.value||'');
  return p?.ids?.length&&!p.invalid?.length&&!p.uncertain?.length?p.ids:[];
 };
 const idKey=a=>a.join('; ');
 const geometryValid=r=>r?.status==='Намерен'&&Array.isArray(r.geojson?.features)&&r.geojson.features.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)&&f.geometry?.coordinates?.length);
 const zoneStatus=r=>{
  if(!Array.isArray(r?.verified_zone_intersections)||typeof r.intersection_verified_outside!=='boolean')return 'UNVERIFIED';
  if(r.verified_zone_intersections.length)return 'INTERSECTS';
  return r.intersection_verified_outside===true?'OUTSIDE':'UNVERIFIED';
 };
 function data(){
  const ids=parsedIds(),live=root.KT80FreeGISResults,workflow=root.KT80WorkflowState||{},
   pi=root.KT80PIMaster?.getResult?.(),place=root.KT82UI?.getLocation?.()||root.KT82Location||null,
   context=root.KT81ContextScreen?.getResult?.()||root.KT81ContextResult||null,
   stage3=root.KT80Stage3?.getResult?.()||null;
  const valid=!!ids.length&&!!live?.results?.length&&idKey(live.ids||[])===idKey(ids)&&live.results.length===ids.length&&live.results.every(geometryValid);
  const zoneStatuses=valid?live.results.map(zoneStatus):[];
  const intersections=!!valid&&zoneStatuses.every(x=>x!=='UNVERIFIED');
  const spatialClass=!intersections?'UNDETERMINED':zoneStatuses.every(x=>x==='OUTSIDE')?'OUTSIDE':zoneStatuses.every(x=>x==='INTERSECTS')?'INTERSECTS':'MIXED';
  const piOK=valid&&!!pi&&idKey(pi.ids||[])===idKey(ids)&&pi.items?.length===ids.length&&pi.items.every(x=>x?.status==='FOUND'&&x.profile);
  const pdfOK=!!valid&&pdf.ready&&idKey(pdf.ids)===idKey(ids)
  
  const scenario=valid?(pdfOK?'FULL_GIS_PDF1':intersections?'FULL_GIS_VERIFIED':'GIS_INCOMPLETE'):'CONTEXT';
  return {ids,live,pi,place,context,stage3,workflow,valid,intersections,spatialClass,zoneStatuses,piOK,pdfOK,scenario};
 }
 function invalidatePDF(){pdf={ready:false,ids:[],stamp:0};}
 const idLabel=d=>d.ids.length?d.ids.join('; '):'не са установени';
 function splitLegal(d){
  const subject=clean($('kt80SubjectText')?.value||d.workflow?.subjectConfirmed?.text||'');
  const scope=clean($('kt80ScopeText')?.value||d.workflow?.subjectConfirmed?.scope||'');
  const q=norm(subject+' '+scope);
  const repairing=/ремонт|подмяна|реконструкц/.test(q),
   power=/трафопост|трансформатор|подстанци|електрическ|електроразпредел|електроенерг/.test(q),
   extension=/разширен|изменен|допълнителна\s+мощност/.test(q),
   newWork=/ново\s+строителство|изграждане\s+на\s+нов/.test(q);
  const description=subject?'„'+subject.slice(0,280)+'“':'предметът не е потвърден';
  const hypothesis=repairing&&power?'Водеща работна хипотеза: основен ремонт или подмяна в съществуващо електроенергийно съоръжение. Не се приравнява автоматично на изграждане на нов обект.':
   newWork?'Водеща работна хипотеза: ново строителство / нови съоръжения, за които се проверява обхватът по ЗООС и ЗБР.':
   repairing?'Водеща работна хипотеза: ремонт, реконструкция или изменение; релевантността на ЗООС се преценява по действителните параметри.':
   'Водеща работна хипотеза: процедурният режим се определя след проверка на фактическите дейности и техните параметри.';
  const laws=[
   {id:'ЗООС · чл. 92, т. 1',detail:'Задължителна ОВОС за предложения, отговарящи на приложение №1. Условна проверка, не автоматична приложимост.',verified:'Проверен текст на разпоредбата; категорията на ИП не е потвърдена.'},
   {id:'ЗООС · чл. 93, ал. 1, т. 1–3',detail:'Преценяване на необходимостта от ОВОС за приложение №2 и съответните изменения/разширения, когато законовите предпоставки са налице.',verified:'Проверен текст на разпоредбата; конкретна точка от приложение №2 не е определена.'},
   {id:'ЗБР · чл. 31, ал. 1',detail:'Оценка за съвместимост при възможно значително отрицателно въздействие върху защитена зона, включително в съвкупност с други предложения.',verified:'Проверен текст; геометрично непресичане само по себе си не изключва косвено въздействие.'}
  ];
  let spatial;
  if(d.scenario==='CONTEXT'){
   const location=d.place?.ekatte&&d.place?.settlement?d.place.settlement+' (ЕКАТТЕ '+d.place.ekatte+')':'неустановено еднозначно';
   spatial='Контекстен режим: местоположение '+location+'; кадастрални идентификатори '+idLabel(d)+'. Не е доказана имотна геометрия и не са удостоверени имотни пространствени пресичания. '+(d.place?.expertReviewed?'Експертът е потвърдил прегледа на контекстните доказателства.':'Контекстното предложение подлежи на експертна проверка.');
  }else{
   const results=d.live.results;
   const classes={OUTSIDE:'ДОКАЗАНО НЕПРЕСИЧАНЕ',INTERSECTS:'ДОКАЗАНО ПРЕСИЧАНЕ',MIXED:'СМЕСЕНО — пресичащи и непресичащи имоти',UNDETERMINED:'НЕУСТАНОВЕНО'};
   const sites=results.map(r=>{
    const z=(r.verified_zone_intersections||[]).map(x=>typeof x==='string'?x:x?.sitecode||x?.code||'').filter(Boolean);
    return 'ПИ '+(r.input||r.cadnum)+': '+(d.intersections?(z.length?'геометрично проверени ЗЗ '+[...new Set(z)].join(', '):r.intersection_verified_outside?'проверено непресичане с анализираните ЗЗ':'пространствен резултат за проверка'):'проверката за ЗЗ още не е завършена');
   }).join('; ');
   spatial='ГИС положение: '+classes[d.spatialClass]+'. Анализирани '+results.length+' имот(а): '+sites+'. '+(d.piOK?'ПИ MASTER: проверени административни и архивни атрибути за всички имоти; архивните ЗТ не са самостоятелно геометрично доказателство.':'ПИ MASTER: непълно зареждане/проверка; данните за ЗТ и административните атрибути не се обявяват за потвърдени.')+' '+(d.pdfOK?'PDF1: успешно изготвен и предложен за изтегляне; необходим е експертен преглед.':'PDF1: няма доказателство за успешно изготвен документ за текущия комплект имоти.');
  }
  const evidence= d.scenario==='CONTEXT'?
   'За окончателен пространствен извод са необходими надеждно местоположение/обхват и при относимост имотни геометрии; при съществен недостиг — конкретно искане за предоставяне на допълнителна информация.':
   d.pdfOK?'Доказателствена основа: проверените геометрии, прегледът на пресичанията, ПИ MASTER и генерираният PDF1. PDF1 няма самостоятелна правно-квалифицираща сила.':
   'Геометрията е налична, но PDF1 и/или част от пространствената проверка все още не са потвърдени. Процедурната квалификация е предварителна.';
  const auth='Предложение за компетентен орган: РИОСВ – Пловдив, ако обектът е изцяло в териториалния ѝ обхват и не са налице специални основания за компетентност на МОСВ или друг орган. По Наредбата за ОС чл. 6а компетентността подлежи на отделна проверка. Не се избира автоматично.';
  const conclusion=repairing&&power?
   'Предварително предложение: проверка дали заявеният основен ремонт не представлява самостоятелна категория по приложения №1/№2 на ЗООС или изменение с относимо въздействие; отделно се преценява ОС по ЗБР при възможно значително въздействие.':
   extension?'Предварително предложение: проверка на действителното изменение и приложимостта на чл. 93, ал. 1, т. 2–3 от ЗООС, ако първоначалният обект е от съответната категория.':
   'Предварително предложение: съпоставяне на действителните дейности с приложения №1 и №2 към ЗООС и преценка на относимостта на чл. 31, ал. 1 от ЗБР.';
  const sourceLinks=[
   ['ЗООС · официален публикуван текст','https://www.moew.government.bg/bg/zakon-za-opazvane-na-okolnata-sreda-8793/'],
   ['ЗБР · официален публикуван текст','https://www.moew.government.bg/static/media/ups/tiny/filebase/Nature/Legislation/ZAKON_za_biologichnoto_raznoobrazie24.pdf'],
   ['Наредба за ОС · официален публикуван текст','https://www.moew.government.bg/static/media/ups/tiny/%D0%9D%D0%A1%D0%97%D0%9F/NAREDBA_za_usloviqta_i_reda_za_izvyrsvane_na_ocenka_za_syvmestimostta_na_planove_programi_proekti_i_.pdf']
  ];
  const content=[
   'ПРЕДМЕТ И ОБХВАТ — '+description,
   hypothesis,
   'ПРОСТРАНСТВЕНИ ДОКАЗАТЕЛСТВА — '+spatial,
   'НОРМАТИВНИ ОСНОВАНИЯ ЗА ПРОВЕРКА — '+laws.map(x=>x.id+' ('+x.detail+')').join(' '),
   'КОМПЕТЕНТНОСТ — '+auth,
   'ПРЕДЛОЖЕНИЕ — '+conclusion,
   'ДОКАЗАТЕЛСТВЕНИ ОГРАНИЧЕНИЯ — '+evidence
  ].join('\n\n');
  return {subject,scope,hypothesis,laws,spatial,evidence,auth,conclusion,content,sourceLinks};
 }
 function sign(d){return JSON.stringify({ids:d.ids,scenario:d.scenario,geometry:d.valid,intersections:d.intersections,spatialClass:d.spatialClass,zoneStatuses:d.zoneStatuses,pi:d.piOK,pdf:d.pdfOK,place:d.place?.ekatte,placeReview:d.place?.expertReviewed,confirmedSubject:d.workflow?.subjectConfirmed?.text,subject:clean($('kt80SubjectText')?.value),scope:clean($('kt80ScopeText')?.value),status:pdfStatus?.textContent});}
 function draw(){
  const d=data(),p=splitLegal(d),signature=sign(d);
  if(lastSignature===signature)return;
  lastSignature=signature;lastDraft=p.content;
  mode.textContent=d.scenario==='FULL_GIS_PDF1'?'ПЪЛЕН ГИС АНАЛИЗ · PDF1 ИЗГОТВЕН · експертна проверка':
   d.scenario==='FULL_GIS_VERIFIED'?'ПЪЛЕН ГИС АНАЛИЗ · ПРОВЕРЕНИ ЗЗ · PDF1 не е изготвен':
   d.scenario==='GIS_INCOMPLETE'?'ИМОТИ С ГЕОМЕТРИЯ · проверките не са завършени':
   'КОНТЕКСТЕН АНАЛИЗ · НЯМА УДОСТОВЕРЕНА ИМОТНА ГЕОМЕТРИЯ';
  paragraphs.replaceChildren();
  for(const [a,b] of [['Работна процедурна хипотеза',p.hypothesis],['Пространствени доказателства',p.spatial],['Предложение за действие',p.conclusion]]){
   const item=node('div',undefined,'kt83-pair');item.append(node('strong',a),node('p',b));paragraphs.append(item);
  }
  deficiencies.textContent=p.evidence;
  detailsBody.replaceChildren();
  for(const law of p.laws){const item=node('p');item.append(node('strong',law.id+' · '),document.createTextNode(law.detail+' '+law.verified));detailsBody.append(item)}
  const sources=node('p','Официални източници: ');for(const [label,url] of p.sourceLinks){const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a,document.createTextNode(' · '));}detailsBody.append(sources);
  detailsBody.append(node('p','Конкретното прилагане на правните норми, компетентността и процедурният извод подлежат на експертно потвърждение.'));
  if(!dirty||!notes.value.trim()||notes.value===authored){
   replacing=true;notes.value=p.content;authored=p.content;dirty=false;replacing=false;
  }
  if(!authority.value){const box=panel.querySelector('#kt83AuthoritySuggestion');if(box)box.textContent='Предложение: РИОСВ – Пловдив (условно; проверете специалната компетентност преди избор).'}
  if(checked.checked){checked.checked=false;const warning=panel.querySelector('#kt83ReviewWarning');if(warning)warning.textContent='Доказателствата са актуализирани. Потвърдете правната преценка повторно.'}
 }
 notes.addEventListener('input',()=>{if(!replacing)dirty=notes.value!==authored});
 const authHint=node('p','Предложение: РИОСВ – Пловдив, само ако е потвърдена териториалната и специалната компетентност.','kt83-auth-hint');authHint.id='kt83AuthoritySuggestion';authority.after(authHint);
 const warning=node('p','','kt83-warning');warning.id='kt83ReviewWarning';checked.closest('label')?.after(warning);
 const selectedAction=()=>{
  if(!lastDraft)draw();if(!lastDraft)return;
  replacing=true;notes.value=lastDraft;authored=lastDraft;dirty=false;replacing=false;
  notes.dispatchEvent(new Event('input',{bubbles:true}));
  warning.textContent='Работното предложение е пренесено. Експертът проверява относимостта на правните основания и компетентността.';
 };
 accept.addEventListener('click',selectedAction);
 refreshButton.addEventListener('click',()=>{lastSignature='';draw()});
 const pdfMonitor=()=>{
  const status=clean(pdfStatus?.textContent);
  const ids=parsedIds(),live=root.KT80FreeGISResults;
  if(status.includes('Готово! PDF1 е изготвен')&&ids.length&&idKey(live?.ids||[])===idKey(ids)&&live.results?.every(geometryValid)){
   if(!pdf.ready||idKey(pdf.ids)!==idKey(ids)){pdf={ready:true,ids:[...ids],stamp:Date.now()};lastSignature='';if(!panel.hidden)draw();}
  }
 };
 if(pdfStatus&&typeof MutationObserver==='function'){
  const watcher=new MutationObserver(pdfMonitor);watcher.observe(pdfStatus,{childList:true,subtree:true,characterData:true});
 }
 pdfButton?.addEventListener('click',()=>{invalidatePDF();lastSignature='';},{capture:true});
 parcel?.addEventListener('input',()=>{invalidatePDF();lastSignature='';});
 $('kt80FindParcels')?.addEventListener('click',()=>{invalidatePDF();lastSignature='';});
 document.addEventListener('kt80:case-reset',()=>{invalidatePDF();lastSignature='';authored='';dirty=false;notes.value='';root.KT83NormativeEvidence=null;});
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===4){lastSignature='';draw();root.KT83NormativeEvidence=data()}});
 const stage4Next=$('kt80ToProposal');stage4Next?.addEventListener('click',()=>{root.KT83NormativeEvidence=data()},{capture:true});
 root.KT83NormativeBridge=Object.freeze({refresh:()=>{lastSignature='';draw()},getEvidence:()=>data(),getDraft:()=>lastDraft,pdfStatus:()=>({...pdf})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(window);