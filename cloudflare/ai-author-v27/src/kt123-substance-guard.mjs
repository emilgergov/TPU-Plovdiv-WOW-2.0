// KT123: independent content checks for recurrent unsupported legal inference.
// A machine can detect invalid reasoning patterns, but cannot certify applicability.
export function substantiveDraftIssues(value){
 const s=String(value||"").replace(/\*\*/gu,"");
 const issues=[];
 const selfAssessment=[
  /(?:този|настоящият)\s+проект\s+(?:представлява\s+)?(?:изцяло|напълно)\s+(?:мотивиран|проверен|законосъобразен)/iu,
  /(?:заключението|проектът|анализът)\s+(?:изцяло\s+)?(?:съответства|отговаря)\s+на\s+(?:цялостния|всички|изискванията|нормативната)/iu,
  /не\s+са\s+(?:констатирани|установени)\s+(?:съществени\s+)?(?:правни|фактически|нормативни)\s+(?:или\s+(?:правни|фактически)\s+)?противоречия/iu,
  /(?:изцяло|напълно)\s+(?:мотивиран[а-я]*|нормативно\s+проверен[а-я]*|законосъобразен)\s+(?:проект|преписк[а-я]*)/iu,
  /българският\s+юридически\s+анализ\s+отчита/iu,
  /не\s+са\s+използвани\s+неопределени\s+правни\s+категории/iu
 ];
 if(selfAssessment.some(x=>x.test(s)))issues.push("UNSUPPORTED_SELF_CERTIFICATION");
 // Annex 2 category may not be excluded merely on the basis of small scale
 // or a claimed unspecified legal threshold. Such claims need verified exact criteria.
 const a2=s.match(/^\s*ПРИЛОЖЕНИЕ\s*№\s*2\s*КЪМ\s*ЗООС\s*:\s*(?:ОТРИЦАТЕЛНА)\s*[—–-]\s*([^\n]+)/imu);
 if(a2&&/(?:под\s+(?:законовите|нормативните)\s+прагове|няма\s+(?:основание|необходимост)\s+за\s+процедура)[^.\n]*/iu.test(a2[1])&&
   !/(?:точна\s+категория|точни\s+критерии|потвърден[а-я]*\s+приложим[а-я]*\s+текст)/iu.test(a2[1]))
  issues.push("ANNEX2_NEGATIVE_FROM_UNVERIFIED_THRESHOLD");
 // A negative OS Art 2(1) cannot follow solely from nonintersection or unproven impact.
 const os1=s.match(/^\s*ЧЛ\.\s*2\s*,?\s*АЛ\.\s*1\s*НАРЕДБА\s+ЗА\s+ОС\s*:\s*ОТРИЦАТЕЛНА\s*[—–-]\s*([^\n]+)/imu);
 if(os1&&/(?:това\s+е\s+доказано\s+от\s+ГИС|това\s+е\s+доказано\s+с\s+ГИС|тъй\s+като[^.\n]{0,150}(?:ГИС|защитена\s+зона)|не\s+се\s+намира\s+в\s+защитена\s+зона)/iu.test(os1[1])&&
    !/(?:друг(?:и|ите)\s+хипотези|всички\s+(?:относими|приложими)\s+хипотези)/iu.test(os1[1]))
  issues.push("OS_ART2_1_EXCLUDED_BY_GIS_ALONE");
 // An OS Art 2(2) positive statement must not be justified solely as the
 // logical negation of Art 2(1); it requires the precise positive legal test.
 const os2=s.match(/^\s*ЧЛ\.\s*2\s*,?\s*АЛ\.\s*2\s*НАРЕДБА\s+ЗА\s+ОС\s*:\s*ПОЛОЖИТЕЛНА\s*[—–-]\s*([^\n]+)/imu);
 if(os2&&/(?:след\s+като\s+не\s+са\s+налице\s+основания\s+по\s+ал\.\s*1|тъй\s+като\s+няма\s+основания\s+за\s+процедура\s+според\s+ал\.\s*1)/iu.test(os2[1]))
  issues.push("OS_ART2_2_INFERRED_FROM_NEGATIVE_AL1");
 if(/(?:не\s+са\s+достигнати|липсва\s+надвишаване)\s+(?:законови|нормативни)\s+прагове[^.\n]{0,100}(?:приложени[ея]\s*№\s*2|ОВОС)/iu.test(s))
  issues.push("UNVERIFIED_ANNEX_THRESHOLD");
 return [...new Set(issues)];
}
