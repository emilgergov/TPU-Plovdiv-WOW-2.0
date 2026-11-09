/* KT77-24: authoritative zone/territory names for free AI draft.
 * Uses checksum-verified PI MASTER, not the test dossier's assertions.
 * Never rewrites Word, AI text, hard paragraphs, or legal conclusions.
 * One complete AI re-authoring only if facts/naming remain inconsistent. */
(function(root){'use strict';
const previous=root.V27AIAuthor, source=root.KT77PiMasterIndex;
if(!previous?.generate||!source?.create){console.error('KT77-24: AI/GIS dependencies unavailable');return;}
const master=source.create('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/v26-test/gis-data/pi-master/browser-index/');
const ID='46989.205.218';
function forbidden(draft){
 const s=String(draft||'');
 const errors=[];
 if(/(?:ЗЗ|защитен(?:а|ата)\s+зон(?:а|ата))\s*(?:(?:BG0001031|с\s+код\s+BG0001031)\s*)?[„\"'(\s]*Свети\s+Дух/iu.test(s)||/BG0001031\s*[(„\"']\s*Свети\s+Дух/iu.test(s)||/защитен(?:а|ата)\s+зон(?:а|ата)\s*[„\"']?Свети\s+Дух/iu.test(s))
  errors.push('объркани ЗЗ „Родопи – Средни“ и ЗТ „Свети Дух“');
 if(/(?:ОВОС|оценк(?:а|ата)\s+на\s+въздействието\s+върху\s+околната\s+среда)\s+е\s+(?:извършен[ао]|проведен[ао])/iu.test(s))
  errors.push('непотвърдено твърдение за завършена оценка');
 if(/(?:всяко|всички)\s+инвестиционн(?:о|и)\s+предложени(?:е|я)[^.!?]{0,170}подлеж(?:и|ат)/iu.test(s))
  errors.push('недоказана универсална процедура');
 return errors;
}
async function generate(payload,token){
 const ids=payload?.facts?.parcelIds||[];
 if(!Array.isArray(ids)||ids.length!==1||ids[0]!==ID)return previous.generate(payload,token);
 const rec=await master.lookup(ID);
 if(rec.status!=='FOUND'||!rec.profile)throw Error('КТ77-24: липсва верифициран ПИ MASTER профил за AI фактите');
 const profile=rec.profile;
 const z=profile.zz||[],t=profile.zt||[];
 const exact=z.find(a=>String(a.code||a.sitecode)==='BG0001031');
 if(!exact||!t.some(a=>/Свети\s+Дух/iu.test(String(a.name_bg||a.name||''))))
  throw Error('КТ77-24: очакваната ЗЗ/ЗТ комбинация не е потвърдена от ПИ MASTER');
 const knownZone=String(exact.name||exact.name_bg||'').trim();
 if(!/Родопи\s*[-–]\s*Средни/iu.test(knownZone))
  throw Error('КТ77-24: наименованието BG0001031 не съответства на GIS данните');
 const gist='Проверено пространствено положение за '+ID+': защитена зона от Натура 2000 BG0001031 „'+knownZone+'“ (ЗБР). Отделно, защитена територия по ЗЗТ: природна забележителност „Свети Дух“. ЗЗ и ЗТ са два отделни правни режима; „Свети Дух“ НЕ е име на BG0001031. Пресичането само по себе си не предрешава процедурата.';
 const facts={...payload.facts,
   gisFindings:(String(payload.facts.gisFindings||'').slice(0,2150)+'\n'+gist).slice(0,3000),
   evidenceNotes:(String(payload.facts.evidenceNotes||'').slice(0,850)+'\n'+gist).slice(0,1500)};
 const augmented={...payload,facts};
 let draft=await previous.generate(augmented,token),issues=forbidden(draft);
 if(!issues.length)return draft;
 console.warn('KT77-24: AI project rejected by verified cadastral factual guard:',issues);
 draft=await previous.generate(augmented,token);issues=forbidden(draft);
 if(issues.length)throw Error('КТ77-24: AI текстът противоречи на проверените ГИС наименования/процедурни ограничения: '+issues.join('; ')+'. ZIP не се създава.');
 return draft;
}
root.V27AIAuthor=Object.freeze({...previous,generate});
})(window);
