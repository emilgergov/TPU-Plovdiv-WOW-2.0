// KT134-B: isolated protected-server bridge. DOES NOT deploy.
// The host must inject real server-side KT125 verification and case authorization.
// No API secrets or authenticated session claims come from the browser JSON.
const op='kt134.auto-dossier-analyze.v1';
const enc=new TextEncoder();
const clean=x=>String(x??'').trim();
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
function validId(x){return typeof x==='string'&&/^EG-\d{4}-\d{6}$/.test(x)}
function safeJson(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Object.assign(new Error('Некоректна заявка'),{status:400});
 return x;
}
function notAuthorized(){return Object.assign(new Error('Нямате разрешен достъп до преписката'),{status:403})}
export function createAutoServerRoute({authenticateRequest,authorizeCase,readDossier,analyze,recordAudit,
 maxBodyBytes=70000,maxDocumentCount=50}={}){
 for(const [name,fn] of Object.entries({authenticateRequest,authorizeCase,readDossier,analyze,recordAudit})){
  if(typeof fn!=='function')throw new Error('Липсва сървърен механизъм: '+name);
 }
 return async function handle(request){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  let user=null,caseId='';
  try {
   // Auth identity is bound to the protected request (Cloudflare Access/KT125 session),
   // NEVER to a client-supplied field, header string or browser-provided "active" flag.
   user=await authenticateRequest(request);
   if(!user?.verified || !clean(user.userId))throw notAuthorized();
   const size=Number(request.headers.get('content-length')||0);
   if(size>maxBodyBytes)return json({error:'Преписката е над допустимия размер'},413);
   const raw=await request.text();
   if(enc.encode(raw).length>maxBodyBytes)return json({error:'Преписката е над допустимия размер'},413);
   const input=safeJson(JSON.parse(raw));
   if(input.operation!==op || !validId(input.caseId) ||
    input.mode!=='automatic_proposal' || input.requireExpertApproval!==true)
    return json({error:'Невалиден договор за автоматичен анализ'},400);
   caseId=input.caseId;
   if(!(await authorizeCase({user,caseId,request})))throw notAuthorized();
   // Read the authoritative case record again. Never trust user-supplied file
   // content as the canonical dossier, incoming number, or registry version.
   const dossier=await readDossier({user,caseId});
   if(dossier?.caseId!==caseId || !Array.isArray(dossier.documents) ||
    !dossier.documents.length || dossier.documents.length>maxDocumentCount)
    return json({error:'Невалидно съдържание на преписката'},422);
   if(clean(input.dossierVersion)!==clean(dossier.version))
    return json({error:'Преписката е променена — необходим е нов анализ'},409);
   const out=await analyze({caseId,verifiedUserId:user.userId,dossier,
    mode:'automatic_proposal',requireExpertApproval:true});
   if(out?.caseId!==caseId||out.expertConfirmed===true||!clean(out.procedure)||
    !clean(out.justification)||!clean(out.documentDraft)||
    !clean(out.documentTitle)||!clean(out.leadingDocumentId)||
    !dossier.documents.some(d=>clean(d.fileId)===clean(out.leadingDocumentId)))
    return json({error:'Автоматичното предложение не изпълнява доказателствения договор'},422);
   const safe={caseId,leadingDocumentId:clean(out.leadingDocumentId),
    procedure:clean(out.procedure),justification:clean(out.justification),
    documentTitle:clean(out.documentTitle),documentDraft:clean(out.documentDraft),
    panelId:out.panelId,reviewerStatus:out.reviewerStatus||'not_completed',
    reviewNotes:Array.isArray(out.reviewNotes)?out.reviewNotes:[],
    evidence:Array.isArray(out.evidence)?out.evidence:[],
    uncertainties:Array.isArray(out.uncertainties)?out.uncertainties:[],
    expertConfirmed:false,status:'automatic_proposal'};
   await recordAudit({userId:user.userId,caseId,event:'auto_proposal',
    dossierVersion:clean(dossier.version),reviewerStatus:safe.reviewerStatus});
   return json(safe);
  }catch(e){
   const status=e?.status===403?403:e instanceof SyntaxError?400:500;
   // No leakage of sensitive dossier text, exception stack, access token or provider secrets.
   await Promise.resolve(recordAudit({userId:user?.userId||null,caseId,
    event:'auto_attempt_failed',status})).catch(()=>{});
   return json({error:status===403?'Достъпът е отказан':status===400?'Невалидна заявка':'Неуспешна автоматична обработка'},status);
  }
 };
}
