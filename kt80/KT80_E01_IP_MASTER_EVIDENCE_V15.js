/* KT80 V15 — IP MASTER factual foundation, not AI legal analysis.
   Source excerpts from original IN reader only; no invented facts, conclusions, or procedures. */
(function(root){'use strict';
const fields=[
 ['activity','Предмет / дейност'],['construction','Строителни и технологични дейности'],
 ['capacity','Капацитет / параметри'],['area','Площ / обхват'],
 ['water_supply','Водоснабдяване'],['wastewater','Отпадъчни води'],
 ['electricity','Електрозахранване'],['access','Транспортен достъп'],
 ['emissions','Емисии'],['waste','Отпадъци']
];
function build(intake){
 if(!intake||!Array.isArray(intake.subject_candidates))throw Error('Няма прегледани кандидати за предмет от IN.');
 const sources=new Map(fields.map(([key])=>[key,[]]));
 function add(key,text,file,kind){
  if(!sources.has(key)||typeof text!=='string'||!text.trim())return;
  const snippet=text.trim().slice(0,600),origin=String(file||'НЕУСТАНОВЕН ДОКУМЕНТ');
  const data=sources.get(key);if(!data.some(e=>e.excerpt===snippet&&e.document===origin))data.push({excerpt:snippet,document:origin,kind,verified:false,expertReview:true});
 }
 const titleCandidates=[];
 for(const s of intake.subject_candidates){
  if(typeof s==='string'){add('activity',s,'Неустановен документ','subject_candidate');titleCandidates.push({text:s,document:null,verified:false});continue}
  if(!s||typeof s!=='object')continue;
  if(s.title&&typeof s.title==='string'){add('activity',s.title,s.source,'subject_title');titleCandidates.push({text:s.title,document:s.source||null,verified:false})}
  for(const act of s.activities||[])add('construction',act,s.source,'activity_excerpt');
  for(const x of s.infrastructure||[])add(x.topic,x.text,x.source||s.source,'infrastructure_excerpt');
  for(const t of s.sections||[]){
   if(!t||typeof t.text!=='string')continue;
   if(t.key==='processes'||t.key==='summary')add('construction',t.text,t.source||s.source,'section_excerpt');
   // Do not infer precise technical capacity or emissions from generic blank form headings.
  }
 }
 for(const d of intake.dossier_documents||[]){
  for(const f of d.facts||[]){
   if(!f||typeof f.value!=='string')continue;
   add(f.key,f.value,d.file||f.source,'factual_excerpt');
  }
 }
 const results=fields.map(([key,label])=>{
  const x=sources.get(key)||[];
  return {key,label,status:x.length?'EXTRACTED_UNVERIFIED':'НЯМА ДАННИ',value:x.length?x[0].excerpt:'НЯМА ДАННИ',
    evidence:x.slice(0,12),requiresReview:true,hasMultipleStatements:x.length>1};
 });
 const title=titleCandidates.find(x=>/уведомлен|uvedomlen|notification/i.test(x.document||''))||titleCandidates[0]||null;
 return Object.freeze({schema:'KT80-IP-MASTER-V15-EVIDENCE',caseFile:intake.archive_name||null,
  proposedSubject:title?.text||'НЯМА ДАННИ',subjectSource:title?.document||null,
  subjectConfirmed:false,fields:results,unverifiedFieldCount:results.filter(x=>x.status==='EXTRACTED_UNVERIFIED').length,
  missingFieldCount:results.filter(x=>x.status==='НЯМА ДАННИ').length,
  legalProcedure:null,competentAuthority:null,spatialValidation:false,warning:'Извлечените откъси са кандидати за факти, не доказателствено потвърдени обстоятелства.'});
}
function render(analysis){
 const host=document.getElementById('kt80IPMasterEvidence');if(!host)return;
 host.replaceChildren();
 function e(tag,t){const node=document.createElement(tag);node.textContent=t;return node}
 host.append(e('h3','ИП MASTER · доказателствена картина'));
 host.append(e('p','Извлечени теми: '+analysis.unverifiedFieldCount+' · НЯМА ДАННИ: '+analysis.missingFieldCount+'. Нито един откъс не е автоматично доказан.'));
 for(const field of analysis.fields){
  const box=document.createElement('details');box.className='kt80-ip-topic';
  const summary=e('summary',field.label+' · '+(field.status==='НЯМА ДАННИ'?'НЯМА ДАННИ':'има непотвърден откъс'));
  box.append(summary);
  if(!field.evidence.length)box.append(e('p','НЯМА ДАННИ — не означава, че въздействие или инфраструктура липсва.'));
  else for(const x of field.evidence)box.append(e('p','Документ: '+x.document+' · Откъс: '+x.excerpt+' · Статус: непотвърден'));
  if(field.hasMultipleStatements)box.append(e('p','Има повече от един източен откъс — необходим е контрол за противоречия и редакции.'));
  host.append(box);
 }
}
root.KT80IPMaster=Object.freeze({build,render});
})(window);
