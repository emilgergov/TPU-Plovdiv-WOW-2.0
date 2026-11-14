/* WOW KT83 P3 — opt-in session-only V11 archive bridge.
 * No automatic file upload, network requests or persistence.
 * Legal validity and expert authority are provided separately: a digest alone
 * never verifies law, official origin, applicability or competence.
 */
(function(root){'use strict';
 const t=x=>String(x??'').trim();
 let active=null;
 function openSession({reviewOfficialSource,verifyOfficialSource,expertReview}={}){
  if(!root.KT83P3LocalSourceRegister?.create||!root.crypto?.subtle?.digest||
     typeof reviewOfficialSource!=='function'||typeof verifyOfficialSource!=='function'||
     typeof expertReview?.getCaseReview!=='function'||
     typeof expertReview?.verifyCaseReview!=='function')
   return Object.freeze({ok:false,code:'TRUSTED_PROVIDERS_MISSING'});
  closeSession();
  const digest=async bytes=>new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes));
  const archive=root.KT83P3LocalSourceRegister.create({
   digest,reviewOfficialSource,verifyOfficialSource
  });
  root.KT83LocalV11Archive=archive;
  root.KT83LocalV11CaseReview=expertReview;
  const local=Object.freeze({
   async importFile(file,metadata){
    if(active!==local)return Object.freeze({ok:false,code:'SESSION_CLOSED'});
    if(!file||typeof file.arrayBuffer!=='function')
      return Object.freeze({ok:false,code:'FILE_REQUIRED'});
    let bytes;
    try{bytes=new Uint8Array(await file.arrayBuffer());}
    catch(_){return Object.freeze({ok:false,code:'READ_FAILED'});}
    if(active!==local)return Object.freeze({ok:false,code:'SESSION_CLOSED'});
    const result=await archive.importDocument({...metadata,bytes});
    if(active!==local)return Object.freeze({ok:false,code:'SESSION_CLOSED'});
    if(result.ok)root.KT83P3V11Connector?.connect?.();
    return result;
   },
   status:()=>active===local?archive.status():null,
   close:()=>{if(active===local)closeSession();}
  });
  active=local;
  return Object.freeze({ok:true,session:local});
 }
 function closeSession(){
  const previous=root.KT83LocalV11Archive;
  previous?.clear?.();
  active=null;
  root.KT83LocalV11Archive=null;
  root.KT83LocalV11CaseReview=null;
  root.KT83NormativeArchiveV11=null;
 }
 root.KT83P3LocalSession=Object.freeze({openSession,closeSession,
  status:()=>active?.status?.()||Object.freeze({version:'V11',count:0,sourceIds:[]})});
 root.document?.addEventListener?.('kt80:case-reset',()=>{
  // Keep archival sources if intentionally imported for this browser session,
  // but never keep the previous case's legal review.
  // Trusted review provider must independently attest each new case ID.
  root.KT83NormativeArchiveV11=null;
  root.KT83P3V11Connector?.connect?.();
 });
})(window);
