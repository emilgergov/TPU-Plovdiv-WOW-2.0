// Includes receiving the response body. One attempt; late results never win.
export async function withAuthorDeadline(operation,{signal,timeoutMs=130000}={}){
 const controller=new AbortController();let timer,onAbort;
 const deadline=new Promise((_,reject)=>{
  const stop=()=>{controller.abort();const error=new Error('ЕГ услугата не отговори навреме. Текущите данни са запазени. Опитайте отново.');error.egTransport=true;reject(error)};
  onAbort=stop;
  if(signal?.aborted){stop();return}
  signal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(stop,timeoutMs);
 });
 try{return await Promise.race([deadline,Promise.resolve().then(()=>{
  if(controller.signal.aborted){const error=new Error('Заявката е прекратена. Текущите данни са запазени.');error.egTransport=true;throw error}
  return operation(controller.signal);
 })])}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort)}
}
