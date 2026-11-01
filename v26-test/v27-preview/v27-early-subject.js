/* V27.1 P4: strictly validated early-AI subject/title suggestions; does not mutate confirmed case. */
(function(root){'use strict';
const idPattern=/\b\d{5}\.\d+\.\d+\b/g;
const norm=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
function validateSuggestion(candidate,caseInput={}){
 const title=norm(candidate?.title),subject=norm(candidate?.subject);
 const ids=[...new Set((caseInput.parcelIds||[]).map(norm).filter(x=>/^\d{5}\.\d+\.\d+$/.test(x)))];
 const citations=Array.isArray(candidate?.evidenceIds)?candidate.evidenceIds.map(norm):[];
 const allowed=new Set((caseInput.evidence?.facts||[]).filter(f=>f.status==='source_matched').map(f=>f.id));
 const issues=[];
 if(!title||title.length>280)issues.push('INVALID_TITLE');
 if(!subject||subject.length>1200)issues.push('INVALID_SUBJECT');
 if(!ids.length)issues.push('MISSING_VERIFIED_PARCELS');
 if(ids.some(id=>!subject.includes(id)))issues.push('MISSING_PARCEL_IN_SUBJECT');
 const claimed=[...new Set([...title.matchAll(idPattern),...subject.matchAll(idPattern)].map(x=>x[0]))];
 if(claimed.some(id=>!ids.includes(id)))issues.push('UNCONFIRMED_PARCEL');
 if(!citations.length||citations.some(id=>!allowed.has(id)))issues.push('UNVERIFIED_EVIDENCE_REFERENCE');
 if(/идентификаторентификатор|писио|proposal¬/i.test(title+' '+subject))issues.push('MALFORMED_TEXT');
 return Object.freeze({accepted:issues.length===0,issues,title,subject,evidenceIds:citations,reviewRequired:true});
}
function requestFromCase({evidence,parcelIds,existingTitle='',existingSubject='',location=''}={}){
 if(evidence?.schema!=='V27_CASE_EVIDENCE_V1')throw Error('Missing verified evidence registry');
 const ids=[...new Set((parcelIds||[]).map(norm).filter(x=>/^\d{5}\.\d+\.\d+$/.test(x)))];
 if(!ids.length)throw Error('Missing verified parcel identifiers');
 const facts=evidence.facts.filter(f=>f.status==='source_matched').map(({id,kind,value,file,page,quote})=>({id,kind,value,file,page,quote}));
 return {task:'subject_title',schema:'V27_EARLY_SUBJECT_V1',parcelIds:ids,existingTitle:norm(existingTitle).slice(0,300),existingSubject:norm(existingSubject).slice(0,1200),location:norm(location).slice(0,400),facts,unreadable:evidence.documents.filter(d=>!d.readable).map(d=>d.file),conflicts:evidence.conflicts,requirements:['Return title, subject, evidenceIds','Do not invent facts or parcel IDs','Keep all confirmed parcel IDs in subject','Propose only; expert must confirm']};
}
root.V27EarlySubject=Object.freeze({validateSuggestion,requestFromCase});
})(typeof window!=='undefined'?window:globalThis);
