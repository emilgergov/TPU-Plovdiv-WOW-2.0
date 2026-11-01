/* V27.1 P2: source-grounded case evidence registry. Pure, no network or AI calls. */
(function(root){'use strict';
const trim=(x,n=4000)=>String(x==null?'':x).replace(/\s+/g,' ').trim().slice(0,n);
const kinds=Object.freeze(['subject','investor','location','construction','electricity','water_supply','wastewater','access','waste','procedure','parcel','other']);
function create(input={}){
 const documents=[],facts=[],warnings=[];
 const raw=Array.isArray(input.documents)?input.documents:[];
 raw.forEach((doc,i)=>{
  const file=trim(doc?.file||doc?.path||doc?.name,220)||'Документ '+(i+1);
  const id='D'+String(i+1).padStart(3,'0');
  const body=typeof doc?.text==='string'?doc.text:'';
  const readable=!doc?.error&&body.trim().length>0;
  documents.push({id,file,readable,length:body.length,error:trim(doc?.error,250)||null});
  if(!readable)warnings.push({code:'UNREADABLE_DOCUMENT',documentId:id,file});
  const supplied=Array.isArray(doc?.facts)?doc.facts:[];
  supplied.forEach((f,j)=>{
   const kind=kinds.includes(f?.kind)?f.kind:'other';
   const value=trim(f?.value,3000);
   if(!value)return;
   const page=Number.isInteger(f?.page)&&f.page>0?f.page:null;
   const quote=trim(f?.quote,1200);
   const sourceStart=Number.isInteger(f?.start)&&f.start>=0?f.start:null;
   const sourceEnd=Number.isInteger(f?.end)&&f.end>=0?f.end:null;
   let grounded=false;
   if(readable&&quote&&body.includes(quote))grounded=true;
   else if(readable&&sourceStart!==null&&sourceEnd!==null&&sourceEnd>sourceStart&&sourceEnd<=body.length){
    grounded=body.slice(sourceStart,sourceEnd).replace(/\s+/g,' ').trim()===value;
   }
   const status=grounded?'source_matched':'unverified';
   if(!grounded)warnings.push({code:'UNVERIFIED_FACT',documentId:id,kind,index:j});
   facts.push({id:id+'F'+String(j+1).padStart(3,'0'),documentId:id,file,kind,value,page,quote:grounded?quote:null,status});
  });
 });
 const conflicts=[];
 const grouped=new Map();
 for(const f of facts.filter(f=>f.status==='source_matched')){
  if(!grouped.has(f.kind))grouped.set(f.kind,new Map());
  const vals=grouped.get(f.kind),key=f.value.toLocaleLowerCase('bg-BG');
  if(!vals.has(key))vals.set(key,[]);
  vals.get(key).push(f.id);
 }
 for(const [kind,vals] of grouped){
  if(vals.size>1)conflicts.push({kind,values:[...vals.values()]});
 }
 return Object.freeze({schema:'V27_CASE_EVIDENCE_V1',documents,facts,warnings,conflicts,reviewRequired:true});
}
function forAI(registry,{maxFacts=80,maxCharacters=24000}={}){
 if(registry?.schema!=='V27_CASE_EVIDENCE_V1')throw Error('Invalid case evidence registry');
 const facts=registry.facts.filter(f=>f.status==='source_matched').slice(0,maxFacts).map(({id,documentId,file,kind,value,page,quote})=>({id,documentId,file,kind,value,page,quote}));
 const result={schema:registry.schema,documents:registry.documents.map(({id,file,readable})=>({id,file,readable})),facts,conflicts:registry.conflicts,warnings:registry.warnings};
 if(JSON.stringify(result).length>maxCharacters)throw Error('Evidence exceeds AI payload budget: split into batches without dropping facts');
 return result;
}
root.V27CaseEvidence=Object.freeze({create,forAI});
})(typeof window!=='undefined'?window:globalThis);
