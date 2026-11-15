/* KT89: revive the original B2 tri-state competition graph as an automatic
   CASE-SCOPED SCREEN, while keeping V11 source and expert approval separate.
   No V10 provenance can be promoted to V11 legal authority. */
import {VERIFIED_ARTICLES,LOCKED_ARCHIVE} from './v11-trusted-source-registry.mjs';
const $=id=>document.getElementById(id), el=(t,s)=>{const x=document.createElement(t);if(s!==undefined)x.textContent=s;return x;};
const DATA=[
 {id:'EIA_ANNEX1',label:'ОВОС · приложение №1',key:'annex1',kind:'investment',registry:null,question:'Доказана ли е категорията и точната точка на приложение №1 към ЗООС?',needed:'Съпоставете реалните дейности и параметри с точната категория; посочете оригинален документ и редакция.'},
 {id:'EIA_SCREEN',label:'ОВОС · преценяване на необходимостта',key:'annex2',kind:'investment',registry:'ZOOS_93',question:'Доказани ли са предпоставките по относимата категория и изключенията?',needed:'Проверете приложение №2, характера на дейността и правния режим за изменения; посочете член, точка и доказателства.'},
 {id:'OS_RELEVANCE',label:'Оценка за съвместимост',key:'os_relevance',kind:'both',registry:null,question:'Има ли правно релевантна необходимост от проверка за ОС?',needed:'Съпоставете предмета и действителните пътища на въздействие с чл. 31 ЗБР и Наредбата за ОС; ГИС непресичането само по себе си не изключва ОС.'},
 {id:'BASIN_INPUT',label:'Води · възможна отделна компетентност',key:'water_trigger',kind:'investment',registry:null,question:'Доказана ли е дейност или съоръжение, което активира специален воден режим?',needed:'Проверете от преписката действителните водни дейности и относимите актове, без да предполагате наличието им.'},
 {id:'EO_ENTRY',label:'Екологична оценка',key:'eo_relevance',kind:'plan_program',registry:null,question:'Документът има ли естество на план или програма и относим режим на ЕО?',needed:'Изяснете вида документ и нормативните предпоставки за ЕО; инвестиционно предложение не става план автоматично.'},
 {id:'COMPETENCE',label:'Компетентен орган',key:'competence',kind:'all',registry:'N_OS_6A',question:'Доказана ли е материалната, териториалната и специалната компетентност?',needed:'Проверете приложимостта на чл. 6а НОС, всички изключения и териториалния обхват; РИОСВ – Пловдив не се приема служебно.'}
];
const norm=s=>String(s??'').trim();
const scenario=()=>{
 const wf=window.KT80WorkflowState||{},s=wf.subjectConfirmed||{},ev=window.KT83NormativeBridge?.getEvidence?.()||{};
 const kind=window.KT82UniversalStage2Result?.type||'INVESTMENT';
 return {key:[wf.caseCycleId,wf.generation,window.KT82EvidenceInvalidation?.getRevision?.()??0,s.text,s.scope,kind].join('~'),
 subject:s.text||'',scope:s.scope||'',confirmed:s.expertConfirmed===true&&s.scopeConfirmed===true,
 kind:kind==='INVESTMENT'?'investment':kind==='PLAN_PROGRAM'?'plan_program':'other',
 spatial:ev.spatialClass||'UNDETERMINED',pdf:!!ev.pdfOK,parcels:(ev.ids||[]).join(', ')||'не са посочени',gisEvidence:ev};
};
const STATUS={true:'ПОДКРЕПЕНА (само за посочения факт)',false:'НЕПОДКРЕПЕНА (само за посочения факт)',unknown:'НЕУСТАНОВЕНА'};
function boot(graph){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(!stage||$('kt89B2Automatic'))return;
 const old=$('kt83B2CaseBridgeStage4');const rhs=$('kt86Matrix')?.querySelector('.kt86-panel:nth-child(2)')||stage;
 const root=el('section');root.id='kt89B2Automatic';root.style.cssText='border:1px solid #d3b97c;border-radius:10px;padding:12px;background:#163c2d;margin:12px 0;color:#f1efdf';
 const title=el('h3','Автоматични правни хипотези · Б2');title.style.color='#efcf89';root.append(title);
 const intro=el('p','Фактите се пренасят от Етапи 1–3. Конкуриращите се хипотези се извеждат без ръчен подбор; неизвестното никога не е отрицателен факт. Архив V11 удостоверява само проверените цитати, а не самата приложимост.');
 intro.style.cssText='font-size:13px;line-height:1.5';root.append(intro);
 const status=el('p');status.setAttribute('role','status');status.style.cssText='border-left:4px solid #debd7a;padding:9px;background:#234c38;font-size:13px';
 const cards=el('div');cards.style.cssText='display:grid;gap:9px';
 const proposal=el('div');proposal.style.cssText='padding:12px;background:#254a38;border:1px solid #8d9876;border-radius:7px;font-size:14px;line-height:1.5';
 const refresh=el('button','Обнови хипотезите по входните факти');refresh.type='button';refresh.style.cssText='padding:10px;background:#dabb78;color:#133d2d;font-weight:bold;border-radius:7px;margin:9px 0';
 let lastKey=null,answers=new Map(),last=null;
 function resetApproval(){
   window.KT83V11CaseEvidenceProvider?.clear?.();
   const w=window.KT80WorkflowState;if(w?.lawConfirmed?.archiveVersion==='V11')w.lawConfirmed=null;
 }
 function draw(force=false){
  const s=scenario();
  if(!force&&lastKey===s.key)return;
  if(lastKey!==s.key){answers=new Map();lastKey=s.key;resetApproval();}
  const kind=s.kind==='plan_program'?'план/програма':s.kind==='investment'?'инвестиционно предложение':'друг административен вход';
  status.textContent='Предмет и обхват: '+(s.confirmed?'потвърдени':'непотвърдени')+' · вид: '+kind+
    ' · ПИ: '+s.parcels+' · ГИС: '+s.spatial+' · PDF1: '+(s.pdf?'има отчетен резултат':'не е удостоверен')+
    '. Няма автоматично удостоверени правни предпоставки.';
  cards.replaceChildren();
  const selected=DATA.filter(d=>d.kind==='all'||d.kind==='both'&&s.kind!=='other'||d.kind===s.kind);
  for(const d of selected){
   const card=el('div');card.style.cssText='border:1px solid #73917a;border-radius:8px;padding:10px;background:#244937';
   const h=el('strong',d.label+' · '+d.id);h.style.cssText='display:block;color:#efd18d;margin-bottom:5px';card.append(h);
   const ref=d.registry&&VERIFIED_ARTICLES[d.registry];const source=el('div',ref?'V11: '+ref.act+' · '+ref.article+' · '+ref.archivePath:'За проверка по пълния V11: в проверения индекс няма достатъчна разпоредба за цялата хипотеза.');
   source.style.cssText='font-size:12px;color:#dedfcb';card.append(source);
   const question=el('p',d.question);question.style.cssText='font-size:13px;margin:6px 0';card.append(question);
   const row=el('div');row.style.cssText='display:grid;grid-template-columns:minmax(150px,1fr) minmax(180px,1fr);gap:7px';
   const select=el('select');select.style.cssText='background:#faf8ef;color:#163629;padding:7px;min-width:0';for(const [v,t] of [['unknown','Неустановено'],['true','Доказано „да“'],['false','Доказано „не“']])select.append(new Option(t,v));
   const origin=el('input');origin.type='text';origin.placeholder='Точен документ, страница и мотив';origin.style.cssText='background:#faf8ef;color:#163629;padding:7px;min-width:0;width:100%';
   const entry=answers.get(d.id);if(entry){select.value=entry.value;origin.value=entry.source}
   const save=()=>{const candidate=select.value,reference=norm(origin.value);const valid=candidate==='unknown'||reference.length>=12;
    if(!valid){select.value='unknown';}
    answers.set(d.id,{value:valid?candidate:'unknown',source:reference});
    resetApproval();conclude(s,selected);};
   select.onchange=save;origin.onchange=save;row.append(select,origin);card.append(row);
   const why=el('details');why.append(el('summary','Проверка, мотиви и липсващи доказателства'),el('p',d.needed));card.append(why);cards.append(card);
  }
  conclude(s,selected);
 }
 function conclude(s,selected){
  const supported=[],unknown=[],denied=[];for(const d of selected){const ans=answers.get(d.id);const v=ans?.value||'unknown';
   (v==='true'?supported:v==='false'?denied:unknown).push(d);
  }
  const lines=[];
  if(!s.confirmed)lines.push('Предложение: потвърдете предмета и обхвата в Етап 2, без да губите вече установените факти.');
  if(s.kind==='investment')lines.push('Предложение: изследвайте конкуриращите се предпоставки по приложения №1/№2 към ЗООС и ОС, без предварително предпочитан изход.');
  if(s.kind==='plan_program')lines.push('Предложение: разгледайте ЕО и ОС самостоятелно и възможността за координиране на режимите.');
  if(s.kind==='other')lines.push('Предложение: определете относимия специален административен ред и компетентния орган.');
  if(supported.length)lines.push('Представени за последваща проверка като подкрепени от посочени доказателства: '+supported.map(x=>x.id).join(', ')+'. Експертна проверка на изключенията остава задължителна.');
  if(denied.length)lines.push('Посочени отрицателни факти (само при източник): '+denied.map(x=>x.id).join(', ')+'.');
  if(unknown.length)lines.push('Неустановени хипотези: '+unknown.map(x=>x.id).join(', ')+'. Предложение: изискайте конкретните липсващи данни и проверете условията и изключенията от оригиналите в V11.');
  if(s.spatial==='OUTSIDE')lines.push('Доказаното пространствено непресичане не е само по себе си изключение от приложимостта на ОС.');
  lines.push('Компетентност: РИОСВ – Пловдив е възможен орган, но не е удостоверен без отделна материална и териториална проверка.');
  proposal.replaceChildren(el('strong','Мотивирано предварително предложение'),el('p',lines.join('\n')));
  proposal.querySelector('p').style.whiteSpace='pre-line';
  last=Object.freeze({caseKey:s.key,archive:LOCKED_ARCHIVE,graphVersion:graph.schema,
   candidateIds:selected.map(x=>x.id),supportedIds:supported.map(x=>x.id),notSupportedIds:denied.map(x=>x.id),
   undeterminedIds:unknown.map(x=>x.id),proposal:lines.join('\n'),expertApproved:false,finalProcedure:false,
   sourceCaveat:'B2 graph was V10-based; only V11 allowlisted citations are displayed.'});
 }
 root.append(status,refresh,cards,proposal);
 // Preserve the original independent fact/rule engine for formal expert verification.
 // Do not let technical JSON forms dominate the expert's default working screen.
 if(old){const fold=el('details');fold.id='kt89ExpertFormalReview';
  fold.style.cssText='margin-top:12px;border-top:1px solid #73917a;padding-top:8px';
  fold.append(el('summary','Разширена проверка на предпоставки и изключения · независим двигател V11'));
  fold.append(old);root.append(fold);}
 // The four legacy hand-entry menus are optional alternatives, not the default route.
 const legacy=Array.from(rhs.querySelectorAll(':scope > .kt86-norm'));
 if(legacy.length){const fold=el('details');fold.id='kt89OptionalNormChoices';
  fold.style.cssText='border:1px solid #668879;border-radius:7px;padding:9px;margin:8px 0';
  fold.append(el('summary','Алтернативни правни връзки · експертна редакция'));
  legacy[0].before(fold);legacy.forEach(x=>fold.append(x));
 }
 const first=rhs.querySelector('#kt89OptionalNormChoices')||rhs.querySelector('#kt87V11Sources')||rhs.querySelector('.kt86-norm');
 if(first)rhs.insertBefore(root,first);else rhs.append(root);
 if($('kt87V11Sources')){const oldSource=$('kt87V11Sources');const fold=el('details');fold.append(el('summary','Пълен проверен индекс V11 · архивни препратки'));oldSource.before(fold);fold.append(oldSource)}
 refresh.onclick=()=>draw(true);
 ['kt80:stage-open','kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'].forEach(event=>document.addEventListener(event,()=>draw()));
 window.KT89AutomaticB2=Object.freeze({refresh:()=>draw(true),snapshot:()=>last});
 draw(true);
}
(async()=>{
 try{
  const url=new URL('./kt82-b2-consolidated-graph-v02.json',import.meta.url);
  const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
  const graph=await res.json();
  if(graph.schema!=='KT82_B2_INDEPENDENT_LEGAL_COMPETITION_GRAPH_V02'||
   graph.archive_sha256!=='605956c29134ebe755d24dacc6bb2a3c062f410043cdc7b39df46e5a34d963cd'||
   graph.logic?.incomplete_facts!=='Unknown is not false; always propose concrete next evidence action')
   throw new Error('Оригиналният Б2 граф не съвпада');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>boot(graph),1900),{once:true});
  else setTimeout(()=>boot(graph),1900);
 }catch(e){console.error('КТ89 Б2: оригиналният граф не е зареден; няма автоматична правна приемка.',e)}
})();
