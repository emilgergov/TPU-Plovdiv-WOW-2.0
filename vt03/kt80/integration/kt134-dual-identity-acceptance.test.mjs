import assert from 'node:assert/strict';
import fs from 'node:fs';
const author=fs.readFileSync(new URL('./KT134_PINNED_kt96-eg-ai-stage4-author.mjs',import.meta.url),'utf8');
const documentAuthor=fs.readFileSync(new URL('./KT134_PINNED_kt117-stage5-document-author.mjs',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../../../cloudflare/ai-author-v27/src/worker.js',import.meta.url),'utf8');
for(const expr of [
 'caseId:identity.caseId,localCycleId:h.caseId,evidenceRevision:h.evidenceRevision',
 'sourceAnchoredClaims:Object.freeze([...request.completeCaseEvidence.kt134DossierCoverage.sourceAnchoredClaims])',
 'caseId:source.caseId,localCycleId:ev.caseId,evidenceRevision:ev.evidenceRevision',
 'ledger.caseId===source.caseId',
 'ledger.localCycleId===ev.caseId',
 'String(ledger.evidenceRevision)===String(ev.evidenceRevision)',
 'String(source.evidenceRevision)===String(ev.evidenceRevision)'
])assert.ok((author+'\n'+documentAuthor).includes(expr),'Missing verified/local case linkage: '+expr);
assert.ok(worker.includes('e5.caseId===input.caseId'),'Worker must reject cross-case source ledger');
assert.ok(worker.includes('String(e5.evidenceRevision)===String(input.evidenceRevision)'),'Worker must reject cross-revision source ledger');
// Independently exercise exactly the identity contract that the client applies.
const match=(ledger,source,ev)=>ledger?.caseId===source.caseId&&
 ledger.localCycleId===ev.caseId&&String(ledger.evidenceRevision)===String(ev.evidenceRevision)&&
 String(source.evidenceRevision)===String(ev.evidenceRevision);
const ledger={caseId:'EG-CENTRAL-24',localCycleId:'EG-LOCAL-3',evidenceRevision:5};
const source={caseId:'EG-CENTRAL-24',evidenceRevision:5};
const local={caseId:'EG-LOCAL-3',evidenceRevision:5};
assert.equal(match(ledger,source,local),true);
assert.equal(match(ledger,{...source,caseId:'EG-OTHER'},local),false);
assert.equal(match(ledger,source,{...local,caseId:'EG-OTHER'}),false);
assert.equal(match(ledger,source,{...local,evidenceRevision:6}),false);
assert.equal(match({...ledger,evidenceRevision:6},source,local),false);
console.log('KT134: central ID, local cycle and evidence revision source binding passed');
