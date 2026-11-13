const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../kt80/normative-master');
const base=JSON.parse(fs.readFileSync(path.join(dir,'KT82_B1_OFFICIAL_SOURCE_REGISTER_2026-11-13.json'),'utf8'));
const added=JSON.parse(fs.readFileSync(path.join(dir,'KT82_B1_OFFICIAL_SOURCE_REGISTER_V02_2026-11-14.json'),'utf8'));
test('B1 source addendum is separate from original and has no duplicate IDs',()=>{
 const list=[...base.records,...added.records];
 assert.equal(new Set(list.map(x=>x.id)).size,list.length);
 assert.ok(added.records.length>=7);
});
test('all B1 sources have official host, name, category and no unverified applied legal rules',()=>{
 for(const item of added.records){
  const url=new URL(item.official_url);
  assert.equal(url.hostname,'www.moew.government.bg');
  assert.ok(item.id&&item.title&&item.official_body);
  assert.ok(Array.isArray(item.categories)&&item.categories.length>0);
  assert.equal(item.case_use,'EXPERT_REVIEW_ONLY');
  assert.match(item.verification_status,/АКТУАЛНА РЕДАКЦИЯ/);
  assert.equal(item.discovered_provisions,undefined);
 }
 assert.equal(added.not_integrated_into_stage4,true);
 assert.equal(added.not_authorized_for_automatic_legal_citations,true);
});
