/* V26.3 — single ZIP dossier evidence reconciliation. Browser/Node. */
(function(root){
'use strict';
function iso(value){
 const m=String(value||'').trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
 if(!m)return null;
 const d=+m[1],mo=+m[2],y=+m[3];
 if(y<1900||mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate())return null;
 return [y,String(mo).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
function analyze(documents){
 if(!Array.isArray(documents))throw Error('Очаква се списък с документи от един ZIP.');
 const inventory=[],groups=new Map(),warnings=[];
 for(const doc of documents){
  if(!doc||typeof doc.file!=='string'||!doc.file.trim())throw Error('Липсва име на изходния документ.');
  const date=iso(doc.date),id=String(doc.id||doc.file);
  inventory.push({id,file:doc.file,type:doc.type||'other',date:doc.date||null,registration:doc.registration||null});
  if(doc.date&&!date)warnings.push({kind:'unreadable_date',file:doc.file});
  for(const f of doc.facts||[]){
   if(!f||!f.key||f.value===undefined||f.value===null)continue;
   const key=String(f.key).trim(),scope=String(f.scope||'proposal').trim();
   const group=JSON.stringify([scope,key]);
   if(!groups.has(group))groups.set(group,[]);
   groups.get(group).push({scope,key,value:String(f.value).trim(),date,document:id,file:doc.file,reference:f.reference||null});
  }
 }
 const findings=[];
 for(const evidence of groups.values()){
  const sorted=evidence.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const values=new Set(sorted.map(e=>e.value));
  const newest=sorted[0];
  let status='corroborated',selected=newest;
  if(values.size>1){
   if(!newest.date||sorted.some(e=>!e.date&&e.value!==newest.value)){
    status='unresolved_missing_date';selected=null;
   }else if(sorted.some(e=>e.date===newest.date&&e.value!==newest.value)){
    status='unresolved_same_date';selected=null;
   }else status='latest_documented_fact';
  }
  findings.push({scope:evidence[0].scope,key:evidence[0].key,status,selected,evidence:sorted,conflict:values.size>1});
 }
 return {inventory,findings,warnings,requiresReview:findings.some(f=>f.status.startsWith('unresolved'))};
}
function characterize(analysis){
 const paragraphs=[];
 for(const f of (analysis&&analysis.findings)||[]){
  if(f.key!=='wastewater_solution'||!f.selected)continue;
  const e=f.selected;
  const wording=e.value==='sewer'?'Предвидено е отвеждане към канализационната мрежа.':e.value==='tank'?'Предвидено е събиране във водоплътно съоръжение.':null;
  if(wording)paragraphs.push({topic:'Отпадъчни води',text:wording,source:e.file,date:e.date,excerpt:e.reference||'',review:true});
 }
 return {paragraphs,requiresReview:!!(analysis&&analysis.requiresReview)||paragraphs.length>0};
}
root.V26DossierEvidence={iso,analyze,characterize};
if(typeof module==='object'&&module.exports)module.exports=root.V26DossierEvidence;
})(typeof window!=='undefined'?window:globalThis);
