import assert from "node:assert/strict";
import {substantiveDraftIssues as scan} from "../src/kt123-substance-guard.mjs";
const self=[
 "Този проект представлява изцяло мотивирана, пълна и нормативно проверена преписка според установените факти.",
 "Заключението съответства на цялостния материал, отговаря на изискванията на контролите.",
 "Не са констатирани съществени правни или фактически противоречия.",
 "Българският юридически анализ отчита спецификата на чл. 2, ал. 2."
];
for(const text of self)assert(scan(text).includes("UNSUPPORTED_SELF_CERTIFICATION"),text);
const annex="ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — Параметрите остават под законовите прагове по приложение № 2 и следователно няма основание за процедура.";
assert(scan(annex).includes("ANNEX2_NEGATIVE_FROM_UNVERIFIED_THRESHOLD"));
const os1="ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — Обектът не е свързан с глава шеста, нито процесът засяга защитена зона. Това е доказано от ГИС анализ на ПИ.";
assert(scan(os1).includes("OS_ART2_1_EXCLUDED_BY_GIS_ALONE"));
const os2="ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — След като не са налице основания по ал. 1, компетентният орган следва да приложи чл. 2, ал. 2.";
assert(scan(os2).includes("OS_ART2_2_INFERRED_FROM_NEGATIVE_AL1"));
assert.deepEqual(scan("Предмет: складове в установения имот. Конкретните данни са представени в уведомлението."),[]);
console.log("PASS KT123 substantive guard: all six regression patterns detected; neutral case unchanged.");
