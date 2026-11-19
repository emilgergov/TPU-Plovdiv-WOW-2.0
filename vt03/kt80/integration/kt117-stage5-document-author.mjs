import {collectStageEvidence} from './kt95-stage-evidence-handoff.mjs';
const make=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const clean=x=>String(x??'').trim();

function formatDraftSubject(draft){
 const raw=String(draft??'').replace(/\r\n/g,'\n');
 const lines=raw.split('\n'),index=lines.findIndex(x=>/^\s*Относно\s*:/iu.test(x));
 if(index<0)return {text:raw,warning:'Липсва ред „Относно:“. Въведете ред по действителния предмет на преписката.'};
 if(index!==0)return {text:raw,warning:'Редът „Относно:“ трябва да е първият ред на документа, както изисква одобрената бланка.'};
 const value=lines[index].replace(/^\s*Относно\s*:\s*/iu,'').trim();
 if(!value)return {text:raw,warning:'Редът „Относно:“ е празен.'};
 // Preserve case-specific designation: investment proposal, plan, programme, project, or another lawful type.
 // Never inject or require a fixed document type; editing the confirmed content belongs to the expert.
 return {text:raw,warning:null};
}

const incomingReference=()=>{
 const w=window.KT80WorkflowState||{},i=w.intake||{};
 // Only explicitly identified incoming-file registry fields; don't mine arbitrary
 // correspondence or attachments for a number belonging to another document.
 const candidates=[i.incoming_number,i.incomingNumber,i.registry_number,i.registryNumber,
  i.entry_number,i.entryNumber,i.vh_number,i.vhNumber,
  i.incoming?.number,i.registration?.incoming_number];
 const explicit=candidates.map(clean).find(x=>/^((вх\.?\s*№\s*)?ОВОС[-– ]?\d+[-–]\d+\s*\/\s*\d{1,2}\.\d{1,2}\.\d{4}(\s*г\.?)?)$/iu.test(x));
 return explicit?explicit.replace(/^вх\.?\s*№\s*/iu,'').trim():'ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';
};
// A case-bound document must retain the expert-confirmed kind of administrative action.
const isPanel01Request=(line,body)=>
 Number(String(line||'').match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b/iu)?.[1]||0)===1 &&
 /(?:необходимо\s+е\s+да\s+представите|изисквам\s+да\s+представите|указвам\s+(?:ви\s+)?да\s+(?:представите|допълните)|да\s+допълните\s+представената\s+документация|представете\s+допълнителн[а-я]*\s+(?:документ|информац)|допълнителна\s+информация[,\s]+включваща)/iu.test(String(body||''));
const documentLabel=line=>{
 const name=clean(line).replace(/^ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]?\s*/iu,'');
 return name||'Административен документ';
};

// The editor and pilot panel share one case-bound view of the confirmed decision.
function panelHandoff(root, approval){
 const state=root.KT80WorkflowState||{}, subject=state.subjectConfirmed||{};
 const evidence=collectStageEvidence(root);
 if(!approval?.expertApproved||approval.evidenceRevision!==evidence.evidenceRevision)return null;
 const panelLine=approval.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b[^\n]*/iu);
 const panelId=Number(approval.panelId??approval.expertDecision?.panelId??panelLine?.[1]);
 if(!Number.isInteger(panelId)||panelId<1||panelId>22||panelId===15)return null;
 const spatial=root.KT83NormativeBridge?.getEvidence?.()||{};
 const gate=state.normativeGate;
 const gisStatus=gate?.expertConfirmed===true&&gate.decision==='NOT_REQUIRED'?'not_applicable':
  gate?.expertConfirmed===true&&gate.decision==='REQUIRED'&&spatial.pdfOK===true&&
  ['INSIDE','INTERSECTS','MIXED','OUTSIDE'].includes(clean(spatial.spatialClass).toUpperCase())?'confirmed':
  gate?.expertConfirmed===true&&gate.decision==='REQUIRED'?'pending':'unverified';
 return Object.freeze({panelId,caseId:approval.caseId,evidenceRevision:evidence.evidenceRevision,
  decisionVersion:approval.version,result:documentLabel(panelLine?.[0]||''),
  decision:approval.text,subject:clean(subject.text),scope:clean(subject.scope),
  gisStatus,gisReason:clean(gate?.reason),pdf1:gisStatus==='confirmed'?{
   spatialClass:clean(spatial.spatialClass),evidenceRevision:evidence.evidenceRevision,
   receiptStamp:root.KT83NormativeBridge?.pdfStatus?.().stamp||null
  }:null,parcelIds:Object.freeze([...evidence.parcelIds]),observations:Object.freeze([...evidence.observations]),
  warnings:Object.freeze([...(approval.warnings||[])])});
}

function initialize(){
 const panel=document.getElementById('kt116Stage5');
 if(!panel)return;
 let source=null,versions=[],confirmed=null,busy=false,editorialIssues=[];
 const endpoint='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/stage5-document';
 const stylesheet=make('style');
 stylesheet.textContent='#kt117Stage5{color:#f7f0df;font:14px/1.6 Verdana,Arial}#kt117Stage5 .kt117-context{padding:14px;background:#264e3b;border:1px solid #8a9b79;border-radius:8px;margin:12px 0}#kt117Stage5 .kt117-heading{font-weight:700;color:#f6d18a;margin:0 0 9px}#kt117Stage5 .kt117-main{font-size:18px;font-weight:700;color:#ffdfa2;margin:8px 0}#kt117Stage5 .kt117-reference{font-weight:700;color:#f6d18a;margin:6px 0 12px}#kt117Stage5 .kt117-paper{padding:16px;background:#284d3c;border-left:4px solid #d9bb7a;white-space:pre-wrap;line-height:1.7;margin:12px 0}#kt117Stage5 .kt117-actions{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0}#kt117Stage5 .kt117-actions button{font:700 13px Verdana,Arial;background:#dab972;color:#163a29;border:none;border-radius:6px;padding:11px 14px;cursor:pointer}#kt117Stage5 .kt117-actions button[disabled]{opacity:.5;cursor:default}#kt117Stage5 [hidden]{display:none!important}#kt117Stage5 textarea[hidden]{display:none!important}#kt117Stage5 .kt117-actions button[hidden]{display:none!important}#kt117Stage5 textarea{width:100%;min-height:360px;box-sizing:border-box;font:13px/1.6 Verdana,Arial;background:#fffdf5;color:#142e22;padding:12px;border-radius:6px}#kt117Stage5 .kt117-note{font-size:12px;color:#f2d398;white-space:pre-wrap}#kt117Stage5 details{padding:10px;border:1px solid #68896e;border-radius:7px;margin:10px 0}#kt117Stage5 summary{color:#f5d18b;cursor:pointer}#kt117Stage5 .kt117-decision-status{padding:12px 14px;border:1px solid #d9bb7a;border-left:5px solid #d9bb7a;border-radius:6px;background:#254e3c;color:#fff0c8;font:700 13px/1.5 Verdana,Arial;margin:6px 0 12px}#kt117Stage5 .kt117-decision-status[data-error="true"]{background:#5b2424;color:#fff7e5;border-color:#e4a08f}';
 stylesheet.textContent+=`
 #kt132AddressedPanel{color:#f7f0df;background:#123529;border:1px solid #bda168;border-radius:12px;padding:22px;width:min(960px,calc(100vw - 36px));box-sizing:border-box;max-height:88vh}
 #kt132AddressedPanel::backdrop{background:#061811bd}
 #kt132AddressedPanel h3{color:#f6d18a}
 #kt132AddressedPanel button,#kt117PanelTransition button{font:700 13px Verdana,Arial;background:#dab972;color:#163a29;border:0;border-radius:6px;padding:11px 14px;cursor:pointer}
 #kt132AddressedPanel .kt117-pilot-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 #kt132AddressedPanel .kt117-pilot-columns>div{background:#163b2c;border:1px solid #68896e;padding:12px;border-radius:8px}
 #kt132AddressedPanel .kt117-pilot h4{margin:0;color:#f6d18a}
 #kt132AddressedPanel .kt117-pilot>h4{margin-top:16px}
 @media(max-width:650px){#kt132AddressedPanel .kt117-pilot-columns{grid-template-columns:1fr}}`;
 document.head.append(stylesheet);
 const ui=make('section');ui.id='kt117Stage5';
 const heading=make('h3','5. Изготвяне на административния документ');
 const context=make('div');context.className='kt117-context';
 const contextTitle=make('div','Потвърдено предложение от Етап 4');contextTitle.className='kt117-heading';
 const direction=make('div');direction.className='kt117-main';
 const reference=make('div');reference.className='kt117-reference';
 const details=make('div'), warnings=make('details'),warningText=make('div');
 warnings.append(make('summary','Бележки от нормативния преглед'),warningText);
 context.append(contextTitle,direction,reference,details,warnings);
 const addressed=make('dialog');addressed.id='kt132AddressedPanel';
 addressed.setAttribute('aria-label','Работен екран на адресирания панел');
 const pilot=make('div');pilot.className='kt117-pilot';
 const back=make('button','Към Етап 5');back.type='button';back.onclick=()=>addressed.close();
 addressed.append(back,pilot);
 document.body.append(addressed);
 const transition=make('section');transition.id='kt117PanelTransition';transition.hidden=true;
 const destination=make('p'),openPanel=make('button','Към панел №01');openPanel.type='button';
 transition.append(destination,openPanel);
 const action=make('div');action.className='kt117-actions';
 const generate=make('button','Изготви текст с EG Автора');
 const edit=make('button','Редактирай текста'),save=make('button','Запази редакцията'),cancel=make('button','Откажи редакцията'),confirm=make('button','Потвърди текста');
 edit.hidden=true;save.hidden=true;cancel.hidden=true;confirm.hidden=true;
 action.append(generate); const reviewActions=make('div'); reviewActions.className='kt117-actions'; reviewActions.append(edit,save,cancel,confirm);
 const note=make('p');note.className='kt117-note';
 const editorial=make('details');editorial.hidden=true;
 const editorialTitle=make('summary','Бележки за редакция');editorial.append(editorialTitle);
 const editorialContent=make('div');editorial.append(editorialContent);
 const preview=make('div');preview.className='kt117-paper';preview.hidden=true;
 const textarea=make('textarea');textarea.hidden=true;textarea.style.display='none';textarea.setAttribute('aria-label','Редакция на административния документ');
 const confirmedText=make('div');confirmedText.className='kt117-note';
 const decisionStatus=make('p');decisionStatus.className='kt117-decision-status';decisionStatus.hidden=true;decisionStatus.setAttribute('role','status');decisionStatus.setAttribute('aria-live','polite');decisionStatus.setAttribute('tabindex','-1');
 const showDecisionStatus=(message,error=false)=>{decisionStatus.textContent=message;decisionStatus.hidden=false;decisionStatus.dataset.error=String(error);decisionStatus.scrollIntoView({behavior:'smooth',block:'center'});};
 const word=make('button','Създай Word по бланката');word.id='kt119WordCreate';word.disabled=true;
 const wordInfo=make('p','Документът се създава автоматично по одобрения институционален модел на РИОСВ – Пловдив. Използва се само експертно потвърденият текст, без пренаписване.');
 wordInfo.className='kt117-note';
 const original=make('details');original.append(make('summary','Пълен експертно потвърден анализ от Етап 4'),make('pre'));
 const footer=make('div');footer.className='kt117-actions';footer.append(word);
 ui.append(heading,context,action,note,editorial,preview,textarea,reviewActions,decisionStatus,confirmedText,footer,wordInfo,original);
 wordInfo.after(transition);
 panel.replaceChildren(ui);
 const live=()=>window.KT116ExpertHandoff?.snapshot?.()||null;
 const confirmedPanelOutput=()=>{
  if(!source||!confirmed||confirmed.caseId!==source.caseId||confirmed.stage4Version!==source.version)return null;
  const output=confirmed.stage5Output;
  if(output){
   return confirmed.wordSaved===true&&output.caseId===confirmed.caseId&&output.decisionVersion===confirmed.stage4Version&&
    output.documentVersion===confirmed.version?output:null;
  }
  // Legacy documents can be reviewed without attributing current GIS to an old decision.
  const legacy=panelHandoff(window,source);
  return legacy?{...legacy,gisStatus:'legacy',gisReason:'',pdf1:null,documentVersion:confirmed.version}:null;
 };
 openPanel.onclick=()=>{
  const handoff=live()?confirmedPanelOutput():null;
  if(handoff?.panelId!==1)return;
  const confirmedData=make('div');
  confirmedData.append(make('h4','Потвърдени данни'));
  if(handoff.subject)confirmedData.append(make('p','Готово · Предмет: '+handoff.subject));
  if(handoff.scope)confirmedData.append(make('p','Готово · Обхват: '+handoff.scope));
  const pending=make('div');
  pending.append(make('h4','Необходими действия'));
  const spatialStatus=handoff.gisStatus;
  const spatialLabel={confirmed:'Готово · ГИС и PDF1',not_applicable:'ГИС · Неприложимо. PDF1 не се изисква.'+(handoff.gisReason?' '+handoff.gisReason:''),
   legacy:'Запазеният проект няма връзка към конкретен ГИС резултат и PDF1.',
   pending:'ГИС и PDF1 · Потвърждението не е налично в панела',unverified:'ГИС · Относимостта е непотвърдена'}[spatialStatus];
  (['confirmed','not_applicable'].includes(spatialStatus)?confirmedData:pending).append(make('p',spatialLabel));
  const project=confirmed;
  pending.append(make('p',project?'Преглед на проекта по преписката':'Изготвяне на проект по потвърдената процедура'));
  const columns=make('div');columns.className='kt117-pilot-columns';columns.append(confirmedData,pending);
  const rationale=make('details'),decision=make('p',handoff.decision);
  decision.style.whiteSpace='pre-wrap';
  rationale.append(make('summary','Виж потвърденото решение'),decision);
  const caseNumber=window.KT126Registry?.caseNumber?.()||'Отворена преписка';
  pilot.replaceChildren(make('h3','Панел №01 · '+handoff.result),make('h4','Защо преписката е тук'),
   make('p',caseNumber+' · Потвърден избор от Етап 5'),rationale,columns);
  if(project){
   const draft=make('details'),text=make('p',project.text);text.style.whiteSpace='pre-wrap';
   draft.append(make('summary','Прегледай проекта'),text);pilot.append(draft);
  }
  addressed.showModal();
 };
 function sync(){
  const a=live();
  if(!a){confirmedText.textContent='';decisionStatus.hidden=true;transition.hidden=true;addressed.close();source=null;versions=[];confirmed=null;editorialIssues=[];editorial.hidden=true;context.hidden=true;action.hidden=true;preview.hidden=true;textarea.hidden=true;textarea.style.display='none';reviewActions.hidden=true;footer.hidden=true;original.hidden=true;note.textContent='Няма потвърдено предложение по текущата преписка.';return;}
  if(source&&source.caseId===a.caseId&&source.version===a.version&&source.text===a.text)return;
  addressed.close();
  source=a;versions=[];confirmed=null;editorialIssues=[];editorial.hidden=true;context.hidden=false;action.hidden=false;reviewActions.hidden=false;footer.hidden=true;
  original.hidden=false;original.querySelector('pre').textContent=a.text;
  let panelLine=a.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0]||'Административно направление, потвърдено от експерта';
  direction.textContent=documentLabel(panelLine);
  reference.textContent='Представена документация · вх. № '+incomingReference();
  const p=window.KT80WorkflowState?.subjectConfirmed||{};
  const handoff=panelHandoff(window,a);
  const parcels=handoff?.parcelIds||collectStageEvidence(window).parcelIds;
  transition.hidden=true;
  destination.textContent=handoff?.panelId===1?'Адресиран панел №01 · '+handoff.result:'';
  details.textContent='Предмет: '+clean(p.text)+'\nИмот(и): '+parcels.join(', ')+'\nЕксперт: '+a.expert+' · Версия: '+a.version;
  warnings.hidden=!a.warnings?.length;warningText.textContent=(a.warnings||[]).join('\n');
  note.textContent='Изготвянето на документа използва потвърденото направление, без нова процедурна квалификация.';
  preview.hidden=true;textarea.hidden=true;textarea.style.display='none';edit.hidden=true;save.hidden=true;cancel.hidden=true;confirm.hidden=true;generate.hidden=false;
 }
 const render=()=>{
  const v=versions.at(-1);if(!v)return;
  preview.textContent=v.text;preview.hidden=false;textarea.hidden=true;textarea.style.display='none';edit.hidden=false;save.hidden=true;cancel.hidden=true;
  confirm.hidden=!!confirmed;confirmedText.textContent=confirmed?'Потвърден текст · версия '+confirmed.version+'. Експертните редакции остават окончателни за документа.':'';
  const output=confirmedPanelOutput();
  transition.hidden=output?.panelId!==1;
  if(!transition.hidden)destination.textContent='Адресиран панел №01 · '+output.result;
  footer.hidden=!confirmed;word.disabled=!(confirmed&&window.KT119TemplateReady?.());
 };
 generate.onclick=async()=>{
  sync();if(!source||busy)return;
  if(!window.KT80EGSession?.hasAccess?.()){note.textContent='Първо установете достъп до EG Автора в Етап 4 в същата работна сесия.';return;}
  const p=window.KT80WorkflowState?.subjectConfirmed||{},ev=collectStageEvidence(window);
  const line=source.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0];
  if(!line){note.textContent='Потвърденото предложение няма еднозначно административно направление. Върнете се в Етап 4 за редакция.';return;}
  const requestId=crypto.randomUUID();const payload={task:'draft_stage5_document',projectOnly:true,expertConfirmed:true,
   caseId:source.caseId,evidenceRevision:source.evidenceRevision,stage4Version:source.version,requestId,
   confirmedStage4Text:source.text,selectedPanelLine:line,subject:clean(p.text),scope:clean(p.scope),
   parcelIds:[...ev.parcelIds],warnings:source.warnings||[],
    qualificationRecord:source.qualificationRecord||null,qualificationProof:source.qualificationProof||null,qualificationGate:source.qualificationGate||null,
     expertDecision:source.expertDecision||null,expertDecisionProof:source.expertDecisionProof||null,
   documentTitle:documentLabel(line),incomingReference:incomingReference()};
  busy=true;generate.disabled=true;note.textContent='EG Авторът изготвя проект на административния текст.';
  const activityTicket=window.KT80Busy?.start?.('EG Автор · Изготвя проекта на административния документ…');
  try{
   const res=await window.KT80EGSession.request(endpoint,JSON.stringify(payload));
   const data=await res.json().catch(()=>({}));
   if(!live()||live()?.text!==source.text||live()?.version!==source.version){note.textContent='Данните на преписката са променени. Отговорът не е използван.';return;}
   if(!res.ok){
    const legalIssue=res.status===422&&['STAGE5_DIRECTION_CONFLICT','UNSUPPORTED_CATEGORICAL_CONCLUSION','STAGE4_LEGAL_MATRIX_CONFLICT','STAGE4_DECISION_MODEL_CONFLICT','STAGE4_SOURCE_PROOF_MISSING','STAGE4_QUALIFICATION_CHANGED'].includes(data.error);
    const diagnostic=(Array.isArray(data.findings)?data.findings:[]).slice(0,4).map(f=>
     String(f.test||'Предпоставка')+': '+String(f.actual||'неустановена')+
     (f.requiredForDirection?' · необходимо за избраното направление: '+f.requiredForDirection:'')+
     (f.reason?' · '+f.reason:''));
    note.textContent=legalIssue?
     'Не е изготвен непроверен документ. '+String(data.message||'Необходимо е съгласуване с анализа от Етап 4.')+
     '\\nПредложение: сверете конкретните предпоставки с доказателствата в Етап 4, редактирайте извода и потвърдете отново. Избраното направление не се сменя автоматично.':
     'Текстът не е получен. Проверете достъпа и услугата (код '+res.status+').';
    if(legalIssue){editorialIssues=[note.textContent,...diagnostic];editorialContent.replaceChildren(...editorialIssues.map(x=>make('p',x)));editorial.hidden=false;}
    return;
   }
   if(data.caseId!==source.caseId||data.requestId!==requestId||data.evidenceRevision!==source.evidenceRevision||
     data.stage4Version!==source.version||data.selectedPanelLine!==line||
     data.documentTitle!==documentLabel(line)||data.incomingReference!==incomingReference()||data.projectOnly!==true||
     data.expertReviewRequired!==true||clean(data.draft).length<120){
     note.textContent='Отговорът не съответства на потвърдената преписка.';return;
   }
   editorialIssues=Array.isArray(data.editorialFlags)?data.editorialFlags.filter(x=>typeof x==='string').slice(0,8):[];
   editorialContent.replaceChildren(...editorialIssues.map(x=>make('p',x)));
   editorial.hidden=!editorialIssues.length;
   const normalized=formatDraftSubject(data.draft);
   if(normalized.warning){editorialIssues.push(normalized.warning);editorialContent.append(make('p',normalized.warning));editorial.hidden=false;}
   // Client-side safety guard is required even while an older Worker may be live.
   const requestInsteadOfNotice=isPanel01Request(line,normalized.text);
   if(requestInsteadOfNotice){
    editorialIssues.push('Избрано е писмо по чл. 2, ал. 2, но проектът изисква допълнителна информация. Не се допуска потвърждаване или Word. Проверете нормативната основа в Етап 4.');
    editorialContent.replaceChildren(...editorialIssues.map(x=>make('p',x)));editorial.hidden=false;
    note.textContent='Отхвърлен е проект с различно административно действие. Резултатът не е запазен за потвърждаване.';return;
   }
   versions.push({version:versions.length+1,text:normalized.text,kind:'предложение на EG Автора — индивидуален предмет'});
   const handoff=panelHandoff(window,source);
   if(handoff?.gisStatus==='confirmed'){
    const {caseId,decisionVersion,evidenceRevision,parcelIds}=handoff;
    versions.at(-1).spatialConfirmation={caseId,decisionVersion,evidenceRevision,parcelIds};
   }
   document.dispatchEvent(new CustomEvent('kt123:stage5-draft',{detail:{caseId:source.caseId,stage4Version:source.version}}));
   confirmed=null;decisionStatus.hidden=true;render();note.textContent=editorialIssues.length?'Проектът е готов. Проверете бележките за редакция преди потвърждение.':'Проектът е готов за експертна редакция или потвърждение.';
  }catch{note.textContent='Възникна грешка при изготвянето на текста.';}
  finally{if(activityTicket!==undefined)window.KT80Busy?.finish?.(activityTicket);busy=false;generate.disabled=false}
 };
 edit.onclick=()=>{
  transition.hidden=true;
  if(!versions.length)return;textarea.value=versions.at(-1).text;textarea.hidden=false;textarea.style.display='block';preview.hidden=true;
  edit.hidden=true;confirm.hidden=true;save.hidden=false;cancel.hidden=false;confirmed=null;footer.hidden=true;
 };
 save.onclick=()=>{
  if(clean(textarea.value).length<120){note.textContent='Текстът е непълен.';return;}
  versions.push({version:versions.length+1,text:textarea.value,kind:'експертна редакция'});
  confirmed=null;render();note.textContent='Редакцията е запазена. След потвърждение няма да бъде променяна от EG Автора.';
 };
 cancel.onclick=render;
 confirm.onclick=()=>{
  if(!source||!live()||live()?.version!==source.version||!versions.length){
    showDecisionStatus('Не може да се потвърди: данните на преписката или експертната версия са променени.',true);return;
  }
  const v=versions.at(-1),checked=formatDraftSubject(v.text);
  if(checked.warning){
    showDecisionStatus(checked.warning+' Изберете „Редактирай текста“.',true);return;
  }
  const selected=source.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0]||'';
  if(isPanel01Request(selected,checked.text)){
   showDecisionStatus('Съдържанието представлява искане за допълнителна информация, а потвърденото направление е панел №01. Преработете текста или извършете нова доказателствена преценка в Етап 4. Не се допуска скрита промяна на вида документ.',true);return;
  }
  const handoff=panelHandoff(window,source);
  if(handoff&&['pending','unverified'].includes(handoff.gisStatus)){
   showDecisionStatus('Етап 5 очаква потвърден ГИС резултат и PDF1 или мотивирано решение за неприложимост.',true);return;
  }
  const stage5Output=handoff?{...handoff,documentVersion:v.version}:null;
  // Expert confirms exactly the displayed draft; no last-minute rewriting.
  confirmed=Object.freeze({...v,caseId:source.caseId,stage4Version:source.version,
    stage5Output,expert:source.expert,confirmedAt:new Date().toISOString()});
  document.dispatchEvent(new CustomEvent('kt123:stage5-confirmed',{detail:{caseId:source.caseId,stage4Version:source.version}}));
  render();
  note.textContent='Текстът е потвърден от експерта. Можете да създадете DOCX по проверената бланка.';
  showDecisionStatus('Текстът е потвърден · версия '+confirmed.version+'. Създаването на Word е достъпно по-долу.');
 };
 word.addEventListener('click',async()=>{
  const version=confirmed;
  if(!version||word.disabled)return;
  word.disabled=true;
  try{
   if(await window.KT119Download?.()===true&&confirmed===version&&live()?.version===version.stage4Version){
    confirmed=Object.freeze({...version,wordSaved:true});
    window.KT126Registry?.saveSoon?.();
   }
  }finally{render();}
 });
 document.addEventListener('kt119:template-ready',()=>{word.disabled=!(confirmed&&window.KT119TemplateReady?.());});
 document.addEventListener('kt116:stage4-confirmed',()=>{source=null;sync()});
 document.addEventListener('kt116:stage5-open',()=>sync());
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(x=>document.addEventListener(x,()=>{source=null;sync()}));
 window.KT117Document=Object.freeze({
  panelHandoff:()=>live()?confirmedPanelOutput():null,
  snapshot:()=>confirmed&&live()?.version===confirmed.stage4Version?confirmed:null,
  refresh:sync
 });
 sync();
}
setTimeout(initialize,3000);
