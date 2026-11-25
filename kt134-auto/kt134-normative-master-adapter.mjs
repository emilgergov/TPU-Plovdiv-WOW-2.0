/**
 * KT134 normative MASTER adapter:
 * Verifies actual EG V11 legal archive readiness (not a static assertion).
 * Hash and document count come from the live /legal-archive-health route.
 * These reference identifiers are index hints only; legal applicability is
 * evaluated independently by EG Author and Reviewer for each dossier.
 */
const verifiedIds=[
 {id:'core/ZBR_2024.txt#31',act:'Закон за биологичното разнообразие',article:'31'},
 {id:'core/ZOOS_2026_51.txt#93',act:'Закон за опазване на околната среда',article:'93'},
 {id:'additions/N_OS_2025.txt#2',act:'Наредба за оценка за съвместимост',article:'2'},
 {id:'additions/N_OS_2025.txt#6а',act:'Наредба за оценка за съвместимост',article:'6а'}
];
const error=code=>{const e=new Error(code);e.code=code;throw e};
export function createKt134NormativeMasterLoader({egWorkerBase,fetchImpl=fetch}={}){
 if(!/^https:\/\//.test(egWorkerBase||'')||typeof fetchImpl!=='function')
  error('KT134_NORMATIVE_HEALTH_NOT_CONFIGURED');
 const url=egWorkerBase.replace(/\/$/,'')+'/legal-archive-health';
 let current=null;
 return async function getNormativeMaster(){
   // Recheck readiness for each case; never allow a stale cross-case approval.
   const response=await fetchImpl(url,{method:'GET',cache:'no-store'});
   const health=await response.json().catch(()=>({}));
   if(!response.ok||health.status!=='ready'||
      !/^[a-f0-9]{64}$/i.test(health.archiveSHA256||'')||
      !Number.isInteger(health.exactProvisionsReady)||health.exactProvisionsReady<7||
      !Number.isInteger(health.requiredProvisionsVerified)||health.requiredProvisionsVerified<7)
     error('KT134_NORMATIVE_MASTER_NOT_READY');
   current=health.archiveSHA256;
   return {name:'TPU Plovdiv V11 legal corpus',sha256:current,
     verifiedReferences:verifiedIds.map(v=>({...v,applicabilityVerified:false}))};
 };
}
