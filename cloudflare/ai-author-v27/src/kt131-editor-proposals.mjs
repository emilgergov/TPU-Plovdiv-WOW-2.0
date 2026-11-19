// These are reviewable editorial suggestions, never automatic changes to an act.
// Only a fully present negative conclusion can be restated as direct notification.
export function editorialParagraphProposals(text,panelLine=''){
 const out=[],parts=String(text).split(/(\n\s*\n)/u);
 const panel01=/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?1\b/iu.test(panelLine);
 for(let index=0;index<parts.length;index+=2){
  const before=parts[index];
  if(panel01){
   const frame=before.match(/^На основание изложеното\s+уведомявам, че\s+(.+?)\s+подлежи на разглеждане и издаване на административен акт по\s+(.+?)\s+с мотивирано констатиране за отпадане на процедурата по\s+(.+?)\.\s+(Не е необходима процедура по[^\n]+\.)\s*$/u);
   if(frame){
    const [,subject,basis,outcome,rest]=frame;
    out.push({id:'direct-notification-'+index,index,kind:'direct_notification',title:'Пряко уведомяване със съществуващия извод',before,
     after:'На основание '+basis+' Ви уведомявам, че за '+subject+' отпада необходимостта от провеждане на процедура по '+outcome+'. '+rest,
     reason:'Предложението преформулира вече записаното отпадане на процедурата и запазва посочените основания. Приемете го само ако това е действителното произнасяне на органа.'});
   }
  }
  if(/^Изпълнението на настоящото административно направление подлежи на последващо експертно потвърждение\.\s*$/u.test(before))out.push({id:'service-note-'+index,index,kind:'service_note',title:'Служебна бележка извън текста към адресата',before,after:'',reason:'Това изречение описва вътрешното експертно потвърждение. При приемане се отделя в бележките; потвърждението на документа в модула остава задължително.'});
 }
 return out;
}
export function applyEditorialProposal(text,choice,panelLine=''){
 const proposal=editorialParagraphProposals(text,panelLine).find(p=>p.id===choice?.id&&p.before===choice?.before);
 if(!proposal)return null;
 const parts=String(text).split(/(\n\s*\n)/u);parts[proposal.index]=proposal.after;
 // Remove only the selected standalone paragraph and its adjacent separator.
 if(!proposal.after){if(proposal.index>0)parts.splice(proposal.index-1,2);else parts.splice(0,2);}
 const next=parts.join('');
 const tokens=s=>(s.match(/\d+(?:[.,/]\d+)*|BG\d{7}|„[^“\n]+“/gu)||[]).sort().join('|');
 if(tokens(text)!==tokens(next)||text.split('\n')[0]!==next.split('\n')[0])return null;
 return {text:next,proposal};
}
