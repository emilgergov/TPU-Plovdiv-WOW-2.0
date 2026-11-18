import {readCase,canEditCase,editGuard} from './registry.mjs';
import {createHash} from 'node:crypto';
const CHUNK=256*1024,MAX=40*1024*1024;
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function sourceInfo(args){if(!await readCase(args))return null;return args.db.prepare('SELECT filename,size,sha256,parts,complete FROM kt126_files WHERE case_id=?').bind(args.caseId).first()}
export async function startSource(args,input){
 const record=await readCase(args);if(!record||!await canEditCase(args))return {status:403};
 if(!Number.isSafeInteger(input?.size)||input.size<1||input.size>MAX||input.sha256!==record.source_hash||typeof input.filename!=='string'||input.filename!==record.source_name)return {status:400};
 const parts=Math.ceil(input.size/CHUNK);
 await args.db.prepare(`INSERT INTO kt126_files(case_id,filename,size,sha256,parts) SELECT case_id,?,?,?,? FROM kt126_registry WHERE case_id=? AND ${editGuard.sql} ON CONFLICT(case_id) DO NOTHING`).bind(input.filename,input.size,input.sha256,parts,args.caseId,...editGuard.args(args.who,args.org,args.now)).run();
 const file=await sourceInfo(args);return file&&file.size===input.size&&file.sha256===input.sha256?{status:200,file}:{status:409};
}
export async function putSourcePart(args,part,bytes){
 const file=await sourceInfo(args);if(!file||!await canEditCase(args))return {status:403};
 const size=bytes.byteLength,expected=part===file.parts-1?file.size-CHUNK*part:CHUNK;
 if(!Number.isSafeInteger(part)||part<0||part>=file.parts||size!==expected)return {status:400};
 const hash=hex(await crypto.subtle.digest('SHA-256',bytes));
 if(!file.complete)await args.db.prepare(`INSERT INTO kt126_chunks(case_id,part,bytes,sha256,size) SELECT case_id,?,?,?,? FROM kt126_registry WHERE case_id=? AND ${editGuard.sql} ON CONFLICT(case_id,part) DO NOTHING`).bind(part,bytes,hash,size,args.caseId,...editGuard.args(args.who,args.org,args.now)).run();
 const old=await args.db.prepare('SELECT sha256 FROM kt126_chunks WHERE case_id=? AND part=?').bind(args.caseId,part).first();return {status:old?.sha256===hash?200:409};
}
export async function finishSource(args){
 if(!await canEditCase(args))return {status:403};const event=crypto.randomUUID();
 const original=await sourceInfo(args);if(!original)return {status:404};
 if(!original.complete){
  const digest=createHash('sha256');let total=0;
  for(let n=0;n<original.parts;n++){const row=await args.db.prepare('SELECT bytes,size FROM kt126_chunks WHERE case_id=? AND part=?').bind(args.caseId,n).first();if(!row)return {status:409};const bytes=new Uint8Array(row.bytes);total+=bytes.byteLength;digest.update(bytes)}
  if(total!==original.size||digest.digest('hex')!==original.sha256)return {status:409};
 }
 await args.db.batch([
 args.db.prepare(`UPDATE kt126_files SET complete=1 WHERE case_id=? AND complete=0 AND parts=(SELECT COUNT(*) FROM kt126_chunks WHERE case_id=kt126_files.case_id) AND size=(SELECT SUM(size) FROM kt126_chunks WHERE case_id=kt126_files.case_id)
 AND EXISTS(SELECT 1 FROM kt126_registry WHERE kt126_registry.case_id=kt126_files.case_id AND ${editGuard.sql})`).bind(args.caseId,...editGuard.args(args.who,args.org,args.now)),
 args.db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
 SELECT ?,organization_id,case_id,?,'case.source.store','created',?,?,json_object('filename',source_name) FROM kt126_registry WHERE case_id=? AND changes()=1`).bind(event,args.who.userId,args.now,event,args.caseId)
 ]);
 const file=await sourceInfo(args);return {status:file?.complete?200:409,file};
}
export async function getSourcePart(args,part){
 const file=await sourceInfo(args);if(!file?.complete||!Number.isSafeInteger(part)||part<0||part>=file.parts)return null;
 return args.db.prepare('SELECT bytes FROM kt126_chunks WHERE case_id=? AND part=?').bind(args.caseId,part).first();
}
