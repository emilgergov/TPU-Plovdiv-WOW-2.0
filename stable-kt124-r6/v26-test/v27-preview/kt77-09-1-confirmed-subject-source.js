/* KT77-09.1 — source-grounded correction of Classic Word subject only.
 * A locked template must not receive AI review markers in its subject.
 * Prefer an explicitly expert-confirmed subject, NEVER the hidden sample title.
 * Fail closed without an authentic confirmed subject. No document/ZIP editing.
 */
(function(root){'use strict';
const marker=/\[\[(?:CHARACTERIZATION|LEGAL|IMPACTS|PROCEDURE|CONCLUSION)\]\]|\[\s*ЗА\s+ЕКСПЕРТНА\s+ПРОВЕРКА|\[\s*ЗА\s+ПОПЪЛВАНЕ|\[\s*ОТКЪС\s+ОТ\s+ПРЕПИСКАТА/iu;
const tidy=x=>String(x||'').replace(/\s+/g,' ').trim();
const idsOf=x=>tidy(x).match(/\b\d{5}\.\d+\.\d+\b/g)||[];
function correct(draft,{confirmedSubject=null,parcelIds=[]}={}){
 if(!draft?.metadata||!Array.isArray(parcelIds)||!parcelIds.length)throw Error('КТ77-09.1: липсва реалният имотен контекст на преписката');
 const before=tidy(draft.metadata.subject);
 if(before&&!marker.test(before))return {draft,applied:false,reason:'Потвърденият предмет е без маркери'};
 const value=confirmedSubject?.confirmed===true?tidy(confirmedSubject.title):'';
 if(!value||marker.test(value)||/^няма данни|^неопределен/iu.test(value))
  throw Error('КТ77-09.1: в заглавието има AI маркер и липсва потвърден автентичен предмет. Отворете „Корекция на предмета“, проверете и потвърдете реалния предмет; Word не е променян.');
 const foreign=idsOf(value).filter(id=>!parcelIds.map(String).includes(id));
 if(foreign.length)throw Error('КТ77-09.1: потвърденият предмет съдържа чужд имот '+foreign.join(', '));
 const normalized=root.KT6722CaseNormalize?.title?.(value)||value;
 if(!normalized||marker.test(normalized))
  throw Error('КТ77-09.1: предметът остава невалиден след нормализация');
 const copy={...draft,metadata:{...draft.metadata,subject:normalized}};
 return {draft:copy,applied:true,source:'expert-confirmed-subject',reason:'Премахнат е маркер в предмета, използван е потвърденият текст'};
}
root.KT77091SubjectSource=Object.freeze({correct,marker});
})(typeof window!=='undefined'?window:globalThis);
