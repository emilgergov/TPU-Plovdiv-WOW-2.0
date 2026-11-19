/* KT80 V32 / IP MASTER — provenance-first proposed subject.
   No AI provider calls, legal routing, inferred works, parcel or capacity facts.
   Explicit expert confirmation remains in the original workflow module. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let draft=null, accepted=null;
const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
const generic=/^(?:предмет|наименование|описание|инвестиционно предложение|уведомление|относно)\s*[:\-–]\s*/i;
const headingOnly=/^(?:уведомление|инвестиционно предложение|предмет|описание|съдържание|техническа информация)$/i;
function candidates(intake){
 const out=[];
 // Provenance is derived from the actual extracted text and the individual
 // reader status. File names or generated subject_candidates are NOT proof.
 const parsed=new Map((intake?.files||[]).map(x=>[clean(x?.filename),String(x?.status||'')]));
 const extracted=new Set((intake?.document_texts||[])
  .filter(x=>clean(x?.text)).map(x=>clean(x?.source)));
 function sourceState(filename){
  if(!filename||!parsed.has(filename)||!extracted.has(filename))return 'NOT_READ';
  const reader=parsed.get(filename);
  if(/НЕПРОЧЕТЕН|неуспешно|няма извлекаем/iu.test(reader))return 'NOT_READ';
  if(/\\.doc$/iu.test(filename)||/OCR:|ПРОВЕРКА:|експертна проверка|частич/iu.test(reader))
   return 'REVIEW_REQUIRED';
  return /текстът е прочетен/iu.test(reader)?'TEXT_EXTRACTED':'REVIEW_REQUIRED';
 }
 function add(text,source,kind){
  let v=clean(text);if(!v||v.length<12||v.length>1500)return;
  v=clean(v.replace(generic,''));if(!v||headingOnly.test(v))return;
  const file=clean(source);
  const sourceReadStatus=sourceState(file);
  // Keep an unverified candidate visible for human reconstruction, but never
  // describe it as read or silently apply it to the confirmed subject field.
  if(!out.some(x=>x.text===v&&x.source===file))
   out.push({text:v,source:file||'НЕУСТАНОВЕН ДОКУМЕНТ',kind,
    sourceReadStatus,requiresExpertReview:sourceReadStatus!=='TEXT_EXTRACTED'});
 }
 for(const s of intake?.subject_candidates||[]){
  if(typeof s==='string'){add(s,null,'subject_candidate');continue}
  if(!s||typeof s!=='object')continue;
  add(s.title||s.heading,s.source,'subject_heading');
  for(const sec of s.sections||[])if(['subject','title','summary','investment_proposal'].includes(sec?.key))
   add(sec.text,sec.source||s.source,'subject_excerpt');
 }
 for(const doc of intake?.dossier_documents||[])for(const fact of doc?.facts||[])
  if(['activity','subject','title','project_name','investment_proposal'].includes(fact?.key))add(fact.value,doc.file||fact.source,'dossier_fact');
 return out;
}
function reviewRequestSource(intake){
 const record=root.KT126Registry?.current?.();
 let confirmedFile='';
 if(record?.external_status==='confirmed'&&record.case_id===root.KT80WorkflowState?.caseCycleId){
  try{
   const evidence=typeof record.external_evidence_json==='string'?JSON.parse(record.external_evidence_json):record.external_evidence_json;
   confirmedFile=clean(evidence?.file);
  }catch{}
 }
 const fileKey=name=>clean(name).replace(/\\/g,'/').normalize('NFC');
 const files=(intake?.files||[]).filter(file=>!file.expertIgnored&&!file.ignored&&/текстът е прочетен/iu.test(file.status||''));
 const documents=(intake?.document_texts||[]).map(doc=>({file:clean(doc.source),text:String(doc.text||'')}));
 const kind=/^(?:иск(?:ане|ам|аме)\s+за\s+преразглеждане|възражение(?:\s+срещу)?|жалба(?:\s+срещу)?)(?=\s|[:.,]|$)/iu;
 const matches=files.flatMap(file=>{
  const name=clean(file.filename);
  const first=clean(documents.find(doc=>fileKey(doc.file)===fileKey(name))?.text?.slice(0,12000)||
   (intake?.page_text_index||[]).filter(page=>fileKey(page.file||page.filename)===fileKey(name)).slice(0,3).map(page=>page.text||'').join(' '));
  if(!first)return [];
  const header=first.match(/(?:^|\s)(?:относно\s*[:–-]\s*)?(иск(?:ане|ам|аме)\s+за\s+преразглеждане|възражение\s+срещу|жалба\s+срещу)(?=\s|[:.,]|$)/iu);
  const filename=name.split(/[\\/]/u).at(-1).replace(/\.[^.]+$/u,'');
  if(!header&&!kind.test(filename))return [];
  if(!/преразглежд|оспорв|възразяв|обжалв/iu.test(first)||!/писм/iu.test(first))return [];
  const label=header?.[1]||filename;
  return [{file:name,kind:/жалба/iu.test(label)?'Жалба срещу':/възражение/iu.test(label)?'Възражение срещу':'Искане за преразглеждане на'}];
 });
 const preferred=confirmedFile?matches.find(match=>fileKey(match.file)===fileKey(confirmedFile)):null;
 return preferred||(matches.length===1?matches[0]:null);
}
function propose(intake){
 const options=candidates(intake);
 // Prefer the actual title/subject read from a notification; never synthesize missing engineering details.
 const score=x=>(x.sourceReadStatus==='TEXT_EXTRACTED'?30:x.sourceReadStatus==='REVIEW_REQUIRED'?15:-30)
  +(/уведомлен|notification|uvedomlen/i.test(x.source)?10:0)
    +(x.kind==='subject_heading'?4:x.kind==='dossier_fact'?3:0)
    +(x.text.length>=30&&x.text.length<=250?2:0);
 const ordered=[...options].sort((a,b)=>score(b)-score(a));
 const lead=reviewRequestSource(intake);
 if(lead){
  const context=ordered.find(option=>option.source!==lead.file&&option.sourceReadStatus==='TEXT_EXTRACTED')?.text;
  ordered.unshift({text:lead.kind+' писмо'+(context?' относно ИП „'+context+'“':''),source:lead.file,
   kind:'procedural_request',sourceReadStatus:'TEXT_EXTRACTED',requiresExpertReview:true});
 }
 const best=ordered[0]||null;
 return Object.freeze({schema:'KT80-IP-SUBJECT-V32',status:best?'EXTRACTED_CANDIDATE_REQUIRES_EXPERT':'NO_RELIABLE_SOURCE',text:best?.text||'',source:best?.source||null,
  candidates:ordered.slice(0,12),sourceType:best?.kind||null,sourceReadStatus:best?.sourceReadStatus||'NOT_READ',expertConfirmed:false,
  warning:best?.sourceReadStatus==='NOT_READ'
   ?'Не е удостоверен извлечен текст от посочения източник. Проверете оригиналния документ или редактирайте ръчно.'
   :best?.sourceReadStatus==='REVIEW_REQUIRED'
   ?'Текстът е извлечен, но документът изисква проверка в оригинала. Няма автоматично удостоверяване на предмета.'
   :'Извлечен текст — фактическата вярност и предметът изискват експертна проверка.'});
}
function showSourceNotice(proposal){
 const statusLine=$('kt80SubjectProposalStatus');
 if(!statusLine)return;
 let notice=$('kt80SubjectLeadingNotice');
 if(!notice){
  notice=document.createElement('p');notice.id='kt80SubjectLeadingNotice';
  notice.setAttribute('role','status');
  notice.style.cssText='padding:.7em .9em;margin:.6em 0;border:1px solid #d7a74d;border-left:5px solid #d7a74d;border-radius:6px;background:#49371e;color:#fff1ca;font-weight:700';
  statusLine.before(notice);
 }
 notice.hidden=!proposal?.source||proposal.sourceReadStatus==='NOT_READ';
 notice.textContent=notice.hidden?'':'За експертно внимание · Водещ документ за предложения предмет: '+proposal.source+' · Проверете дали документът е поводът за текущата преписка.';
}
function status(t){const el=$('kt80SubjectProposalStatus');if(el)el.textContent=t}
function show(proposal,{apply=false}={}){
 draft=proposal;
 showSourceNotice(proposal);
 const box=$('kt80SubjectProposalSources');if(box){
  box.replaceChildren();
  const lead=document.createElement('p');
  lead.textContent=proposal.candidates.length?'Предложения от източника ('+proposal.candidates.length+'). Изберете конкретен откъс или редактирайте текста.':'НЯМА ДАННИ за надежден извлечен предмет. Въведете предмет ръчно според документите.';
  box.append(lead);
  for(const c of proposal.candidates.slice(0,5)){
   const b=document.createElement('button');b.type='button';b.className='kt80-subject-source-choice';
   b.textContent=c.text+' · Източник: '+c.source+
    (c.sourceReadStatus==='TEXT_EXTRACTED'?' · извлечен текст':c.sourceReadStatus==='REVIEW_REQUIRED'?' · ЗА ПРОВЕРКА':' · НЯМА УДОСТОВЕРЕН ПРОЧИТ');
   b.addEventListener('click',()=>{const input=$('kt80SubjectText');if(!input)return;input.value=c.text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();status('Избран откъс от '+c.source+'. Текстът изисква експертно потвърждение.')});
   box.append(b);
  }
 }
 if(apply&&proposal.text&&proposal.sourceReadStatus!=='NOT_READ'&&!$('kt80SubjectText')?.value.trim()){
  $('kt80SubjectText').value=proposal.text;
  $('kt80SubjectText').dispatchEvent(new Event('input',{bubbles:true}));
 }
 status(proposal.text?'Кандидат за предмет · източник: '+proposal.source+' · '+
  (proposal.sourceReadStatus==='TEXT_EXTRACTED'?'ИЗВЛЕЧЕН ТЕКСТ, БЕЗ ЕКСПЕРТНО ПОТВЪРЖДЕНИЕ':
   proposal.sourceReadStatus==='REVIEW_REQUIRED'?'ЗА ПРОВЕРКА В ОРИГИНАЛА':
   'НЕ Е УДОСТОВЕРЕН ПРОЧИТ')+'. '+proposal.warning:
  'Няма доказан кандидат от преписката. Въведете предмет ръчно въз основа на проверени документи.');
}
function constructed(){
 // A repeated deterministic reconstruction must not silently overwrite expert text.
 const prior=clean($('kt80SubjectText')?.value);
 const scopePrior=clean($('kt80ScopeText')?.value);
 const confirmed=Boolean($('kt80SubjectConfirmation')?.checked||$('kt80ScopeConfirmation')?.checked||root.KT80WorkflowState?.subjectConfirmed);
 if(prior||scopePrior||confirmed){
  const answer=root.confirm('Реконструкцията ще изготви повторно предмет и обхват от преписката. Съществуващите редакции и отметки за потвърждение ще бъдат заменени. Продължавате ли?');
  if(!answer){status('Реконструкцията е отменена. Предметът и обхватът са запазени.');return null;}
 }
 // KT53 is the sole evidence-aware construction route; V32 remains a source-picker.
 if(root.KT80KT53?.construct)return root.KT80KT53.construct({force:true});
 const workflow=root.KT80WorkflowState;
 const proposal=propose(workflow?.intake);
 show(proposal,{apply:false});
 if(proposal.text){
  const input=$('kt80SubjectText');
  // Explicit request by expert: replace only unconfirmed subject.
  if(!workflow?.subjectConfirmed){input.value=proposal.text;input.dispatchEvent(new Event('input',{bubbles:true}));}
  status('Алгоритмичен кандидат · '+proposal.source+' · необходима експертна проверка. Не са добавяни непосочени факти.');
 }
 return proposal;
}
function correction(){
 const input=$('kt80SubjectText');
 if(!input)return;
 input.readOnly=false;input.focus();input.select();
 status('Ръчна редакция на предмета — експертът може да промени текста, след което да го потвърди.');
}
function confirmedSubject(){
 const t=clean($('kt80SubjectText')?.value);
 accepted=t?{text:t,source:draft?.source||null,expertConfirmed:true,mode:draft&&t===draft.text?'SOURCE_CANDIDATE_CONFIRMED':'EXPERT_EDITED'}:null;
 return accepted;
}
function reset(){showSourceNotice(null);draft=null;accepted=null;const e=$('kt80SubjectProposalSources');if(e)e.replaceChildren();status('Въведете предмет или обработете преписката; предложенията изискват експертна проверка.')}
function init(){
 $('kt80ConstructSubject')?.addEventListener('click',constructed);
 $('kt80EditSubject')?.addEventListener('click',correction);
 document.addEventListener('kt80:case-reset',reset);
 root.KT80SubjectMaster=Object.freeze({propose,show,reviewRequestSource,construct:constructed,confirmedSubject,reset,getDraft:()=>draft,getAccepted:()=>accepted});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
