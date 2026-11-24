/**
 * KT134 — protected final approval handoff from D1/R2 to expert decision.
 * Isolated integration module; NOT a public route or deployed Worker.
 * The host supplies real KT125 session, ACL, revision and atomic decision ports.
 */
const ensure=(v,m)=>{if(!v)throw Error(m)};
const hash=/^[a-f0-9]{64}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createKT134StoredApprovalBridge({
 verifySession,authorizeCase,loadCaseRevision,vault,decisions,audit
}={}){
 for(const [key,fn] of Object.entries({verifySession,authorizeCase,loadCaseRevision,audit}))
  ensure(typeof fn==='function','Липсва защитен сървърен порт: '+key);
 ensure(typeof vault?.loadDraft==='function','Липсва защитен D1/R2 архив');
 ensure(typeof decisions?.decide==='function','Липсва механизъм за експертно решение');
 return Object.freeze({
  async confirm({caseId,proposalVersion,previewBindingSha256}={}){
   ensure(uuid.test(caseId||'')&&typeof proposalVersion==='string'&&proposalVersion.length>0,
    'Невалидна идентичност на преписката или проекта');
   ensure(typeof previewBindingSha256==='string'&&hash.test(previewBindingSha256),
    'Липсва проверен отпечатък на Word прегледа');
   // Never accept actor identity, role, permissions or document bytes from client.
   const session=await verifySession();
   ensure(session?.active===true&&typeof session.userId==='string'&&session.userId,
    'Няма активна експертна сесия');
   const allowed=await authorizeCase({userId:session.userId,caseId,action:'case.confirm'});
   ensure(allowed===true,'Няма право за окончателно одобрение');
   // includeWord requires its own protected document.generate authorization
   // and checks SHA-256 of the actual private R2 document.
   const stored=await vault.loadDraft({userId:session.userId,caseId,proposalVersion,includeWord:true});
   ensure(stored?.status==='awaiting_expert'&&
    stored.caseId===caseId&&stored.proposalVersion===proposalVersion,
    'Няма актуален неодобрен Word проект');
   ensure(Number.isSafeInteger(stored.caseRevision)&&stored.caseRevision>=0,
    'Липсва ревизия на архивирания проект');
   ensure(stored.wordBytes instanceof Uint8Array&&stored.wordBytes.length>4,
    'Липсва действителният архивиран Word');
   ensure(hash.test(stored.wordSha256||''),'Липсва отпечатък на архивирания Word');
   ensure(hash.test(stored.bindingSha256||'')&&
    stored.bindingSha256===previewBindingSha256,
    'Показаният Word преглед не съответства на архивирания документ');
   const revision=await loadCaseRevision({caseId,userId:session.userId});
   ensure(revision===stored.caseRevision,'Преписката е променена — необходим е нов анализ');
   const proposal=stored.proposal;
   ensure(proposal?.caseId===caseId&&proposal.expertConfirmed===false&&
    typeof proposal.documentDraft==='string'&&proposal.documentDraft.trim()&&
    typeof proposal.procedure==='string'&&proposal.procedure.trim()&&
    typeof proposal.documentTitle==='string'&&proposal.documentTitle.trim(),
    'Архивът няма пълно мотивирано предложение');
   // This is an adapter only. The host's decisions.saveDecision MUST atomically
   // compare case revision, proposal version, active status and binding hash.
   const decision=await decisions.decide({
    session,caseId,proposalVersion,action:'confirm',previewBindingSha256,
    expectedCaseRevision:stored.caseRevision,expectedWordSha256:stored.wordSha256
   });
   ensure(decision?.expertConfirmed===true&&decision.caseId===caseId,
    'Няма потвърдено експертно решение');
   await audit({event:'kt134_stored_word_expert_confirmed',
    userId:session.userId,caseId,proposalVersion,caseRevision:revision,
    bindingSha256:previewBindingSha256});
   return Object.freeze({caseId,proposalVersion,
    decisionVersion:decision.version,expertConfirmed:true});
  }
 });
}
