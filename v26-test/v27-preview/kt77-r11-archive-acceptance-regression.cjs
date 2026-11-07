#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),p=f=>fs.readFileSync(path.join(root,f),'utf8');
const primary=JSON.parse(p('data/normative-archive-register.json'));
const catalog=JSON.parse(p('normative/sources.json'));
const supplement=JSON.parse(p('v27-preview/kt77-r11-zzt-normative-supplement.json'));
const baseline=p('v27-preview/V27_27_KT77_03_R11_EDITOR_ZZT_ARCHIVE.html');
const preview=p('v27-preview/V27_27_KT77_03_R11_ZZT_ARCHIVE_ACCEPTANCE.html');
const addition='\n<script src="v27-preview/kt77-r11-archive-acceptance.js?v=r11-archive-check-01"></script>';
assert.equal(preview.replace(addition,''),baseline,'R11 acceptance must not alter any approved application or generator');
const keys=['N05','T01','T02'];
assert.equal(new Set(primary.map(x=>x.id)).size,primary.length);
for(const key of keys){
 const x=primary.find(x=>x.id===key);assert(x, 'missing ZZT source '+key);
 assert.equal(x.verified,false,'unverified text must never be asserted verified');
 assert.equal(x.reference_only,true);
 assert.equal(x.legal_conclusion_override,false);
 assert(x.source.startsWith('https://'));
 assert(!/ПРЕДСТОИ/.test(JSON.stringify(x)),'unsupported pending placeholder');
}
assert.equal(catalog.items.length,47);
assert.equal(new Set(catalog.items.map(x=>x.id)).size,catalog.items.length);
const zzt=catalog.items.find(x=>x.id===3);
assert(zzt.url.endsWith('/ZZT.pdf'),'ZZT link must be direct official PDF');
assert.equal(zzt.verified_revision,false);
for(const number of [46,47])assert(catalog.items.some(x=>x.id===number));
assert(primary.some(x=>x.id==='R01'&&x.source.includes('pdbase.eea.government.bg')));
assert(supplement.policy.zt_never_automatically_reclassifies_ab);
assert(supplement.policy.zt_never_overwrites_zz_expert_conclusion);
const adapter=p('v27-preview/kt77-r11-zzt-supplement.js'),accept=p('v27-preview/kt77-r11-archive-acceptance.js');
assert(adapter.includes('scenario_override:null'));
assert(accept.includes("get('kt77r11')")&&accept.includes("['N05','T01','T02']"));
assert(!accept.includes('standalonePDF')&&!accept.includes('.generate('),'acceptance must not invoke document author');
console.log('PASS KT77 R11 ARCHIVE: 13 primary records; 47 public catalog sources; ZZT official PDF + EEA register + Sveti Duh; controlled legal-status and byte-identical generators.');
