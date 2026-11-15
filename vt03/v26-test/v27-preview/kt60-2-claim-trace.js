/* KT60.2 — trace AI claims to exact source excerpts without upgrading them to verified legal conclusions. */
(function(root){'use strict';
const norm=v=>String(v??'').replace(/\s+/gu,' ').trim();
const weak=v=>!norm(v)||/\[ЗА (?:ЕКСПЕРТНА ПРОВЕРКА|ПОПЪЛВАНЕ)|НЯМА ДАННИ|\[ОТКЪС ОТ ПРЕПИСКАТА/iu.test(v);
const words=v=>[...new Set((norm(v).toLocaleLowerCase('bg-BG').match(/[\p{L}\p{N}]{5,}/gu)||[]).filter(w=>!['предложение','инвестиционно','документа','преценка','настоящия','извършване','проверка','защитена','дейности','съгласно','предвидено'].includes(w)))];
const labels={CHARACTERIZATION:'Характеристика',LEGAL:'Правна аргументация',PROCEDURE:'Процедурна преценка',IMPACTS:'Въздействия'};
function split(raw){
 const t=String(raw||''),matches=[...t.matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)],out={};
 for(let i=0;i<matches.length;i++){
  const a=matches[i],end=matches[i+1]?.index??t.length;
  out[a[1]]=t.slice(a.index+a[0].length,end).trim().split(/\n\s*\n/).map(norm).filter(Boolean);
 }
 return out;
}
function indexSources(evidence,legalRegister){
 const docs=(evidence?.facts||[]).filter(f=>f.status==='source_matched'&&norm(f.file)&&norm(f.quote||f.value)).map(f=>({
  type:'dossier',file:norm(f.file),page:f.page||null,kind:f.kind||'other',quote:norm(f.quote||f.value),record:f.id||''
 }));
 const legal=(legalRegister?.records||[]).filter(r=>r&&r.title&&r.source).map(r=>{
  const verified=r.officialVerified===true&&!!norm(r.version||r.effectiveDate)&&!!norm(r.provisionText||r.articleText);
  return {type:'normative',file:norm(r.title),url:norm(r.source),quote:norm(r.provisionText||r.articleText),article:norm(r.article),status:verified?'article_verified':'catalog_only'};
 });
 return {docs,legal};
}
function rankClaims({aiDraft='',evidence=null,normativeRegister=null}={}){
 const chunks=split(aiDraft),sources=indexSources(evidence,normativeRegister),claims=[];
 for(const [section,label] of Object.entries(labels)){
  for(const [i,t] of (chunks[section]||[]).entries()){
   if(weak(t))continue;
   const query=words(t);
   const candidates=[];
   const relevant=section==='CHARACTERIZATION'?sources.docs
       :section==='LEGAL'||section==='PROCEDURE'?sources.legal
       :[...sources.docs,...sources.legal];
   for(const src of relevant){
    const anchor=src.quote||src.file;
    const tokens=words(anchor);
    const overlap=query.filter(x=>tokens.includes(x)).length;
    const score=query.length?overlap/query.length:0;
    // Only *suggest* a citation; common topics and words do not prove a claim.
    if(overlap>=2&&score>=0.15)candidates.push({source:src,score:Math.round(score*100)});
   }
   candidates.sort((a,b)=>b.score-a.score);
   claims.push({section,label,index:i,text:t,candidates:candidates.slice(0,3),
     status:candidates.length?'candidate_source':'unmatched',confirmed:false});
  }
 }
 return {claims,sourceCounts:{dossier:sources.docs.length,normative:sources.legal.length,articleVerified:sources.legal.filter(x=>x.status==='article_verified').length},
   linkedClaims:claims.filter(c=>c.candidates.length).length,totalClaims:claims.length};
}
function appendReport(dialog,report){
 if(!report)return;
 const head=document.createElement('h3');head.textContent='КТ60.2 · проследимост на AI твърденията';dialog.append(head);
 const intro=document.createElement('p');
 intro.textContent='AI абзаци: '+report.totalClaims+'; със сходни източници: '+report.linkedClaims+
   '; документални цитати: '+report.sourceCounts.dossier+
   '; нормативни записи: '+report.sourceCounts.normative+
   ' (проверен текст на разпоредба: '+report.sourceCounts.articleVerified+'). Нито един AI извод не се счита автоматично за потвърден.';
 dialog.append(intro);
 for(const claim of report.claims){
  const details=document.createElement('details');
  const summary=document.createElement('summary');summary.textContent=claim.label+' '+(claim.index+1)+' · '+(claim.status==='candidate_source'?'източник за сверяване':'без свързан източник');details.append(summary);
  const p=document.createElement('p');p.textContent=claim.text;details.append(p);
  for(const c of claim.candidates){const q=document.createElement('p');q.textContent='Кандидат: '+c.source.file+' — '+(c.source.quote||'само каталожен запис')+' [сходство '+c.score+'%]';details.append(q);}
  dialog.append(details);
 }
}
root.KT602ClaimTrace=Object.freeze({rankClaims,appendReport});
})(window);
