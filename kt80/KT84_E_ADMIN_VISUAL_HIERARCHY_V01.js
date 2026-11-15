/* KT84-E visual hierarchy. Presentation only: never advances route, validates
   a norm, generates an OUT or changes any GIS/Word evidence. */
(function(root){'use strict';
 const $=id=>document.getElementById(id);
 const css=document.createElement('style');
 css.id='kt84-e-legal-hierarchy';
 css.textContent=`
 .kt80-stage-panel{font-family:"Segoe UI",Arial,sans-serif!important}
 .kt80-stage-panel h2,.kt80-stage-panel h3,.kt80-dashboard h2,.kt80-dashboard h3{
   font-family:"Segoe UI",Arial,sans-serif!important;line-height:1.35}
 .kt80-stage-panel p{font-size:14px;line-height:1.48}
 .kt80-stage-panel button{font-family:"Segoe UI",Arial,sans-serif!important}
 .kt84-primary-finding{background:#15392e;color:#fff5df;border:2px solid #ddb790;
   border-left:7px solid #f1bd77;border-radius:10px;margin:4px 0 15px;padding:15px 17px;
   font:500 16px/1.5 "Segoe UI",Arial,sans-serif;box-shadow:0 4px 16px #0003}
 .kt84-primary-finding[data-ready="true"]{border-color:#aed5b7;border-left-color:#a2d9b2}
 .kt84-primary-finding h3{margin:0 0 7px!important;color:#fff0cd!important;
   font:750 21px/1.3 "Segoe UI",Arial,sans-serif!important}
 .kt84-primary-finding p{margin:4px 0!important;color:#fff1df!important;
   font:500 15px/1.5 "Segoe UI",Arial,sans-serif!important}
 .kt84-primary-finding .kt84-next{font-weight:700!important}
 .kt80-stage-panel[data-panel="4"] .kt83-independent-panel button,
 .kt80-stage-panel[data-panel="4"] #kt83P5CommitV11{
   font-size:13px!important;font-weight:650!important}

 .kt84-intake-evidence{background:#18382c;color:#f4eee0;border:2px solid #a8bf9c;
  border-left:7px solid #dab875;border-radius:10px;padding:12px 16px;margin:5px 0 12px;
  font:500 14px/1.45 "Segoe UI",Arial,sans-serif}
 .kt84-intake-evidence h3{color:#fff0ce!important;font:750 18px/1.3 "Segoe UI",Arial,sans-serif!important;margin:0 0 7px!important}
 .kt84-intake-evidence p{color:#f0ecdb!important;font:500 14px/1.45 "Segoe UI",Arial,sans-serif!important;margin:5px 0!important}
 .kt84-intake-evidence[data-incomplete="true"]{border-color:#d9ad84;border-left-color:#f1ab75}
 .kt84-format-details{margin:7px 0 11px;background:#1b3d30;border:1px solid #769177;
 border-radius:8px;padding:8px 11px;font:500 13px/1.45 "Segoe UI",Arial,sans-serif}
 .kt84-format-details summary{cursor:pointer;color:#eed5a0;font-weight:700}
 .kt84-format-details #kt80AcceptedFormatsNote{background:transparent!important;
 border:0!important;margin:8px 0 2px!important;padding:3px!important;font-size:13px!important}
 .kt84-work-step{display:flex;gap:10px;align-items:flex-start;padding:9px 13px;
 border:1px solid #8ca993;border-radius:8px;background:#18382c;color:#f4eee0;
 margin:4px 0 12px;font:500 14px/1.42 "Segoe UI",Arial,sans-serif}
 .kt84-work-step strong{font-weight:750;color:#f9eac5}
 .kt84-work-step .kt84-work-fields{display:grid;gap:3px;flex:1}
 .kt84-work-step .kt84-work-marker{font-weight:800;color:#f4d69a;white-space:nowrap}
 @media(max-width:620px){.kt84-work-step{display:block}.kt84-work-step .kt84-work-marker{display:block;margin-bottom:5px}}
 .kt84-result-group{position:relative}
 .kt84-result-group h3{font-family:"Segoe UI",Arial,sans-serif!important}
 @media(max-width:650px){.kt84-primary-finding{padding:11px 13px}
 .kt84-primary-finding h3{font-size:18px!important}}
 `;
 document.head.append(css);
 function legal(){
  // This is the already-accepted independent case-bound V11 handoff.
  // Never interpret the user checkbox as a legal verification.
  const assessment=root.KT83RouteAccess?.currentV11?.();
  return assessment?.ok===true
   ? {ready:true,title:'Правната преценка е удостоверена',
      reason:'Нормативните предпоставки и компетентността са удостоверени за текущата преписка.',
      next:'Следва експертен преглед на мотивираното предложение. Не е издаден административен акт.'}
   : {ready:false,title:'Правната готовност не е удостоверена',
      reason:assessment?.reason||'Няма независимо удостоверена правна преценка за текущата преписка.',
      next:assessment?.nextAction||'Предложение: проверете относимите разпоредби в Нормативния архив и доказателствените факти.'};
 }
 function show(){
  const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
  if(!stage)return;
  let area=$('kt84PrimaryLegalFinding');
  if(!area){
   area=document.createElement('section');area.id='kt84PrimaryLegalFinding';
   area.className='kt84-primary-finding';area.setAttribute('role','status');
   area.setAttribute('aria-live','polite');
   for(const [tag,id] of [['h3','kt84PrimaryLegalTitle'],['p','kt84PrimaryLegalReason'],['p','kt84PrimaryLegalNext']]){
    const child=document.createElement(tag);child.id=id;
    if(id==='kt84PrimaryLegalNext')child.className='kt84-next';
    area.append(child);
   }
   stage.prepend(area);
  }
  const value=legal();
  area.dataset.ready=String(value.ready);
  for(const [id,txt] of [
   ['kt84PrimaryLegalTitle',value.title],['kt84PrimaryLegalReason',value.reason],
   ['kt84PrimaryLegalNext',value.next]
  ]){
   const node=$(id);if(node&&node.textContent!==txt)node.textContent=txt;
  }
 }
const stageGuides=[
 {work:'Прегледайте прочита на документите и отбележете липсите.',
  finish:'Наличен е действителен документен отчет; спорните извлечени данни остават за експертна проверка.'},
 {work:'Проверете предмета, обхвата и произхода на извлечените сведения.',
  finish:'Предметът и обхватът са потвърдени поотделно от експерта.'},
 {work:'Проверете имотите, реалната геометрия и пространствения резултат.',
  finish:'Налице е обоснован пространствен резултат или мотивирана неприложимост на ГИС.'},
 {work:'Съпоставете фактите с нормативните основания и компетентността.',
  finish:'Независимата правна преценка е удостоверена за текущата преписка.'},
 {work:'Прегледайте мотивираното предложение и вида на документа.',
  finish:'Документът е неподписан работен проект и отразява удостовереното правно основание.'}
];
function showWorkGuides(){
 for(let step=1;step<=5;step++){
  const stage=document.querySelector('.kt80-stage-panel[data-panel="'+step+'"]');
  if(!stage)continue;
  let banner=document.getElementById('kt84WorkGuide'+step);
  if(!banner){
   banner=document.createElement('section');banner.id='kt84WorkGuide'+step;
   banner.className='kt84-work-step';banner.setAttribute('aria-label','Експертна задача за етап '+step);
   const mark=document.createElement('span');mark.className='kt84-work-marker';mark.textContent='Етап '+step;
   const body=document.createElement('div');body.className='kt84-work-fields';
   for(const [id,head] of [['kt84GuideWork'+step,'Текуща задача: '],['kt84GuideFinish'+step,'Критерий за завършване: ']]){
    const item=document.createElement('div');item.id=id;
    const strong=document.createElement('strong');strong.textContent=head;
    item.append(strong,document.createTextNode(''));body.append(item);
   }
   banner.append(mark,body);
   const legal=document.getElementById('kt84PrimaryLegalFinding');
   if(step===4&&legal?.parentElement===stage)legal.after(banner);
   else stage.prepend(banner);
  }
  const info=stageGuides[step-1];
  for(const [id,value] of [['kt84GuideWork'+step,info.work],['kt84GuideFinish'+step,info.finish]]){
   const el=document.getElementById(id);
   if(el&&el.lastChild?.nodeType===3)el.lastChild.textContent=value;
   else if(el)el.append(document.createTextNode(value));
  }
 }
}
function foldIntakeFormats(){
 const note=$('kt80AcceptedFormatsNote');
 if(!note||note.closest('details'))return;
 const disclosure=document.createElement('details');
 disclosure.className='kt84-format-details';
 const title=document.createElement('summary');
 title.textContent='Допустими файлове и ограничения';
 note.before(disclosure);disclosure.append(title,note);
 // Document types and size constraints remain unchanged and accessible.
}
function showIntakeEvidence(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="1"]');if(!stage)return;
 let node=$('kt84IntakeEvidenceResult');
 if(!node){
  node=document.createElement('section');node.id='kt84IntakeEvidenceResult';
  node.className='kt84-intake-evidence';node.setAttribute('role','status');
  node.setAttribute('aria-live','polite');
  for(const [tag,id] of [['h3','kt84IntakeResultTitle'],['p','kt84IntakeResultCounts'],['p','kt84IntakeResultNext']]){
   const el=document.createElement(tag);el.id=id;node.append(el);
  }
  stage.prepend(node);
 }
 const state=root.KT80WorkflowState||{},audit=root.KT80DossierAudit;
 const records=Array.isArray(audit?.records)?audit.records:null;
 let title='Прочитът на преписката не е удостоверен';
 let counts='Няма завършен доказателствен отчет за входните файлове.';
 let next='Следващо действие: изберете преписка и проверете извличането на текст за всеки документ.';
 let incomplete=true;
 if(records){
  const read=records.filter(r=>r.state==='TEXT_EXTRACTED').length;
  const review=records.filter(r=>r.state==='REVIEW_REQUIRED').length;
  const unread=records.filter(r=>r.state==='NOT_READ'||r.state==='UNSUPPORTED').length;
  const other=Math.max(0,records.length-read-review-unread);
  title='Автоматичната обработка е отчетена — експертната проверка остава необходима';
  counts='Инвентаризирани: '+records.length+' · Извлечен текст: '+read+
    ' · За проверка: '+review+' · Без надеждно извлечен текст: '+(unread+other);
  next=review||unread||other
    ?'Следващо действие: отворете оригиналите на проблемните документи и отбележете ограниченията преди правни изводи.'
    :'Следващо действие: прегледайте извлеченото съдържание; извличането не удостоверява фактическа вярност.';
  incomplete=!!(review||unread||other);
 }else if(state.intake){
  title='Има предварителен прочит, но липсва пълен доказателствен отчет';
  next='Следващо действие: проверете инвентара и оригиналите на всички приложени документи.';
 }
 node.dataset.incomplete=String(incomplete);
 for(const [id,txt] of [['kt84IntakeResultTitle',title],['kt84IntakeResultCounts',counts],['kt84IntakeResultNext',next]]){
  if($(id).textContent!==txt)$(id).textContent=txt;
 }
}
 function init(){
  foldIntakeFormats();show();showWorkGuides();showIntakeEvidence();
  for(const event of ['kt80:case-change','kt80:case-reset','kt80:stage-open',
    'kt82:evidence-invalidated','kt80:procedure-confirmed']){
   document.addEventListener(event,()=>queueMicrotask(show));
  }
  for(const id of ['kt80LawConfirmed','kt80ToProposal','kt83P5CommitV11',
   'kt80SubjectConfirmation','kt80ScopeConfirmation']){
   $(id)?.addEventListener('click',()=>queueMicrotask(show));
  }
  const legalResult=$('kt83P5ReviewStatus');
  if(legalResult&&root.MutationObserver)
   new MutationObserver(()=>queueMicrotask(show))
    .observe(legalResult,{childList:true,characterData:true,subtree:true});
  for(const event of ['kt80:stage-open','kt80:case-reset','kt80:case-change'])
   document.addEventListener(event,()=>queueMicrotask(showIntakeEvidence));
  const intakeStatus=$('kt80InputStatus');
  if(intakeStatus&&root.MutationObserver){
   new MutationObserver(()=>queueMicrotask(showIntakeEvidence))
    .observe(intakeStatus,{childList:true,characterData:true,subtree:true});
  }
  root.KT84EVisual=Object.freeze({refresh:()=>{show();showWorkGuides();showIntakeEvidence()}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
