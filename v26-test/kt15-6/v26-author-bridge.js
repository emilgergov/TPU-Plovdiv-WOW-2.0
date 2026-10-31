/* KT20.4: invisible author bridge. Never makes external calls or exposes credentials. */
(function(root){'use strict';
function resolve(candidate,dossierId,parcelIds){
 if(!candidate)return null; // unchanged verified browser fallback
 if(candidate.ready!==true||candidate.schema!=='KT19_7_WORD_PAYLOAD_V1'||candidate.dossierId!==dossierId)throw Error('AI проектът не е одобрен за текущата преписка.');
 const expected=[...new Set((parcelIds||[]).map(String))].sort();
 const actual=[...new Set((candidate.confirmedParcelIds||[]).map(String))].sort();
 if(expected.length===0||actual.length!==expected.length||actual.some((x,i)=>x!==expected[i]))throw Error('AI проектът не съответства на потвърдените имоти.');
 const sections=['construction','electricity','water_supply','wastewater'];
 if(!String(candidate.subject||'').trim()||!String(candidate.heading||'').trim()||!String(candidate.heading).includes(String(candidate.subject))||sections.some(k=>!String(candidate.classical?.[k]||'').trim())||!String(candidate.expert?.text||'').trim())throw Error('AI проектът има непълно съдържание.');
 if(!Array.isArray(candidate.claims)||candidate.claims.some(c=>!c||c.verified!==true||!String(c.source||'').trim()))throw Error('AI проектът съдържа непроверени твърдения.');
 return candidate;
}
const api=Object.freeze({resolve});root.V26AuthorBridge=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
