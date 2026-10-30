/* V26.4 expert review: no unverified text enters the Word template. */
(()=>{'use strict';
const labels=['Строителство и дейности','Електроснабдяване','Водоснабдяване','Отпадъчни води'];
const templateStarts={A:['С реализацията','Електроснабдяването','Водоснабдяването','Отпадъчните води'],B:['С реализацията','Електроснабдяването','Водозахранването','Отпадъчните води']};
let fields=[],confirmed=null,caseFields={},legalFields=[],impactFields=[],procedureField=null;
function mount(){
 const button=document.getElementById('proposal');if(!button||document.getElementById('v26WordReview'))return;
 const box=document.createElement('details');box.id='v26WordReview';box.style.cssText='margin:12px 0;padding:12px;border:1px solid #82998a;border-radius:8px';
 const summary=document.createElement('summary');summary.textContent='Проверка на съдържанието и данните за Word предложението';box.append(summary);
 const hint=document.createElement('p');hint.textContent='Попълнете само доказани обстоятелства от преписката. Прегледът е задължителен преди Word. Празни или непотвърдени абзаци блокират генерирането.';box.append(hint);
 fields=labels.map((label,i)=>{const wrap=document.createElement('div');wrap.style.margin='8px 0';const title=document.createElement('label');title.textContent=label;title.style.display='block';const area=document.createElement('textarea');area.rows=3;area.placeholder='Образец А: '+templateStarts.A[i]+'… | Образец Б: '+templateStarts.B[i]+'…';area.style.cssText='display:block;width:100%;box-sizing:border-box';area.addEventListener('input',()=>{confirmed.checked=false});wrap.append(title,area);box.append(wrap);return area});
 const caseTitle=document.createElement('h4');caseTitle.textContent='Променливи данни за Word — потвърждение';box.append(caseTitle);
 for(const [key,label] of [['recipient','Адресат'],['address','Адрес'],['subject','Предмет на ИП'],['incomingReference','Входящ номер и дата'],['salutation','Обръщение'],['parcelIds','Кадастрални идентификатори на имотите'],['location','Местоположение (населено място, община, област; само потвърдени данни)']]){
  const wrap=document.createElement('div');wrap.style.margin='6px 0';const caption=document.createElement('label');caption.textContent=label;caption.style.display='block';const input=document.createElement('input');input.type='text';input.style.cssText='width:100%;box-sizing:border-box';input.addEventListener('input',()=>{confirmed.checked=false});caseFields[key]=input;wrap.append(caption,input);box.append(wrap);
 }
 const evidenceHeading=document.createElement('p');evidenceHeading.textContent='Откъсите от преписката са помощен материал. Отваряйте ги само когато е необходимо да сверите източника.';box.insertBefore(evidenceHeading,caseTitle);
 const legalTitle=document.createElement('h4');legalTitle.textContent='Фактически и правни констатации — задължителна експертна проверка';box.append(legalTitle);
 const legalHint=document.createElement('p');legalHint.textContent='Попълнете само проверени констатации. Не пренасяйте автоматично примерни изводи за допустимост, въздействие или защитени територии. За сценарий А се използват първите 5 полета; за сценарий Б — всичките 7.';box.append(legalHint);
 const legalLabels=['Местоположение и защитени територии / предназначение','Защитени зони и най-близки зони','Допустимост и режими / ЗООС','Проверка по ЗЗТ / вероятност за въздействие','Преценка на въздействието','Заключение / преценка','Допълнителна констатация за сценарий Б'];
 legalFields=legalLabels.map((label,i)=>{const wrap=document.createElement('div');const title=document.createElement('label');title.textContent=label;title.style.display='block';const area=document.createElement('textarea');area.rows=3;area.style.cssText='width:100%;box-sizing:border-box;margin-bottom:8px';area.addEventListener('input',()=>{confirmed.checked=false});wrap.append(title,area);box.append(wrap);return area});
 const procLabel=document.createElement('label');procLabel.textContent='Проверена приложима процедура по Наредбата за ОС';procLabel.style.display='block';procedureField=document.createElement('textarea');procedureField.rows=3;procedureField.style.cssText='width:100%;box-sizing:border-box';procedureField.addEventListener('input',()=>{confirmed.checked=false});box.append(procLabel,procedureField);
 const impactTitle=document.createElement('h4');impactTitle.textContent='Пет констатации за въздействията — поотделно';box.append(impactTitle);
 impactFields=['Местообитания','Видове','Цялост и цели','Кохерентност','Кумулативни въздействия'].map(label=>{const wrap=document.createElement('div');const caption=document.createElement('label');caption.textContent=label;caption.style.display='block';const area=document.createElement('textarea');area.rows=2;area.style.cssText='width:100%;box-sizing:border-box';area.addEventListener('input',()=>{confirmed.checked=false});wrap.append(caption,area);box.append(wrap);return area});
 const check=document.createElement('label');confirmed=document.createElement('input');confirmed.type='checkbox';check.append(confirmed,document.createTextNode(' Потвърждавам проверката на описанията, административните данни и правните констатации по преписката.'));box.append(check);
 box.hidden=true;button.parentNode.insertBefore(box,button);
}
function autoEvidence(){
 const ctx=window.V26WorkingContext||{};
 const sections=ctx.characterization?.sections||[];
 const topics=['construction','electricity','water_supply','wastewater'];
 const note='Няма данни в преписката.';
 const paragraphs=topics.map((key,i)=>{
  const section=sections.find(s=>s.key===key);
  const verified=(section?.sources||[]).filter(s=>['verified','corroborated'].includes(s.status)&&s.excerpt);
  if(verified.length)return verified.slice(0,3).map(s=>String(s.excerpt).trim()).join(' '); // Evidence only; never directly insert into Word.
  // Raw dossier excerpts remain explicitly subject to expert review.
  const review=(section?.sources||[]).filter(s=>s.status==='source_excerpt_not_verified'&&String(s.excerpt||'').trim());
  if(review.length)return review.slice(0,3).map(s=>String(s.excerpt).trim()+' (Източник: '+s.file+')').join(' ');
  return note;
 });
 const ids=(document.getElementById('ids')?.value||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[];
 const subject=window.V26SubjectContext;
 return {paragraphs,ids:[...new Set(ids.map(id=>id.split('.').slice(0,3).join('.')))].join(', '),subject:subject?.confirmed?(subject.wordHeading||subject.title):null};
}
function formatVerifiedParagraph(raw,i,scenario){
 const value=String(raw||'').trim();if(!value)return '';
 const prefix=(templateStarts[scenario==='B'?'B':'A']||templateStarts.A)[i];
 if(value.startsWith(prefix))return value;
 // Only confirmed dossier excerpts may be adapted to the institutional template.
 throw Error('Текстът за „'+labels[i]+'“ не започва с изискваното начало „'+prefix+'“. Редактирайте цялото изречение според образец '+scenario+'; автоматично слепване на откъс от преписката е забранено.');
}
function refreshVerifiedFields(){
 const auto=autoEvidence();
 // Source excerpts remain review-only; no silent auto-fill of Word paragraphs.
 if(caseFields.subject&&!caseFields.subject.value.trim()&&auto.subject)caseFields.subject.value=auto.subject.replace(/^Относно:\s*/i,'').trim();
 if(caseFields.parcelIds&&!caseFields.parcelIds.value.trim()&&auto.ids)caseFields.parcelIds.value=auto.ids;
}
function getConfirmedParagraphs(scenario='A'){
 refreshVerifiedFields();
 // No invented or generic fallback may enter an administrative document.
 // The four paragraphs must be individually reviewed and confirmed.
 const values=fields.map((f,i)=>{const typed=f.value.trim();return typed?formatVerifiedParagraph(typed,i,scenario):'';});
 const missing=values.map((v,i)=>v?null:labels[i]).filter(Boolean);
 if(missing.length){
  const panel=document.getElementById('v26WordReview');if(panel){panel.hidden=false;panel.open=true;panel.scrollIntoView?.({block:'nearest'});}
  throw Error('За Word липсват проверени описания: '+missing.join(', ')+'. Отворен е разделът за експертна проверка.');
 }
 return values;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
function validateCaseMetadata(result){
 const required=[['recipient','Адресат'],['address','Адрес'],['subject','Предмет на ИП'],['incomingReference','Входящ номер и дата'],['salutation','Обръщение'],['parcelIds','Имотни идентификатори']];
 const missing=required.filter(([key])=>!String(result[key]||'').trim()).map(([,label])=>label);
 if(missing.length)throw Error('За Word липсват потвърдени административни данни: '+missing.join(', ')+'.');
 const ids=String(result.parcelIds).match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[];
 if(!ids.length)throw Error('Не са въведени валидни кадастрални идентификатори.');
 const originalIdentifiers=[...new Set(ids)];
 const unique=[...new Set(originalIdentifiers.map(id=>id.split('.').slice(0,3).join('.')))];
 const unexpected=String(result.parcelIds).replace(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g,'').replace(/[\s,;]+/g,'');
 if(unexpected)throw Error('Полето за имоти съдържа неразпознат текст; коригирайте го преди Word.');
 result.originalCadastralIdentifiers=originalIdentifiers.join(', '); // Preserve source-level building/unit identifiers for traceability; GIS uses parcel IDs.
 result.parcelIds=unique.join(', ');
 return result;
}
function getConfirmedMetadata({allowIncomplete=false}={}){
 refreshVerifiedFields();
 // Working proposal: unresolved fields remain explicit review notes in DOCX.
 if(Object.keys(caseFields).length!==7)throw Error('Формулярът за административни данни не е зареден.');
 const result=Object.fromEntries(Object.entries(caseFields).map(([k,v])=>[k,v.value.trim()]));
 result.legalParagraphs=legalFields.map(f=>f.value.trim());
 result.procedureFinding=procedureField?.value.trim()||'';
 result.impactFindings=impactFields.map(f=>f.value.trim());
 // Missing evidence must not be converted into repeated administrative prose.
 // Keep the fields empty so the original-template preflight can stop generation
 // and identify what needs expert confirmation.
 result.legalParagraphs=result.legalParagraphs.map(v=>v.trim());
 result.impactFindings=result.impactFindings.map(v=>v.trim());
 const auto=autoEvidence();
 if(!caseFields.subject.value.trim()&&auto.subject)result.subject=auto.subject.replace(/^Относно:\s*/i,'').trim();
 if(!result.parcelIds)result.parcelIds=auto.ids;
 // Registration data are taken only from explicit incoming-reference matches.
 // Ambiguous or multiple numbers are not silently chosen.
 if(!caseFields.incomingReference.value.trim()){
  const ctx=window.V26WorkingContext||{};
  const references=(ctx.documents||[]).flatMap(d=>(d.references||[]).filter(x=>x.number&&x.date).map(x=>({number:String(x.number).trim(),date:String(x.date).trim()})));
  const distinct=[...new Map(references.map(x=>[x.number+'|'+x.date,x])).values()];
  if(distinct.length===1)result.incomingReference='Вх. № '+distinct[0].number+' / '+distinct[0].date;
 }
 return allowIncomplete?result:validateCaseMetadata(result);
}
document.addEventListener('v26:dossier-loaded',event=>{
 if(confirmed)confirmed.checked=false;
 for(const f of fields)f.value='';
 for(const f of Object.values(caseFields))f.value='';for(const f of legalFields)f.value='';for(const f of impactFields)f.value='';if(procedureField)procedureField.value='';
 const draft=event.detail?.context?.characterization;
 const dossierSubject=window.V26SubjectContext;
 // Evidence is displayed in the source review panels below; never copied into administrative prose automatically.
 // A confirmed title is not evidence of construction details; do not fabricate a construction paragraph.
 if(caseFields.subject&&dossierSubject?.confirmed&&String(dossierSubject.wordHeading||dossierSubject.title||'').trim())caseFields.subject.value=String(dossierSubject.wordHeading||dossierSubject.title).replace(/^Относно:\s*/i,'').trim();
 const knownIds=(document.getElementById('ids')?.value||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[];
 if(caseFields.parcelIds&&knownIds.length)caseFields.parcelIds.value=[...new Set(knownIds.map(id=>id.split('.').slice(0,3).join('.')))].join(', ');
 const topics=[['construction','Строителни дейности'],['electricity','Електрозахранване'],['water_supply','Водоснабдяване'],['wastewater','Отпадъчни води']];
 const box=document.getElementById('v26WordReview');if(!box)return;
 box.querySelectorAll('.v26-evidence-suggestion').forEach(el=>el.remove());
 topics.forEach(([key],i)=>{
  const section=draft?.sections?.find(x=>x.key===key);if(!section?.sources?.length||!fields[i])return;
  const wrapper=document.createElement('div');wrapper.className='v26-evidence-suggestion';wrapper.style.cssText='font-size:0.9em;margin:3px 0 10px;padding:7px;border-left:3px solid #819d89';
  const evidenceDetails=document.createElement('details');const title=document.createElement('summary');title.textContent='Покажи източници от преписката ('+Math.min(section.sources.length,3)+')';evidenceDetails.append(title);wrapper.append(evidenceDetails);
  section.sources.slice(0,3).forEach(source=>{const p=document.createElement('p');p.textContent=source.file+' · '+(source.date||'дата неустановена')+': '+String(source.excerpt||'').slice(0,380).replace(/\s+\S*$/,'').trim();evidenceDetails.append(p)});
  fields[i].parentNode.append(wrapper);
 });
});
document.addEventListener('v26:subject-confirmed',()=>{const subject=autoEvidence().subject;if(subject&&caseFields.subject)caseFields.subject.value=String(subject).replace(/^Относно:\s*/i,'').trim();});
document.addEventListener('v26:gis-invalidated',()=>{if(confirmed)confirmed.checked=false; /* Preserve dossier-derived descriptions and the confirmed subject across GIS recalculation. */ });
document.addEventListener('v26:full-reset',()=>{if(confirmed)confirmed.checked=false;for(const f of fields)f.value='';for(const f of Object.values(caseFields))f.value='';for(const f of legalFields)f.value='';for(const f of impactFields)f.value='';if(procedureField)procedureField.value='';document.querySelectorAll('.v26-evidence-suggestion').forEach(el=>el.remove());});
function getWorkingDraft(){
 refreshVerifiedFields();
 const auto=autoEvidence();
 const subject=String(caseFields.subject?.value||auto.subject||'').replace(/^Относно:\s*/i,'').replace(/идентификатор(?:\s*идентификатор)+/gi,'идентификатор').replace(/\s+—\s+ПИ с идентификатор[\s\S]*$/i,'').replace(/\s+—\s+поземлени имоти с идентификатори[\s\S]*$/i,'').trim();
 const paragraphs=fields.map((f,i)=>{
  const value=String(f.value||'').trim();
  if(value&&!/Няма данни в преписката|Източник:/i.test(value))return value; // Preserve unreviewed text verbatim in the working draft; never manufacture template wording.
  const source=(window.V26WorkingContext?.characterization?.sections||[]).find(x=>x.key===['construction','electricity','water_supply','wastewater'][i]);
  const excerpts=(source?.sources||[]).filter(x=>String(x.excerpt||'').trim()).map(x=>String(x.excerpt).replace(/\s*\(Източник:[^)]*\)/g,'').trim()).filter(Boolean);
  const unique=[...new Set(excerpts)];
  if(unique.length)return unique[0]+' (извлечено от преписката; необходима е експертна проверка на съдържанието)';
  return '[ЗА ЕКСПЕРТНА ПРОВЕРКА — липсва потвърдено описание]';
 });
 const metadata=getConfirmedMetadata({allowIncomplete:true});
 metadata.subject=subject||'[ЗА ЕКСПЕРТНА ПРОВЕРКА — предмет на ИП]';
 if(!metadata.recipient)metadata.recipient='ДО ВЪЗЛОЖИТЕЛЯ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ';
 if(!metadata.address)metadata.address='Адрес за кореспонденция: [ЗА ПОПЪЛВАНЕ]';
 if(!metadata.incomingReference)metadata.incomingReference='Вх. № ОВОС-9999 / ДАТА-99.99.9999 г.';
 if(!metadata.salutation)metadata.salutation='УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА,';
 metadata.legalParagraphs=Array.from({length:7},(_,i)=>metadata.legalParagraphs?.[i]||'[ЗА ЕКСПЕРТНА ПРОВЕРКА — правна констатация '+(i+1)+']');
 metadata.procedureFinding=metadata.procedureFinding||'[ЗА ЕКСПЕРТНА ПРОВЕРКА — процедурна преценка]';
 metadata.impactFindings=Array.from({length:5},(_,i)=>metadata.impactFindings?.[i]||'[ЗА ЕКСПЕРТНА ПРОВЕРКА — въздействие '+(i+1)+']');
 return {paragraphs,metadata};
}
window.V26WordReview=Object.freeze({getConfirmedParagraphs,getConfirmedMetadata,getWorkingDraft});
})();
