import {resetProof} from './recovery.mjs';
import {localConfig,id,normalizeKT125Email,purposeToken} from './common.mjs';
export function smtpConfig(env){
 const host=env.KT125_SMTP_HOST,port=Number(env.KT125_SMTP_PORT),from=normalizeKT125Email(env.KT125_SMTP_FROM);
 if(typeof host!=='string'||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/i.test(host)||![465,587].includes(port)||!from||
  typeof env.KT125_SMTP_USER!=='string'||!env.KT125_SMTP_USER||/[\r\n]/.test(env.KT125_SMTP_USER)||typeof env.KT125_SMTP_PASSWORD!=='string'||!env.KT125_SMTP_PASSWORD)return null;
 return {host,port,from,user:env.KT125_SMTP_USER,password:env.KT125_SMTP_PASSWORD};
}
export async function deliverSmtp(env,message,{createTransport}={}){
 const smtp=smtpConfig(env);if(!smtp)return {state:'queued'};
 let transport;
 try{
  const factory=createTransport||(await import('nodemailer')).default.createTransport;
  transport=factory({host:smtp.host,port:smtp.port,secure:smtp.port===465,requireTLS:true,ignoreTLS:false,
   auth:{user:smtp.user,pass:smtp.password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
   connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,
   disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
  const result=await transport.sendMail({from:{name:'WOW · ТПУ Пловдив',address:smtp.from},
   to:message.to,subject:message.subject,text:message.text,messageId:message.messageId,
   disableFileAccess:true,disableUrlAccess:true});
  if(result.accepted?.some(a=>normalizeKT125Email(typeof a==='string'?a:a.address)===message.to))return {state:'accepted'};
  return {state:result.rejected?.length?'failed':'uncertain'};
 }catch(e){
  // SMTP cannot provide exactly-once delivery after an ambiguous disconnect.
  // Never retry an uncertain DATA result automatically; never expose SMTP errors.
  const beforeData=['EAUTH','EDNS','ECONNECTION','EENVELOPE'].includes(e?.code)||
   (['ESOCKET','ETIMEDOUT'].includes(e?.code)&&e?.command==='CONN');
  return {state:beforeData?'failed':'uncertain'};
 }finally{try{transport?.close()}catch{}}
}
export async function sendNotification(env,mailId,{deliver=deliverSmtp,now=Date.now()}={}){
 const config=localConfig(env);if(!config||!id(mailId)||!smtpConfig(env))return {ok:false,pending:true};
 const db=env.KT125_DB;
 try{
  const row=await db.prepare(`SELECT o.mail_id,a.account_id,a.username,a.email,a.display_name,a.credential_version,a.activation_nonce,a.activation_expires_ms
   FROM kt125_local_outbox o JOIN kt125_local_accounts a ON a.account_id=o.account_id AND a.organization_id=o.organization_id
   WHERE o.mail_id=? AND o.organization_id=? AND o.state IN ('queued','failed') AND a.state='approved' AND a.activated_at_ms IS NULL AND a.activation_expires_ms>?`).bind(mailId,config.org,now).first();
  if(!row)return {ok:false};
  const proof=await purposeToken(env,'activate',row);
  const link=config.origin+'/auth/activate?account='+row.account_id+'&token='+proof;
  const claimed=await db.prepare(`UPDATE kt125_local_outbox SET state='sending',attempt_at_ms=? WHERE mail_id=? AND state IN ('queued','failed') AND EXISTS(SELECT 1 FROM kt125_local_accounts a WHERE a.account_id=kt125_local_outbox.account_id AND a.activation_nonce=? AND a.credential_version=? AND a.state='approved' AND a.activated_at_ms IS NULL)`).bind(now,mailId,row.activation_nonce,row.credential_version).run();
  if(claimed?.meta?.changes!==1)return {ok:false};
  const result=await deliver(env,{to:row.email,subject:'WOW — заявката Ви за достъп е одобрена',
   messageId:`<wow-${mailId}@${new URL(config.origin).hostname}>`,
   text:`Здравейте, ${row.display_name}!\n\nЗаявката Ви за достъп до експертния модул WOW е одобрена.\nЗа първоначалния вход отворете връзката и въведете избраните от Вас потребителско име и парола:\n${link}\n\nВръзката е валидна 7 дни от одобрението. След първоначалния вход използвайте само потребителското си име и парола.\nПаролата Ви не е достъпна за администратора и не се изпраща с това писмо.`});
  const state=['accepted','failed','uncertain'].includes(result?.state)?result.state:'uncertain';
  await db.prepare("UPDATE kt125_local_outbox SET state=? WHERE mail_id=? AND state='sending' AND attempt_at_ms=?").bind(state,mailId,now).run();
  return {ok:state==='accepted',state};
 }catch{return {ok:false,state:'uncertain'}}
}

export async function sendResetNotification(env,resetId,{deliver=deliverSmtp,now=Date.now()}={}){
 const config=localConfig(env);if(!config||!id(resetId)||!smtpConfig(env))return {ok:false,pending:true};
 const db=env.KT125_DB;
 try{
  const row=await db.prepare(`SELECT r.*,a.email,a.display_name FROM kt125_local_resets r
   JOIN kt125_local_accounts a ON a.account_id=r.account_id AND a.credential_version=r.credential_version
   JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id
   WHERE r.reset_id=? AND a.organization_id=? AND r.mail_state IN ('queued','failed') AND r.used_at_ms IS NULL AND r.expires_at_ms>?
   AND a.state='approved' AND a.activated_at_ms IS NOT NULL AND u.active=1 AND u.role=a.approved_role`).bind(resetId,config.org,now).first();
  if(!row)return {ok:false};
  const proof=await resetProof(env,row);
  const claim=await db.prepare(`UPDATE kt125_local_resets SET mail_state='sending' WHERE reset_id=? AND mail_state IN ('queued','failed') AND used_at_ms IS NULL
   AND EXISTS(SELECT 1 FROM kt125_local_accounts a JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id WHERE a.account_id=kt125_local_resets.account_id AND a.credential_version=kt125_local_resets.credential_version AND u.active=1 AND a.state='approved')`).bind(resetId).run();
  if(claim.meta.changes!==1)return {ok:false};
  const result=await deliver(env,{to:row.email,subject:'WOW — възстановяване на парола',messageId:`<wow-reset-${resetId}@${new URL(config.origin).hostname}>`,
   text:`Здравейте, ${row.display_name}!\n\nЗа да зададете нова парола за WOW, отворете следната връзка до 30 минути:\n${config.origin}/auth/reset?request=${resetId}&token=${proof}\n\nАко не сте поискали тази промяна, не предприемайте действие. Паролата Ви остава същата. След успешната промяна всички отворени сесии се прекратяват.`});
  const state=['accepted','failed','uncertain'].includes(result?.state)?result.state:'uncertain';
  await db.prepare("UPDATE kt125_local_resets SET mail_state=? WHERE reset_id=? AND mail_state='sending'").bind(state,resetId).run();return {ok:state==='accepted',state};
 }catch{return {ok:false,state:'uncertain'}}
}

/** Private service RPC diagnostic: validates TLS and SMTP authentication only.
 * Never sends a message and never returns server text, credentials or tokens. */
export async function verifySmtpConnection(env,{createTransport}={}){
 const smtp=smtpConfig(env);if(!smtp)return {ok:false,configured:false,code:'CONFIGURATION'};
 let transport;
 try{
  const factory=createTransport||(await import('nodemailer')).default.createTransport;
  transport=factory({host:smtp.host,port:smtp.port,secure:smtp.port===465,requireTLS:true,ignoreTLS:false,
   auth:{user:smtp.user,pass:smtp.password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
   connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
   disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
  await transport.verify();return {ok:true,configured:true,authenticated:true};
 }catch(e){
  const codes=new Set(['EAUTH','EDNS','ECONNECTION','EENVELOPE','ESOCKET','ETIMEDOUT','ETLS','ECONNREFUSED','ERR_NOT_IMPLEMENTED']);
  const commands=new Set(['CONN','EHLO','HELO','STARTTLS','AUTH','AUTH PLAIN','AUTH LOGIN']);
  return {ok:false,configured:true,code:codes.has(e?.code)?e.code:'TRANSPORT_ERROR',
   command:commands.has(e?.command)?e.command:null,
   responseCode:Number.isInteger(e?.responseCode)&&e.responseCode>=100&&e.responseCode<=599?e.responseCode:null,
   runtimeUnsupported:/not implemented|is not a function/i.test(String(e?.message||''))};
 }finally{try{transport?.close()}catch{}}
}
