#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name));
const manifest=JSON.parse(file('normative/offline/archive-manifest.json').toString('utf8'));
assert.equal(manifest.schema,'kt77-r11-local-normative-archive-v1');
assert.equal(manifest.total_registry_entries,60);
assert.equal(manifest.sources.length,manifest.total_registry_entries);
assert.equal(manifest.archived_entries+manifest.missing_entries,60);
assert.equal(manifest.complete,manifest.missing_entries===0);
assert.equal(manifest.contents_legally_verified,false);
for(const rule of ['all_dossier_reads_local_only','never_modify_approved_zz_conclusions','zt_as_factual_findings','a_b_scenario_based_on_zz_only','unavailable_or_stale_entries_require_expert_review','external_downloads_only_in_offline_archival_pipeline']){
 assert.equal(manifest.rules[rule],true,'missing safeguards: '+rule);
}
assert.equal(manifest.rules.generator_integration_approved,false);
const byId=new Map();
let saved=0,failed=0,pdfs=0,texts=0;
for(const entry of manifest.sources){
 assert(!byId.has(entry.id),'duplicate '+entry.id);
 byId.set(entry.id,entry);
 if(entry.archived){
  saved++;
  assert(/^normative\/offline\/assets\/[0-9a-f]{24}\.(pdf|txt)$/.test(entry.local_path),'unsafe path');
  const content=file(entry.local_path);
  assert.equal(crypto.createHash('sha256').update(content).digest('hex'),entry.sha256,'checksum '+entry.id);
  if(entry.kind==='pdf'){assert(content.subarray(0,5).equals(Buffer.from('%PDF-')));pdfs++;}
  if(entry.kind==='txt'){assert(content.length>80);texts++;}
 }else{failed++;assert(entry.error,'missing entry without explanation');}
}
assert.equal(saved,manifest.archived_entries);
assert.equal(failed,manifest.missing_entries);
for(const id of ['C003','R-N01','R-N02','R-N05']){
 assert(byId.get(id)?.archived,'critical legal original missing '+id);
 assert.equal(byId.get(id).kind,'pdf','critical legal source not PDF '+id);
}
const read=fs.readFileSync(path.join(__dirname,'kt77-r11-local-normative-reader.js'),'utf8');
assert(read.includes('SHA-256')&&read.includes('scope.crypto.subtle.digest'));
assert(!read.includes('entry.official_url,')&&!read.includes('fetch(entry.official_url')&&!read.includes('fetch(r.official_url'));
const baseline=fs.readFileSync(path.join(__dirname,'V27_27_KT77_03_R11_ZZT_ARCHIVE_ACCEPTANCE.html'),'utf8');
assert(baseline.includes('kt77-r11-zzt-supplement.js'));
const browser=file('normative/offline/index.html').toString('utf8');
assert(browser.includes('archive-manifest.json')&&browser.includes('local_path'));
console.log('PASS KT77 R11 LOCAL: '+saved+'/60 captured ('+pdfs+' PDFs, '+texts+' text copies), '+failed+' pending; no generator change, checksum and original legal PDF checks.');
