/* V27.1 P7 contract regression: preserve bounded provenance in author request. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../src/worker.js','utf8');
const client=fs.readFileSync(__dirname+'/../../../v26-test/v27-expert-evidence.js','utf8');
assert.match(client,/verifiedContext:/);
assert.match(client,/legalVerification:/);
const serverHasContext=/verifiedContext\s*:/.test(source);
const serverHasProvisions=/provisionText\s*:/.test(source);
if(!serverHasContext||!serverHasProvisions){
 console.error('P7 pending: author server does not yet retain verifiedContext and provisionText');
 process.exitCode=1;
}else console.log('P7 server provenance contract: PASS');
