/**
 * KT134 isolated KT126 D1 + private R2 draft vault.
 * Requires protected KT125 user and per-case action authorization.
 * This module is NOT deployed in any live Worker and creates no schema itself.
 *
 * R2 write precedes D1 metadata commit; failed D1 insert may leave an orphaned
 * content-addressed blob. Never delete it blindly (other attempts may share it).
 */
const txt=v=>String(v??'').trim();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const sha=/^[0-9a-f]{64}$/u;
const need=(v,message)=>{if(!v)throw Error(message)};
const hex=bytes=>[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
export function createKT134DraftVault({db,r2,authorizeCase,subtle=globalThis.crypto?.subtle,now=()=>Date.now()}={}){
 need(typeof db?.prepare==='function','Липсва защитена база D1');
 need(typeof r2?.put==='function'&&typeof r2?.get==='function','Липсва частен архив R2');
 need(typeof authorizeCase==='function','Липсва KT125 проверка на достъпа');
 need(typeof subtle?.digest==='function','Липсва проверка на Word файла');
 async function authorized({userId,caseId,action}){
  need(txt(userId)&&uuid.test(caseId),'Невалидна идентичност на преписката');
  need(await authorizeCase({userId,caseId,action}), 'Липсва разрешен достъп до преписката');
 }
 const computeHash=async bytes=>hex(new Uint8Array(await subtle.digest('SHA-256',bytes)));
 return Object.freeze({
  async saveDraft({userId,caseId,caseRevision,proposalVersion,proposal,wordBytes,presentation}={}){
   await authorized({userId,caseId,action:'case.edit'});
   need(Number.isSafeInteger(caseRevision)&&caseRevision>=0,'Невалидна ревизия');
   need(txt(proposalVersion)&&proposal?.caseId===caseId&&proposal?.expertConfirmed===false,
    'Невалиден неодобрен проект');
   need(wordBytes instanceof Uint8Array&&wordBytes.length>4&&
    wordBytes[0]===80&&wordBytes[1]===75,'Липсва DOCX файл');
   need(presentation?.caseId===caseId&&presentation.proposalVersion===proposalVersion&&
    presentation.expertConfirmed===false&&presentation.wordReady===true,
    'Липсва проверено съвпадение с Word прегледа');
   need([presentation.wordSha256,presentation.contentSha256,presentation.bindingSha256].every(x=>sha.test(x)),
    'Невалидни отпечатъци на проекта');
   need((await computeHash(wordBytes))===presentation.wordSha256,
    'Word документът е променен след проверката');
   const key='kt134-auto/'+caseId+'/'+presentation.wordSha256+'.docx';
   // The R2 bucket is private. This key is only an internal storage reference.
   await r2.put(key,wordBytes,{httpMetadata:{contentType:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});
   const result=await db.prepare(
    "INSERT INTO kt134_auto_drafts "+
    "(case_id,case_revision,proposal_version,actor_id,document_key,word_sha256,content_sha256,binding_sha256,proposal_json,preview_json,created_at_ms) "+
    "SELECT r.case_id,r.revision,?,?,?,?,?,?,?,?,? "+
    "FROM kt126_registry r WHERE r.case_id=? AND r.revision=? "+
    "ON CONFLICT(case_id,proposal_version) DO NOTHING"
   ).bind(proposalVersion,userId,key,presentation.wordSha256,
    presentation.contentSha256,presentation.bindingSha256,
    JSON.stringify(proposal),JSON.stringify(presentation.previewParagraphs),
    now(),caseId,caseRevision).run();
   need(result?.meta?.changes===1,'Word проектът не е записан за текущата версия');
   return Object.freeze({ok:true,caseId,caseRevision,proposalVersion,
    bindingSha256:presentation.bindingSha256,wordSha256:presentation.wordSha256});
  },
  async loadDraft({userId,caseId,proposalVersion,includeWord=false}={}){
   await authorized({userId,caseId,action:includeWord?'document.generate':'case.edit'});
   need(txt(proposalVersion),'Липсва версия');
   const row=await db.prepare(
    "SELECT d.case_id,d.case_revision,d.proposal_version,d.document_key,d.word_sha256,"+
    "d.content_sha256,d.binding_sha256,d.proposal_json,d.preview_json,d.status "+
    "FROM kt134_auto_drafts d JOIN kt126_registry r ON r.case_id=d.case_id "+
    "AND r.revision=d.case_revision "+
    "WHERE d.case_id=? AND d.proposal_version=?"
   ).bind(caseId,proposalVersion).first();
   need(row,'Няма актуален проект за преписката');
   const meta={caseId,caseRevision:row.case_revision,proposalVersion,
    status:row.status,bindingSha256:row.binding_sha256,
    proposal:JSON.parse(row.proposal_json),
    previewParagraphs:Object.freeze(JSON.parse(row.preview_json))};
   if(!includeWord)return Object.freeze(meta);
   const object=await r2.get(row.document_key);
   need(object&&typeof object.arrayBuffer==='function','Липсва архивиран Word');
   const bytes=new Uint8Array(await object.arrayBuffer());
   need((await computeHash(bytes))===row.word_sha256,'Архивираният Word е повреден');
   return Object.freeze({...meta,wordBytes:bytes});
  }
 });
}
