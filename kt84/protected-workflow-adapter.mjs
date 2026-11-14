/* KT84-03 — opt-in adapter for a future Access-protected admin shell.
 * DO NOT import from the public GitHub Pages entrypoint.
 *
 * This does not bypass existing KT83 legal/GIS guards. It is an additional
 * per-case authorisation/freshness boundary; protected API remains authority.
 */
import {createCaseSession,createProtectedTransport} from './expert-case-session.mjs';
const stageSet=new Set([1,2,3,4,5]);
const fail=code=>Object.freeze({ok:false,code});
export function installProtectedWorkflow({root,apiOrigin,fetcher}={}){
 if(!root?.KT80WorkflowState||!root?.document||typeof fetcher!=='function')
  throw new TypeError('Липсва отделен защитен административен интерфейс.');
 if(!root.KT83CaseBoundary)
  throw new TypeError('Липсва заключената граница на текущата преписка.');
 // A private Access-protected shell must explicitly call this installer.
 // No hardcoded credentials, public API URLs or automatic login.
 const local=()=>{
  const w=root.KT80WorkflowState||{};
  return {cycleId:w.caseCycleId,generation:w.generation,
    evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??0};
 };
 const abortPending=()=>{
  root.KT83CaseBoundary?.invalidate?.();
  root.KT80EGSession?.clear?.();
 };
 const session=createCaseSession({
  transport:createProtectedTransport({origin:apiOrigin,fetcher}),
  local,abortPending
 });
 let serial=0,stageReady=null;
 const clear=()=>{serial++;stageReady=null;session.clear()};
 for(const ev of ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'])
  root.document.addEventListener(ev,clear);
 root.addEventListener?.('pagehide',clear);
 const canUseStage=step=>{
  const b=session.bound(),w=root.KT80WorkflowState||{};
  return !!b&&stageSet.has(step)&&stageReady?.step===step&&
   stageReady.caseId===b.id&&stageReady.version===b.version&&
   stageReady.cycleId===w.caseCycleId&&
   stageReady.generation===w.generation&&
   stageReady.evidenceRevision===(root.KT82EvidenceInvalidation?.getRevision?.()??0);
 };
 async function prepareStage(step){
  if(!stageSet.has(step))return fail('INVALID_STAGE');
  const ticket=++serial;
  stageReady=null;
  const r=await session.check();
  if(ticket!==serial)return fail('SESSION_CHANGED');
  if(!r.ok)return r;
  const w=root.KT80WorkflowState||{};
  const b=session.bound();
  if(!b||w.caseCycleId!==b.localCycleId)return fail('LOCAL_CASE_MISMATCH');
  stageReady=Object.freeze({step,caseId:b.id,version:b.version,
   cycleId:w.caseCycleId,generation:w.generation,
   evidenceRevision:b.evidenceRevision});
  return Object.freeze({ok:true,step,serverCaseId:b.id,version:b.version});
 }
 async function openStage(step){
  const r=await prepareStage(step);
  if(!r.ok)return r;
  if(step===5&&root.KT83RouteAccess?.canOpenStage?.(5)!==true)
   return fail('V11_REVIEW_REQUIRED');
  // The legacy stage is still constrained by its own expert checkpoints.
  if(!canUseStage(step))return fail('LOCAL_CASE_CHANGED');
  const result=root.KT80WorkflowGo?.(step);
  return result===false?fail('WORKFLOW_DENIED'):Object.freeze({ok:true,step});
 }
 async function createCase(subject){
  stageReady=null;return session.create(subject);
 }
 async function openExistingCase(serverCaseId){
  stageReady=null;return session.attach(serverCaseId);
 }
 async function saveSubject(subject){
  stageReady=null;return session.updateSubject(subject);
 }
 const api=Object.freeze({
  login:()=>session.login(),createCase,openExistingCase,saveSubject,
  prepareStage,openStage,canUseStage,clear,
  getExpert:()=>session.identity(),getCase:()=>session.bound(),
  // EG author must be refactored to call a *server*-authorized service.
  // Do not pass an old per-tab bearer credential as multi-expert identity.
  authorizeEG:async()=>fail('SERVER_SIDE_EG_CASE_GATE_REQUIRED'),
  getDocument:async()=>fail('SERVER_SIDE_DOCUMENT_GATE_REQUIRED')
 });
 root.KT84ProtectedWorkflow=api;
 return api;
}
