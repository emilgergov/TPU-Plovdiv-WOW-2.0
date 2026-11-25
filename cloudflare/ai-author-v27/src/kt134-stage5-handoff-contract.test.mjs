import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../../../vt03/kt80/integration/KT134_PINNED_kt117-stage5-document-author.mjs',import.meta.url),'utf8');
// This checks the wiring contract, NOT live model quality or legal correctness.
for(const key of ['stage5Evidence:(()=>','caseId:ev.caseId','evidenceRevision:ev.evidenceRevision','observations:ev.observations','gis:{pdf1Available'])
 assert.ok(client.includes(key),'Stage5 client field missing: '+key);
for(const key of ['const e5Bound=','e5.caseId===input.caseId','String(e5.evidenceRevision)===String(input.evidenceRevision)',
 'stage5EvidenceContext:{documents:e5Docs','STAGE5_CASE_EVIDENCE_NOT_BOUND','reviewerUnresolved'])
 assert.ok(worker.includes(key),'Worker binding missing: '+key);
assert.ok(client.includes('data.kt134Content?.findings'),'Stage5 editorial notes must include content findings');
assert.ok(worker.includes('reviewerUnresolved=verdict==="reject"&&!correctedByReviewer'),
 'Reviewer dissent must remain visible without veto');

console.log('KT134: stage5 case-evidence wiring and reviewer-disagreement checks passed');
