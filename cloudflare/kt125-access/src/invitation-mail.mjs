/** Optional transactional-email transport. Nothing is sent without explicit
 * deployment configuration, a manager command and an approved invitation.
 * Provider acceptance is not a delivery receipt. */
import {kt125ManagementPrincipal} from './management-read.mjs';
import {normalizeKT125Email} from './identity-email.mjs';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const fail=code=>({ok:false,code});
export async function sendKT125InvitationMail({request,verifier,db,invitationId,env,nowMs=Date.now(),fetcher=fetch}={}){
 if(!id(invitationId)||!Number.isSafeInteger(nowMs))return fail('INVALID_REQUEST');
 const actor=await kt125ManagementPrincipal({request,verifier,db});
 if(!actor||!['egmaster','administrator'].includes(actor.role))return fail('NOT_PERMITTED');
 const from=normalizeKT125Email(env?.KT125_MAIL_FROM);
 let origin;
 try{const u=new URL(env.KT125_PRIVATE_ORIGIN);if(u.protocol!=='https:'||u.origin!==env.KT125_PRIVATE_ORIGIN)throw Error();origin=u.origin;}catch{return fail('MAIL_NOT_CONFIGURED')}
 if(!from||env?.KT125_MAIL_TRANSPORT!=='resend'||typeof env?.KT125_MAIL_API_KEY!=='string'||!env.KT125_MAIL_API_KEY||/[\r\n]/.test(env.KT125_MAIL_API_KEY))return fail('MAIL_NOT_CONFIGURED');
 let identity;try{identity=await verifier.verify(request)}catch{return fail('NOT_PERMITTED')}
 if(identity?.verified!==true)return fail('NOT_PERMITTED');
 try{
  const invitation=await db.prepare(`SELECT email,display_name,expires_at_ms,identity_provider,status,accepted_user_id FROM kt125_staff_invitations
   WHERE invitation_id=? AND organization_id=? AND status IN ('pending','accepted') AND expires_at_ms>?`).bind(invitationId,actor.organizationId,nowMs).first();
  if(!invitation||!normalizeKT125Email(invitation.email))return fail('MAIL_NOT_SENDABLE');
  const member=invitation.identity_provider===env.KT125_MEMBER_ISSUER&&Boolean(env.KT125_MEMBER_ISSUER);
  if(member){
   try{const u=new URL(env.KT125_MEMBER_ORIGIN);if(u.protocol!=='https:'||u.origin!==env.KT125_MEMBER_ORIGIN)throw Error();origin=u.origin;}catch{return fail('MAIL_NOT_CONFIGURED')}
  }else if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(invitation.identity_provider))return fail('MAIL_NOT_CONFIGURED');
  let acceptedTarget=null;
  if(invitation.status==='accepted'){
   if(!member)return fail('MAIL_NOT_SENDABLE');
   const linked=await db.prepare(`SELECT a.linked_user_id FROM kt125_member_accounts a JOIN kt125_access_requests r ON r.request_id=a.request_id WHERE r.invitation_id=? AND r.organization_id=? AND r.status='approved' AND a.linked_user_id=?`).bind(invitationId,actor.organizationId,invitation.accepted_user_id).first();
   if(!linked)return fail('MAIL_NOT_SENDABLE');acceptedTarget=linked.linked_user_id;
  }
  const initialPayload={from,to:[invitation.email],subject:'WOW — одобрена заявка за достъп',
   text:`Здравейте, ${invitation.display_name}!\n\nЗаявката Ви за достъп до WOW е одобрена.\n${member?'Влезте с потребителското име и паролата, избрани при регистрацията. Не е необходим нов код.':'Отворете адреса и влезте с този имейл, за да активирате профила:'}\n${origin}${member?'/auth/login':'/kt125/enrollment/activate'}\n\n${acceptedTarget?'Съществуващият Ви служебен профил е запазен.':'Поканата за първоначален вход е валидна до '+new Date(invitation.expires_at_ms).toISOString()+'.'}\nПредоставената роля не дава автоматичен достъп до чужди преписки.`};
  // One lease per email. Retry only within 23 hours of first attempt because the
  // provider's idempotency window is 24h. Freeze payload configuration on claim.
  const claim=await db.prepare(`UPDATE kt125_invitation_mail SET state='sending',
   first_attempt_ms=COALESCE(first_attempt_ms,?),attempt_at_ms=?,
   from_email=COALESCE(from_email,?),activation_origin=COALESCE(activation_origin,?),payload_json=COALESCE(payload_json,?)
   WHERE invitation_id=? AND organization_id=? AND state IN ('queued','failed','sending')
    AND (first_attempt_ms IS NULL OR (first_attempt_ms<=? AND first_attempt_ms>?))
    AND (attempt_at_ms IS NULL OR attempt_at_ms<=?)
    AND EXISTS(SELECT 1 FROM kt125_staff_invitations i WHERE i.invitation_id=kt125_invitation_mail.invitation_id
     AND i.organization_id=? AND (i.status='pending' OR (i.status='accepted' AND i.accepted_user_id=?)) AND i.expires_at_ms>?)
    AND EXISTS(SELECT 1 FROM kt125_users a WHERE a.user_id=? AND a.organization_id=? AND a.identity_provider=?
     AND a.provider_subject=? AND a.active=1 AND a.role IN ('egmaster','administrator'))
   RETURNING from_email,activation_origin,payload_json`
  ).bind(nowMs,nowMs,from,origin,JSON.stringify(initialPayload),invitationId,actor.organizationId,nowMs,nowMs-23*3600000,nowMs-300000,
   actor.organizationId,acceptedTarget,nowMs,actor.userId,actor.organizationId,identity.issuer,identity.subject).first();
  if(!claim)return fail('MAIL_NOT_SENDABLE');
  const payload=JSON.parse(claim.payload_json);
  let providerId=null;
  try{
   const response=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'manual',
    headers:{Authorization:'Bearer '+env.KT125_MAIL_API_KEY,'Content-Type':'application/json',
     'Idempotency-Key':'kt125-invitation/'+invitationId},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
   if(response.status===200&&!response.redirected){const data=await response.json();if(id(data.id))providerId=data.id;}
  }catch{/* Never expose provider responses, token or recipient in diagnostics. */}
  const result=await db.prepare(`UPDATE kt125_invitation_mail SET state=?,provider_id=?
   WHERE invitation_id=? AND organization_id=? AND state='sending' AND attempt_at_ms=?`
  ).bind(providerId?'accepted':'failed',providerId,invitationId,actor.organizationId,nowMs).run();
  if(result?.meta?.changes!==1)return fail('MAIL_RESULT_UNCERTAIN');
  return providerId?{ok:true,accepted:true}:fail('MAIL_NOT_ACCEPTED');
 }catch{return fail('MAIL_UNAVAILABLE')}
}
