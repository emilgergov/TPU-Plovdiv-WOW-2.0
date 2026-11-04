/* KT60 - evidence-backed automatic intake before unchanged KT42 Word writer.
 * No text is fabricated; AI output is a draft, not a proof of legal/procedural facts.
 */
(function(root){'use strict';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const invalid=v=>!clean(v)||/\[ЗА (?:ЕКСПЕРТНА ПРОВЕРКА|ПОПЪЛВАНЕ)|\[ОТКЪС ОТ ПРЕПИСКАТА|НЯМА ДАННИ/i.test(clean(v));
const idsOf=rs=>(rs||[]).map(r=>clean(r.input||r.cadnum)).filter(Boolean).sort().join(',');
const labels=['Предмет и дейности','Електрозахранване','Водоснабдяване','Отпадъчни води','Правно основание 1','Правно основание 2','Правно основание 3','Правно основание 4','Въздействие 1','Въздействие 2','Въздействие 3','Въздействие 4','Въздействие 5','Мотивиран процедурен извод'];
function sections(raw){
 const names=['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'],out={};
 const t=String(raw||''),marks=[...t.matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)];
 for(let i=0;i<marks.length;i++){const a=marks[i],end=i+1<marks.length?marks[i+1].index:t.length;
  out[a[1]]=t.slice(a.index+a[0].length,end).trim().split(/\n\s*\n/).map(clean).filter(Boolean);
 }
 return names.every(n=>out[n]?.length)?out:null;
}
function sourceFacts(evidence){return (evidence?.facts||[]).filter(f=>f.status==='source_matched'&&clean(f.file)&&!invalid(f.quote||f.value));}
function sourced(value,facts,kinds){
 const txt=clean(value);
 if(invalid(txt))return null;
 // Match actual source quote or value; a semantically related AI sentence is NOT provenance.
 return facts.find(f=>kinds.includes(f.kind)&&((clean(f.quote||f.value)===txt)||(clean(f.quote||f.value).includes(txt)&&txt.length>=28)));
}
function build({results=[],workingDraft={},aiDraft='',evidence=null,normativeRegister=null,previousEvidence=null}={}){
 const parcelIds=idsOf(results);if(!parcelIds)throw Error('KT60: липсва потвърден имот.');
 const zones=[...new Set(results.flatMap(r=>(r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:clean(z?.code||z?.sitecode)).filter(z=>/^BG\d{7}$/.test(z))))];
 if(!zones.length)return {ok:true,scenario:'А',draft:workingDraft,issues:[],report:[]};
 const m=workingDraft.metadata||{},ai=sections(aiDraft),facts=sourceFacts(evidence);
 const p=Array.from({length:4},(_,i)=>clean(workingDraft.paragraphs?.[i]));
 const kinds=[['dossier_excerpt','subject','construction'],['electricity'],['water_supply'],['wastewater']];
 const referenceFacts=[...facts,...(previousEvidence?.facts||[]).filter(f=>f.status==='source_matched'&&f.file)];
 const sourceCandidates=Array.from({length:4},(_,i)=>referenceFacts.filter(f=>kinds[i].includes(f.kind)).slice(0,5).map(f=>({file:f.file,page:f.page||'',kind:f.kind,quote:clean(f.quote||f.value).slice(0,220)})));
 const sources=[];
 for(let i=0;i<4;i++){
  const match=sourced(p[i],referenceFacts,kinds[i]);
  sources.push(match?{file:match.file,page:match.page||'',kind:match.kind}:null);
 }
 const registry=Array.isArray(normativeRegister?.records)?normativeRegister.records:[];
 const legalRecords=registry.filter(r=>r.officialVerified===true&&clean(r.version||r.effectiveDate)&&clean(r.provisionText||r.articleText)&&clean(r.source));
 const legal=Array.from({length:4},(_,i)=>{
  const t=clean(m.legalParagraphs?.[i]);
  const rec=legalRecords.find(r=>!invalid(t)&&t.includes(clean(r.provisionText||r.articleText)));
  return {text:t,source:rec?{file:rec.source,article:rec.article||'',version:rec.version||rec.effectiveDate}:null};
 });
 const impacts=Array.from({length:5},(_,i)=>clean(m.impactFindings?.[i]));
 const procedure=clean(m.procedureFinding);
 const confirmed=!!(m.procedureFindingConfirmed===true&&clean(m.procedureFindingSource)&&!invalid(procedure));
 const rows=[
  ...p.map((value,i)=>({name:labels[i],state:sources[i]?'verified':sourceCandidates[i].length?'source_found':'review',value,source:sources[i],candidates:sourceCandidates[i]})),
  ...legal.map((x,i)=>({name:labels[i+4],state:x.source?'verified':'review',value:x.text,source:x.source})),
  ...impacts.map((value,i)=>({name:labels[i+8],state:'review',value,source:null})),
  {name:labels[13],state:confirmed?'verified':'review',value:procedure,source:confirmed?m.procedureFindingSource:null}
 ];
 // The preceding 5 impact values may only be confirmed by a separately validated case record.
 const impactValidated=Array.isArray(m.impactFindingSources)?m.impactFindingSources:[];
 impacts.forEach((value,i)=>{const src=impactValidated[i];if(!invalid(value)&&src&&src.confirmed===true&&clean(src.file)) {rows[8+i].state='verified';rows[8+i].source=src;}});
 const issues=rows.filter(r=>r.state!=='verified').map(r=>r.name);
 const md={...m,legalParagraphs:legal.map(x=>x.text),legalFindingSources:legal.map(x=>x.source?.file||''),impactFindings:impacts};
 const report={parcelIds,zones,aiAvailable:!!ai,verified:rows.length-issues.length,sourceFound:rows.filter(r=>r.state==='source_found').length,required:rows.length,rows,issues,documentCount:evidence?.documents?.filter(d=>d.readable).length||0};
 // No automatic upgrade of draft/legal inference to "verified".
 return {ok:issues.length===0,scenario:'Б',draft:{...workingDraft,paragraphs:p,metadata:md},issues,report};
}
function show(result){
 let dialog=document.getElementById('kt60-summary');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='kt60-summary';dialog.style='width:min(700px,92vw);max-height:80vh;overflow:auto;border:1px solid #a6bdac;border-radius:12px;padding:20px;background:white;color:#173b2b';document.body.appendChild(dialog);}
 dialog.replaceChildren();
 const h=document.createElement('h2');h.textContent='КТ60.1 · документални сведения и доказателствен контрол';dialog.append(h);
 const t=document.createElement('p');t.textContent='Потвърдени: '+result.report.verified+' от '+result.report.required+'. Намерени тематични документални откъси: '+result.report.sourceFound+'. Прочетени документи: '+result.report.documentCount+'. Намерен откъс не доказва автоматично извод на AI.';dialog.append(t);
 const ul=document.createElement('ul');
 for(const row of result.report.rows){
  const li=document.createElement('li');
  li.textContent=(row.state==='verified'?'Потвърдено: ':row.state==='source_found'?'Намерени сведения (за проверка): ':'Без потвърден източник: ')+row.name;
  if(row.state==='source_found'&&row.candidates?.length){
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Документални откъси: '+row.candidates.length;details.append(summary);
   for(const c of row.candidates){const q=document.createElement('p');q.textContent=c.file+': '+c.quote;details.append(q);}
   li.append(details);
  }
  ul.append(li);
 }
 dialog.append(ul);
 const p=document.createElement('p');p.textContent=result.ok?'Всички доказателствени условия са налице.':'Генерирането на Б остава защитено; заключените абзаци не са заменени.';dialog.append(p);
 const close=document.createElement('button');close.textContent='Затвори';close.onclick=()=>dialog.close();dialog.append(close);dialog.showModal();
}
root.KT601Evidence=Object.freeze({build,show,sections});
})(window);
