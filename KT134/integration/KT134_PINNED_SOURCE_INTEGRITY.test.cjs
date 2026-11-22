'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const pins={
  "vt03/kt80/integration/KT134_PINNED_kt116-expert-approval-handoff.mjs": "ef9887945ea41d99eb09dcf365507d443ecf6d89",
  "vt03/kt80/integration/KT134_PINNED_kt117-stage5-document-author.mjs": "06ec7ab81d5bdd1fc93420debba34ee6b5740a26",
  "vt03/kt80/integration/KT134_PINNED_kt119-docx-generator.mjs": "0344ebd39f53fad55925ad716a5b2c4d76b47dfc",
  "vt03/kt80/integration/KT134_PINNED_kt96-eg-ai-stage4-author.mjs": "7fb89e85e57314569c8aee83f6c59143a43b19a6",
  "vt03/kt80/KT134_PINNED_KT80_E01_KT53_SUBJECT_SCOPE_CONSTRUCTOR_V54.js": "bee5833bd28125367047c94529d24ac7c3119fd6",
  "vt03/kt80/KT134_PINNED_KT80_E01_IP_MASTER_SUBJECT_V32.js": "36ed464149752ad6b6f84e28c5ee06fe34ffadb3"
};
for(const [file,expected] of Object.entries(pins)){
 const bytes=fs.readFileSync(path.join(root,file));
 const gitSha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(gitSha,expected,'Pinned production file diverged from active KT133 version: '+file);
}
console.log('KT134: 6 production pin copies verified with Git blob SHA-1');
