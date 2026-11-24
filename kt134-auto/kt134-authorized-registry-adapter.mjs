// KT134: fail-closed adapter for existing authorized dossier storage.
// Host supplies server-bound authorization, never browser-stored credentials.
const str=x=>String(x??'').trim();
export function createAuthorizedCaseRegistry({verifySession,readAuthorizedCase}){
 if(typeof verifySession!=='function'||typeof readAuthorizedCase!=='function')
  throw Error('Липсва защитен достъп до регистъра');
 return Object.freeze({async getCase({session,caseId}){
  if(session?.active!==true||!str(session.userId)||!str(caseId))
   throw Error('Липсва активна сесия или преписка');
  const verified=await verifySession();
  if(verified?.active!==true||str(verified.userId)!==str(session.userId))
   throw Error('Сесията не е потвърдена от защитения сървър');
  const dossier=await readAuthorizedCase({caseId:str(caseId)});
  if(str(dossier?.caseId)!==str(caseId))throw Error('Регистърът върна различна преписка');
  if(!Array.isArray(dossier.documents)||!dossier.documents.length)
   throw Error('Преписката няма достъпни документи');
  const seen=new Set();
  const documents=dossier.documents.map(d=>{
   const fileId=str(d.fileId||d.file||d.name);
   if(!fileId||seen.has(fileId))throw Error('Невалиден или повторен документ в регистъра');
   seen.add(fileId);
   return Object.freeze({fileId,
    kind:str(d.kind)||'unknown',
    sourceText:str(d.sourceText||d.text),
    date:str(d.date),
    evidenceRefs:Object.freeze(Array.isArray(d.evidenceRefs)?d.evidenceRefs.map(str):[]),
    statedRequest:str(d.statedRequest)});
  });
  return Object.freeze({caseId:str(caseId),incomingNumber:str(dossier.incomingNumber),
   version:str(dossier.version),documents:Object.freeze(documents)});
 }});
}
