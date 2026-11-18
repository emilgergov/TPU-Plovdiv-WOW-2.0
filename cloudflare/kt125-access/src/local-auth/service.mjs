import {WorkerEntrypoint,DurableObject} from 'cloudflare:workers';
import {hashPassword,verifyPassword} from './password.mjs';
import handler from './worker.mjs';
import {sendNotification,sendResetNotification,smtpConfig} from './mail.mjs';
// Only a configured server-side Cloudflare Service Binding can invoke RPC.
// There is deliberately no public HTTP endpoint for sending approval emails.
export class LocalAuthService extends WorkerEntrypoint {
 async sendResetNotification(resetId){return sendResetNotification(this.env,resetId)}
 async getStatus(){return {configured:Boolean(smtpConfig(this.env))}}
 async sendNotification(mailId){return sendNotification(this.env,mailId)}
}
// Native memory-hard password work runs in our own Durable Object, whose CPU
// budget accommodates the KDF. Nothing is persisted in this object.
export class PasswordKdf extends DurableObject {
 async hash(password){return this.ctx.blockConcurrencyWhile(()=>hashPassword(password))}
 async verify(password,encoded){return this.ctx.blockConcurrencyWhile(()=>verifyPassword(password,encoded))}
}
export default handler;
