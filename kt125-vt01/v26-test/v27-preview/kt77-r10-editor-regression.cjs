#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,p=f=>fs.readFileSync(path.join(root,f),'utf8');
const base=p('V27_27_KT77_03_PI_MASTER_R09_FINAL_COMPACT.html'),next=p('V27_27_KT77_03_PI_MASTER_R10_SMART_EDITOR.html');
const marker='\n<style id="kt77-r10-editor-css">';
assert(next.includes(marker));
assert.equal(next.replace(/\n<style id="kt77-r10-editor-css">[\s\S]*?<\/style>\n<script src="v27-preview\/kt77-r10-smart-editor.js\?v=kt77-r10-01"><\/script>/,''),base,'R09 baseline changed');
const win={};const fakeDoc={readyState:'loading',addEventListener(){}};
vm.runInNewContext(p('kt77-r10-smart-editor.js'),{window:win,document:fakeDoc});
const core=win.KT77R10Core;assert(core,'Missing pure editor core');
const eq=(actual,expected)=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);
eq(core.segments('46989,205,218'),['46989,205,218']);
eq(core.segments('46989,205,218,46989,205,219'),['46989,205,218','46989,205,219']);
eq(core.segments('46989.205.218,46989.205.219'),['46989.205.218','46989.205.219']);
eq(core.segments('46989.205.218;46989.205.219'),['46989.205.218','46989.205.219']);
assert.equal(core.proposals('46989,205,218')[0].parcel,'46989.205.218');
assert.equal(core.proposals('46989..205.218')[0].parcel,'46989.205.218');
assert.equal(core.proposals('46989 205 218')[0].parcel,'46989.205.218');
assert.equal(core.proposals('46989.205.218.1')[0].parcel,'46989.205.218');
assert.equal(core.proposals('46989.205').length,0,'missing component must not be guessed');
assert(core.proposals('46989205218').some(x=>x.parcel==='46989.205.218'));
(async()=>{
 const found=new Set(['46989.205.218','46989.205.219']);
 const idx={async lookup(id){return found.has(id)?{status:'FOUND',profile:{cadnum:id}}:{status:'NOT_IN_VALIDATED_CADASTRE'}}};
 let r=await core.validate('46989,205,218\n46989.205.219',idx);
 assert.equal(r.errors.length,0);assert.equal(r.warnings.length,0);assert.equal(r.records.length,2);
 r=await core.validate('46989205218',idx);
 assert.equal(r.errors.length,0);assert.equal(r.warnings.length,1);assert.equal(r.records[0].chosen,null);
 r=await core.validate('46989.205',idx);assert.equal(r.errors.length,1);
 r=await core.validate('46989.205.9999',idx);assert.equal(r.errors.length,1);
 let blocked=false;try{await core.validate('46989.205.218',{lookup:async()=>{throw Error('Missing shard')}});}catch(e){blocked=true}
 assert(blocked,'Missing PI MASTER must block lookup');
 assert(next.includes('kt77-r08-context-marker-visual-only'));
 console.log('PASS R10: R09 byte-identical; typos, comma-separated IDs, suffix, omission, unseparated candidate approval, archive lookup and fail-closed.');
})().catch(e=>{console.error(e);process.exitCode=1});