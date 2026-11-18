export function notificationSubject(text){
 const plain=String(text||'').replace(/\s+/gu,' ').trim();
 const match=plain.match(/следното\s+инвестиционно\s+предложение\s*[:：]\s*([\s\S]{15,1200}?)(?=\s+(?:[IІ1]\.\s*(?:Характеристик|Резюме)|Характеристик[аи]\s+на\s+инвестиционното\s+предложение)|$)/iu);
 if(!match)return '';
 const title=match[1].replace(/^[\s„“"'«»—–\-:;,]+|[\s„“"'«»—–\-:;,]+$/gu,'').trim();
 return /\p{L}{3}/u.test(title)?title:'';
}
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('KT126 subject source mismatch');return s.replace(a,b)};
export function overlaySubject(source){
 source=once(source,'function candidates(intake){',notificationSubject.toString()+'\nfunction candidates(intake){');
 source=once(source,' for(const s of intake?.subject_candidates||[]){'," for(const doc of intake?.document_texts||[]){const heading=notificationSubject(doc.text);if(heading&&sourceState(clean(doc.source))!=='NOT_READ')add(heading,doc.source,'notification_project_heading');}\n for(const s of intake?.subject_candidates||[]){");
 source=once(source,"+(x.kind==='subject_heading'?4:x.kind==='dossier_fact'?3:0)","+(x.kind==='notification_project_heading'?60:x.kind==='subject_heading'?4:x.kind==='dossier_fact'?3:0)");
 source=once(source," if(root.KT80KT53?.construct)return root.KT80KT53.construct({force:true});"," if(root.KT80KT53?.construct){root.KT80RebuildKT52?.();return root.KT80KT53.construct({force:true});}");
 return source;
}
