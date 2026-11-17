/* KT51 restoration. Delegate ALL substantive content to the approved KT35/KT39 and V27 R02 authoring adapters.
 * This bridge may touch only administrative metadata; it never reconstructs DOCX paragraphs.
 * See backup/kt51-20261104-pre-restore for the discarded fixed-paragraph bridge.
 */
(function(root){'use strict';
const classic=root.V26TemplateWord,expert=root.V26ExpertWord;
if(classic?.layout!=='KT35_A_KT39_B_APPROVED'||expert?.layout!=='V27_EXPERT_R02_APPROVED')
 throw Error('КТ51: липсва одобреният авторски генератор (А/Б + V27 R02).');
const X10='Х'.repeat(10),X15='Х'.repeat(15),REF='Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';
const val=x=>String(x??'').trim();
const unknown=x=>!val(x)||/^\[(?:ЗА ПОПЪЛВАНЕ|ЗА ЕКСПЕРТНА ПРОВЕРКА)/i.test(val(x))||/^НЯМА ДАННИ$/i.test(val(x));
function field(input,label,count){
 const text=val(input).replace(label==='Възложител'?/^(?:Възложител(?:я)?|ДО)\s*:?\s*/i:/^(?:Адрес(?:\s+за\s+кореспонденция)?|За\s+кореспонденция)\s*:?\s*/i,'').trim();
 const generic=/^(?:ВЪЗЛОЖИТЕЛЯ?\s+НА\s+ИНВЕСТИЦИОННОТО\s+ПРЕДЛОЖЕНИЕ|НЕИЗВЕСТЕН\s+ВЪЗЛОЖИТЕЛ)$/i.test(text);
 return label+': '+(unknown(text)||generic?'Х'.repeat(count):text);
}
function title(input){
 let s=val(input).replace(/^Относно:\s*/i,'');
 s=s.replace(/^(?:(?:Уведомление\s+за\s+)?инвестиционно\s+предложение(?:\s*\(ИП\))?\s*[:–—-]?\s*)+/i,'');
 s=s.replace(/\s*[,;—–-]?\s*(?:в\s+)?(?:ПИ|поземлен(?:и)?\s+имот(?:и)?)\s+(?:с\s+)?(?:идентификатор(?:и)?|ИД)\s*[:№]?\s*\d{5}\.\d+\.\d+[\s\S]*$/i,'');
 return (s.replace(/^[„“"'«»\s]+|[„“"'«»\s]+$/g,'').replace(/\s+/g,' ').trim()||val(input));
}
function normalized(m){
 const r={...(m||{})};
 r.recipient=field(r.recipient,'Възложител',10);
 r.address=field(r.address,'Адрес',15);
 const ref=val(r.incomingReference);
 r.incomingReference=unknown(ref)||/ОВОС-9999\s*\/\s*ДАТА-99/i.test(ref)?REF:ref;
 r.subject=title(r.subject);
 return r;
}
function protectClassic(paragraphs){
 if(!Array.isArray(paragraphs)||paragraphs.length!==4)throw Error('КТ51: липсват четирите абзаца от характеристиката.');
 // Do not generate a formally complete but content-free letter.
 if(paragraphs.some(p=>unknown(p)||/^ЗА ЕКСПЕРТНА ПРОВЕРКА\b/i.test(val(p))))
  throw Error('КТ51: характеристиката на ИП е непълна. AI авторът/експертът трябва да потвърди четирите съдържателни абзаца; одобреният Word не се заменя с шаблонни предупреждения.');
}
async function makeClassic(scenario,paragraphs,metadata,context){
 protectClassic(paragraphs);
 return classic.make(scenario,paragraphs,normalized(metadata),context);
}
const TECH_MARKER=/\[\[(?:CONCLUSION|CHARACTERIZATION|PROCEDURE|LEGAL|IMPACTS)\]\]/g;
async function stripTechnicalMarkers(blob){
 // Only remove internal AI section delimiters. Keep ALL surrounding
 // legal, factual and expert-authored wording in the approved V27 R02.
 const zip=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const raw=zip['word/document.xml'];
 if(!raw)throw Error('КТ51: липсва Word XML на експертния проект.');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ51: невалиден XML на експертния проект.');
 const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 let count=0;
 for(const t of Array.from(xml.getElementsByTagNameNS(W,'t'))){
  const before=t.textContent||'';
  const after=before.replace(TECH_MARKER,'').replace(/ {2,}/g,' ');
  if(after!==before){t.textContent=after;count++;}
 }
 const allText=Array.from(xml.getElementsByTagNameNS(W,'t')).map(t=>t.textContent||'').join('');
 if(TECH_MARKER.test(allText))throw Error('КТ51: технически AI разделител е разделен между Word елементи и изисква отделна корекция.');
 if(!count)return blob;
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
async function makeExpert(draft,options){
 if(!draft?.metadata)throw Error('КТ51: липсва административният контекст за експертния Word.');
 const meta=normalized(draft.metadata);
 const approved=await expert.make({...draft,metadata:meta},options);
 return stripTechnicalMarkers(approved);
}
root.V26TemplateWord=Object.freeze({make:makeClassic,templatePaths:classic.templatePaths,layout:'KT51_APPROVED_CLASSIC_RESTORED'});
root.V26ExpertWord=Object.freeze({make:makeExpert,layout:'KT51_APPROVED_EXPERT_R02_RESTORED'});
root.KT51Admin=Object.freeze({normalized,version:'KT51_CONTENT_RESTORE'});
})(typeof window!=='undefined'?window:globalThis);
