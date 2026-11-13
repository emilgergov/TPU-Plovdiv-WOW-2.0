/**
 * WOW V61.1: compact, separate KT80 preview for the accepted independent
 * B2 engine. Uses no route catalog, no Classic A/B and no automatic act.
 */
import {createKT83V611Bridge} from './kt83-v613-case-bound-b2-bridge.mjs';
import {createCaseAssessmentPacket} from './kt83-v612-independent-rule-packet.mjs';
import {createReviewDocument,renderReviewHTML} from './kt83-v614-review-document.mjs';
import {makeReviewDOCX} from './kt83-v615-independent-docx-adapter.mjs';
const $=id=>document.getElementById(id);
function el(tag,value){const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;}
function boot(){
 const p4=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 const p5=document.querySelector('.kt80-stage-panel[data-panel="5"]');
 if(!p4||!p5)return;
 const bridge=createKT83V611Bridge(window);
 const box4=el('section');box4.id='kt83B2CaseBridgeStage4';
 box4.className='kt83-independent-panel';
 box4.append(el('h3','Б2 · Независима нормативна преценка'));
 const intro=el('p','Основа: заключен нормативен архив V11. Не се извеждат правни изводи от примерна преписка, ключови думи или каталога от 22 изхода.');
 const inputs=el('details');
 const head=el('summary','Независими правни хипотези и факти · архив V11');inputs.append(head);
 const how=el('p','Тестова среда: не въвеждайте лични данни или реални поверителни преписки. Всяка хипотеза се конструира от експерта с архивна разпоредба, предпоставки, изключения и доказателства. Няма готова процедура.');
 const ruleLabel=el('label','Хипотези — JSON масив');const ruleInput=el('textarea');ruleInput.id='kt83V612Rules';ruleInput.rows=7;ruleInput.placeholder='[{"id":"h1","title":"Хипотеза","registryId":"ZOOS_93","requirements":["f1"],"exceptions":["ex1"],"exceptionAudit":{"status":"listed","sourceId":"V11","sourceLocation":"разпоредба","reason":"преглед"},"missingFactProposal":"Предложение за уточняване","supportedProposal":"Предложение за проверка","notSupportedProposal":"Предложение за алтернативна хипотеза"}]';ruleLabel.htmlFor=ruleInput.id;
 const factLabel=el('label','Фактически доказателства — JSON масив');const factInput=el('textarea');factInput.id='kt83V612Facts';factInput.rows=7;factInput.placeholder='[{"factId":"f1","value":"true","sourceId":"документ","sourceType":"преписка","sourceLocation":"стр. 1","reason":"експертно установяване"}]';factLabel.htmlFor=factInput.id;
 inputs.append(how,ruleLabel,ruleInput,factLabel,factInput);
 const run4=el('button','Провери нормативната готовност');run4.type='button';
 const status4=el('p','Потвърдете предмета и обхвата.');status4.setAttribute('role','status');
 box4.append(intro,inputs,run4,status4);
 const box5=el('section');box5.id='kt83B2CaseBridgeStage5';box5.className='kt83-independent-panel';
 box5.append(el('h3','Б2 → Етап 5 · Независимо предложение'));
 const run5=el('button','Предложи следващо действие');run5.type='button';
 const status5=el('p','Компетентност и приложимост на такса не са удостоверени.');status5.setAttribute('role','status');
 const draftButton=el('button','Създай работна HTML чернова за преглед');draftButton.type='button';
 const draftStatus=el('p','Черновата няма официална сила, подпис или потвърдена компетентност.');
 const shellSelect=el('input');shellSelect.type='file';shellSelect.accept='.docx';shellSelect.id='kt83V615BlankDOCX';
 const shellLabel=el('label','Само одобрена празна DOCX бланка — не използвайте Classic A/Б');shellLabel.htmlFor=shellSelect.id;
 const docxButton=el('button','Създай неподписан Word проект');docxButton.type='button';
 const docxStatus=el('p','Не е избрана и удостоверена независима празна бланка.');
 box5.append(run5,status5,draftButton,draftStatus,shellLabel,shellSelect,docxButton,docxStatus);
 p4.append(box4);p5.append(box5);
 function clear(){bridge.invalidate();docxStatus.textContent='Данните по преписката са изменени. Повторете проверката.';draftStatus.textContent='Работната чернова трябва да бъде създадена отново за тази преписка.';status4.textContent='Изменени данни. Необходима е нова преценка.';status5.textContent='Няма актуално предложение за тази преписка.';}
 run4.addEventListener('click',()=>{
  try{
   const x=bridge.inspect();
   if(!x.ready)throw new Error('Първо потвърдете предмета и обхвата в Етап 2.');
   // Explicit expert supplied, independently sourced hypotheses only.
   const hypotheses=JSON.parse(ruleInput.value.trim()||'[]');
   const facts=JSON.parse(factInput.value.trim()||'[]');
   const packet=createCaseAssessmentPacket({hypotheses,facts});
   const result=bridge.assess(packet);
   status4.textContent=['Работен цикъл: '+x.caseId,
    'Проверени условни хипотези от архивния индекс V11: '+result.legalFindings.length,
    ...result.legalFindings.map(f=>'• '+f.title+' — '+f.state+'; изключенията се оценяват като условия, не като предварителен извод'),
    ...result.proposals,
    'Не е направена правна квалификация. Не е издаден административен акт.'].join('\n');
   status5.textContent='Готово е предложение за следваща проверка, без определена процедура.';
  }catch(e){clear();status4.textContent='Нормативната преценка не е приложена: '+String(e.message||e)}
 });
 run5.addEventListener('click',()=>{
  try{
   const result=bridge.propose();
   status5.textContent=result.independentText+'\nСтатус на компетентността: '+result.authorityVerification+'\nФормален документ: НЕРАЗРЕШЕН. Не е издаден административен акт.';
  }catch(e){status5.textContent='Предложение: '+String(e.message||e)+' Проверете доказателствата от Етап 4.';}
 });
 draftButton.addEventListener('click',()=>{
  try{
   const inspect=bridge.inspect();
   if(!inspect.ready)throw new Error('Първо потвърдете предмета и обхвата.');
   const proposal=bridge.propose();
   const record=createReviewDocument({caseId:inspect.caseId,generation:inspect.generation,
    subject:inspect.confirmedSubject,proposal,evidenceRevision:inspect.evidenceRevision});
   const html=renderReviewHTML(record);
   const blob=new Blob([html],{type:'text/html;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=el('a');a.href=url;a.download='WOW_RABOTEN_PROEKT_ZA_PREGLED.html';
   document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
   draftStatus.textContent='Създадена е единствено неподписана работна HTML чернова. Не е издаден административен акт.';
  }catch(e){draftStatus.textContent='Няма нова чернова: '+String(e.message||e)}
 });
 docxButton.addEventListener('click',async()=>{
  const file=shellSelect.files?.[0];
  if(!file){docxStatus.textContent='Изберете изрично одобрена празна институционална DOCX бланка.';return}
  try{
   if(file.size>12000000||file.size<30)throw new Error('Невалиден размер на DOCX бланката');
   const before=bridge.inspect();
   if(!before.ready)throw new Error('Непотвърден предмет или обхват');
   const proposal=bridge.propose();
   const record=createReviewDocument({caseId:before.caseId,generation:before.generation,
    subject:before.confirmedSubject,proposal,evidenceRevision:before.evidenceRevision});
   const bytes=new Uint8Array(await file.arrayBuffer());
   const after=bridge.inspect();
   if(before.caseId!==after.caseId||before.generation!==after.generation||
      before.evidenceRevision!==after.evidenceRevision||before.confirmedSubject!==after.confirmedSubject||
      !bridge.getAssessment())
     throw new Error('Преписката е променена при зареждане на бланката');
   const result=makeReviewDOCX({templateBytes:bytes,zipEngine:window.fflate,record});
   if(!bridge.getAssessment())throw new Error('Изменени доказателства — Word изходът е отхвърлен');
   const blob=new Blob([result.bytes],{type:result.mediaType});
   const url=URL.createObjectURL(blob);
   const link=el('a');link.href=url;link.download='WOW_RABOTEN_PROEKT_ZA_PREGLED.docx';
   document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
   docxStatus.textContent='Създадена е само неподписана Word чернова за преглед. Няма официално произнасяне.';
  }catch(e){docxStatus.textContent='Word чернова не е създадена: '+String(e.message||e)}
 });
 for(const event of ['kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'])
  document.addEventListener(event,clear);
 for(const field of [ruleInput,factInput])field.addEventListener('input',clear);
 document.addEventListener('kt80:case-reset',()=>{ruleInput.value='';factInput.value='';});
 document.addEventListener('kt80:case-change',()=>{ruleInput.value='';factInput.value='';});
 document.addEventListener('input',event=>{
  if(['kt80SubjectText','kt80ScopeText','kt80ParcelInput'].includes(event.target?.id))clear();
 });
 window.KT83B2CaseBridge=bridge;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
