/**
 * KT134: a single protected-host integration entrypoint, not a parallel module.
 * The real KT125 host MUST inject the original, server-verified identity,
 * case/D1 and operation-journal ports, and its existing EG calls and GIS reader.
 * Never expose the server's source texts, legal corpus or credentials to client.
 * This module does not register a route or deploy anywhere on its own.
 */
import {createKT125LocalPorts} from './kt134-kt125-local-ports.mjs';
import {createAutoAnalysisEngine} from './kt134-auto-analysis-engine.mjs';
import {createKT134V11NormativeReader} from './kt134-v11-normative-reader.mjs';
import {createAutoServerRoute} from './kt134-server-route.mjs';
import {createKT125AutoProxyGuard} from './kt134-kt125-auto-proxy-guard.mjs';

const requireFn=(name,value)=>{if(typeof value!=='function')throw Error('Липсва защитена връзка към КТ125: '+name);return value};
export function createKT134ProtectedHost({
 origin,identity,caseContext,readState,unpackState,listSources,
 readSpatial,author,reviewer,recordAudit,
 reserveOperation,completeOperation,getRevision,
 // Dependency injection is for isolated tests only; the protected host uses V11.
 getLegalContext
}={}){
 for(const [key,fn] of Object.entries({
  identity,caseContext,readState,unpackState,listSources,readSpatial,
  author,reviewer,recordAudit,reserveOperation,completeOperation,getRevision
 }))requireFn(key,fn);
 const ports=createKT125LocalPorts({identity,caseContext,readState,unpackState,listSources});
 const legalOptions=getLegalContext===undefined?{}:{getContext:requireFn('getLegalContext',getLegalContext)};
 const readNormative=createKT134V11NormativeReader(legalOptions);
 const analyze=createAutoAnalysisEngine({author,reviewer,readSpatial,readNormative,recordAudit});
 const route=createAutoServerRoute({
  authenticateRequest:ports.authenticateRequest,
  authorizeCase:ports.authorizeCase,
  readDossier:ports.readDossier,
  analyze,recordAudit
 });
 // Existing production KT125 operations/journal must validate local auth,
 // case ACL, actor, payload hash and idempotency inside reserveOperation.
 const handle=createKT125AutoProxyGuard({
  origin,route,reserveOperation,completeOperation,getRevision
 });
 return Object.freeze({handle});
}
