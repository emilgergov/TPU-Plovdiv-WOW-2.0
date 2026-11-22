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
assert.equal(actual,expected,'Integrated HTML differs beyond three explicitly permitted changes');
function scripts(html){return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(x=>x[1])}
const left=scripts(original),right=scripts(actual);
assert.equal(left.length,86);assert.equal(right.length,86);
assert.deepEqual(right.map(x=>x.includes('KT82_A_PDF1_V600_KT134_CANDIDATE.js')?'KT82_A_PDF1_V600.js?v=600-kt83':x),left,'E1-E5 script order changed');
console.log('KT134: exact HTML parity, only three intentional changes, 86/86 scripts unchanged in sequence');
