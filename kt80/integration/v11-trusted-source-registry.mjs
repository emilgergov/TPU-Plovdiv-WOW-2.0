/**
 * KT83 V1.1 — immutable allowlist audited against local locked V11 ZIP.
 * Article SHA256 values are from the actual UTF-8 extracted V11 article bodies.
 * Unlisted articles are intentionally BLOCKED, not inferred absent from law.
 * This registry binds legal references, NOT case-specific applicability.
 */
export const LOCKED_ARCHIVE = 'KT82_Normative_MASTER_V11_Tariff_Euro_2026-11-13.zip';
export const LOCKED_ARCHIVE_SHA256 = '8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
const records = {
  "TARIFA_8": {
  "id": "TARIFA_8",
  "act": "Тарифа за таксите в системата на МОСВ",
  "article": "чл. 8",
  "archivePath": "additions_v11/TARIFA_MOEW_2022.txt",
  "documentSha256": "9e1164276136bd0b90bea878066ebd429fdb11a8fbf7f2288199f17a9ddf5185",
  "articleSha256": "0c46717cff9ac7b6d7b116650bc5aa5f7633c02ea831076e62a940785071936d",
  "anchor": "За издаване на разрешения се събират следните такси:"
},
  "ZOOS_93": {
    "id": "ZOOS_93",
    "act": "Закон за опазване на околната среда",
    "article": "чл. 93",
    "archivePath": "core/ZOOS_2026_51.txt",
    "documentSha256": "4243e6c8d67600d0ec5f3c7a4814f49d27b6ca3f0dbe5e4480a4f604af0a0861",
    "articleSha256": "f63f8e1be8961f9d3344431dac89eafa7752aec7db7c148a4a26203494998ab3",
    "anchor": "Необходимостта от\nизвършване на ОВОС се преценява за:"
  },
  "TARIFA_1": {
    "id": "TARIFA_1",
    "act": "Тарифа за таксите в системата на МОСВ",
    "article": "чл. 1",
    "archivePath": "additions_v11/TARIFA_MOEW_2022.txt",
    "documentSha256": "9e1164276136bd0b90bea878066ebd429fdb11a8fbf7f2288199f17a9ddf5185",
    "articleSha256": "e0db464184382b02ed0cf2275fcc24cea5eee97576a5b316f8d89feae102d5d3",
    "anchor": "за издаване на решение за преценяване на необходимостта от извършване на"
  },
  "TARIFA_22": {
    "id": "TARIFA_22",
    "act": "Тарифа за таксите в системата на МОСВ",
    "article": "чл. 22",
    "archivePath": "additions_v11/TARIFA_MOEW_2022.txt",
    "documentSha256": "9e1164276136bd0b90bea878066ebd429fdb11a8fbf7f2288199f17a9ddf5185",
    "articleSha256": "fee1c9cb5e8971c9312f096415ccde87445bf3d0d7165e8a444318e851f6535b",
    "anchor": "такса в размер 280 лв."
  },
  "EURO_11": {
    "id": "EURO_11",
    "act": "Закон за въвеждане на еврото в Република България",
    "article": "чл. 11",
    "archivePath": "additions_v11/EURO_LAW_BNB_2026_DV92.txt",
    "documentSha256": "8349ca6acd4eea1de566a22991259605495f78d250d9e35417f8637e9861b466",
    "articleSha256": "1032ddf30e197b6ee20dc04c661fae2ed8c13eaecb348c973f28ea5d0e54058d",
    "anchor": "въвеждането на еврото не засяга действието"
  },
  "EURO_12": {
    "id": "EURO_12",
    "act": "Закон за въвеждане на еврото в Република България",
    "article": "чл. 12",
    "archivePath": "additions_v11/EURO_LAW_BNB_2026_DV92.txt",
    "documentSha256": "8349ca6acd4eea1de566a22991259605495f78d250d9e35417f8637e9861b466",
    "articleSha256": "ad150b828f5b47dfc5034e3e0cc74bf1e34a1eb970137faa6010a55f85ac29ca",
    "anchor": "Официалният валутен курс не се закръглява"
  },
  "EURO_13": {
    "id": "EURO_13",
    "act": "Закон за въвеждане на еврото в Република България",
    "article": "чл. 13",
    "archivePath": "additions_v11/EURO_LAW_BNB_2026_DV92.txt",
    "documentSha256": "8349ca6acd4eea1de566a22991259605495f78d250d9e35417f8637e9861b466",
    "articleSha256": "3759a93371d89583c608bbcf33a82f700782e0e441782817f23649ac7e391f1a",
    "anchor": "получената сума се закръглява до втория знак"
  },
  "EURO_52": {
    "id": "EURO_52",
    "act": "Закон за въвеждане на еврото в Република България",
    "article": "чл. 52",
    "archivePath": "additions_v11/EURO_LAW_BNB_2026_DV92.txt",
    "documentSha256": "8349ca6acd4eea1de566a22991259605495f78d250d9e35417f8637e9861b466",
    "articleSha256": "c134d26b90a5e4d130655f949932cd755c28fd38820039fed0882c6025c4e17e",
    "anchor": "всички публични вземания към"
  }
};
for(const entry of Object.values(records)) Object.freeze(entry);
export const VERIFIED_ARTICLES = Object.freeze(records);
export function lookupVerifiedArticle(id) {
  if(typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(VERIFIED_ARTICLES,id))
    throw new TypeError('Нормативната разпоредба не е удостоверена в регистъра V11: '+String(id));
  return VERIFIED_ARTICLES[id];
}
export function assertVerifiedReference(ref) {
  const entry=lookupVerifiedArticle(ref?.registryId);
  if(ref.archive !== LOCKED_ARCHIVE || ref.archiveSha256 !== LOCKED_ARCHIVE_SHA256 ||
     ref.act !== entry.act || ref.article !== entry.article ||
     ref.archivePath !== entry.archivePath || ref.documentSha256 !== entry.documentSha256 ||
     ref.articleSha256 !== entry.articleSha256 || ref.archiveTextAnchor !== entry.anchor) {
    throw new TypeError('Правният цитат не съвпада с проверения индекс на V11');
  }
  return entry;
}
export function verifiedReference(registryId) {
  const record=lookupVerifiedArticle(registryId);
  return Object.freeze({registryId,archive:LOCKED_ARCHIVE,archiveSha256:LOCKED_ARCHIVE_SHA256,
    act:record.act,article:record.article,archivePath:record.archivePath,
    documentSha256:record.documentSha256,articleSha256:record.articleSha256,
    archiveTextAnchor:record.anchor});
}
