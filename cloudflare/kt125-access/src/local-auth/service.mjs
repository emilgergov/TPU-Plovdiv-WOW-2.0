import {sendPresentationBatch,queueStandardPresentation} from './presentation-mail.mjs';
import {WorkerEntrypoint,DurableObject} from 'cloudflare:workers';
import {hashPassword,verifyPassword} from './password.mjs';
import handler from './worker.mjs';
import {localConfig} from './common.mjs';
import {identity} from './store.mjs';
import {caseContext} from '../kt126/registry.mjs';
import {sendNotification,sendResetNotification,smtpConfig,verifySmtpConnection} from './mail.mjs';
// Only a configured server-side Cloudflare Service Binding can invoke RPC.
// There is deliberately no public HTTP endpoint for sending approval emails.
export class LocalAuthService extends WorkerEntrypoint {
 async getCaseContext({cookie,caseId,action}){
  const config=localConfig(this.env);if(!config||this.env.KT126_REGISTRY_ENABLED!=='true'||typeof cookie!=='string'||cookie.length>16000||!['case.edit','case.confirm','document.generate'].includes(action))return null;
  const now=Date.now(),request=new Request(config.origin+'/member',{headers:{Cookie:cookie}});
  const who=await identity({db:this.env.KT125_DB,request,config,now});
  return who?caseContext({db:this.env.KT125_DB,who,org:config.org,caseId,now,action}):null;
 }
 async queueStandardPresentation(input){return queueStandardPresentation(this.env,input)}
 async sendPresentationBatch(batchId){return sendPresentationBatch(this.env,batchId)}
 async verifyAuthorTransport(){
  if(!this.env.KT128_AUTHOR)return {configured:false};
  try{const config=localConfig(this.env);if(!config)return {configured:true,guarded:false};
   const response=await this.env.KT128_AUTHOR.fetch(new Request('https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/subject-improve',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','X-KT126-Case':'11111111-1111-4111-8111-111111111111','X-KT126-Session':'invalid'},body:'{"caseId":"11111111-1111-4111-8111-111111111111","subject":"diagnostic","facts":[]}'}));
   const json=response.headers.get('Content-Type')?.includes('application/json')||false;
   return {configured:true,status:response.status,json,guarded:response.status===403&&json};
  }catch{return {configured:true,guarded:false}}
 }
 async sendResetNotification(resetId){return sendResetNotification(this.env,resetId)}
 async verifyMailTransport(){return verifySmtpConnection(this.env)}
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

