import {localConfig,normalizeKT125Email,id,digest} from './common.mjs';
import {presentationDefaults,presentationHtml} from './presentation.mjs';
import {deliverSmtp,smtpConfig} from './mail.mjs';
export const PRESENTATION_MAIL_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS kt127_mail_batches(batch_id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,actor_id TEXT NOT NULL,request_key TEXT NOT NULL,data_json TEXT NOT NULL,created_at_ms INTEGER NOT NULL,UNIQUE(organization_id,actor_id,request_key))`,
 `CREATE TABLE IF NOT EXISTS kt127_mail_recipients(batch_id TEXT NOT NULL,email TEXT NOT NULL,label TEXT NOT NULL,position INTEGER NOT NULL,state TEXT NOT NULL CHECK(state IN ('queued','sending','accepted','failed','uncertain')),attempt_at_ms INTEGER,PRIMARY KEY(batch_id,email),FOREIGN KEY(batch_id) REFERENCES kt127_mail_batches(batch_id))`
];
export async function setupPresentationMail(db){for(const sql of PRESENTATION_MAIL_SCHEMA)await db.prepare(sql).run();}
export function presentationText(data,origin){const d={...presentationDefaults,...data};return `РИОСВ – ПЛОВДИВ ПРЕДСТАВЯ\nWOW · Експертен административен модул\n\nЕдна преписка. Свързани данни. Обосновани решения.\n\n${d.intro}\n\n${d.panels.map(([title,body])=>title+'\n'+body).join('\n\n')}\n\nРазвитие към 22 административни панела\n${d.development}\n\nЕкспертът проверява, потвърждава и решава.\n\n${d.cta}\nЗаяви достъп: ${origin}/auth/register\nВход за регистрирани потребители: ${origin}/auth/login\n\nРИОСВ – Пловдив\nгр. Пловдив, бул. „Марица“ № 122\nriosv@plovdiv.riew.gov.bg\nhttps://plovdiv.riew.gov.bg/\n`}
export async function queuePresentation({db,org,actorId,requestKey,data,recipients,now=Date.now(),uuid=()=>crypto.randomUUID()}){
 if(!id(actorId)||typeof requestKey!=='string'||requestKey.length>220||!requestKey||!data?.subject||/[\r\n]/.test(data.subject)||data.subject.length>180||!Array.isArray(data.panels)||data.panels.length!==5||!Array.isArray(recipients)||!recipients.length||recipients.length>50)return null;
 const targets=[];for(const [position,r] of recipients.entries()){const email=normalizeKT125Email(typeof r==='string'?r:r.email);if(!email)return null;if(!targets.some(x=>x.email===email))targets.push({email,label:typeof r==='string'?email:String(r.label||email).slice(0,160),position});}
 await setupPresentationMail(db);
 const existing=await db.prepare('SELECT batch_id FROM kt127_mail_batches WHERE organization_id=? AND actor_id=? AND request_key=?').bind(org,actorId,requestKey).first();if(existing)return existing.batch_id;
 const batchId=uuid();if(!id(batchId))return null;
 const actor=`EXISTS(SELECT 1 FROM kt125_users WHERE user_id=? AND organization_id=? AND active=1 AND role IN ('egmaster','administrator'))`;
 const writes=[db.prepare(`INSERT INTO kt127_mail_batches(batch_id,organization_id,actor_id,request_key,data_json,created_at_ms) SELECT ?,?,?,?,?,? WHERE ${actor} ON CONFLICT(organization_id,actor_id,request_key) DO NOTHING`).bind(batchId,org,actorId,requestKey,JSON.stringify(data),now,actorId,org),...targets.map(r=>db.prepare(`INSERT INTO kt127_mail_recipients(batch_id,email,label,position,state) SELECT ?,?,?,?,'queued' WHERE EXISTS(SELECT 1 FROM kt127_mail_batches WHERE batch_id=? AND organization_id=? AND actor_id=?)`).bind(batchId,r.email,r.label,r.position,batchId,org,actorId))];
 await db.batch(writes);
 const row=await db.prepare('SELECT batch_id FROM kt127_mail_batches WHERE organization_id=? AND actor_id=? AND request_key=?').bind(org,actorId,requestKey).first();return row?.batch_id||null;
}
export async function presentationDeliveryReport(db,org,actorId,batchId){
 if(!id(batchId))return null;const batch=await db.prepare('SELECT batch_id FROM kt127_mail_batches WHERE batch_id=? AND organization_id=? AND actor_id=?').bind(batchId,org,actorId).first();if(!batch)return null;
 const rows=await db.prepare('SELECT email,label,state FROM kt127_mail_recipients WHERE batch_id=? ORDER BY position').bind(batchId).all();return {batchId,recipients:rows.results||[]};
}
// Private service-binding operation for an explicitly authorized operator run.
// Resolves registered addresses inside the service; never accepts credentials,
// public cookies or a public HTTP request as proof of administrator authority.
export async function queueStandardPresentation(env,{actorUsername,usernames=[],extraEmails=[],requestKey}={}){
 const config=localConfig(env);if(!config||typeof actorUsername!=='string'||!Array.isArray(usernames)||!Array.isArray(extraEmails)||usernames.length+extraEmails.length>50)return {ok:false};
 const db=env.KT125_DB;
 const actor=await db.prepare(`SELECT a.user_id FROM kt125_local_accounts a JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id WHERE a.organization_id=? AND a.username=? AND a.state='approved' AND a.activated_at_ms IS NOT NULL AND u.active=1 AND u.role IN ('egmaster','administrator')`).bind(config.org,actorUsername).first();if(!actor)return {ok:false};
 const recipients=[];for(const email of extraEmails){if(!normalizeKT125Email(email))return {ok:false};recipients.push({email,label:email});}
 for(const name of usernames){if(typeof name!=='string')return {ok:false};const r=await db.prepare(`SELECT a.email,a.username FROM kt125_local_accounts a JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id WHERE a.organization_id=? AND a.username=? AND a.state='approved' AND a.activated_at_ms IS NOT NULL AND u.active=1`).bind(config.org,name).first();if(!r)return {ok:false,reason:'registered_recipient_unavailable'};recipients.push({email:r.email,label:r.username});}
 const batchId=await queuePresentation({db,org:config.org,actorId:actor.user_id,requestKey,data:presentationDefaults,recipients});return {ok:Boolean(batchId),batchId,report:batchId?await presentationDeliveryReport(db,config.org,actor.user_id,batchId):null};
}
export async function sendPresentationBatch(env,batchId,{deliver=deliverSmtp,now=()=>Date.now()}={}){
 const config=localConfig(env),smtp=smtpConfig(env);if(!config||!id(batchId)||smtp?.from!=='gergov@plovdiv.riew.gov.bg')return {ok:false,reason:'sender_not_ready'};
 const db=env.KT125_DB;await setupPresentationMail(db);
 const batch=await db.prepare(`SELECT b.* FROM kt127_mail_batches b JOIN kt125_users u ON u.user_id=b.actor_id AND u.organization_id=b.organization_id WHERE b.batch_id=? AND b.organization_id=? AND u.active=1 AND u.role IN ('egmaster','administrator')`).bind(batchId,config.org).first();if(!batch)return {ok:false,reason:'not_authorized'};
 const data=JSON.parse(batch.data_json),rows=await db.prepare("SELECT email FROM kt127_mail_recipients WHERE batch_id=? AND state='queued' ORDER BY position").bind(batchId).all();
 // One envelope per recipient. A queued row can be claimed only once. Neither
 // failed nor ambiguous DATA outcomes are automatically retried on a replay.
 for(const row of rows.results||[]){
  const at=now(),claim=await db.prepare(`UPDATE kt127_mail_recipients SET state='sending',attempt_at_ms=? WHERE batch_id=? AND email=? AND state='queued' AND EXISTS(SELECT 1 FROM kt125_users WHERE user_id=? AND organization_id=? AND active=1 AND role IN ('egmaster','administrator'))`).bind(at,batchId,row.email,batch.actor_id,config.org).run();
  if(claim.meta.changes!==1)continue;
  let state='uncertain';try{const result=await deliver(env,{to:row.email,senderName:'РИОСВ – Пловдив · WOW',subject:data.subject,html:presentationHtml(data,config.origin),text:presentationText(data,config.origin),messageId:`<wow-invitation-${batchId}-${(await digest(row.email)).slice(0,20)}@${new URL(config.origin).hostname}>`});if(['accepted','failed','uncertain'].includes(result?.state))state=result.state;}catch{}
  await db.prepare("UPDATE kt127_mail_recipients SET state=? WHERE batch_id=? AND email=? AND state='sending' AND attempt_at_ms=?").bind(state,batchId,row.email,at).run();
 }
 const report=await presentationDeliveryReport(db,config.org,batch.actor_id,batchId);return {ok:report?.recipients.every(x=>x.state==='accepted')||false,...report};
}
