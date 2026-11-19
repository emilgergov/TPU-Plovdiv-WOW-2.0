const messages = {
 EG_CREDIT_EXHAUSTED: 'ЕГ услугата е спряла поради изчерпан кредит или достигнат лимит за разход. Уведомете администратора. Текущите данни са запазени.',
 EG_RATE_LIMIT: 'Достигнато е временно ограничение за заявки към ЕГ услугата. Изчакайте малко и опитайте отново. Текущите данни са запазени.',
 EG_PROVIDER_ACCESS: 'ЕГ доставчикът отказва служебния достъп. Уведомете администратора; не сменяйте паролата на профила си. Текущите данни са запазени.',
 EG_PROVIDER_TIMEOUT: 'ЕГ услугата не отговори навреме. Заявката е прекратена; текущите данни са запазени. Можете да опитате отново.',
 EG_PROVIDER_UNAVAILABLE: 'ЕГ услугата временно не е достъпна. Текущите данни са запазени. Опитайте по-късно.'
};
export class ProviderFailure extends Error {
 constructor(code,status,providerStatus=null,retryAfter=null){
  super(messages[code]);this.name='ProviderFailure';
  this.result={status,body:{error:code,message:this.message,transportFailure:true,retryable:['EG_RATE_LIMIT','EG_PROVIDER_TIMEOUT','EG_PROVIDER_UNAVAILABLE'].includes(code)}};
  if(Number.isInteger(providerStatus))this.result.body.providerStatus=providerStatus;
  if(retryAfter!==null&&/^\d{1,3}$/.test(String(retryAfter)))this.result.body.retryAfterSeconds=Math.min(120,Number(retryAfter));
 }
}
export const providerFailureData=error=>error instanceof ProviderFailure?error.result:null;
export const replyProviderFailure=(error,reply)=>{const failure=providerFailureData(error);return failure?reply(failure.body,failure.status):null;};
// Never retry here or disclose upstream error text, credentials or account details.
export async function providerFetch(url,options,fetcher=fetch){
 if(url!=='https://api.openai.com/v1/responses')throw Error('Unexpected provider endpoint');
 let response;
 try{response=await fetcher(url,options)}catch(error){
  throw new ProviderFailure(options?.signal?.aborted||error?.name==='AbortError'?'EG_PROVIDER_TIMEOUT':'EG_PROVIDER_UNAVAILABLE',options?.signal?.aborted||error?.name==='AbortError'?504:503);
 }
 if(response.ok)return response;
 let failure;try{failure=(await response.json())?.error}catch{}
 const code=String(failure?.code||''),type=String(failure?.type||'');
 if(['credit_balance_exhausted','organization_usage_limit_exceeded','billing_hard_limit_reached','insufficient_quota'].includes(code)||type==='insufficient_quota')throw new ProviderFailure('EG_CREDIT_EXHAUSTED',503,response.status);
 if(response.status===429)throw new ProviderFailure('EG_RATE_LIMIT',429,429,response.headers.get('retry-after'));
 if(response.status===401||response.status===403)throw new ProviderFailure('EG_PROVIDER_ACCESS',502,response.status);
 if(response.status===408||response.status===504)throw new ProviderFailure('EG_PROVIDER_TIMEOUT',504,response.status);
 throw new ProviderFailure('EG_PROVIDER_UNAVAILABLE',503,response.status);
}
