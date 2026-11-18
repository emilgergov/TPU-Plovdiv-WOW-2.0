import {createCase,listCases,readState,changeCase,validCaseId} from './registry.mjs';
import {sourceInfo,startSource,putSourcePart,finishSource,getSourcePart} from './files.mjs';
import {saveArtifact,listArtifacts,readArtifact} from './artifacts.mjs';
export const registryJson=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
export async function registryHttp({request,env,who,config,now=Date.now()}){
 const path=new URL(request.url).pathname,db=env.KT125_DB;
 if(!who?.verified)return registryJson({error:'Влезте в профила си.'},403);
 const args={db,who,org:config.org,now};
 const detail=path.match(/^\/kt126\/registry\/([0-9a-f-]{36})(?:\/(external|state))?$/i);
 const source=path.match(/^\/kt126\/registry\/([0-9a-f-]{36})\/source(?:\/(start|finish|part\/(\d+)))?$/i);
 const artifacts=path.match(/^\/kt126\/registry\/([0-9a-f-]{36})\/artifacts(?:\/([0-9a-f-]{36}))?$/i);
 if(request.method==='GET'){
  if(artifacts){const a={...args,caseId:artifacts[1]};if(artifacts[2]){const doc=await readArtifact(a,artifacts[2]);return doc?new Response(new Uint8Array(doc.bytes),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(doc.filename),'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}}):registryJson({error:'Нямате достъп до документа.'},403)}const items=await listArtifacts(a);return items?registryJson({items}):registryJson({error:'Нямате достъп до преписката.'},403)}
  if(source){const a={...args,caseId:source[1]};if(!source[2]){const file=await sourceInfo(a);return file?registryJson({file}):registryJson({error:'Оригиналът не е наличен.'},404)}
   if(source[3]!==undefined){const row=await getSourcePart(a,Number(source[3]));return row?new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}}):registryJson({error:'Нямате достъп до оригинала.'},403)}
  }
  if(path==='/kt126/registry')return registryJson({items:await listCases(args)});
  if(detail&&validCaseId(detail[1])&&!detail[2]){const data=await readState({...args,caseId:detail[1]});return data?registryJson(data):registryJson({error:'Нямате достъп до тази преписка.'},403)}
  return registryJson({error:'Невалиден адрес.'},404);
 }
 if(request.method!=='POST')return registryJson({error:'Неподдържано действие.'},405);
 if(request.headers.get('Origin')!==config.origin||(request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'))return registryJson({error:'Заявката е отказана.'},403);
 if(artifacts&&!artifacts[2]){
  if(request.headers.get('Content-Type')!=='application/octet-stream')return registryJson({error:'Невалиден формат.'},415);
  const reader=request.body?.getReader();let size=0,parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>900000){await reader.cancel();return registryJson({error:'Документът е твърде голям.'},413)}parts.push(value)}
  const bytes=new Uint8Array(size);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.byteLength}
  try{const result=await saveArtifact({...args,caseId:artifacts[1]},{filename:decodeURIComponent(request.headers.get('X-Document-Name')||''),revision:Number(request.headers.get('X-Case-Revision')),documentVersion:Number(request.headers.get('X-Document-Version')),bytes:bytes.buffer});return registryJson(result.artifact?{artifact:result.artifact}:{error:result.status===409?'Преписката е променена. Проверете потвърдения документ.':'Документът не е записан.'},result.status)}catch{return registryJson({error:'Документът не е записан. Опитайте отново.'},503)}
 }
 if(source&&source[3]!==undefined){
  if(request.headers.get('Content-Type')!=='application/octet-stream')return registryJson({error:'Невалиден формат.'},415);
  const reader=request.body?.getReader();let size=0,parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256*1024){await reader.cancel();return registryJson({error:'Частта е твърде голяма.'},413)}parts.push(value)}
  const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.byteLength}
  try{const result=await putSourcePart({...args,caseId:source[1]},Number(source[3]),bytes.buffer);return registryJson(result,result.status)}catch{return registryJson({error:'Частта не е записана. Повторете изпращането.'},503)}
 }
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('Content-Type')||''))return registryJson({error:'Невалиден формат.'},415);
 let input;try{
  const reader=request.body?.getReader();let size=0,parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>950000){await reader.cancel();return registryJson({error:'Записът е твърде голям.'},413)}parts.push(value)}
  const data=new Uint8Array(size);let pos=0;for(const part of parts){data.set(part,pos);pos+=part.byteLength}input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  if(!input||Array.isArray(input)||typeof input!=='object')throw Error('Invalid object');
 }catch{return registryJson({error:'Проверете изпратените данни.'},400)}
 try{
  const result=source?source[2]==='start'?await startSource({...args,caseId:source[1]},input):source[2]==='finish'?await finishSource({...args,caseId:source[1]}):{status:404}:path==='/kt126/registry/create'?await createCase({...args,input}):detail&&detail[2]?await changeCase({...args,caseId:detail[1],kind:detail[2],input}):{status:404};
  return registryJson(result.record?{record:result.record}:result.file?{file:result.file}:{error:result.status===409?'Преписката е променена в друг прозорец. Отворете я отново преди запис.':result.status===400?'Проверете данните и изричното потвърждение.':result.status===413?'Записът е твърде голям.':'Действието не е разрешено.'},result.status);
 }catch{return registryJson({error:'Записът не е потвърден. Опитайте отново със същата заявка.'},503)}
}
