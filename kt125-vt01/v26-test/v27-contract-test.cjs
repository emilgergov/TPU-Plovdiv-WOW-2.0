/* V27 automated contract checks; runs in GitHub Actions, no dossier upload. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root={};root.window=root;
for(const file of ['v27-ai-facts.js','v26-expert-draft.js']){
 vm.runInNewContext(fs.readFileSync(__dirname+'/'+file,'utf8'),root,{filename:file});
}
const id='56784.13.102';
const results=[{input:id,cadnum:id,status:'Намерен',geojson:{features:[{geometry:{type:'Polygon'}}]},verified_zone_intersections:[],location:'Пловдив'}];
const roles={[id]:'leading'};
const metadata={subject:'Складове и офиси',location:'гр. Пловдив',parcelIds:id};
const workingDraft={metadata};
const payload=root.V27AIFacts.build({results,roles,workingDraft,subject:metadata.subject});
assert.equal(payload.mode,'expert');
assert.equal(payload.facts.subject,metadata.subject);
assert.equal(payload.facts.parcelIds[0],id);
assert.equal(payload.facts.legalReferences.includes('НЯМА ДАННИ'),true);
const rich=root.V27AIFacts.build({results,roles,workingDraft,subject:metadata.subject,archivePreview:{files:[{path:'case.txt',text:'Предвижда се склад за промишлени стоки.'}]},normativeRegister:{records:[{id:'law-1',title:'Закон за опазване на околната среда',source:'МОСВ'}]}});
assert.equal(rich.facts.dossierExcerpts[0].file,'case.txt');
assert.match(rich.facts.legalReferences,/НЯМА ДАННИ/);
assert.equal(rich.facts.legalSources.length,0,'Unverified legal record must not reach AI');
const verified=root.V27AIFacts.build({results,roles,workingDraft,subject:metadata.subject,normativeRegister:{records:[{id:'law-2',title:'Проверена разпоредба за теста',source:'Официален архив',article:'чл. 1',verified_scope:'Проверен обхват за теста',verified:true,revision_verified:true}]}});
assert.match(verified.facts.legalReferences,/Проверена разпоредба за теста/);
assert.equal(verified.facts.legalSources.length,1,'Verified article must reach AI');
assert.equal(verified.facts.legalSources[0].article,'чл. 1');
assert.equal(verified.facts.legalSources[0].verifiedScope,'Проверен обхват за теста');
assert.equal(verified.facts.legalSources[0].revisionVerified,true);
const accepted=root.V27AIFacts.build({results,roles,workingDraft,subject:metadata.subject,normativeRegister:{records:[{id:'project-1',title:'Проектно приет нормативен акт',source:'Интегриран архив',article:'чл. 2, ал. 1',verified_scope:'Проверен текст, приложимостта се преценява отделно',verified:true,revision_verified:false,project_revision_accepted:true}]}});
assert.equal(accepted.facts.legalSources.length,1,'Project-accepted source should reach AI');
assert.equal(accepted.facts.legalSources[0].revisionVerified,false,'Project acceptance must not masquerade as independent verification');
assert.equal(accepted.facts.legalSources[0].projectRevisionAccepted,true);

assert.match(root.V27AIFacts.build({results:[{...results[0],intersection_verified_outside:true}],roles,workingDraft,subject:metadata.subject}).facts.gisFindings,/потвърдено отсъствие/);
assert.match(payload.facts.gisFindings,/пространственият резултат не е потвърден/);
assert(!payload.facts.gisFindings.includes('потвърдено отсъствие'));
assert.throws(()=>root.V27AIFacts.build({results,roles:{},workingDraft}),/роля/);
assert.throws(()=>root.V27AIFacts.build({results:[{...results[0],geojson:{features:[]}}],roles,workingDraft}),/геометрия/);
assert.throws(()=>root.V27AIFacts.build({results,roles,workingDraft:{metadata:{}},subject:''}),/предмет/);
const base={results,roles,determination:{scenario:'А',zones:[]},metadata,paragraphs:['описание 1','описание 2','описание 3','описание 4'],evidence:{findings:[],warnings:[]}};
const withAI=root.V26ExpertDraft.build({...base,aiDraft:'ПРОВЕРКА AI ТЕКСТ'});
const withoutAI=root.V26ExpertDraft.build({...base,aiDraft:''});
assert.equal(withAI.aiDraft,'ПРОВЕРКА AI ТЕКСТ');
assert.equal(withoutAI.aiDraft,'');
assert.equal(withAI.reviewRequired,true);
assert.equal(withAI.parcels[0].id,id);
assert.throws(()=>root.V26ExpertDraft.build({...base,roles:{}}),/роля/);
const packageSource=fs.readFileSync(__dirname+'/v26-draft-package.js','utf8');
const wordSource=fs.readFileSync(__dirname+'/v26-expert-word.js','utf8');
const indexSource=fs.readFileSync(__dirname+'/index.html','utf8');
assert.match(packageSource,/aiDraft:register\?\.v27AiDraft\|\|''/);
assert.match(packageSource,/V26ExpertWord\.make\(expertDraft,\{mapSvg:overviewMap\}\)/);
assert.match(packageSource,/V26TemplateWord\.make\(expertDraft\.scenario,classicParagraphs,expertDraft\.metadata\)/);
assert.match(wordSource,/const aiSections=/);
// KT24.3: the Word renderer must accept the AI draft, but must not
// blindly substitute AI-generated legal/procedural conclusions for verified
// dossier evidence. The generated DOCX is exercised by the real smoke tests.
assert.match(wordSource,/const aiSections=/);
assert.match(wordSource,/const unsupportedAi=/);
assert.match(wordSource,/const safeAi=/);
assert.match(wordSource,/const aiProposal=/);
assert.match(wordSource,/safeAi\('IMPACTS'\)\?aiProposal\('IMPACTS'\)/);
assert.match(wordSource,/confirmed\(draft\.characterization\)/);
assert.match(wordSource,/Правните основания се уточняват/);
assert.match(wordSource,/Приложимата процедура се определя/);
assert.match(indexSource,/V27AIAuthor\.generate\(payload,token\)/);
assert.match(indexSource,/v27AiDraft,v27LegalSources,mapSvg/);
console.log('V27 contract checks PASS: adapter, role/geometry gates, AI draft propagation, classic separation (static).');
