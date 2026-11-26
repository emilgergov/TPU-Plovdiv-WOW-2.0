/**
 * KT134 isolated EG Stage 1: author and independent reviewer decide which
 * of the ACTUAL uploaded documents initiates the current administrative task.
 * No human intermediate confirmations or invented source identifiers.
 */
const bad=(error,status=422)=>new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const clean=(x,n=2000)=>typeof x==='string'?x.trim().slice(0,n):'';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const output=x=>(x?.output||[]).flatMap(y=>y.content||[]).filter(y=>y.type==='output_text').map(y=>y.text).join('\n').trim();
const safeObject=raw=>{
 try{const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
  if(start<0||end<start)return null;
  const x=JSON.parse(raw.slice(start,end+1));
  if(x&&typeof x==='object'&&!Array.isArray(x))return x;
 }catch{}
 return null;
};
export function validateKt134LeadingResponse(x,caseId,documents){
 if(!x||x.caseId!==caseId)return null;
 const id=clean(x.leadingDocumentId,160);
 if(!documents.some(d=>d.id===id))return null;
 const currentRequest=clean(x.currentRequest,1100),rationale=clean(x.rationale,2400);
 const subject=clean(x.subject,1200),scope=clean(x.scope,2500);
 if(!id||!currentRequest||!rationale||!subject||!scope)return null;
 return {caseId,leadingDocumentId:id,currentRequest,rationale,subject,scope,
  criticalUncertainty:x.criticalUncertainty===true};
}
export function createKt134Stage1LeadingHandler({fetchImpl=fetch}={}){
 return async function handle(request,env){
  if(request.method!=='POST')return bad('METHOD_NOT_ALLOWED',405);
  const access=[env.AI_AUTHOR_ACCESS_TOKEN,env.AI_AUTHOR_PASSWORD_V27].filter(v=>typeof v==='string'&&v.length>0);
  if(!env.OPENAI_API_KEY||!access.length)return bad('EG_NOT_CONFIGURED',503);
  if(!access.some(v=>request.headers.get('Authorization')==='Bearer '+v))
   return bad('EG_NOT_AUTHORIZED',401);
  if(Number(request.headers.get('content-length')||0)>98000)return bad('INTAKE_TOO_LARGE',413);
  let input;
  try{const raw=await request.text();if(new TextEncoder().encode(raw).length>98000)return bad('INTAKE_TOO_LARGE',413);input=JSON.parse(raw)}
  catch{return bad('INVALID_JSON',400)}
  const caseId=clean(input?.caseId,160),documents=input?.documents;
  if(!UUID.test(caseId)||!Array.isArray(documents)||!documents.length||documents.length>50||
     input?.stage!==1||input?.projectOnly!==true)return bad('INVALID_E1_CONTEXT');
  const ids=new Set(),sources=[];
  for(const d of documents){
   const id=clean(d?.id,160),fileName=clean(d?.fileName,240),text=clean(d?.text,5000);
   if(!id||!fileName||!text||ids.has(id))return bad('E1_DOCUMENT_SOURCE_INVALID');
   ids.add(id);
   sources.push({id,fileName,text,date:clean(d.date,60),type:clean(d.type,120)});
  }
  // The same source set is supplied to author and reviewer. No intermediate expert prompts.
  async function ask(role,context){
   const system=role==='author'
     ?'Ти си EG Автор за Етап 1 на българска екологична административна преписка. Изследвай ВСИЧКИ документи, кой сезира органа СЕГА, дати, входящи номера и предходни актове. Водещ е документът, определящ актуалната задача, не първият в ZIP, не най-дългият или само името. Възражение срещу предходно писмо по правило води текущото разглеждане, когато съдържанието го потвърждава. Избери реално наличен id. Предложи предмет и обхват без да добавяш факти. Не определяй автоматично процедура само по вида на водещия документ. Върни САМО JSON с ключове caseId,leadingDocumentId,currentRequest,rationale,subject,scope,criticalUncertainty. При обикновено колебание винаги избери най-добре обоснован водещ документ и criticalUncertainty=false.'
     :'Ти си независим EG Рецензент за Етап 1. Анализирай отново ВСИЧКИ първични документи и провери предложението на автора. Можеш да го поправиш, но НЯМАШ право да блокираш, връщаш или да искаш човешко потвърждение. Избери най-добре подкрепения реално наличен документ дори при разногласие. Посочи коригиран предмет/обхват ако е нужно. Върни САМО JSON с ключове caseId,leadingDocumentId,currentRequest,rationale,subject,scope,criticalUncertainty. criticalUncertainty=true е допустимо единствено при критична обективна невъзможност за надеждна преценка, не при нормално колебание.';
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
   try{
    const r=await fetchImpl('https://api.openai.com/v1/responses',{
      method:'POST',signal:controller.signal,
      headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini',store:false,max_output_tokens:1300,
       input:[{role:'system',content:system},
        {role:'user',content:JSON.stringify({caseId,documents:sources,...context})}]})
    });
    if(!r.ok)return null;
    const x=await r.json();
    return validateKt134LeadingResponse(safeObject(output(x)),caseId,sources);
   }catch{return null}finally{clearTimeout(timer)}
  }
  const author=await ask('author',{});
  if(!author)return bad('EG_E1_AUTHOR_CRITICAL_UNAVAILABLE',503);
  const reviewer=await ask('reviewer',{authorProposal:author});
  const selected=reviewer||author;
  return new Response(JSON.stringify({caseId,stage:1,status:'stage1_documentary_proposal',
   selected,author,reviewer:reviewer||null,
   reviewerStatus:reviewer?'completed':'unavailable_nonblocking',
   sourceCount:sources.length,expertApproved:false,
   intermediateExpertConfirmationRequired:false}),{headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'
   }});
 };
}
