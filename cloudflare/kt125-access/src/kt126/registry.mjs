const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validCaseId=x=>typeof x==='string'&&uuidPattern.test(x);
const authorRoles=new Set(['expert','egmaster','administrator']);
export const registryYear=now=>Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(now));
export async function sha256(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
const clean=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\x00-\x1f\x7f]/.test(value)?value.trim():null;
async function actor(db,who,org){if(who?.verified!==true||!who.userId)return null;return db.prepare('SELECT user_id,role FROM kt125_users WHERE user_id=? AND organization_id=? AND active=1').bind(who.userId,org).first()}
// Permission is re-evaluated by SQLite at mutation time, including grant expiry.
const accessSQL=`EXISTS(SELECT 1 FROM kt125_cases c JOIN kt125_users m ON m.organization_id=c.organization_id
 WHERE c.case_id=kt126_registry.case_id AND m.user_id=? AND m.organization_id=? AND m.active=1
 AND (c.status='active' OR ?='case.read')
 AND ((c.owner_id=m.user_id AND m.role IN ('expert','egmaster','administrator')) OR EXISTS(
 SELECT 1 FROM kt125_grants g JOIN json_each(g.actions_json) j WHERE g.case_id=c.case_id AND g.organization_id=c.organization_id
 AND g.grantee_id=m.user_id AND g.grantor_id=c.owner_id AND g.revoked_at_ms IS NULL AND g.not_before_ms<=? AND g.expires_at_ms>?
 AND j.value=?)))`;
const accessArgs=(who,org,action,now)=>[who.userId,org,action,now,now,action];
const columns=`kt126_registry.*,c.owner_id,c.status,c.updated_at_ms`;
export async function readCase({db,who,org,caseId,now=Date.now()}){
 if(!validCaseId(caseId)||who?.verified!==true)return null;
 return db.prepare(`SELECT ${columns} FROM kt126_registry JOIN kt125_cases c USING(case_id) WHERE case_id=? AND ${accessSQL}`).bind(caseId,...accessArgs(who,org,'case.read',now)).first();
}
export async function listCases({db,who,org,now=Date.now()}){
 if(who?.verified!==true)return [];
 const out=await db.prepare(`SELECT ${columns} FROM kt126_registry JOIN kt125_cases c USING(case_id) WHERE ${accessSQL} ORDER BY kt126_registry.created_at_ms DESC,case_id DESC LIMIT 100`).bind(...accessArgs(who,org,'case.read',now)).all();return out.results||[];
}
export async function createCase({db,who,org,input,now=Date.now(),uuid=()=>crypto.randomUUID()}){
 const user=await actor(db,who,org);if(!user||!authorRoles.has(user.role))return {status:403};
 const key=input?.requestKey,name=clean(input?.sourceName,512),hash=input?.sourceHash;
 if(!validCaseId(key)||!name||typeof hash!=='string'||!(/^[a-f0-9]{64}$/.test(hash)))return {status:400};
 const payload=await sha256(JSON.stringify({name,hash})),caseId=uuid(),event=uuid(),year=registryYear(now);
 if(!validCaseId(caseId)||!validCaseId(event)||caseId===event)return {status:503};
 const statements=[
 db.prepare(`INSERT INTO kt126_claims(organization_id,actor_id,request_key,case_id,payload_hash,year)
 SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM kt125_users WHERE user_id=? AND organization_id=? AND active=1 AND role IN ('expert','egmaster','administrator'))
 ON CONFLICT(organization_id,actor_id,request_key) DO NOTHING`).bind(org,user.user_id,key,caseId,payload,year,user.user_id,org),
 db.prepare(`INSERT INTO kt126_counters(organization_id,year,last_number) SELECT ?,?,1 WHERE changes()=1
 ON CONFLICT(organization_id,year) DO UPDATE SET last_number=last_number+1`).bind(org,year),
 db.prepare(`INSERT INTO kt125_cases(case_id,organization_id,owner_id,status,created_at_ms,updated_at_ms)
 SELECT case_id,organization_id,actor_id,'active',?,? FROM kt126_claims WHERE case_id=? AND changes()=1`).bind(now,now,caseId),
 db.prepare(`INSERT INTO kt126_registry(case_id,organization_id,year,sequence,internal_number,source_name,source_hash,created_at_ms)
 SELECT c.case_id,c.organization_id,c.year,n.last_number,printf('EG-%04d-%06d',c.year,n.last_number),?,?,?
 FROM kt126_claims c JOIN kt126_counters n ON n.organization_id=c.organization_id AND n.year=c.year WHERE c.case_id=? AND changes()=1`).bind(name,hash,now,caseId),
 db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
 SELECT ?,organization_id,case_id,?,'case.register','created',?,?,json_object('internal_number',internal_number) FROM kt126_registry WHERE case_id=? AND changes()=1`).bind(event,user.user_id,now,key,caseId)
 ];
 await db.batch(statements);
 const claim=await db.prepare('SELECT case_id,payload_hash FROM kt126_claims WHERE organization_id=? AND actor_id=? AND request_key=?').bind(org,user.user_id,key).first();
 if(!claim)return {status:403};if(claim.payload_hash!==payload)return {status:409};
 const record=await readCase({db,who,org,caseId:claim.case_id,now});return record?{status:claim.case_id===caseId?201:200,record}:{status:403};
}
export async function changeCase({db,who,org,caseId,input,kind,now=Date.now(),uuid=()=>crypto.randomUUID()}){
 if(!validCaseId(caseId)||who?.verified!==true||!Number.isSafeInteger(input?.revision)||input.revision<0)return {status:400};
 let value,evidence={};
 if(kind==='external'){
  if(!['confirm','omit'].includes(input.decision))return {status:400};
  value=input.decision==='confirm'?clean(input.number,240):null;
  if(input.decision==='confirm'&&(!value||input.confirm!==true))return {status:400};
  if(input.decision==='omit'&&input.confirm!==true)return {status:400};
  const file=clean(input.evidence?.file||'',512);if(file===null)return {status:400};
  evidence={file,page:1,area:'top-half',method:input.evidence?.method==='manual'?'manual':'document-proposal'};
 }else if(kind==='state'){
  if(!input.state||typeof input.state!=='object'||Array.isArray(input.state))return {status:400};
 }else return {status:400};
 const content=JSON.stringify(kind==='external'?{decision:input.decision,number:value,evidence}:input.state);
 if(new TextEncoder().encode(content).length>900000)return {status:413};
 const event=uuid();if(!validCaseId(event))return {status:503};
 const mutation=kind==='external'?
 db.prepare(`UPDATE kt126_registry SET external_number=?,external_status=?,external_by=?,external_at_ms=?,external_evidence_json=?,revision=revision+1 WHERE case_id=? AND revision=? AND ${accessSQL}`)
 .bind(value,input.decision==='confirm'?'confirmed':'omitted',who.userId,now,JSON.stringify(evidence),caseId,input.revision,...accessArgs(who,org,'case.edit',now)):
 db.prepare(`UPDATE kt126_registry SET revision=revision+1 WHERE case_id=? AND revision=? AND ${accessSQL}`).bind(caseId,input.revision,...accessArgs(who,org,'case.edit',now));
 const version=db.prepare(`INSERT INTO kt126_versions(case_id,revision,actor_id,kind,content_json,created_at_ms) SELECT case_id,revision,?,?,?,? FROM kt126_registry WHERE case_id=? AND changes()=1`).bind(who.userId,kind,content,now,caseId);
 const audit=db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
 SELECT ?,organization_id,case_id,?,?,'allowed',?,?,json_object('revision',revision,'kind',?) FROM kt126_registry WHERE case_id=? AND changes()=1`).bind(event,who.userId,kind==='external'?'case.external.confirm':'case.state.save',now,event,kind,caseId);
 const update=db.prepare('UPDATE kt125_cases SET updated_at_ms=? WHERE case_id=? AND changes()=1').bind(now,caseId);
 const results=await db.batch([mutation,version,audit,update]);
 if(results[0]?.meta?.changes!==1)return {status:(await readCase({db,who,org,caseId,now}))?409:403};
 return {status:200,record:await readCase({db,who,org,caseId,now})};
}
export async function readState({db,who,org,caseId,now=Date.now()}){
 const record=await readCase({db,who,org,caseId,now});if(!record)return null;
 const v=await db.prepare("SELECT revision,content_json FROM kt126_versions WHERE case_id=? AND kind='state' ORDER BY revision DESC LIMIT 1").bind(caseId).first();
 return {record,state:v?JSON.parse(v.content_json):null};
}
export async function canEditCase({db,who,org,caseId,now=Date.now()}){
 if(!validCaseId(caseId)||who?.verified!==true)return false;
 return !!await db.prepare(`SELECT case_id FROM kt126_registry WHERE case_id=? AND ${accessSQL}`).bind(caseId,...accessArgs(who,org,'case.edit',now)).first();
}
export const editGuard={sql:accessSQL,args:(who,org,now)=>accessArgs(who,org,'case.edit',now)};
export async function caseContext({db,who,org,caseId,action='case.read',now=Date.now()}){
 if(!validCaseId(caseId)||who?.verified!==true)return null;
 const row=await db.prepare(`SELECT case_id,internal_number,revision,external_number,external_status FROM kt126_registry WHERE case_id=? AND ${accessSQL}`).bind(caseId,...accessArgs(who,org,action,now)).first();
 return row?{verified:true,caseId:row.case_id,internalNumber:row.internal_number,revision:row.revision,externalNumber:row.external_status==='confirmed'?row.external_number:'',actorId:who.userId}:null;
}
export const actionGuard={sql:accessSQL,args:accessArgs};
export async function readHistory(args){
 if(!await readCase(args))return null;
 return (await args.db.prepare("SELECT revision,actor_id,kind,created_at_ms,CASE WHEN kind='external' THEN content_json ELSE NULL END AS external_json FROM kt126_versions WHERE case_id=? ORDER BY revision DESC LIMIT 100").bind(args.caseId).all()).results||[];
}
