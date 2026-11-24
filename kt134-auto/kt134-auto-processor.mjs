// KT134-B isolated automatic workflow prototype. Never injected into KT133.
// Ports are provided by the protected host; the browser never receives API secrets.
const txt = value => String(value ?? '').trim();
const frozen = object => Object.freeze(object);
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a,b) => txt(a) === txt(b) && txt(a) !== '';

export function createAutoProcessor({registry, gateway, word, audit}) {
 ensure(typeof registry?.getCase === 'function', 'Липсва регистър на преписките');
 ensure(typeof gateway?.run === 'function', 'Липсва защитен мост');
 ensure(typeof word?.buildDraft === 'function', 'Липсва генератор на Word');
 ensure(typeof audit?.record === 'function', 'Липсва одитна следа');
 const running = new Set();

 async function run({session, caseId}) {
  ensure(session?.active === true && txt(session.userId), 'Изисква се активна експертна сесия');
  ensure(txt(caseId), 'Липсва идентификатор на преписката');
  ensure(!running.has(caseId), 'Преписката вече се обработва');
  running.add(caseId);
  try {
   const dossier = await registry.getCase({session,caseId});
   ensure(same(dossier?.caseId,caseId), 'Разминаване на идентификатора на преписката');
   ensure(Array.isArray(dossier.documents) && dossier.documents.length > 0, 'Липсват документи');
   // Only a server-verified session; no passwords, tokens or arbitrary endpoints in payloads.
   const request = frozen({caseId, dossierVersion:txt(dossier.version),
    documents:dossier.documents, mode:'automatic_proposal', requireExpertApproval:true});
   const analysis = await gateway.run({session,request});
   ensure(same(analysis?.caseId,caseId), 'Анализът се отнася за друга преписка');
   ensure(txt(analysis?.leadingDocumentId), 'Няма водещ документ и мотивирано предложение');
   ensure(txt(analysis?.procedure) && txt(analysis?.justification), 'Липсва мотивирана процедура');
   ensure(txt(analysis?.documentDraft), 'Липсва проект на документ');
   ensure(analysis?.expertConfirmed !== true, 'Недопустимо фиктивно експертно потвърждение');
   const panelId = Number(analysis.panelId);
   const output = frozen({
    caseId, incomingNumber:txt(dossier.incomingNumber),
    dossierVersion:txt(dossier.version),
    leadingDocumentId:txt(analysis.leadingDocumentId),
    procedure:txt(analysis.procedure), justification:txt(analysis.justification),
    documentDraft:txt(analysis.documentDraft),
    proposedPanel:Number.isInteger(panelId)&&panelId>=1&&panelId<=22?panelId:null,
    reviewNotes:frozen(Array.isArray(analysis.reviewNotes)?analysis.reviewNotes.map(txt):[]),
    uncertainties:frozen(Array.isArray(analysis.uncertainties)?analysis.uncertainties.map(txt):[]),
    evidence:frozen(Array.isArray(analysis.evidence)?analysis.evidence:[]),
    status:'awaiting_final_expert_approval',expertConfirmed:false
   });
   // Word is a project, never an issued administrative act.
   let wordDraft=null,wordError=null;
   try {
    const built=await word.buildDraft({session,caseId,content:output.documentDraft,
      procedure:output.procedure,panelId:output.proposedPanel,template:'riosv-plovdiv-approved',status:'draft'});
    ensure(built instanceof Uint8Array && built.length>0, 'Word генераторът не върна DOCX');
    wordDraft=built;
   } catch(error) { wordError=txt(error?.message||error); }
   await audit.record({session,caseId,event:'automatic_proposal_created',
    dossierVersion:output.dossierVersion,wordReady:!!wordDraft,
    reviewerIssues:output.reviewNotes.length,unresolved:output.uncertainties.length});
   return frozen({proposal:output,wordDraft,wordError,
    availableActions:frozen(['confirm','edit','manual_from_stage1'])});
  } finally {
   running.delete(caseId);
  }
 }

 async function manualFromStage1({session,caseId,proposal}) {
  ensure(session?.active === true && txt(session.userId), 'Липсва активна сесия');
  ensure(same(caseId,proposal?.caseId), 'Не може да се прехвърля чужда преписка');
  ensure(proposal.expertConfirmed===false, 'Потвърден документ не се отменя автоматично');
  await audit.record({session,caseId,event:'manual_route_requested',stage:1});
  return frozen({caseId,stage:1,mode:'classic',reuseExistingDossier:true,
   carryAutomaticProposalsAsUnconfirmed:true});
 }
 return frozen({run,manualFromStage1});
}
