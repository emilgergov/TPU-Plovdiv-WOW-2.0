// Narrow, asserted overlays over the immutable accepted R6 sources.
const replaceOnce=(source,anchor,replacement)=>{if(source.split(anchor).length!==2)throw Error('KT126 source contract mismatch');return source.replace(anchor,replacement)};
export function overlayModule(rel,source){
 if(rel==='vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html'){if(source.includes('src="/kt126/client.js"'))throw Error('KT126 overlay already applied');source=replaceOnce(source,'<body>','<body data-kt80-view="home">');return replaceOnce(source,'</body>','<script defer src="/kt126/client.js"></script></body>');}
 if(rel.endsWith('/KT83_WORKFLOW_CASE_V591.js')){
  source=replaceOnce(source,'  const result=await root.V26LocalIntake.process(file);','  const result=root.KT126Registry?.restoredIntake()||await root.V26LocalIntake.process(file);');
  source=replaceOnce(source," if(currentFileRef&&currentFileRef!==file)state.caseCycleId=newCaseCycleId();"," if(root.KT126Registry){$('kt80ProcessFile').disabled=true;try{await root.KT126Registry.beforeProcess(file)}catch(e){$('kt80ProcessFile').disabled=false;return say(e.message)}}\n if(currentFileRef&&currentFileRef!==file&&!root.KT126Registry?.current())state.caseCycleId=newCaseCycleId();");
  source=replaceOnce(source,'  intakeResults(result);',"  if(root.KT126Registry){root.KT80Busy?.finish(workId);await root.KT126Registry.afterRead(result);if(!isCurrent())return;}\n  intakeResults(result);");
  source=replaceOnce(source,"  const all=Array.isArray(result?.files)?result.files:[];",'  await root.KT126Registry?.afterProcess();\n  const all=Array.isArray(result?.files)?result.files:[];');
  source=replaceOnce(source,"function setBadge(){ ","function setBadge(){ queueMicrotask(()=>root.KT126Registry?.refreshBadge()); ");
 }
 if(rel.endsWith('/KT80_E01_DOSSIER_ORIGINALS_V39.js'))source=replaceOnce(source,'Object.freeze({openOriginal,close})',"Object.freeze({openOriginal,close,readBytes:async filename=>{const source=$('kt80InputFile')?.files?.[0];if(!source)throw Error('Първо изберете оригиналната преписка');return /\\.zip$/i.test(source.name)?extractZIP(source,normalize(filename)):source.arrayBuffer()}})");
 if(rel.endsWith('/kt117-stage5-document-author.mjs')){
  source=replaceOnce(source,'const incomingReference=()=>{',"const incomingReference=()=>{\n if(window.KT126Registry)return window.KT126Registry.confirmedExternal();");
  source=replaceOnce(source,"reference.textContent='Представена документация · вх. № '+incomingReference();","reference.textContent='Представена документация · Деловоден № '+(incomingReference()||'не е посочен');");
  source=replaceOnce(source,"['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated']","['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated','kt126:external-change']");
  source=replaceOnce(source,'  refresh:sync',`  checkpoint:()=>source?({source,versions,confirmed,editorialIssues,external:window.KT126Registry?.confirmedExternal()||''}):null,
  restoreCheckpoint:data=>{
   sync();const a=live();if(!a||data?.source?.caseId!==a.caseId||data.source.version!==a.version||data.source.text!==a.text||data.external!==(window.KT126Registry?.confirmedExternal()||''))return false;
   if(!Array.isArray(data.versions)||data.versions.some(x=>typeof x?.text!=='string')||data.confirmed&&data.confirmed.caseId!==a.caseId)return false;
   source=a;versions=data.versions;confirmed=data.confirmed||null;editorialIssues=data.editorialIssues||[];render();return true;
  },
  refresh:sync`);
 }
 if(rel.endsWith('/kt116-expert-approval-handoff.mjs'))source=replaceOnce(source,'window.KT116ExpertHandoff=Object.freeze({snapshot:',`window.KT116ExpertHandoff=Object.freeze({
 checkpoint:()=>proposal&&current()?({proposal,history,approved,binding:{caseId:evidence().caseId,subject:val(window.KT80WorkflowState?.subjectConfirmed?.text),scope:val(window.KT80WorkflowState?.subjectConfirmed?.scope),ids:[...evidence().parcelIds]}}):null,
 restoreCheckpoint:data=>{
  const e=evidence(),w=window.KT80WorkflowState||{},b=data?.binding;
  if(!b||b.caseId!==e.caseId||b.subject!==val(w.subjectConfirmed?.text)||b.scope!==val(w.subjectConfirmed?.scope)||JSON.stringify(b.ids)!==JSON.stringify([...e.parcelIds])||!data.proposal||!Array.isArray(data.history)||data.approved&&data.approved.caseId!==e.caseId)return false;
  proposal={...data.proposal,localId:e.caseId,caseId:e.caseId,revision:e.evidenceRevision,generation:e.generation,key:e.key};history=data.history;approved=data.approved||null;
  ui.hidden=false;display();render5();return true;
 },snapshot:`);
 if(rel.endsWith('/kt119-docx-generator.mjs')){
  source=replaceOnce(source,"     const bytes=window.fflate.zipSync(contents,{level:6});",'     window.KT126Registry?.attachDocxMetadata(contents,approved);\n     const bytes=window.fflate.zipSync(contents,{level:6});');
  source=replaceOnce(source,"     const blob=new Blob([bytes],{type:","     const kt126Filename=window.KT126Registry?window.KT126Registry.caseNumber()+'_v'+approved.version+'.docx':null;\n     if(window.KT126Registry)await window.KT126Registry.saveGeneratedDocument(bytes,kt126Filename,approved);\n     const blob=new Blob([bytes],{type:");
  source=replaceOnce(source,"link.href=url;link.download='RIOSV_Plovdiv_'","link.href=url;link.download=kt126Filename||'RIOSV_Plovdiv_'");
 }
 return source;
}
