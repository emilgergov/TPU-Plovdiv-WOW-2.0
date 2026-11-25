/**
 * KT134 composition root for the isolated KT125-backed EG workflow.
 * The caller MUST supply the original KT125 authenticated session resolver,
 * the approved local normative MASTER loader, and the accepted Word builder.
 * Any missing binding fails at creation; never downgrade to synthetic mode.
 */
import {createKt134NativeDossierAdapters} from './kt134-native-dossier-adapter.mjs';
import {createKt134Kt125SessionVerifier} from './kt134-kt125-session-verifier.mjs';
import {createKt134ProtectedHttpHandler} from './kt134-protected-http-integration.mjs';
const error=name=>{throw Error('KT134_HOST_MISSING_'+name)};
export function createKt134IsolatedProtectedHost({
  db,cookieName,resolveKt125Session,resolvePrincipal,getNormativeMaster,buildDraftWord,
  egWorkerBase,egAccessToken,fetchImpl=fetch
}={}){
 if(typeof db?.prepare!=='function')error('KT125_DB');
 if(!resolveKt125Session&&!resolvePrincipal){
   const verifier=createKt134Kt125SessionVerifier({db,cookieName});
   resolveKt125Session=verifier.resolveKt125Session;
   resolvePrincipal=verifier.resolvePrincipal;
 }
 for(const [name,impl] of Object.entries({
   resolveKt125Session,resolvePrincipal,getNormativeMaster,buildDraftWord
 }))if(typeof impl!=='function')error(name);
 if(!egWorkerBase||!egAccessToken)error('KT134_EG_CREDENTIALS');
 const caseAdapters=createKt134NativeDossierAdapters({db,resolvePrincipal,getNormativeMaster});
 return createKt134ProtectedHttpHandler({
   resolveKt125Session,
   loadProtectedContext:caseAdapters.loadProtectedContext,
   loadEvidenceBundle:caseAdapters.loadEvidenceBundle,
   buildDraftWord,egWorkerBase,egAccessToken,fetchImpl
 });
}
