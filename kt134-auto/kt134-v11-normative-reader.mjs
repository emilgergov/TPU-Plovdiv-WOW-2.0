/**
 * KT134 protected host callback using the ORIGINAL V11 normative MASTER.
 * Returns verified archive TEXT and provenance, never legal applicability.
 * No personal dossier leaves the server; no direct network request.
 */
import {getLegalContext} from '../cloudflare/ai-author-v27/src/legal-v11-loader.mjs';
const V11='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
const text=x=>String(x??'').trim();
export function createKT134V11NormativeReader({getContext=getLegalContext}={}){
 if(typeof getContext!=='function')throw Error('Липсва нормативен MASTER');
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
  return Object.freeze({
   caseId,archiveSHA256:V11,sourceKind:'local_normative_master_v11',
   archiveTextIntegrityChecked:true,verified:false,
   legalApplicabilityVerified:false,
   provisions:Object.freeze(sources),
   evidence:Object.freeze([]),
   note:'Реални текстове от локалния архив; приложимостта и компетентността не са преценени.'
  });
 };
}
