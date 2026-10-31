'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const id of ['v26AiReview','v26AiDraftFile','v26AiDraftReview','v26AiApprove','v26AiClear'])assert(!html.includes('id="'+id+'"'),'AI author UI must remain invisible: '+id);
assert(html.includes("approvedAuthorPayload:window.V26AuthorBridge.resolve("),'Internal optional author integration retained');
assert(html.includes("window.V26ApprovedAuthorPayload=null;window.V26ApprovedAuthorDossierId=null;v26DossierEpoch++"),'Full reset clears author approval');
console.log('PASS KT20.3: AI author is invisible to expert, internal integration preserved');
