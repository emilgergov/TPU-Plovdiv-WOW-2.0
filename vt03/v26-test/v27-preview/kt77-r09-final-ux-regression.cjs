#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const p=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const base=p('V27_27_KT77_03_PI_MASTER_R08_CONTEXT_MARKER.html');
const next=p('V27_27_KT77_03_PI_MASTER_R09_FINAL_COMPACT.html');
const match=next.match(/\n<style id="kt77-r09-final-ux">[\s\S]*?<\/style>/);
const assert=(b,m)=>{if(!b)throw Error('KT77 R09 BLOCKED: '+m)};
assert(match,'missing final UX CSS');
assert(next.replace(match[0],'')===base,'R08 map/GIS/PI MASTER/Word/PDF/AI baseline changed');
const c=match[0];
assert(c.includes('#summary')&&c.includes('display:flex')&&c.includes('flex-wrap:wrap'),'overview not compact');
assert(c.includes('> .kt77-pm-title')&&c.includes('display:none !important'),'duplicate title not removed from view');
assert(c.includes('> .kt77-pm-selection-heading'),'selected property heading not preserved');
assert(base.includes('kt77-r08-context-marker-visual-only')&&next.includes('kt77-r08-context-marker-visual-only'),'approved context locator missing');
console.log('PASS KT77 R09: CSS-only, overview compact, redundant title hidden; R08 red marker, R13 map, full MASTER and document generator dependencies byte-identical.');
