import {readCase,caseContext,actionGuard} from './registry.mjs';
export async function saveArtifact(args,{filename,revision,documentVersion,bytes}){
 if(!Number.isSafeInteger(revision)||revision<0||!Number.isSafeInteger(documentVersion)||documentVersion<1||typeof filename!=='string'||filename.length>240||!filename.endsWith('.docx')||/[\x00-\x1f/\\]/.test(filename)||bytes.byteLength>900000||!bytes.byteLength)return {status:400};
 const context=await caseContext({...args,action:'document.generate'});if(!context)return {status:403};if(context.revision!==revision)return {status:409};
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join(''),artifactId=crypto.randomUUID(),event=crypto.randomUUID();
 await args.db.batch([
 args.db.prepare(`INSERT INTO kt126_artifacts(artifact_id,case_id,actor_id,case_revision,document_version,filename,sha256,bytes,created_at_ms)
 SELECT ?,case_id,?,revision,?,?,?,?,? FROM kt126_registry WHERE case_id=? AND revision=? AND ${actionGuard.sql} ON CONFLICT(case_id,document_version,sha256) DO NOTHING`).bind(artifactId,args.who.userId,documentVersion,filename,hash,bytes,args.now,args.caseId,revision,...actionGuard.args(args.who,args.org,'document.generate',args.now)),
 args.db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
 SELECT ?,organization_id,case_id,?,'document.generate','created',?,?,json_object('artifact_id',?,'document_version',?,'revision',revision) FROM kt126_registry WHERE case_id=? AND changes()=1`).bind(event,args.who.userId,args.now,event,artifactId,documentVersion,args.caseId)
 ]);
 const row=await args.db.prepare('SELECT artifact_id,filename,document_version,created_at_ms FROM kt126_artifacts WHERE case_id=? AND document_version=? AND sha256=?').bind(args.caseId,documentVersion,hash).first();return row?{status:200,artifact:row}:{status:403};
}
export async function listArtifacts(args){if(!await readCase(args))return null;return (await args.db.prepare('SELECT artifact_id,filename,document_version,created_at_ms FROM kt126_artifacts WHERE case_id=? ORDER BY created_at_ms DESC LIMIT 50').bind(args.caseId).all()).results||[]}
export async function readArtifact(args,artifactId){if(!await readCase(args))return null;return args.db.prepare('SELECT filename,bytes FROM kt126_artifacts WHERE case_id=? AND artifact_id=?').bind(args.caseId,artifactId).first()}
