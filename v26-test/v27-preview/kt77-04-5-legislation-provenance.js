/* KT77-04.5 — immutable citation metadata for PDF2, no runtime external requests.
   Adoption/publication dates verified against source documents (separate from revision status).
   Never auto-claim current legal wording. */
(function(root){'use strict';
const acts=Object.freeze([
 {key:'ЗБР',title:'Закон за биологичното разнообразие',adoption:'Приет от XXXIX Народно събрание на 10.07.2002 г. и 02.08.2002 г.',publication:'Обн., ДВ, бр. 77 от 09.08.2002 г.',authority:'МОСВ',url:'https://www.moew.government.bg/bg/priroda/zakonodatelstvo/nacionalno-zakonodatelstvo/zakoni/',scope:'Оригинално обнародване; актуална редакция се сверява отделно.'},
 {key:'ЗЗТ',title:'Закон за защитените територии',adoption:'Приет от XXXVIII Народно събрание на 30.10.1998 г.',publication:'Обн., ДВ, бр. 133 от 11.11.1998 г.',authority:'МОСВ',url:'https://www.moew.government.bg/bg/priroda/zakonodatelstvo/nacionalno-zakonodatelstvo/zakoni/',scope:'Оригинално обнародване; актуална редакция се сверява отделно.'},
 {key:'ЗООС',title:'Закон за опазване на околната среда',adoption:'Приет от XXXIX Народно събрание на 23.07.2002 г. и 19.09.2002 г.',publication:'Обн., ДВ, бр. 91 от 25.09.2002 г.',authority:'МОСВ',url:'https://www.moew.government.bg/bg/zakon-za-opazvane-na-okolnata-sreda-6671/',scope:'Оригинално обнародване; актуална редакция се сверява отделно.'},
 {key:'ОС',title:'Наредба за оценка за съвместимост',adoption:'Приета с ПМС № 201 от 31.08.2007 г.',publication:'Обн., ДВ, бр. 73 от 11.09.2007 г.',authority:'МОСВ',url:'https://www.moew.government.bg/static/media/ups/tiny/filebase/Nature/Legislation/Naredbi/NAREDBA_za_usl_reda_za_izvarshvane_na_ocenka_za_savmestimostta_na_PPPIP_2025.pdf',scope:'Оригинално обнародване; измененията, включително ДВ бр. 96/2025, се сверяват спрямо конкретната преписка.'}
]);
root.KT77045Acts=Object.freeze({acts,byKey:key=>acts.find(a=>a.key===key)||null});
})(window);
