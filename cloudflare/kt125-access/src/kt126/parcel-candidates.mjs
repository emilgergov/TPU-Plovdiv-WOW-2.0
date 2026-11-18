// Candidate extraction only: no geometry, expert approval or legal inference.
export function notificationParcelCandidates(introduction,documentText){
 const header=String(documentText||'').replace(/\s+/gu,' ').trim();
 const text=String(introduction||'').replace(/\s+/gu,' ').trim();
 if(!text||!/уведомление/iu.test(header)||!/инвестиционно\s+предложение/iu.test(header))return [];
 // A heading listing neighbours/former IDs needs individual expert review.
 if(/съсед|граничи|(?:предишен|стар|предходен)\s+идентификатор/iu.test(text))return [];
 const ids=[...text.matchAll(/(?:ПИ(?:\s+с\s+(?:ИД|идентификатор))?|поземлен\s+имот\s+с\s+идентификатор)\s*[:№]?\s*(\d{5}\.\d+\.\d+)(?![\d.])/giu)].map(x=>x[1]);
 return [...new Set(ids)];
}
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('KT130 parcel candidate source contract mismatch');return s.replace(a,b)};
export function overlayParcelCandidates(source){
 source=once(source,"const directNoticeIds=introductory?[...introductory[1].matchAll(/(?:ПИ\\s+с\\s+(?:ИД|идентификатор)|поземлен\\s+имот\\s+с\\s+идентификатор)\\s*[:№]?\\s*(\\d{5}\\.\\d+\\.\\d+)/gi)].map(x=>x[1]):[];",`const directNoticeIds=(${notificationParcelCandidates.toString()})(introductory?.[1],cleanNoticeText);`);
 return once(source,'if(noticeFile&&directNoticeIds.length===1)leading.add(directNoticeIds[0]);','if(directNoticeIds.length===1)leading.add(directNoticeIds[0]);');
}
