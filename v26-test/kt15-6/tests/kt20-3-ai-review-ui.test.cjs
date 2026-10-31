'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const anchor of ['id="v26AiDraftFile"','id="v26AiDraftReview"','id="v26AiApprove"','id="v26AiClear"','v26AiPending','window.V26ApprovedAuthorPayload','confirmedParcelIds:[...ids]','window.confirm(\'Потвърждавате ли прегледания AI текст'])assert(html.includes(anchor),'Missing: '+anchor);
assert(html.includes("window.V26ApprovedAuthorPayload=null;window.V26ApprovedAuthorDossierId=null;v26DossierEpoch++"),'Full reset clears approval');
assert(html.includes("approvedAuthorPayload:(()=>{"),'Package receives approval');
console.log('PASS KT20.3: optional AI review, explicit approval, parcel binding and reset');
