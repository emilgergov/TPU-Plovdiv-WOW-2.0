/**
 * KT134 ↔ KT125 server-only composition boundary.
 * Accepts a trusted Request from a protected KT125 route; it never accepts
 * browser supplied actor/session/role. No automatic admin approval.
 * Not deployed. KT125 host must inject its authentic identity, caseContext,
 * live D1 revision and atomic D1 commit procedures.
 */
import {createKT134VaultProposalLoader} from './kt134-vault-proposal-loader.mjs';
import {createKT134BoundDecisionSaver} from './kt134-bound-decision-saver.mjs';
import {createAutoExpertDecisions} from './kt134-final-expert-decision.mjs';
import {createKT134StoredApprovalBridge} from './kt134-stored-approval-bridge.mjs';

const ensure=(x,msg)=>{if(!x)throw Error(msg)};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createKT134KT125SessionBoundApproval({
 request,localPorts,vault,loadCaseRevision,atomicCommit,audit
}={}){
 ensure(request instanceof Request,'Липсва защитена KT125 HTTP заявка');
 for(const [name,fn] of Object.entries({
  authenticateRequest:localPorts?.authenticateRequest,
  authorizeCase:localPorts?.authorizeCase,
  loadCaseRevision,atomicCommit,audit
 }))ensure(typeof fn==='function','Липсва KT125 сървърен порт: '+name);
 ensure(typeof vault?.loadDraft==='function'&&typeof vault?.loadCurrentDraft==='function',
  'Липсва защитено D1/R2 зареждане');

 async function verifiedUser(){
  const who=await localPorts.authenticateRequest(request);
  ensure(who?.verified===true&&typeof who.userId==='string'&&who.userId.trim(),
   'Няма активна локална KT125 сесия');
  return who;
 }
 async function verifySession(){
  const who=await verifiedUser();
  return Object.freeze({active:true,userId:who.userId});
 }
 async function authorizeCase({userId,caseId,action}){
  if(!uuid.test(caseId||'')||
   !['case.confirm','case.edit','document.generate'].includes(action))return false;
  const current=await verifiedUser();
  if(current.userId!==userId)return false;
  return (await localPorts.authorizeCase({user:current,caseId,action}))===true;
 }
 const loader=createKT134VaultProposalLoader({vault});
 const saver=createKT134BoundDecisionSaver({
  atomicCommit:async expected=>{
   const current=await verifiedUser();
   ensure(current.userId===expected.userId,'KT125 сесията е сменена');
   // Host atomicCommit MUST revalidate the local KT125 session, membership,
   // per-case confirm ACL, revision and both SHA-256 hashes INSIDE its D1
   // transaction. This preflight check is not sufficient by itself.
   ensure(await localPorts.authorizeCase({
    user:current,caseId:expected.caseId,action:'case.confirm'
   }), 'Отнето право за окончателно потвърждение');
   return atomicCommit({request,authenticatedActor:current,expected});
  }
 });
 const decisions=createAutoExpertDecisions({
  verifySession,authorizeCase,
  loadProposal:loader.loadProposal,saveDecision:saver.saveDecision,audit
 });
 return createKT134StoredApprovalBridge({
  verifySession,authorizeCase,
  loadCaseRevision:async({caseId,userId})=>{
   const who=await verifiedUser();
   ensure(who.userId===userId,'KT125 сесията е сменена');
   ensure(await localPorts.authorizeCase({user:who,caseId,action:'case.confirm'}),
    'Липсва право за окончателно потвърждение');
   return loadCaseRevision({request,authenticatedActor:who,caseId});
  },
  vault,decisions,audit
 });
}
