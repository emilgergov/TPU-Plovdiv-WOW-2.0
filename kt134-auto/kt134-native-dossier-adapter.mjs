/**
 * KT134: server-side KT125/KT126 dossier loader.
 * Requires an authenticated KT125 principal from a trusted service adapter.
 * Does not accept case facts, permissions or evidence records from the browser.
 * Returns no synthetic or guessed administrative facts.
 */
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const str=x=>typeof x==='string'?x.trim():'';
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const list=x=>Array.isArray(x)?x:[];
const hash=async x=>{
 const raw=new TextEncoder().encode(typeof x==='string'?x:JSON.stringify(x));
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',raw));
 return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
};
const verified=(x,description)=>{if(!x)fail(description);return x;};
const select=async(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>{const r=await db.prepare(sql).bind(...args).all();return r.results||[]};
function decodeVersion(value){
 try{return JSON.parse(value||'{}')}catch{fail('KT126_VERSION_INVALID_JSON')}
}
const sourceDocuments=x=>{
 const a=list(x?.documents?.length?x.documents:x?.sourceTexts?.length?x.sourceTexts:x?.files);
 return a.filter(v=>obj(v)&&str(v.text)&&str(v.sourceId||v.source))
  .map(v=>({sourceId:str(v.sourceId||v.source),text:str(v.text),
     fileName:str(v.fileName||v.filename||v.name),
     type:str(v.type),date:str(v.date)}));
};
export function createKt134NativeDossierAdapters({db,resolvePrincipal,getNormativeMaster}={}){
 if(typeof db?.prepare!=='function'||typeof resolvePrincipal!=='function'||
    typeof getNormativeMaster!=='function')fail('KT134_NATIVE_ADAPTER_NOT_CONFIGURED');
 const snapshots=new Map();
 async function read({authenticatedSession,caseId}){
  if(!str(caseId)||!str(authenticatedSession))fail('KT125_AUTH_REQUIRED');
  const principal=await resolvePrincipal(authenticatedSession);
  if(!principal||!str(principal.userId)||principal.authenticated!==true)
    fail('KT125_AUTH_REQUIRED');
  const user=await select(db,'SELECT user_id,organization_id,role,active FROM kt125_users WHERE user_id=?',principal.userId);
  if(!user||Number(user.active)!==1||user.organization_id!==principal.organizationId||
     !['expert','egmaster','administrator','admin'].includes(String(user.role||'').toLowerCase()))
    fail('KT125_AUTH_REQUIRED');
  const c=await select(db,'SELECT case_id,organization_id,owner_id,status,updated_at_ms FROM kt125_cases WHERE case_id=? AND organization_id=?',caseId,user.organization_id);
  if(!c)fail('CASE_NOT_FOUND');
  const grant=c.owner_id!==user.user_id?await select(db,
   "SELECT grantee_id,actions_json,expires_at_ms,revoked_at_ms FROM kt125_grants WHERE case_id=? AND grantee_id=? AND organization_id=? AND revoked_at_ms IS NULL AND (expires_at_ms IS NULL OR expires_at_ms>?) ORDER BY created_at_ms DESC LIMIT 1",
    caseId,user.user_id,user.organization_id,Date.now()):null;
  let delegated=false;
  if(grant){
   try{const actions=JSON.parse(grant.actions_json||'[]');
     delegated=Array.isArray(actions)&&actions.some(x=>['read','write','process','*'].includes(x));
   }catch{/* Deny unknown grant shapes. */}
  }
  if(c.owner_id!==user.user_id&&!delegated)fail('CASE_ACCESS_DENIED');
  if(c.status!=='active')fail('CASE_NOT_ACTIVE');
  const registry=await select(db,'SELECT revision,internal_number,external_number,external_status FROM kt126_registry WHERE case_id=? AND organization_id=?',caseId,user.organization_id);
  if(!registry)fail('KT126_REGISTRY_NOT_FOUND');
  // Version state is authoritative; never use an unverified in-browser intake as an established fact.
  const versions=await all(db,'SELECT revision,kind,content_json FROM kt126_versions WHERE case_id=? ORDER BY revision DESC',caseId);
  const latest=versions.map(v=>({...v,data:decodeVersion(v.content_json)}));
  // KT126 stores E1–E5 snapshots under state, values and globals.
  // Read only persisted server versions; do not trust browser-provided facts.
  const get=(keys)=>{
    for(const v of latest){
      const roots=[v.data,v.data?.state,v.data?.values,v.data?.globals,
        v.data?.globals?.KT80IPMasterDraft,v.data?.globals?.KT80FreeGISResults];
      for(const root of roots)for(const key of keys)
        if(root&&root[key]!==undefined&&root[key]!==null)return root[key];
    }
    return null;
  };
  const rawSubject=get(['confirmedSubject','subjectText','subject','subjectConfirmed','kt80SubjectText','proposedSubject']);
  const rawScope=get(['confirmedScope','scopeText','scope','kt80ScopeText']);
  const subject=str(rawSubject?.text||rawSubject?.subject||rawSubject);
  const scope=str(rawScope?.text||rawScope?.scope||rawScope);
  if(!subject||!scope)fail('KT134_SUBJECT_OR_SCOPE_MISSING');
  if(!['confirmed','verified'].includes(registry.external_status))
    fail('KT126_EXTERNAL_NUMBER_NOT_CONFIRMED');
  const documents=latest.flatMap(v=>[
    ...sourceDocuments(v.data),
    ...sourceDocuments(v.data?.state?.intake),
    ...sourceDocuments(v.data?.globals?.KT80DossierAudit),
    ...sourceDocuments(v.data?.globals?.KT80CH2Passport)
  ]);
  const unique=[...new Map(documents.map(x=>[x.sourceId,x])).values()];
  const files=await all(db,'SELECT source_id,filename,sha256,complete FROM kt126_files WHERE case_id=?',caseId);
  if(!files.length||!files.every(f=>Number(f.complete)===1&&/^[a-f0-9]{64}$/i.test(f.sha256||'')))
    fail('KT126_FILE_MANIFEST_INCOMPLETE');
  const bySource=new Map(files.map(f=>[f.source_id,f]));
  if(!unique.length||unique.some(x=>!bySource.has(x.sourceId)))
    fail('KT134_VERIFIED_SOURCE_TEXTS_MISSING');
  const gis=get(['gis','spatialEvidence','gisResult','KT80FreeGISResults']);
  const gisMode=gis?.pdf1Ref&&gis?.sourceId?'required':
   get(['gisSkipConfirmed'])===true?'contextual_skip':null;
  if(!gisMode)fail('KT134_GIS_CONTEXT_UNCONFIRMED');
  const normative=await getNormativeMaster({caseId,principal});
  if(!normative||!str(normative.name)||!Array.isArray(normative.verifiedReferences)||
     normative.verifiedReferences.length===0||
     !/^[a-f0-9]{64}$/i.test(normative.sha256||''))
    fail('KT134_NORMATIVE_MASTER_MISSING');
  const piMaster=get(['piMaster','parcelMaster','KT80IPMasterDraft']);
  const parcelSource=get(['parcels','confirmedParcels','parcelsConfirmed']);
  const parcels=list(Array.isArray(parcelSource)?parcelSource:parcelSource?.parcels);
  const revision=String(Math.max(Number(registry.revision)||0,...latest.map(v=>Number(v.revision)||0)));
  const receipts={
    dossier:{type:'dossier',caseId,sourceId:'KT126_FILES',digest:await hash(files.map(f=>[f.source_id,f.sha256]).sort()),verifiedAt:'server'},
    normativeMaster:{type:'normative_master',caseId,sourceId:normative.name,digest:normative.sha256,verifiedAt:'server'},
    piMaster:{type:'pi_master',caseId,sourceId:'KT126_PI_MASTER',digest:await hash({parcels,piMaster}),verifiedAt:'server'}
  };
  if(gisMode==='required')receipts.gisPdf1={type:'gis_pdf1',caseId,sourceId:str(gis.sourceId),digest:await hash(gis),verifiedAt:'server'};
  const caseRecord={id:caseId,revision,subject,registryNumber:str(registry.external_number),
    registryConfirmed:true,status:'active',ownerUserId:user.user_id,
    gisMode,...(gisMode==='contextual_skip'?{gisSkipConfirmed:true,
      gisSkipReason:str(get(['gisSkipReason']))}:{})};
  if(gisMode==='contextual_skip'&&!caseRecord.gisSkipReason)fail('KT134_GIS_SKIP_REASON_MISSING');
  const ctx={principal:{source:'KT125_SERVER',authenticated:true,status:'active',
    userId:user.user_id,roles:['expert',...(delegated?['case_delegate']:[])]},
    caseRecord,evidence:receipts,policy:{source:'KT125_SERVER',liveAutomaticEnabled:true}};
  const bundle={caseId,revision,serverVerified:true,caseIsolated:true,
    receiptRefs:Object.values(receipts).map(v=>v.type+':'+v.digest),
    subject,scope,documents:unique,parcels,piMaster,gis:gisMode==='required'?gis:null,
    gisMode,gisSkipReason:caseRecord.gisSkipReason,normativeArchive:normative,
    registryNumber:caseRecord.registryNumber,
    pdf2Ref:str(get(['pdf2Ref'])),facts:list(get(['facts','confirmedFacts'])),
    procedureEvidence:list(get(['procedureEvidence']))};
  return {ctx,bundle};
 }
 return {
  async loadProtectedContext({authenticatedSession,caseId}){
   const data=await read({authenticatedSession,caseId});
   snapshots.set(authenticatedSession+':'+caseId,data);
   return data.ctx;
  },
  async loadEvidenceBundle({preflight,authenticatedSession}){
   const key=authenticatedSession+':'+preflight.case.caseId;
   const data=snapshots.get(key);
   if(!data)fail('KT134_CONTEXT_NOT_LOADED');
   snapshots.delete(key);
   return data.bundle;
  }
 };
}
