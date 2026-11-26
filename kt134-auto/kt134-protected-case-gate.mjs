/** KT134 secure preflight. Host MUST authenticate via KT125 and load every field server-side.
 * No public browser request can supply trusted principal, policy or evidence.
 * This adapter does not call production, EG, GIS or archives.
 */
const fail = code => { const e = new Error(code); e.code=code; throw e; };
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
function receipt(r, type, caseId) {
  if (!r || r.type !== type || !nonempty(r.sourceId) || !nonempty(r.verifiedAt) ||
      !/^[a-f0-9]{64}$/i.test(r.digest || '')) fail('UNVERIFIED_EVIDENCE');
  if (r.caseId !== caseId) fail('CROSS_CASE_EVIDENCE');
  return Object.freeze({type,caseId,sourceId:r.sourceId,digest:r.digest.toLowerCase(),verifiedAt:r.verifiedAt});
}
export function prepareProtectedAutomaticCase({principal,caseRecord,evidence,policy}={}) {
  const rpc=principal?.nativeAuthorization;
  const nativeAuthorized=rpc?.source==='KT125_NATIVE_RPC'&&
    rpc.verified===true&&rpc.action==='case.edit'&&
    rpc.actorId===principal?.userId&&
    rpc.caseId===caseRecord?.id&&rpc.revision===caseRecord?.revision;
  if (principal?.source!=='KT125_SERVER' || principal?.authenticated!==true ||
      principal?.status!=='active' || !nonempty(principal.userId) ||
      (!principal.roles?.includes('expert')&&!nativeAuthorized))
    fail('KT125_AUTH_REQUIRED');
  const c=caseRecord;
  if (!c || !nonempty(c.id) || !nonempty(c.revision) || !nonempty(c.subject) ||
      !nonempty(c.registryNumber)) fail('CASE_INCOMPLETE');
  if (c.status!=='active') fail('CASE_NOT_ACTIVE');
  // Native KT125 RPC proves a per-case edit grant for this exact actor and
  // revision, including properly delegated experts. It replaces the weaker
  // local owner-ID guess ONLY in the native RPC branch.
  if (!nativeAuthorized&&c.ownerUserId!==principal.userId &&
      !principal.roles.includes('case_delegate')) fail('CASE_ACCESS_DENIED');
  if (c.registryConfirmed!==true) fail('REGISTRY_NOT_CONFIRMED');
  if (policy?.source!=='KT125_SERVER' || policy?.liveAutomaticEnabled!==true) fail('AUTOMATION_NOT_ENABLED');
  const records=[
    receipt(evidence?.dossier,'dossier',c.id),
    receipt(evidence?.normativeMaster,'normative_master',c.id),
    receipt(evidence?.piMaster,'pi_master',c.id)
  ];
  let gis;
  if (c.gisMode==='required') {
    gis=Object.freeze({mode:'required',receipt:receipt(evidence?.gisPdf1,'gis_pdf1',c.id)});
    records.push(gis.receipt);
  } else if (c.gisMode==='contextual_skip') {
    if (!c.gisSkipConfirmed || !nonempty(c.gisSkipReason) || evidence?.gisPdf1!=null)
      fail('GIS_SKIP_UNCONFIRMED');
    gis=Object.freeze({mode:'contextual_skip',reason:c.gisSkipReason});
  } else fail('GIS_MODE_UNDECIDED');
  return Object.freeze({
    mode:'KT134_PROTECTED_AUTOMATIC_DRAFT',status:'ready_for_author_review',
    principalId:principal.userId,
    case:Object.freeze({caseId:c.id,revision:c.revision,registryNumber:c.registryNumber}),
    subject:c.subject,gis,evidence:Object.freeze(records),
    expertApproved:false
  });
}
export function assertSameCaseRevision(preflight,current) {
  if (!preflight || !current || preflight.case?.caseId!==current.id ||
      preflight.case?.revision!==current.revision) fail('STALE_OR_DIFFERENT_CASE');
  return true;
}
export function assertDraftNotApproval(output) {
  if (!output || output.status!=='draft' || output.expertApproved!==false ||
      output.finalDecision!=null) fail('UNAUTHORIZED_FINALIZATION');
  return output;
}
