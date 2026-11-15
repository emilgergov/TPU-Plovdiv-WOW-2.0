import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Extract the exact algorithm deployed to GitHub Pages, not a second copy.
const source=readFileSync('vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs','utf8');
const begin=source.indexOf(' const stageBytes=');
const end=source.indexOf(' let serial=0,',begin);
assert(begin>=0&&end>begin,'missing client size guard');
const sandbox={TextEncoder,JSON,Math};
vm.createContext(sandbox);
const fit=vm.runInContext(source.slice(begin,end)+'; fitStage4Request;',sandbox);
const longBulgarian='Описано инвестиционно предложение за изграждане на складови площи и офиси. '.repeat(1500);
const request={
 caseId:'test-KT103',requestId:'r-001',evidenceRevision:8,
 subject:'Складове и офиси в ПИ 56784.13.102',scope:'Изграждане на складове и офиси',
 evidence:[{factId:'subject',status:'established',value:'confirmed'}],
 parcelIds:['56784.13.102'],
 archive:{verifiedReferences:[{id:'ZOOS_93',article:'чл. 93'}]},
 completeCaseEvidence:{
  archiveName:'p4.zip',documentRecords:[],pageTexts:[],
  sourceTexts:[{source:'notification.pdf',text:longBulgarian,totalChars:longBulgarian.length},
               {source:'attachment.pdf',text:longBulgarian,totalChars:longBulgarian.length}],
  sourceTextCount:2,documents:[{file:'notification.pdf'},{file:'attachment.pdf'}],
  gis:{parcelIds:['56784.13.102'],spatial:'not intersecting'} }
};
const original=new TextEncoder().encode(JSON.stringify(request)).length;
assert(original>100000,'test must exceed Worker size limit');
const result=fit(request);
assert(result.payload,'large Cyrillic case should be bounded, not discarded');
const bytes=new TextEncoder().encode(result.payload).length;
assert(bytes<=85000, 'bounded payload exceeds safety margin');
const decoded=JSON.parse(result.payload);
assert.equal(decoded.caseId,'test-KT103');
assert.equal(decoded.evidenceRevision,8);
assert.equal(decoded.archive.verifiedReferences[0].id,'ZOOS_93');
assert.equal(decoded.completeCaseEvidence.sourceTextCount,2);
assert.equal(decoded.completeCaseEvidence.sourceTexts[0].source,'notification.pdf');
assert.equal(decoded.completeCaseEvidence.gis.spatial,'not intersecting');
assert.equal(decoded.completeCaseEvidence.sourceTextTruncated,true);
console.log('PASS: Stage 4 Cyrillic payload reduced from',original,'to',bytes,'bytes; core provenance retained');
