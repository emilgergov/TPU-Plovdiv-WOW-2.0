import {stage5CaseEvidence} from '../../../ai-author-v27/src/kt130-stage5-context.mjs';
import {spatialEvidenceSummary} from './spatial-handoff.mjs';
// Presentation only: preserve draft text, evidence, expert actions and server authorization.
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('KT130 presentation source contract mismatch');return s.replace(a,b)};
export function displayApplicability(text){
 const labels={'ПОЛОЖИТЕЛНА':'Приложима','ОТРИЦАТЕЛНА':'Неприложима','НЕОПРЕДЕЛЕНА':'Не може да се определи'};
 return String(text??'').replace(/^(\s*(?:ПРИЛОЖЕНИЕ\s*№\s*[12]\s*КЪМ\s*ЗООС|ЧЛ\.\s*2\s*,?\s*АЛ\.\s*[12]\s*НАРЕДБА\s*ЗА\s*ОС)\s*[:：]\s*)(ПОЛОЖИТЕЛНА|ОТРИЦАТЕЛНА|НЕОПРЕДЕЛЕНА)(?=\s*[—–-])/gimu,(_,heading,status)=>heading+labels[status.toUpperCase()]);
}
export function overlayPresentationPolish(rel,source){
 if(rel.endsWith('/KT82_STAGE4_V11_SOURCE_GATE_V610.js')){
  source=once(source,"  const proof=root.KT83P2Automatic?.current?.();\n  if(!valid||!proof||!root.KT83P2SpatialGate?.pdfReceiptMatches?.(proof,receipt))return;","  // Retain a case-bound receipt while prerequisites settle; data() still requires the complete P2 proof.\n  if(!valid||!Number.isFinite(receipt.bytes)||receipt.bytes<=0)return;");
 }
 if(rel.endsWith('/kt122-acceptance-finish.js'))source=once(source,"mk('span',null,why.slice(0,340))","mk('span',null,why)");
 if(rel.endsWith('/kt96-eg-ai-stage4-author.mjs'))source=once(source,'afterLead.slice(0,1100).trim()','afterLead.trim()');
 if(rel.endsWith('/kt116-expert-approval-handoff.mjs')){
  source=once(source,'AI бележките остават в преписката','ЕГ бележките остават в преписката');
  source=once(source,'Не се изисква спор с AI рецензента.','Не се изисква спор с ЕГ рецензента.');
  source=once(source,'function installKT116(){',`const applicabilityDisplay=${displayApplicability.toString()};\nfunction installKT116(){`);
  source=once(source,'const normalized=content.replace(', 'const normalized=applicabilityDisplay(content).replace(');
  source=once(source,"const header=mk('h3','Предложение за експертна преценка'),alerts=mk('details'),alertContent=mk('div');",`const header=mk('h3','Предложение за експертна преценка'),alerts=mk('details'),alertContent=mk('div');
 const meanings=mk('details');meanings.id='kt130ApplicabilityMeanings';
 meanings.append(mk('summary','Значение на нормативните оценки'));
 for(const description of ['Приложима — конкретните предпоставки са проверени и изпълнени.','Неприложима — конкретните предпоставки са проверени и е обосновано защо не са изпълнени.','Не може да се определи — посочен е конкретният липсващ факт, който препятства извода.'])meanings.append(mk('p',description));
 meanings.append(mk('p','За чл. 2, ал. 2 се разграничават приложимото основание за произнасяне и резултатът от проверката. „Приложима“ може да бъде съчетано с обоснован извод „Не е необходимо провеждане на процедура по реда на наредбата“. Първите три отрицателни оценки не определят автоматично четвъртата.'));`);
  source=once(source,'ui.append(header,alerts,paper,textarea,conclusion,actorLabel,actions,note,next,archiveMenu);','ui.append(header,meanings,alerts,paper,textarea,conclusion,actorLabel,actions,note,next,archiveMenu);');
  // Keep a heading and every following paragraph together until the next heading.
  source=once(source,'  for(const chunk of normalized.split(/\\n\\s*\\n/)){','  let activeSection=container;\n  for(const chunk of normalized.split(/\\n\\s*\\n/)){');
  source=once(source,"    if(emphasis)section.className='kt124-key-finding';","    activeSection=section;if(emphasis)section.className='kt124-key-finding';");
  source=once(source,"   else container.append(mk('p',t));","   else {const paragraph=mk('p',t);if(activeSection!==container)paragraph.className='kt124-key-value';activeSection.append(paragraph);}");

  source=once(source,"const actorLabel=mk('label','Експерт — име или служебен идентификатор');const actor=mk('input');actor.maxLength=120;actorLabel.append(actor);",`const actorLabel=mk('label','Експерт — име или служебен идентификатор');actorLabel.className='kt130-expert-identity';const actor=mk('input');actor.id='kt130ExpertIdentity';actor.maxLength=120;actor.autocomplete='name';
 const profileName=val(document.querySelector('#wow-session-banner .wow-session-who > strong')?.textContent);
 if(profileName){actor.value=profileName;actor.title='Попълнено от активния профил';}
 actorLabel.append(actor);
 const identityStyle=mk('style');identityStyle.textContent=\`
 #kt116Editor .kt130-expert-identity{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px;margin:18px 0;padding:14px 17px;border:1px solid #8b9069;border-radius:8px;background:#193e2e;color:#f3d28c;font:700 14px/1.5 Verdana,Arial}
 #kt116Editor .kt130-expert-identity input{flex:1 1 280px;min-width:0;max-width:520px;box-sizing:border-box;min-height:44px;padding:10px 13px;border:1px solid #dabc73;border-radius:7px;background:#0b2b20;color:#fff0de;font:400 15px/1.45 Verdana,Arial}
 #kt116Editor .kt130-expert-identity input:focus-visible{outline:3px solid #f3d28c;outline-offset:2px}
 #kt116Editor #kt124ReviewedConclusion{background:#32483b!important;border-color:#ad6965!important;border-left:5px solid #e15e58!important}
 #kt116Editor #kt124ReviewedConclusion>h4{color:#ff9189!important;border-bottom-color:#ad6965!important}
 @media(max-width:620px){#kt116Editor .kt130-expert-identity{display:grid;grid-template-columns:1fr}#kt116Editor .kt130-expert-identity input{width:100%;max-width:none}}
 \`;document.head.append(identityStyle);`);
 }
 if(rel.endsWith('/kt117-stage5-document-author.mjs')){
  source=once(source,'function initialize(){',`const kt130Stage5Evidence=${stage5CaseEvidence.toString()};\nconst kt130Stage5Spatial=${spatialEvidenceSummary.toString()};\nfunction initialize(){`);
  source=once(source,'  const requestId=crypto.randomUUID();const payload=',`  let stage5Evidence;\n  try{stage5Evidence=kt130Stage5Evidence(window,source,ev,kt130Stage5Spatial(window.KT83NormativeBridge?.getEvidence?.()))}\n  catch{note.textContent='Доказателствата са променени. Върнете се към потвърдения анализ на текущата преписка.';return;}\n  const requestId=crypto.randomUUID();const payload=`);
  source=once(source,'   documentTitle:documentLabel(line),incomingReference:incomingReference()};','   documentTitle:documentLabel(line),incomingReference:incomingReference(),completeCaseEvidence:stage5Evidence};');
  source=once(source,"original.querySelector('pre').textContent=a.text;","original.querySelector('pre').textContent=("+displayApplicability.toString()+")(a.text);");
 }
 return source;
}
