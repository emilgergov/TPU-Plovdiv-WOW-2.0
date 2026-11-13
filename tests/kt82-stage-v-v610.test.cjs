const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../kt80');
const source=p=>fs.readFileSync(path.join(dir,p),'utf8');
const legal=source('KT82_STAGE4_V11_SOURCE_GATE_V610.js');
const routing=source('KT82_STAGE5_INDEPENDENT_V610.js');
const html=source('KT82_19_STAGE_V_V610_INTEGRATION_TEST.html');
const frozen=JSON.parse(fs.readFileSync(path.join(dir,'normative-master/KT82_B_FROZEN_V11_B2_ACCEPTED_STAGE_V_OPEN_2026-11-13.json'),'utf8'));
test('Stage V uses locked legal archive and no public web for normative evidence',()=>{
 assert.equal(frozen.status.B1_V11,'LOCKED_AS_EXCLUSIVE_DOCUMENTARY_BASIS');
 assert.equal(frozen.status.B2,'EXPERT_ACCEPTED_WITH_DOCUMENTED_LIMITATIONS');
 assert.doesNotMatch(legal,/https:\/\/www\.moew\.government\.bg/);
 assert.doesNotMatch(legal,/verified:'Проверен текст/);
 assert.match(legal,/няма разрешение за автоматичен правен цитат/i);
});
test('No dossier type chooses a preselected candidate from the catalog',()=>{
 const root={};
 vm.runInNewContext(routing,{window:root,document:{readyState:'loading',addEventListener(){}}});
 const kinds=['SIGNAL','COMPLAINT','INVESTMENT','REQUEST','APPLICATION','CORRESPONDENCE'];
 const candidate=[{id:17,title:'Жалба'},{id:18,title:'Сигнал'}];
 for(const kind of kinds){
  const a=root.KT82RouteAdvice.advise({type:kind,subject:'Предмет за проверка',
    lawConfirmed:{expertConfirmed:true,legal:'Експертна правна преценка'}},candidate);
  assert.equal(a.routeId,null,kind);
  assert.ok(a.next,kind);
 }
});
test('Source-first stage V is isolated and preserves GIS and PDF1 evidence guards',()=>{
 for(const file of ['KT82_STAGE4_V11_SOURCE_GATE_V610.js','KT82_STAGE5_INDEPENDENT_V610.js',
  'KT82_A_FREE_GIS_V603.js','KT82_A_EVIDENCE_INVALIDATION_V602.js','KT82_A_PDF1_V600.js'])
   assert.ok(html.includes(file),file);
 assert.doesNotThrow(()=>new Function(legal));
 assert.doesNotThrow(()=>new Function(routing));
});
