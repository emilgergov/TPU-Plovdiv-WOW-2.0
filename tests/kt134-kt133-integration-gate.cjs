'use strict';
// KT134 / KT133 — non-production integration gate.
// No authenticated users, D1 writes, Worker deployments, or real dossiers.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const baseline=read('vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html');
const candidate=read('vt03/kt80/KT134_PANEL15_VISUAL_TEST.html');
const stage4=read('vt03/kt80/integration/KT134_PINNED_kt116-expert-approval-handoff.mjs');
const stage5=read('vt03/kt80/integration/KT134_PINNED_kt117-stage5-document-author.mjs');
const currentEG=read('vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs');
const shell=read('vt03/kt80/integration/kt123-universal-panel-shell.js');
const scripts=x=>[...x.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
const a=scripts(baseline),b=scripts(candidate);
let pass=0;
function check(name,fn){fn();console.log('PASS',name);pass++;}
check('same 86 module positions as accepted base',()=>{assert.equal(a.length,86);assert.equal(b.length,86)});
check('no altered module order / unexpected replacements',()=>{
 const allowed=new Set([30,37,58,80,81,82]);
 a.forEach((s,i)=>{if(!allowed.has(i))assert.equal(b[i],s,'Changed unexpected module #'+i)});
});
check('original KT133 PDF1 engine kept',()=>assert.equal(b[13],a[13]));
check('KT133 full EG normative checks kept',()=>{
 assert.equal(b[79],a[79]);
 assert.match(currentEG,/POSITIVE_ANNEX_UNCONFIRMED_CASE_SOURCE/);
 assert.match(currentEG,/POSITIVE_ANNEX_CATEGORY_NOT_IN_LAW/);
 assert.match(currentEG,/POSITIVE_ANNEX_CATEGORY_FACT_MISMATCH/);
});
check('only additional GIS consistency gate',()=>{
 assert.match(b[58],/KT134_SPATIAL_GATE_CONSISTENCY\.js/);
 assert.equal(b[59],a[59]);
});
check('Stage4 passes expert-selected panel id',()=>{
 assert.match(stage4,/panelId:chosen/);
 assert.match(stage4,/kt116:stage4-confirmed/);
});
check('Stage5 allows panel 17 addressed case view',()=>{
 assert.match(stage5,/addressedPanels=new Set\(\[1,17\]\)/);
 assert.match(stage5,/openPanel\.onclick=/);
 assert.match(stage5,/kt117PanelTransition/);
 assert.match(stage5,/caseId:approval\.caseId/);
 assert.match(stage5,/evidenceRevision:evidence\.evidenceRevision/);
});
check('confirmed Stage5 binds document and stage4 version',()=>{
 assert.match(stage5,/stage4Version:source\.version/);
 assert.match(stage5,/kt123:stage5-confirmed/);
 assert.match(stage5,/wordSaved===true/);
});
check('approved designs retained outside original work routes',()=>{
 for(const marker of ['kt134FiveStageVisuals','kt134Panel02FlowRuntime',
 'kt134OtherPanelFlowRuntime','kt134WorkContainersVisual','kt134Panel15VisualLabel'])
 assert.ok(candidate.includes(marker),'Missing accepted visual '+marker);
});
check('retired panel IDs excluded from active catalog only',()=>{
 assert.match(candidate,/cards\.filter\(c=>c\.id!==13&&c\.id!==14\)/);
 assert.match(candidate,/window\.KT80OpenRoute=open/);
});
check('independent GIS panel not converted to standard panel',()=>{
 assert.doesNotMatch(candidate,/15:\{flow:\[/);
 assert.match(shell,/id===15/);
});
check('presentation overlay does not replace authenticated case registry',()=>{
 assert.doesNotMatch(candidate,/Преписки в панела/);
 assert.match(stage5,/kt132AddressedPanel/);
});
// KT133 current published visual overlay — structural regression guards.
const visual=read('kt80/KT133_APPROVED_VISUALS.js');
const visualCss=read('kt80/KT133_APPROVED_VISUALS.css');
check('all 19 active non-GIS panel entrances use accepted five-step flow',()=>{
 const section=visual.slice(visual.indexOf('const catalog='),visual.indexOf('window.KT133ApprovedFlowCatalog=catalog'));
 const ids=[...section.matchAll(/\n\s*(\d{1,2}):\{flow:/g)].map(m=>Number(m[1]));
 ids.push(2);ids.sort((a,b)=>a-b);
 const expected=Array.from({length:22},(_,i)=>i+1).filter(id=>![13,14,15].includes(id));
 assert.deepEqual(ids,expected);
});
check('legacy entry cleanup is structural and preserves working actions',()=>{
 const section=visual.slice(visual.indexOf('function hideOldSteps('),visual.indexOf('function enhance(heading)'));
 assert.match(section,/cards\.length!==3/);
 assert.match(section,/row\.contains\(originalAction\)/);
 assert.match(section,/!before\(row,originalAction\)/);
 assert.doesNotMatch(section,/Постъпила документация|Проверка за липси|Искане за допълнителна информация/);
 assert.match(visual,/originalAction\.click\(\)/);
 assert.doesNotMatch(visual,/originalAction\.remove\(\)/);
 assert.match(visualCss,/\.kt133-approved-entrance-container \.kt133-legacy-tile-hidden/);
});
check('legacy badge on panel 16 is visual-only; Stage5 addressed panel 17 remains',()=>{
 assert.doesNotMatch(visual,/data-kt80-index="16".*\.kt123-panel-mark.*\.remove\(\)/);
 assert.match(visualCss,/data-kt80-index="16".*\.kt123-panel-mark/);
 assert.match(stage5,/addressedPanels=new Set\(\[1,17\]\)/);
 assert.match(visual,/if\(\[13,14,15\]\.includes\(id\)\)return/);
});
console.log('KT134/KT133 code-based regression gate:',pass+'/'+pass);
console.log('LIMITATION: protected login, case registry, D1 and authenticated E1-E5 -> 17 must be verified on a separate Cloudflare test Worker.');
