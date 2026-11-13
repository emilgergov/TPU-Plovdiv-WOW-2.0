/* KT82 V34 / CH1: evidence-focused intake completeness inventory.
   Read-only companion to V26LocalIntake, never upgrades extracted snippets to verified facts. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const ext=name=>{const m=String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:'unknown'};
function audit(intake){
 const docs=Array.isArray(intake?.files)?intake.files:[];
 const records=docs.map((d,i)=>{
  const status=String(d.status||'').trim();
  const readable=/текстът е прочетен|OCR:\s*\d+/i.test(status);
  const concern=/OCR:|експертна проверка|ПРОВЕРКА:|неуспешно|няма извлекаем|отложен|частич|неподдържан|неизвлечен/i.test(status);
  const type=ext(d.filename);
  const supported=['txt','csv','json','md','pdf','docx','jpg','jpeg','png','webp','bmp','tif','tiff'].includes(type);
  const state=!supported?'UNSUPPORTED':!readable?'NOT_READ':concern?'REVIEW_REQUIRED':'TEXT_EXTRACTED';
  const extracted=readable;
  const isLegacyDoc=type==='doc';
  return {index:i+1,file:String(d.filename||'НЕУСТАНОВЕН ФАЙЛ'),fileType:type,readerStatus:status||'НЯМА ДАННИ',state,extracted,
   note:state==='TEXT_EXTRACTED'?'Текстът е извлечен; точността на фактите не е потвърдена':
    state==='REVIEW_REQUIRED'?'Проверете текста, OCR и страниците в оригинала':
    state==='NOT_READ'?'Изисква се повторен прочит/ръчна проверка':isLegacyDoc?'Старият Word .doc не се обработва: нужен е DOCX или оригинален PDF':'Форматът не е обработен от четеца'};
 });
 const expected=Number.isInteger(intake?.archive_entries)?intake.archive_entries:docs.length;
 const shortfall=Math.max(0,expected-docs.length);
 const issues=records.filter(d=>d.state!=='TEXT_EXTRACTED');
 const critical=shortfall>0||issues.some(d=>d.state==='NOT_READ'||d.state==='UNSUPPORTED');
 const cautions=issues.length+shortfall;
 const leadingCount=Array.isArray(intake?.classification?.leading_candidates)?intake.classification.leading_candidates.length:0;
 const hasParcelEvidence=leadingCount>0;
 const candidateCount=Array.isArray(intake?.subject_candidates)?intake.subject_candidates.length:0;
 return Object.freeze({schema:'KT82-DOSSIER-COMPLETENESS-V34',filesExpected:expected,filesEnumerated:docs.length,filesExtracted:records.filter(r=>r.extracted).length,filesVerifiedWithoutReview:records.filter(r=>r.state==='TEXT_EXTRACTED').length,leadingParcelCandidates:leadingCount,
  filesNeedReview:issues.length,missingInventory:shortfall,candidateCount,records,issues,
  status:critical?'INCOMPLETE':cautions?'REVIEW_REQUIRED':'EXTRACTION_REPORTED',
  claim:'Извличането на текст не удостоверява пълен прочит на таблици, графики, подписи, приложения или фактическа вярност.',
  requiresExpertReview:true,
  fullPageTraceAvailable:false,
  interpretation:'Отчетът измерва отчетените резултати на наличния V26 четец, не прецизност на OCR по страници.'});
}
function render(a){
 const host=$('kt80DossierAudit');if(!host)return;
 host.replaceChildren();
 const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
 host.append(node('h3','Ч1 · Контрол на пълнотата на прочита'));
 const totals={read:a.records.filter(r=>r.state==='TEXT_EXTRACTED').length,review:a.records.filter(r=>r.state==='REVIEW_REQUIRED').length,unread:a.records.filter(r=>r.state==='NOT_READ'||r.state==='UNSUPPORTED').length};
 const summary=node('p','Общо: '+a.filesEnumerated+'/'+a.filesExpected+' · 🟢 ПРОЧЕТЕН: '+totals.read+' · 🟡 ЗА ПРОВЕРКА: '+totals.review+' · 🔴 НЕПРОЧЕТЕН: '+totals.unread);
 summary.className='kt80-file-status-summary';host.append(summary);
 if(a.leadingParcelCandidates===0)host.append(node('p','В преписката не са извлечени поземлени имоти. Това не е непълнота на прочита. Необходимостта от пространствени данни се определя след потвърждаване на предмета и обхвата в етап №2.'));
 host.append(node('p',a.status==='INCOMPLETE'?'ВНИМАНИЕ: има непрочетени или неподдържани материали — предметът и процедурата не бива да се приемат за напълно доказани.':
 a.status==='REVIEW_REQUIRED'?'Налични са текстови откъси с предупреждения. Проверете оригиналните файлове.':'Текстовият прочит е отчетен; необходима е съдържателна експертна проверка.'));
 const details=document.createElement('details');details.open=a.filesNeedReview>0||a.missingInventory>0;
 details.append(node('summary','Документен инвентар и рискове ('+a.records.length+' файла)'));
 for(const r of a.records){
  const row=document.createElement('div');row.className='kt80-file-status-row';
  const marker=document.createElement('span');
  const isRead=r.state==='TEXT_EXTRACTED',isReview=r.state==='REVIEW_REQUIRED';
  marker.className='kt80-file-status '+(isRead?'kt80-file-read':isReview?'kt80-file-check':'kt80-file-unread');
  marker.textContent=isRead?'🟢 ПРОЧЕТЕН':isReview?'🟡 ЗА ПРОВЕРКА':'🔴 НЕПРОЧЕТЕН';
  marker.setAttribute('aria-label',marker.textContent);
  const body=document.createElement('span');body.className='kt80-file-name';
  body.textContent='№'+r.index+' · '+r.file;
  const info=document.createElement('small');info.className='kt80-file-reason';
  info.textContent=r.note+' · '+r.readerStatus;
  const open=document.createElement('button');
  open.type='button';open.className='kt80-original-open';open.textContent='◉ Отвори';
  open.title='Бърз преглед на оригиналния документ от текущата преписка';
  open.addEventListener('click',()=>{const viewer=root.KT80DossierOriginals;
   if(viewer?.openOriginal)viewer.openOriginal(r.file).catch(err=>{console.error(err)});
   else alert('Прегледът на оригинали не е зареден.');});
  row.append(marker,body,open,info);details.append(row);
 }
 if(a.missingInventory)details.append(node('p','Липсващи записи в отчетения инвентар: '+a.missingInventory));
 host.append(details);host.append(node('small',a.claim));
}
function reset(){const el=$('kt80DossierAudit');if(el){el.replaceChildren();el.textContent='Документният инвентар ще се появи след обработка на преписката.'}}
root.KT80DossierCompleteness=Object.freeze({audit,render,reset});
document.addEventListener('kt80:case-reset',reset);
})(window);
