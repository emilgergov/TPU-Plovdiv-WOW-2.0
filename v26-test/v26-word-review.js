/* V26.4 expert review: no unverified text enters the Word template. */
(()=>{'use strict';
const labels=['Строителство и дейности','Електроснабдяване','Водоснабдяване','Отпадъчни води'];
let fields=[],confirmed=null,caseFields={},legalFields=[],impactFields=[],procedureField=null;
function mount(){
 const button=document.getElementById('proposal');if(!button||document.getElementById('v26WordReview'))return;
 const box=document.createElement('details');box.id='v26WordReview';box.style.cssText='margin:12px 0;padding:12px;border:1px solid #82998a;border-radius:8px';
 const summary=document.createElement('summary');summary.textContent='Проверка на съдържанието и данните за Word предложението';box.append(summary);
 const hint=document.createElement('p');hint.textContent='Попълнете само доказани обстоятелства от преписката. Прегледът е задължителен преди Word. Празни или непотвърдени абзаци блокират генерирането.';box.append(hint);
 fields=labels.map(label=>{const wrap=document.createElement('div');wrap.style.margin='8px 0';const title=document.createElement('label');title.textContent=label;title.style.display='block';const area=document.createElement('textarea');area.rows=3;area.style.cssText='display:block;width:100%;box-sizing:border-box';area.addEventListener('input',()=>{confirmed.checked=false});wrap.append(title,area);box.append(wrap);return area});
 const caseTitle=document.createElement('h4');caseTitle.textContent='Променливи данни за Word — потвърждение';box.append(caseTitle);
 for(const [key,label] of [['recipient','Адресат'],['address','Адрес'],['subject','Предмет на ИП'],['incomingReference','Входящ номер и дата'],['salutation','Обръщение'],['parcelIds','Кадастрални идентификатори на имотите']]){
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
 const note='ЗА ЕКСПЕРТНА ПРОВЕРКА — липсва проверено описание в преписката.';
 const paragraphs=topics.map((key,i)=>{
  const section=sections.find(s=>s.key===key);
  const verified=(section?.sources||[]).filter(s=>s.status==='verified'&&s.excerpt);
  return verified.length?verified.map(s=>String(s.excerpt)+' (Източник: '+s.file+')').join(' '):note;
 });
 const ids=(document.getElementById('ids')?.value||'').match(/\\b\\d{5}\\.\\d+\\.\\d+(?:\\.\\d+){0,2}\\b/g)||[];
 const subject=window.V26SubjectContext;
 return {paragraphs,ids:[...new Set(ids)].join(', '),subject:subject?.confirmed?(subject.wordHeading||subject.title):null};
}
function getConfirmedParagraphs(){
 const fallback='ЗА ЕКСПЕРТНА ПРОВЕРКА — липсва достатъчно потвърдена информация от преписката.';
 const auto=autoEvidence();return fields.map((f,i)=>f.value.trim()||auto.paragraphs[i]||fallback);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
function getConfirmedMetadata(){
 // Working proposal: unresolved fields remain explicit review notes in DOCX.
 if(Object.keys(caseFields).length!==6)throw Error('Формулярът за административни данни не е зареден.');
 const result=Object.fromEntries(Object.entries(caseFields).map(([k,v])=>[k,v.value.trim()]));
 result.legalParagraphs=legalFields.map(f=>f.value.trim());
 result.procedureFinding=procedureField?.value.trim()||'';
 result.impactFindings=impactFields.map(f=>f.value.trim());
 const note='ЗА ЕКСПЕРТНА ПРОВЕРКА — не е установено от преписката.';
 result.legalParagraphs=result.legalParagraphs.map(v=>v||note);
 result.impactFindings=result.impactFindings.map(v=>v||note);
 result.procedureFinding=result.procedureFinding||note;
 for(const k of ['recipient','address','subject','incomingReference','salutation'])result[k]=result[k]||note;
 const auto=autoEvidence();
 if(!result.subject&&auto.subject)result.subject=auto.subject.replace(/^Относно:\s*/i,'').trim();
 if(!result.parcelIds)result.parcelIds=auto.ids;
 return result;
}
document.addEventListener('v26:dossier-loaded',event=>{
 if(confirmed)confirmed.checked=false;
 for(const f of fields)f.value='';
 for(const f of Object.values(caseFields))f.value='';for(const f of legalFields)f.value='';for(const f of impactFields)f.value='';if(procedureField)procedureField.value='';
 const draft=event.detail?.context?.characterization;
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
window.V26WordReview=Object.freeze({getConfirmedParagraphs,getConfirmedMetadata});
})();
