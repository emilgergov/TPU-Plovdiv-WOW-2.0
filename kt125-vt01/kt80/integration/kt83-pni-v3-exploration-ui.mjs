/**
 * PNI-V3 isolated research interface. No call to an AI inference endpoint is
 * claimed or performed. Its input is an expert draft or a future AI payload.
 * This display is not legal advice and never selects a route or signs an act.
 */
import {auditExploratoryHypotheses} from '../independence/pni-hypothesis-auditor.mjs';
import {readKT80V598State} from './kt80-v598-case-evidence-adapter.mjs';
const el=(tag,text)=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=text;
 return e;
};
function start(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(!stage)return;
 const section=el('section');section.id='kt83PNIV3Exploration';
 section.className='kt83-independent-panel';
 section.append(el('h3','ПНИ · Свободно изследване на правни хипотези'));
 section.append(el('p','Тук се проверяват проекти на хипотези, предложени от експерт или външен EG Автор. Все още няма включено автоматично AI генериране в този екран. Нито една хипотеза не е предпочитана или установена по подразбиране.'));
 const lab=el('label','Изследователски предложения (структуриран списък)');
 const area=el('textarea');
 area.id='kt83PNIV3Drafts';area.rows=7;area.readOnly=false;
 area.placeholder='Въведете JSON масив с полета: id, question, reasoning, supporting, contrary, alternatives, unknowns, proposedChecks, sourceType. Не въвеждайте реални лични данни.';
 lab.htmlFor=area.id;
 const button=el('button','Провери хипотезите, алтернативите и опроверженията');
 button.type='button';button.id='kt83PNIV3Audit';
 const outLabel=el('label','Преглед по ПНИ — не е окончателен процедурен извод');
 const output=el('textarea');output.id='kt83PNIV3Output';output.rows=9;output.readOnly=true;
 outLabel.htmlFor=output.id;
 section.append(lab,area,button,outLabel,output);
 stage.prepend(section);
 const stage5=document.querySelector('.kt80-stage-panel[data-panel="5"]');
 if(stage5){
   const notice=el('p','ПНИ-V3: свободните правни хипотези са само изследователски проекти. Не е определена процедура и не се генерира административен акт. За мотивиран процедурен проект е необходима независима нормативна и експертна приемка.');
   notice.id='kt83PNIV3Stage5Notice';notice.className='kt83-independent-state';
   stage5.prepend(notice);
 }
 let last=null;
 const review=(hypotheses)=>{
  const data=readKT80V598State(window);
  const result=auditExploratoryHypotheses({
    confirmedSubject:data.confirmedSubject,scopeConfirmed:data.scopeConfirmed,
    candidates:hypotheses,
    normalizedEvidence:data.legalFacts||[],
    normativeCoverageComplete:false
  });
  last=result;
  output.value=[
   'Статус: '+result.status,
   'Потвърден предмет: '+(data.confirmedSubject||'липсва'),
   'Следващо действие: '+result.nextAction,
   ...result.findings.flatMap((f,i)=>[
     'Хипотеза '+(i+1)+': '+f.question,
     'Правен статус: '+f.status,
     'Проверени нормативни източници: '+(f.verifiedNormativeReferences.map(r=>r.registryId).join(', ')||'няма'),
     'Пропуски: '+(f.issues.join('; ')||'няма установени от тази ограничена проверка'),
     'Алтернативи: '+(f.alternatives.join('; ')||'не са посочени'),
     'Предложени проверки: '+(f.proposedChecks.join('; ')||'не са посочени')
    ]),
   'Не е определена процедура. Не е издаден административен акт.'
  ].join('\n\n');
  return result;
 };
 button.addEventListener('click',()=>{
  try{
   const draft=JSON.parse(area.value||'[]');
   if(!Array.isArray(draft))throw new TypeError('Въведете масив от хипотези');
   review(draft);
  }catch(e){last=null;output.value='Невалиден изследователски вход: '+e.message;}
 });
 document.addEventListener('input',e=>{
  if(['kt80SubjectText','kt80ScopeText','kt80ParcelInput'].includes(e.target?.id)){
   last=null;output.value='Променен предмет или обхват. Повторете изследването.';
  }
 });
 document.addEventListener('kt80:case-reset',()=>{last=null;area.value='';output.value='Преписката е изчистена.';});
 window.KT83PNIExploration=Object.freeze({
  auditDrafts:payload=>review(payload),
  getLast:()=>last,
  version:'KT83_PNI_V3_RESEARCH_ONLY'
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
