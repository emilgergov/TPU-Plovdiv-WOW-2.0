'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'vt03/kt80');
const original=fs.readFileSync(path.join(dir,'KT83_VT02_P1_P6_VISUAL_TEST.html'),'utf8');
const actual=fs.readFileSync(path.join(dir,'KT134_PDF1_ISOLATED_REGRESSION_TEST.html'),'utf8');
let expected=original;
function once(from,to){assert.equal(expected.split(from).length-1,1,'Missing unique integration anchor: '+from);expected=expected.replace(from,to)}
once('<title>WOW · V61.7 · ВТ03-R6 — Общ визуален тест на административните етапи</title>','<title>КТ134 · Изолиран тест · PDF1 — без промяна на Етапи 1–5</title>');
once('src="KT82_A_PDF1_V600.js?v=600-kt83"','src="../../KT134/integration/KT82_A_PDF1_V600_KT134_CANDIDATE.js?v=kt134-isolated-guard"');
once('</head><body>','<link rel="stylesheet" href="../../KT134/integration/KT134_PANEL15_REAL_GIS.css?v=kt134-09"></head><body>');
once('"integration/kt116-expert-approval-handoff.mjs','"integration/KT134_PINNED_kt116-expert-approval-handoff.mjs');
once('"integration/kt117-stage5-document-author.mjs','"integration/KT134_PINNED_kt117-stage5-document-author.mjs');
once('"integration/kt119-docx-generator.mjs','"integration/KT134_PINNED_kt119-docx-generator.mjs');
once('"KT80_E01_KT53_SUBJECT_SCOPE_CONSTRUCTOR_V54.js','"KT134_PINNED_KT80_E01_KT53_SUBJECT_SCOPE_CONSTRUCTOR_V54.js');
once('"KT80_E01_IP_MASTER_SUBJECT_V32.js','"KT134_PINNED_KT80_E01_IP_MASTER_SUBJECT_V32.js');
once('"integration/kt96-eg-ai-stage4-author.mjs','"integration/KT134_PINNED_kt96-eg-ai-stage4-author.mjs');
once('src="integration/kt83-p2-spatial-gate.js?v=p2"','src="../../KT134/integration/KT134_SPATIAL_GATE_CONSISTENCY.js?v=kt134-safe"');
assert.equal(actual,expected,'Integrated HTML differs beyond ten explicitly permitted changes');
function scripts(html){return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(x=>x[1])}
const left=scripts(original),right=scripts(actual);
assert.equal(left.length,86);assert.equal(right.length,86);
const normalizeScript=x=>x.replace('KT82_A_PDF1_V600_KT134_CANDIDATE.js?v=kt134-isolated-guard','KT82_A_PDF1_V600.js?v=600-kt83').replace('../../KT134/integration/KT134_SPATIAL_GATE_CONSISTENCY.js?v=kt134-safe','integration/kt83-p2-spatial-gate.js?v=p2').replace(/KT134_PINNED_/g,'');
assert.deepEqual(right.map(normalizeScript),left,'E1-E5 script order changed');
console.log('KT134: exact HTML parity, only ten intentional changes, 86/86 scripts unchanged in sequence');
