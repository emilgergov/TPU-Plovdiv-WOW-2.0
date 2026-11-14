/* KT83 P5: submit the ALREADY REVIEWED Stage 4 rules to original V11.
 * Controls are nested in the existing advanced legal evidence section.
 * No duplicate stage, no automatic jurisdiction, no A/B route selection.
 */
import {createCaseAssessmentPacket} from './kt83-v612-independent-rule-packet.mjs';
import {prepareExpertV11Review} from './kt83-p5-expert-v11-review.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
const t=x=>String(x??'').trim();
const make=(tag,label)=>{const x=document.createElement(tag);if(label)x.textContent=label;return x};
function boot(){
 const panel=document.getElementById('kt83B2CaseBridgeStage4');
 const parent=panel?.querySelector('details');
 const rules=document.getElementById('kt83V612Rules');
 const facts=document.getElementById('kt83V612Facts');
 if(!parent||!rules||!facts)return;
 const group=make('section');
 group.id='kt83P5ExpertVerification';
 group.style.cssText='border-top:1px solid #9cad9e;padding-top:10px;margin-top:13px';
 group.append(make('h4','Експертна проверка на нормативните основания'));
 group.append(make('p','След проверката на хипотезите посочете отделно основанието и доказателствата за компетентността. Потвърждението не издава административен акт.'));
 function field(id,label,placeholder=''){
  const wrap=make('label',label);
  wrap.style.cssText='display:block;margin:8px 0;font-size:13px';
  const x=make('input');x.type='text';x.id=id;x.maxLength=400;x.placeholder=placeholder;
  x.style.cssText='display:block;width:100%;margin-top:3px;font-size:14px';
  wrap.append(x);group.append(wrap);return x;
 }
 const authority=field('kt83P5CompetentAuthority','Експертно установен компетентен орган');
 const municipality=field('kt83P5CompetenceMunicipality','Община по приложения териториален обхват на РИОСВ – Пловдив');
 const article=field('kt83P5CompetenceRegistry','Разпоредба от нормативния MASTER V11 — ИД от проверения индекс','Например идентификатор на действително относимата разпоредба');
 const source=field('kt83P5CompetenceDocument','Проверен документ от преписката или нормативния архив');
 const location=field('kt83P5CompetenceLocation','Точно място в документа (страница, член, алинея)');
 const reason=field('kt83P5CompetenceReason','Експертен мотив за материална и териториална компетентност');
 group.append(make('p','За контрол по чл. 6а НОС проверете отделно приложимостта, териториалния обхват и всички седем изключения за компетентност на министъра. Доказателствените факти в таблицата трябва да съдържат цитат от оригиналния документ (sourceQuote). Непълните данни не се приемат за отрицателен факт.'));
 const checkLabel=make('label');
 checkLabel.style.cssText='display:block;margin:10px 0';
 const confirmed=make('input');confirmed.type='checkbox';confirmed.id='kt83P5CompetenceConfirmed';
 checkLabel.append(confirmed,document.createTextNode(' Потвърждавам проверката на относимите основания, доказателствата и компетентността.'));
 const button=make('button','Потвърди проверената нормативна преценка');button.type='button';
 button.id='kt83P5CommitV11';
 const status=make('p','Без експертно потвърждение Етап 5 остава заключен.');
 status.id='kt83P5ReviewStatus';status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 group.append(checkLabel,button,status);parent.append(group);
 const reset=()=>{
  const provider=window.KT83V11CaseEvidenceProvider;
  provider?.clear?.();
  const wf=window.KT80WorkflowState;
  if(wf?.lawConfirmed?.archiveVersion==='V11')wf.lawConfirmed=null;
  status.textContent='Данните се измениха. Необходима е актуална експертна проверка.';
 };
 for(const input of [rules,facts,authority,municipality,article,source,location,reason,confirmed])
  input.addEventListener('input',reset);
 for(const event of ['kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'])
  document.addEventListener(event,()=>{
   for(const input of [authority,municipality,article,source,location,reason])input.value='';
   confirmed.checked=false;
   reset();
  });
 button.addEventListener('click',async()=>{
  const provider=window.KT83V11CaseEvidenceProvider;
  const route=window.KT83RouteAccess;
  const workflow=window.KT80WorkflowState||{};
  try{
   if(workflow.step!==4)throw new Error('Преценката се потвърждава в Етап 4.');
   if(!provider?.submit||!route?.commitVerifiedExpertReview)
    throw new Error('Няма връзка с нормативния MASTER V11 и единния маршрут.');
   const checked=window.KT83B2CaseBridge?.getAssessment?.();
   if(!checked)throw new Error('Първо изпълнете проверката на нормативните хипотези и факти.');
   const packet=createCaseAssessmentPacket({
    hypotheses:JSON.parse(rules.value||'[]'),
    facts:JSON.parse(facts.value||'[]')
   });
   const context={
    caseId:workflow.caseCycleId,generation:workflow.generation,
    evidenceRevision:window.KT82EvidenceInvalidation?.getRevision?.()??null,
    subject:workflow.subjectConfirmed?.text,scope:workflow.subjectConfirmed?.scope,
    subjectConfirmed:workflow.subjectConfirmed?.expertConfirmed===true,
    scopeConfirmed:workflow.subjectConfirmed?.scopeConfirmed===true
   };
   const competence={
    name:t(authority.value),municipality:t(municipality.value),registryId:t(article.value),
    sourceId:t(source.value),sourceLocation:t(location.value),reason:t(reason.value)
   };
   if(!confirmed.checked)throw new Error('Потвърдете експертния преглед.');
   if(!t(municipality.value))throw new Error('Уточнете общината за териториалната компетентност.');
   const archived=verifiedReference(competence.registryId);
   const verifier=window.KT83IndependentCompetenceAudit;
   if(typeof verifier?.verify!=='function')
    throw new Error('Липсва независим механизъм за проверка на компетентността. Проверете основанието от нормативния MASTER V11 и преписката.');
   const audit=await verifier.verify({context,competence,archived,packet});
   if(audit?.verified!==true)throw new Error(audit?.nextAction||'Не е доказана компетентността по текущата преписка.');
   const review=prepareExpertV11Review({
    context,packet,existingStage4:checked,
    expertApproved:confirmed.checked,authority:competence,
    independentCompetenceAudit:audit
   });
   const result=provider.submit(review);
   if(!result.ok)throw new Error(result.reason||'Невалидни доказателства.');
   const moved=route.commitVerifiedExpertReview();
   if(!moved.ok){provider.clear();throw new Error(moved.reason||'Отказан преход към Етап 5.')}
   status.textContent='Провереният нормативен резултат е предаден към Етап 5 за тази преписка.';
  }catch(e){
   provider?.clear?.();
   status.textContent='Предложение: '+String(e?.message||e);
  }
 });
 window.KT83P5ReviewUI=Object.freeze({status:()=>status.textContent});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
