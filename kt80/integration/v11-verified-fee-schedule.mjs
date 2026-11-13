/**
 * KT83 V1.1 tariff fixed-fee allowlist grounded in uploaded 2022 MOEW tariff.
 * Fees are NOT automatically applicable; legal procedure, date and exemptions
 * must be checked. Later amendments are not presumed absent.
 */
import {lookupVerifiedArticle} from './v11-trusted-source-registry.mjs';
const fixed={
  "OVOS_SCREENING": {
    "id": "OVOS_SCREENING",
    "articleId": "TARIFA_1",
    "clause": "чл. 1, ал. 5, т. 1",
    "archivedBgnAmount": "500.00",
    "label": "Преценяване необходимостта от ОВОС"
  },
  "OVOS_MANDATORY": {
    "id": "OVOS_MANDATORY",
    "articleId": "TARIFA_1",
    "clause": "чл. 1, ал. 5, т. 2, б. а",
    "archivedBgnAmount": "1200.00",
    "label": "Решение при задължителна ОВОС"
  },
  "OVOS_FOLLOWUP": {
    "id": "OVOS_FOLLOWUP",
    "articleId": "TARIFA_1",
    "clause": "чл. 1, ал. 5, т. 2, б. б",
    "archivedBgnAmount": "700.00",
    "label": "Решение след преценка да се извърши ОВОС"
  },
  "EO_OPINION": {
    "id": "EO_OPINION",
    "articleId": "TARIFA_1",
    "clause": "чл. 1, ал. 5, т. 3",
    "archivedBgnAmount": "600.00",
    "label": "Становище по екологична оценка"
  },
  "EO_SCREENING": {
    "id": "EO_SCREENING",
    "articleId": "TARIFA_1",
    "clause": "чл. 1, ал. 5, т. 4",
    "archivedBgnAmount": "400.00",
    "label": "Преценяване необходимостта от екологична оценка"
  },
  "OS_STANDALONE": {
    "id": "OS_STANDALONE",
    "articleId": "TARIFA_22",
    "clause": "чл. 22, ал. 1",
    "archivedBgnAmount": "280.00",
    "label": "Самостоятелна оценка за съвместимост"
  },
  "WATER_PERMIT_OTHER": {
    "id": "WATER_PERMIT_OTHER",
    "articleId": "TARIFA_8",
    "clause": "чл. 8, ал. 1, т. 2, б. б",
    "archivedBgnAmount": "250.00",
    "label": "Разрешение за водовземане в останалите случаи"
  }
};
for(const f of Object.values(fixed))Object.freeze(f);
export const VERIFIED_FIXED_FEES=Object.freeze(fixed);
export function verifiedFixedFee(id){
 if(typeof id!=='string'|| !Object.prototype.hasOwnProperty.call(fixed,id))
   throw new TypeError('Няма удостоверен фиксиран размер на таксата във V11: '+String(id));
 const f=fixed[id];
 lookupVerifiedArticle(f.articleId);
 return f;
}
