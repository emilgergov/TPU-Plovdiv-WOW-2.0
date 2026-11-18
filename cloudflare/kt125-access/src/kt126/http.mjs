import {createCase,listCases,readState,changeCase,validCaseId} from './registry.mjs';
export const registryJson=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
export async function registryHttp({request,env,who,config,now=Date.now()}){
 const path=new URL(request.url).pathname,db=env.KT125_DB;
 if(!who?.verified)return registryJson({error:'Влезте в профила си.'},403);
 const args={db,who,org:config.org,now};
 const detail=path.match(/^\/kt126\/registry\/([0-9a-f-]{36})(?:\/(external|state))?$/i);
 if(request.method==='GET'){
  if(path==='/kt126/registry')return registryJson({items:await listCases(args)});
  if(detail&&validCaseId(detail[1])&&!detail[2]){const data=await readState({...args,caseId:detail[1]});return data?registryJson(data):registryJson({error:'Нямате достъп до тази преписка.'},403)}
  return registryJson({error:'Невалиден адрес.'},404);
 }
 if(request.method!=='POST')return registryJson({error:'Неподдържано действие.'},405);
 if(request.headers.get('Origin')!==config.origin||(request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'))return registryJson({error:'Заявката е отказана.'},403);
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('Content-Type')||''))return registryJson({error:'Невалиден формат.'},415);
 let input;try{
  const reader=request.body?.getReader();let size=0,parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>950000){await reader.cancel();return registryJson({error:'Записът е твърде голям.'},413)}parts.push(value)}
  const data=new Uint8Array(size);let pos=0;for(const part of parts){data.set(part,pos);pos+=part.byteLength}input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  if(!input||Array.isArray(input)||typeof input!=='object')throw Error('Invalid object');
 }catch{return registryJson({error:'Проверете изпратените данни.'},400)}
 try{
  const result=path==='/kt126/registry/create'?await createCase({...args,input}):detail&&detail[2]?await changeCase({...args,caseId:detail[1],kind:detail[2],input}):{status:404};
  return registryJson(result.record?{record:result.record}:{error:result.status===409?'Преписката е променена в друг прозорец. Отворете я отново преди запис.':result.status===400?'Проверете данните и изричното потвърждение.':result.status===413?'Записът е твърде голям.':'Действието не е разрешено.'},result.status);
 }catch{return registryJson({error:'Записът не е потвърден. Опитайте отново със същата заявка.'},503)}
}
