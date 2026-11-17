/* KT124 independent expert authority: additive panel. No changes to original
   Stage 4 AI approval or Stage 5 Word document engine. */
import {collectStageEvidence} from './kt95-stage-evidence-handoff.mjs';
const routes=[{"id":1,"title":"Писмо по чл. 2, ал. 2 от Наредбата за ОС"},{"id":2,"title":"Писмо за допълнителна информация"},{"id":3,"title":"Искане за становище от институция"},{"id":4,"title":"Писмо за приложима процедура по ОВОС"},{"id":5,"title":"Писмо за приложима процедура по ОС"},{"id":6,"title":"Решение по чл. 18 от НОС"},{"id":7,"title":"Решение по чл. 93 ЗООС"},{"id":8,"title":"Решение по ОВОС"},{"id":9,"title":"Прекратяване на процедура"},{"id":10,"title":"Писмо за процедура по ЕО"},{"id":11,"title":"Решение за преценяване на ЕО"},{"id":12,"title":"Становище по ЕО"},{"id":13,"title":"Експертна справка"},{"id":14,"title":"Проверка на преписка"},{"id":15,"title":"Справка за имоти и ограничения"},{"id":16,"title":"Архив на преписка"},{"id":17,"title":"Отговор по жалба"},{"id":18,"title":"Отговор по сигнал"},{"id":19,"title":"Произнасяне по възражение"},{"id":20,"title":"Препращане по компетентност"},{"id":21,"title":"Уведомяване за резултат от проверка"},{"id":22,"title":"Произнасяне по предложение"}];
const labels=['Приложение № 1 към ЗООС','Приложение № 2 към ЗООС','Чл. 2, ал. 1 Наредба за ОС','Чл. 2, ал. 2 Наредба за ОС'];
const keys=['A1','A2','OS1','OS2'];
const x=v=>String(v??'').trim();
const mk=(t,body)=>{const el=document.createElement(t);if(body!==undefined)el.textContent=body;return el};
const select=(options)=>{const el=mk('select');for(const [value,label] of options){const opt=mk('option',label);opt.value=value;el.append(opt)}return el};
function boot(){
 const host=document.getElementById('kt96EGAuthor');if(!host||document.getElementById('kt124ExpertPanel'))return;
 let caseRecord=null,pending=false,confirmed=false;
 const root=mk('section');root.id='kt124ExpertPanel';
 root.style.cssText='font:14px/1.5 Verdana,Arial;color:#f7f2e5;margin:15px 0;padding:15px;border:1px solid #bca36c;border-radius:8px;background:#173a2b';
 const css=mk('style');css.textContent='#kt124ExpertPanel h3{font:bold 17px Verdana;color:#f2d393;margin:0 0 12px}#kt124ExpertPanel h4{font:bold 15px Verdana;color:#f1d18e;margin:0 0 10px}#kt124ExpertPanel .k124-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}#kt124ExpertPanel .k124-card{border:1px solid #789c83;padding:12px;background:#234936;border-radius:7px;min-width:0}#kt124ExpertPanel .k124-card pre{white-space:pre-wrap;max-height:240px;overflow:auto;font:12px/1.6 Verdana;margin:8px 0;overflow-wrap:anywhere}#kt124ExpertPanel textarea,#kt124ExpertPanel input,#kt124ExpertPanel select{width:100%;box-sizing:border-box;background:#fffef9;color:#16392c;border:1px solid #8c9a84;border-radius:5px;padding:9px;font:13px/1.5 Verdana}#kt124ExpertPanel textarea{min-height:65px;resize:vertical}#kt124ExpertPanel label{display:block;margin:10px 0 4px;font-weight:700}#kt124ExpertPanel button{border:0;border-radius:7px;background:#dcb977;color:#173929;font:bold 13px Verdana;padding:12px 16px;cursor:pointer}#kt124ExpertPanel button:disabled{opacity:.55;cursor:not-allowed}#kt124ExpertPanel .k124-note{color:#f4d5a1}#kt124ExpertPanel .k124-row{border-top:1px solid #63816b;padding-top:9px;margin-top:10px}@media(max-width:1000px){#kt124ExpertPanel .k124-grid{grid-template-columns:1fr}}';
 root.append(css,mk('h3','КТ123 · Три отделни становища и окончателна експертна преценка'));
 const grid=mk('div');grid.className='k124-grid';
 const aCard=mk('section');aCard.className='k124-card';
 aCard.append(mk('h4','1. EG Автор · предложение'));
 const authorText=mk('pre','Все още няма предложение.');aCard.append(authorText);
 const rCard=mk('section');rCard.className='k124-card';
 rCard.append(mk('h4','2. AI рецензент · аргументи'));
 const reviewerText=mk('pre','Няма извършен рецензентски преглед.');rCard.append(reviewerText);
 const eCard=mk('section');eCard.className='k124-card';
 eCard.append(mk('h4','3. Експерт · собствено решение'));
 const decisionText=mk('pre','Не е потвърдено самостоятелно експертно решение.');eCard.append(decisionText);
 grid.append(aCard,rCard,eCard);root.append(grid);
 const d=mk('details');d.style.cssText='margin-top:13px;border:1px solid #8da88b;border-radius:7px;padding:12px';
 d.append(mk('summary','Самостоятелна експертна преценка · отхвърли и двете AI становища'));
 const intro=mk('p','Действието не издава административен акт. Записва собствените мотиви на експерта и предава избраното направление към съществуващия Етап 5. AI несъгласието не е вето.');intro.className='k124-note';d.append(intro);
 const label=(caption,input)=>{const l=mk('label',caption);d.append(l,input);return input};
 const expert=label('Експерт — име или служебен идентификатор',mk('input'));expert.maxLength=120;
 const panel=label('Административно направление — всички 22 панела',select(routes.map(z=>[String(z.id),String(z.id).padStart(2,'0')+' — '+z.title])));
 const rowInputs=keys.map((key,i)=>{const box=mk('div');box.className='k124-row';const title=mk('label',labels[i]);const status=select([['НЕОПРЕДЕЛЕНА','НЕОПРЕДЕЛЕНА'],['ПОЛОЖИТЕЛНА','ПОЛОЖИТЕЛНА'],['ОТРИЦАТЕЛНА','ОТРИЦАТЕЛНА']]);const reason=mk('textarea');reason.placeholder='Конкретна правна предпоставка, доказателство и мотив за избрания статус';reason.maxLength=550;box.append(title,status,reason);d.append(box);return {key,status,reason}});
 const caseGrounds=label('Установени факти и техните източници',mk('textarea'));caseGrounds.maxLength=2000;caseGrounds.placeholder='Документ, място, релевантни характеристики, пространствени данни...';
 const legalGrounds=label('Точни правни основания',mk('textarea'));legalGrounds.maxLength=2000;legalGrounds.placeholder='Акт, член, алинея, точка, приложима законова предпоставка...';
 const reasoning=label('Мотиви за избраното направление и несъгласието с AI',mk('textarea'));reasoning.maxLength=2200;reasoning.placeholder='Защо това направление следва от фактите и нормите, защо не приемате двата AI извода...';
 const consentLabel=mk('label');consentLabel.style.cssText='display:flex;align-items:start;gap:9px;margin:12px 0;font-weight:400';
 const consent=mk('input');consent.type='checkbox';consent.style.cssText='width:18px;height:18px;flex:none';
 consentLabel.append(consent,mk('span','Разгледах наличните AI становища. Потвърждавам самостоятелно мотивирана експертна преценка по тази преписка.'));
 d.append(consentLabel);
 const action=mk('button','Потвърди експертното решение за Етап 5');action.type='button';const note=mk('p');note.className='k124-note';note.setAttribute('aria-live','polite');d.append(action,note);root.append(d);host.append(root);
 function clear(){caseRecord=null;confirmed=false;authorText.textContent='Все още няма предложение.';reviewerText.textContent='Няма извършен рецензентски преглед.';decisionText.textContent='Не е потвърдено самостоятелно експертно решение.';note.textContent='';d.open=false}
 function receive(v){
  const h=collectStageEvidence(window);if(!v?.caseId||v.evidenceRevision!==h.evidenceRevision)return;
  const prior=caseRecord&&caseRecord.caseId===v.caseId?caseRecord:null;
  caseRecord={caseId:v.caseId,evidenceRevision:h.evidenceRevision,generation:h.generation,key:h.key,caseIdType:v.caseIdType,requestId:v.requestId,
   draft:x(v.sourceDraft)||prior?.draft||'',issueCodes:Array.isArray(v.warnings)?v.warnings:[],
   reviewerVerdict:v.reviewerVerdict||'not_completed',
   reviewerFindings:Array.isArray(v.reviewerFindings)?v.reviewerFindings:[]};
  confirmed=false;
  authorText.textContent=caseRecord.draft||'EG Авторът не е изготвил проверим текст. Констатации: '+caseRecord.issueCodes.join('; ');
  const name={pass:'Приет без отбелязани възражения',revise:'Препоръчана преработка',reject:'Отхвърлен',not_completed:'Рецензията не е проведена или не е завършена'};
  reviewerText.textContent=(name[caseRecord.reviewerVerdict]||'Непотвърден рецензентски резултат')+'\n'+
   (caseRecord.reviewerFindings.length?caseRecord.reviewerFindings.join('\n\n'):'Няма предоставени конкретни аргументи от рецензента.');
  decisionText.textContent='Предстои собствена експертна преценка.';note.textContent='';
 }
 document.addEventListener('kt115:stage4-draft',e=>receive(e.detail));
 document.addEventListener('kt124:stage4-attempt',e=>receive(e.detail));
 action.onclick=async()=>{
  if(pending)return;
  const h=collectStageEvidence(window),p=window.KT80WorkflowState?.subjectConfirmed||{};
  if(!p.expertConfirmed||!p.scopeConfirmed){note.textContent='Първо потвърдете предмета и обхвата в Етап 2.';return}
  if(!caseRecord||h.evidenceRevision!==caseRecord.evidenceRevision||h.generation!==caseRecord.generation||h.key!==caseRecord.key){
   note.textContent='Няма актуална преписка с регистриран AI резултат. Стартирайте EG Автора веднъж за текущия работен цикъл.';return;
  }
  if(!window.KT80EGSession?.hasAccess?.()){note.textContent='Необходим е действащ достъп до EG Автора в същата работна сесия.';return}
  if(!consent.checked){note.textContent='Потвърдете изрично експертната отговорност.';return}
  const body={task:'confirm_independent_expert_decision',projectOnly:true,
   caseId:caseRecord.caseId,evidenceRevision:caseRecord.evidenceRevision,requestId:crypto.randomUUID(),
   subject:x(p.text),scope:x(p.scope),parcelIds:[...h.parcelIds],
   decision:{expert:x(expert.value),panelId:Number(panel.value),
    rows:rowInputs.map(z=>({key:z.key,status:z.status.value,reason:x(z.reason.value)})),
    caseGrounds:x(caseGrounds.value),legalGrounds:x(legalGrounds.value),reasoning:x(reasoning.value),explicitOverride:true},
   author:{draft:caseRecord.draft,issueCodes:caseRecord.issueCodes},
   reviewer:{verdict:caseRecord.reviewerVerdict,findings:caseRecord.reviewerFindings}};
  if(body.decision.expert.length<3||body.decision.caseGrounds.length<35||
     body.decision.legalGrounds.length<35||body.decision.reasoning.length<80||
     body.decision.rows.some(z=>z.reason.length<25)){
   note.textContent='Попълнете експерта, четирите мотивирани нормативни статуса, фактическите основания, правните основания и избора на панел.';return;
  }
  pending=true;action.disabled=true;note.textContent='Регистриране на самостоятелното експертно решение…';
  try{
   const result=await window.KT80EGSession.request('https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/stage4-expert-decision',JSON.stringify(body));
   const data=await result.json().catch(()=>({}));
   const current=collectStageEvidence(window);
   if(current.evidenceRevision!==caseRecord.evidenceRevision||current.key!==caseRecord.key){note.textContent='Данните на преписката са променени. Решението не е предадено.';return}
   if(!result.ok||!data.expertDecisionProof||data.caseId!==body.caseId||data.requestId!==body.requestId||data.evidenceRevision!==body.evidenceRevision){
    note.textContent='Самостоятелното решение не е регистрирано: '+(data.issues?.join(', ')||data.error||result.status);return}
   confirmed=true;decisionText.textContent='ПОТВЪРДЕНО ОТ ЕКСПЕРТА\nЕксперт: '+data.expertDecision.expert+
    '\nНаправление: '+String(data.expertDecision.panelId).padStart(2,'0')+' — '+data.expertDecision.panelTitle+
    '\nПравни основания: '+data.expertDecision.legalGrounds+
    '\nФакти: '+data.expertDecision.caseGrounds+
    '\nМотиви: '+data.expertDecision.reasoning;
   document.dispatchEvent(new CustomEvent('kt124:expert-decision-approved',{detail:{
    caseId:data.caseId,evidenceRevision:data.evidenceRevision,requestId:data.requestId,
    sourceDraft:data.draft,expertDecision:data.expertDecision,expertDecisionProof:data.expertDecisionProof,
    caseIdType:caseRecord.caseIdType,qualityPassed:true
   }}));
   note.textContent='Експертното решение е регистрирано. Използвайте „Продължи към Етап 5“ от панела за потвърдената преценка.';
   d.open=false;
  }catch{note.textContent='Неуспешна връзка със защитения сървърен маршрут.'}
  finally{pending=false;action.disabled=false}
 };
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(name=>document.addEventListener(name,clear));
}
setTimeout(boot,2700);
