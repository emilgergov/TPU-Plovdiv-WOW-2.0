/* KT88 — restore the Stage 4 UI bridge to the already accepted V11 engines.
   Does not create new laws or infer that a cited norm applies to this dossier. */
import {VERIFIED_ARTICLES,verifiedReference} from './v11-trusted-source-registry.mjs';
import {createCaseAssessmentPacket} from './kt83-v612-independent-rule-packet.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
const mk=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const $=id=>document.getElementById(id);
function start(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(!stage||$('kt83B2CaseBridgeStage4'))return;
 const wrap=mk('section');wrap.id='kt83B2CaseBridgeStage4';
 wrap.style.cssText='padding:12px;border:1px solid #a1a786;border-radius:9px;background:#173c2e;margin:12px 0;color:#f2eddd';
 wrap.append(mk('h3','Правни хипотези · консолидиран механизъм V11'));
 wrap.append(mk('p','Архивните препратки се извеждат автоматично. Приложимостта, фактическите предпоставки и изключенията се проверяват за настоящата преписка. Предложение има и при липсващи доказателства.'));
 const counter=mk('p');counter.setAttribute('role','status');
 const list=mk('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:7px';
 const selection=new Set(),records=Object.values(VERIFIED_ARTICLES).sort((a,b)=>a.act.localeCompare(b.act,'bg')||a.article.localeCompare(b.article,'bg'));
 for(const r of records){
  const label=mk('label');label.style.cssText='border:1px solid #66816f;border-radius:6px;padding:8px;display:flex;gap:8px;align-items:flex-start;font-size:13px';
  const box=mk('input');box.type='checkbox';box.value=r.id;
  box.addEventListener('change',()=>{box.checked?selection.add(r.id):selection.delete(r.id);drawCount()});
  label.append(box,mk('span',r.act+' · '+r.article+' · '+r.id));list.append(label);
 }
 function drawCount(){counter.textContent='Проверен индекс: '+records.length+' разпоредби · избрани за изследване: '+selection.size+'. Това е индекс на потвърдени цитати, не пълен списък на приложимите процедури.'}
 drawCount();wrap.append(counter,list);
 const details=mk('details');details.open=false;
 details.append(mk('summary','Експертна доказателствена проверка · съществуващ нормативен двигател'));
 const intro=mk('p','Изберете относимите разпоредби и свържете всяка с конкретни, проверими предпоставки и изключения. Не се създава служебно положителен факт. Празни или недоказани предпоставки не се приемат.');
 const rulesLabel=mk('label','Правни хипотези и условия (JSON)');
 const rules=mk('textarea');rules.id='kt83V612Rules';rules.rows=7;rules.style.cssText='width:100%;background:#fcf9ef;color:#183b2c;padding:9px;font:13px/1.4 monospace';
 const factLabel=mk('label','Факти с първични източници (JSON)');
 const facts=mk('textarea');facts.id='kt83V612Facts';facts.rows=6;facts.style.cssText=rules.style.cssText;
 const fill=mk('button','Подготви проверка по избраните разпоредби');fill.type='button';
 const assess=mk('button','Провери хипотезите с V11');assess.type='button';
 for(const b of [fill,assess])b.style.cssText='background:#dcbc78;color:#113726;padding:9px;border-radius:7px;font-weight:bold;margin:8px 8px 8px 0';
 const result=mk('div');result.setAttribute('role','status');result.style.whiteSpace='pre-wrap';
 fill.addEventListener('click',()=>{
  if(!selection.size){result.textContent='Изберете поне една архивна разпоредба.';return}
  const existing=(()=>{try{return JSON.parse(rules.value||'[]')}catch{return []}})();
  const entries=Array.isArray(existing)?existing.filter(e=>!selection.has(e.registryId)):[];
  for(const id of selection){
   const r=VERIFIED_ARTICLES[id];
   entries.push({id:'H_'+id,title:r.act+' · '+r.article,registryId:id,
    requirements:['F_'+id],exceptions:[],
    exceptionAudit:{status:'requires_review',sourceId:'',sourceLocation:r.archivePath,reason:'Експертът трябва да провери изключенията по пълния архивен текст'},
    missingFactProposal:'Предложение: проверете предпоставките и изключенията по '+r.article+' от '+r.act+' и приложете доказателствата.',
    supportedProposal:'Предложение: проверете и мотивирайте приложимата процедура по '+r.article+'.',
    notSupportedProposal:'Предложение: изследвайте алтернативните приложими правни основания.'});
  }
  // Drafts are deliberately incomplete; they cannot be submitted as verified
  // without a case-specific expert audit of exceptions and primary facts.
  rules.value=JSON.stringify(entries,null,2);
  result.textContent='Изготвени са '+selection.size+' проекта за проверка. Потвърдете всички предпоставки, изключения и доказателства; служебно не се удостоверява тяхната приложимост.';
  rules.dispatchEvent(new Event('input',{bubbles:true}));
 });
 let last=null;
 for(const input of [rules,facts])input.addEventListener('input',()=>{last=null});
 assess.addEventListener('click',()=>{
  try{
   const packet=createCaseAssessmentPacket({hypotheses:JSON.parse(rules.value||'[]'),facts:JSON.parse(facts.value||'[]')});
   const state=window.KT80WorkflowState||{};
   last=assessStage4({confirmedSubject:state.subjectConfirmed?.expertConfirmed?state.subjectConfirmed.text:'',
    scopeConfirmed:state.subjectConfirmed?.scopeConfirmed===true,evidence:packet.evidence,rules:packet.rules});
   result.textContent='Проверени хипотези: '+last.legalFindings.length+'\n'+last.legalFindings.map(x=>x.title+' — '+x.state+'\n'+x.proposedAction).join('\n\n')+
    '\nФормална готовност за проект: '+(last.readyForStage5Draft?'условно да, след проверка на компетентността':'не')+
    '\nЕкспертната приемка и компетентността се удостоверяват отделно.';
  }catch(e){last=null;result.textContent='Необходима проверка: '+e.message}
 });
 details.append(intro,rulesLabel,rules,factLabel,facts,fill,assess,result);
 wrap.append(details);
 window.KT83B2CaseBridge=Object.freeze({getAssessment:()=>last});
 const target=$('kt86Matrix')?.querySelector('.kt86-panel:nth-child(2)')||stage;
 target.append(wrap);
 document.addEventListener('kt80:case-change',()=>{last=null;facts.value='';rules.value='';result.textContent='Нова преписка: нормативните доказателства се изследват отначало.'});
 document.addEventListener('kt82:evidence-invalidated',()=>{last=null;result.textContent='Данните са променени. Необходима е нова нормативна проверка.'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
