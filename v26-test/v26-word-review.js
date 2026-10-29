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
  if(verified.length)return verified.map(s=>String(s.excerpt)+' (Източник: '+s.file+')').join(' ');
  // Raw dossier excerpts remain explicitly subject to expert review.
  const review=(section?.sources||[]).filter(s=>s.status==='source_excerpt_not_verified'&&String(s.excerpt||'').trim());
  if(review.length)return review.slice(0,3).map(s=>String(s.excerpt).trim()+' (Източник: '+s.file+')').join(' ');
  return note;
 });
 const ids=(document.getElementById('ids')?.value||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[];
 const subject=window.V26SubjectContext;
 return {paragraphs,ids:[...new Set(ids)].join(', '),subject:subject?.confirmed?(subject.wordHeading||subject.title):null};
}
function getConfirmedParagraphs(){
 // No invented or generic fallback may enter an administrative document.
 // The four paragraphs must be individually reviewed and confirmed.
 const auto=autoEvidence();
 const values=fields.map((f,i)=>f.value.trim()||((auto.paragraphs[i]&&auto.paragraphs[i]!=='Няма данни в преписката.'&&!/Източник:/i.test(auto.paragraphs[i]))?auto.paragraphs[i]:''));
 const missing=values.map((v,i)=>v?null:labels[i]).filter(Boolean);
 if(missing.length){
  const panel=document.getElementById('v26WordReview');if(panel){panel.hidden=false;panel.open=true;panel.scrollIntoView?.({block:'nearest'});}
  throw Error('За Word липсват проверени описания: '+missing.join(', ')+'. Отворен е разделът за експертна проверка.');
 }
 return values;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
function getConfirmedMetadata(){
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
 return result;
}
document.addEventListener('v26:dossier-loaded',event=>{
 if(confirmed)confirmed.checked=false;
 for(const f of fields)f.value='';
 for(const f of Object.values(caseFields))f.value='';for(const f of legalFields)f.value='';for(const f of impactFields)f.value='';if(procedureField)procedureField.value='';
 const draft=event.detail?.context?.characterization;
 const dossierSubject=window.V26SubjectContext;
 const verifiedSections=draft?.sections||[];
 const topicKeys=['construction','electricity','water_supply','wastewater'];
 topicKeys.forEach((key,i)=>{const sources=(verifiedSections.find(section=>section.key===key)?.sources||[]).filter(source=>['verified','corroborated'].includes(source.status)&&String(source.excerpt||'').trim());if(sources.length&&fields[i])fields[i].value=sources.slice(0,3).map(source=>String(source.excerpt).trim()).join(' ');});
 if(!fields[0]?.value.trim()&&dossierSubject?.confirmed){const heading=String(dossierSubject.wordHeading||dossierSubject.title||'').trim();if(heading)fields[0].value='С реализацията на инвестиционното предложение се предвижда: '+heading.replace(/^Относно:\s*/i,'').replace(/[.\s]+$/,'')+'.';}
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
  section.sources.slice(0,3).forEach(source=>{const p=document.createElement('p');p.textContent=source.file+' · '+(source.date||'дата неустановена')+': '+source.excerpt.slice(0,380);evidenceDetails.append(p)});
  fields[i].parentNode.append(wrapper);
 });
});
document.addEventListener('v26:gis-invalidated',()=>{if(confirmed)confirmed.checked=false;for(const f of fields)f.value='';for(const f of Object.values(caseFields))f.value='';});
document.addEventListener('v26:full-reset',()=>{if(confirmed)confirmed.checked=false;for(const f of fields)f.value='';for(const f of Object.values(caseFields))f.value='';for(const f of legalFields)f.value='';for(const f of impactFields)f.value='';if(procedureField)procedureField.value='';document.querySelectorAll('.v26-evidence-suggestion').forEach(el=>el.remove());});
window.V26WordReview=Object.freeze({getConfirmedParagraphs,getConfirmedMetadata});
})();
