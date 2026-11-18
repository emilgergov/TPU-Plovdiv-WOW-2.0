// Narrow, asserted overlays over the immutable accepted R6 sources.
const replaceOnce=(source,anchor,replacement)=>{if(source.split(anchor).length!==2)throw Error('KT126 source contract mismatch');return source.replace(anchor,replacement)};
export function overlayModule(rel,source){
 if(rel==='vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html'){if(source.includes('src="/kt126/client.js"'))throw Error('KT126 overlay already applied');return replaceOnce(source,'</body>','<script defer src="/kt126/client.js"></script></body>');}
 if(rel.endsWith('/KT83_WORKFLOW_CASE_V591.js')){
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
 }
 if(rel.endsWith('/kt119-docx-generator.mjs')){
  source=replaceOnce(source,"     const bytes=window.fflate.zipSync(contents,{level:6});",'     window.KT126Registry?.attachDocxMetadata(contents,approved);\n     const bytes=window.fflate.zipSync(contents,{level:6});');
  source=replaceOnce(source,"     const blob=new Blob([bytes],{type:","     const kt126Filename=window.KT126Registry?window.KT126Registry.caseNumber()+'_v'+approved.version+'.docx':null;\n     if(window.KT126Registry)await window.KT126Registry.saveGeneratedDocument(bytes,kt126Filename,approved);\n     const blob=new Blob([bytes],{type:");
  source=replaceOnce(source,"link.href=url;link.download='RIOSV_Plovdiv_'","link.href=url;link.download=kt126Filename||'RIOSV_Plovdiv_'");
 }
 return source;
}
