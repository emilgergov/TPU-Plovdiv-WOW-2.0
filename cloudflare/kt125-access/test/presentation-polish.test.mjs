import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {overlayPresentationPolish} from '../src/kt126/presentation-polish.mjs';
const read=p=>readFile(new URL('../../../'+p,import.meta.url),'utf8');
const gatePath='vt03/kt80/KT82_STAGE4_V11_SOURCE_GATE_V610.js';
const original=await read(gatePath),fixed=overlayPresentationPolish(gatePath,original);
const p2ctx={module:{exports:{}}};vm.runInNewContext(await read('vt03/kt80/integration/kt83-p2-spatial-gate.js'),p2ctx);const validator=p2ctx.module.exports;
const ids=['12345.1.2'];const live={ids,results:[{input:ids[0],status:'Намерен',geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[1,2],[1,1]]]}}]},verified_zone_intersections:[],intersection_verified_outside:true}]};
const proof={caseId:'case-a',generation:4,evidenceRevision:2,gisDecision:'REQUIRED',ids,live,pi:{ids,items:[]},zones:Array.from({length:32},()=>({}))};
const root={KT80WorkflowState:{caseCycleId:proof.caseId,generation:4},KT80FreeGISResults:live,KT82EvidenceInvalidation:{getRevision:()=>2},KT83P2Automatic:{current:()=>proof},KT83P2SpatialGate:validator};
function handler(source){const a=source.indexOf(' const pdfReceipt=event=>{'),b=source.indexOf(" document.addEventListener('kt82:pdf1-completed'",a);assert(a>=0&&b>a);const c={root,parsedIds:()=>ids,idKey:a=>a.join('|'),geometryValid:r=>!!r.geojson,Number,Date,panel:{hidden:true},draw:()=>{},pdf:{ready:false},lastSignature:''};vm.createContext(c);vm.runInContext(source.slice(a,b)+'\nthis.receive=pdfReceipt;',c);return c;}
const receipt={caseId:'case-a',generation:4,evidenceRevision:2,ids,source:live,bytes:2000};
const before=handler(original);before.receive({detail:receipt});assert.equal(before.pdf.ready,false,'Reproduce lost receipt with PI MASTER still pending');
const after=handler(fixed);after.receive({detail:receipt});assert.equal(after.pdf.ready,true);assert.equal(validator.pdfReceiptMatches(proof,after.pdf),false,'Captured receipt does not bypass incomplete prerequisites');
proof.pi.items=[{status:'FOUND',profile:{}}];assert.equal(validator.pdfReceiptMatches(proof,after.pdf),true,'Original receipt becomes usable after prerequisites settle without another download');
for(const bad of [{caseId:'case-b'},{generation:5},{evidenceRevision:3},{source:{...live}},{bytes:0},{bytes:NaN},{ids:['12345.1.3']}]){const c=handler(fixed);c.receive({detail:{...receipt,...bad}});assert.equal(c.pdf.ready,false,JSON.stringify(bad));}
proof.evidenceRevision=3;assert.equal(validator.pdfReceiptMatches(proof,after.pdf),false,'Later evidence revision invalidates captured receipt');proof.evidenceRevision=2;
assert(fixed.includes('pdfOK=!!valid&&!!proof&&!!root.KT83P2SpatialGate?.pdfReceiptMatches?.(proof,pdf)'),'Final complete validation retained');
console.log('PASS KT130: reproduced receipt timing failure, delayed proof succeeds, stale/empty receipts fail and final P2 validation remains');
const editorPath='vt03/kt80/integration/kt116-expert-approval-handoff.mjs';
const editor=overlayPresentationPolish(editorPath,await read(editorPath));
const actorStart=editor.indexOf("const actorLabel=mk('label','Експерт"),actorEnd=editor.indexOf('document.head.append(identityStyle);',actorStart)+'document.head.append(identityStyle);'.length;assert(actorStart>=0&&actorEnd>actorStart);
const styles=[];const make=()=>({append(...items){this.children=items;}});
for(const profile of ['Емил Гергов','']){const c={mk:make,val:s=>String(s??'').trim(),document:{querySelector:()=>profile?{textContent:profile}:null,head:{append:s=>styles.push(s)}}};vm.createContext(c);vm.runInContext(editor.slice(actorStart,actorEnd)+'\nthis.actor=actor;',c);assert.equal(c.actor.value||'',profile);c.actor.value='Друг експерт';assert.equal(c.actor.value,'Друг експерт','Expert can still edit the field');}
assert(styles[0].textContent.includes('display:flex'));assert(styles[0].textContent.includes('#ff9189'));assert(styles[0].textContent.includes('@media(max-width:620px)'));
assert(!editor.slice(actorStart,actorEnd).includes('.click('),'Prefill never confirms or clicks');
const card=overlayPresentationPolish('vt03/kt80/integration/kt122-acceptance-finish.js',await read('vt03/kt80/integration/kt122-acceptance-finish.js'));
assert(card.includes("mk('span',null,why)"));assert(!card.includes('why.slice(0,340)'));
const author=overlayPresentationPolish('vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs',await read('vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs'));assert(author.includes('afterLead.trim()'));assert(!author.includes('afterLead.slice(0,1100)'));
assert.throws(()=>overlayPresentationPolish(editorPath,editor),/contract mismatch/);
console.log('PASS KT130: trusted profile prefill stays editable, responsive identity styling, matching conclusion colors, full proposal text, no automatic confirmation');
const worker=await read('cloudflare/ai-author-v27/src/worker.js');assert(worker.includes('MOSV_EDITORIAL_GUIDE,'));assert(worker.includes('instructions+" "+MOSV_EDITORIAL_GUIDE'));assert(worker.includes('утвърдената бланка')||worker.includes('утвърдената бланка'.replace('у','У')));assert(worker.includes('не удостоверяване на действащо право'));assert(worker.includes('Предлага се издаване на писмо'));
console.log('PASS KT130: editorial methodology applies to Stage4/5 with historical-source and leading-template boundaries');
