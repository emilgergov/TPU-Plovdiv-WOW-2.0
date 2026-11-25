/**
 * KT134 protected host callback using the ORIGINAL V11 normative MASTER.
 * Returns verified archive TEXT and provenance, never legal applicability.
 * No personal dossier leaves the server; no direct network request.
 */
import {getLegalContext,getFullV11Document,V11_CORPUS_FILES} from '../cloudflare/ai-author-v27/src/legal-v11-loader.mjs';
const V11='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
const text=x=>String(x??'').trim();
export function createKT134V11NormativeReader({
 getContext=getLegalContext,getFullDocument=getFullV11Document,
 availableActs=V11_CORPUS_FILES
}={}){
 if(typeof getContext!=='function'||typeof getFullDocument!=='function')throw Error('Липсва нормативен MASTER');
 if(!Array.isArray(availableActs)||availableActs.length===0||new Set(availableActs).size!==availableActs.length)
  throw Error('Непълен нормативен каталог');
 return async function readNormative({caseId,context}={}){
  if(!text(caseId)||context?.caseId!==caseId||!Array.isArray(context.documents)||
     context.documents.length===0)throw Error('Невалидна преписка за нормативно извличане');
  const texts=context.documents.map(d=>text(d.sourceText??d.text)).filter(Boolean);
  if(!texts.length)throw Error('Няма документален текст за нормативно извличане');
  const result=await getContext({
   archiveSHA256:V11,
   subject:text(context.subject??''),
   scope:text(context.scope??''),
   caseTexts:texts
  });
  if(result?.archiveSHA256!==V11||!Array.isArray(result.legalProvisions)||
     result.legalProvisions.length===0)throw Error('Невалиден архивен правен контекст');
  const sources=result.legalProvisions.map(p=>{
   if(p?.applicabilityVerified!==false||!text(p.sourcePath)||!text(p.contentSHA256)||
      !text(p.reference)||!text(p.fullLegalText))throw Error('Недоказан източник на правен текст');
   return Object.freeze({
    act:text(p.act),reference:text(p.reference),sourcePath:text(p.sourcePath),
    contentSHA256:text(p.contentSHA256),originalSourceSHA256:text(p.originalSourceSHA256),
    fullLegalText:p.fullLegalText,
    applicabilityVerified:false
   });
  });
  const catalog=Object.freeze([...availableActs]);
  const getAct=async ({forCaseId,id}={})=>{
   if(forCaseId!==caseId||!catalog.includes(id))throw Error('Неразрешен нормативен източник или чужда преписка');
   const act=await getFullDocument(id);
   if(act?.id!==id||!text(act.text)||!text(act.archivePath)||
      !/^[0-9a-f]{64}$/u.test(text(act.contentSHA256)))
    throw Error('Непълен или недоказан нормативен документ');
   return Object.freeze({caseId,id,title:text(act.title),sourcePath:act.archivePath,
    contentSHA256:act.contentSHA256,originalSourceSHA256:act.originalSHA256,
    fullLegalText:act.text,applicabilityVerified:false});
  };
  return Object.freeze({
   caseId,archiveSHA256:V11,sourceKind:'local_normative_master_v11',
   availableActs:catalog,getAct,
   archiveTextIntegrityChecked:true,verified:false,
   legalApplicabilityVerified:false,
   provisions:Object.freeze(sources),
   evidence:Object.freeze([]),
   note:'Реални текстове от локалния архив; приложимостта и компетентността не са преценени.'
  });
 };
}
