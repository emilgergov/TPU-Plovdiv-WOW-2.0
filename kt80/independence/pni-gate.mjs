/**
 * КТ83 — Протокол за нормативна независимост: техническа проверка ПНИ.
 * Reads normative sources only; fixtures are not inputs to this gate.
 * Deliberate fail-closed: source/hash or architecture drift exits nonzero.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'../..');

export const PROTECTED_SOURCES=Object.freeze([
 'kt80/integration/v11-trusted-source-registry.mjs',
 'kt80/integration/v11-verified-fee-schedule.mjs',
 'kt80/integration/stage4-independent-legal-engine.mjs',
 'kt80/integration/stage5-independent-proposal.mjs',
 'kt80/integration/kt83-v1-4-hypothesis-discovery.mjs',
 'kt80/independence/pni-normative-conditions.mjs',
 'kt80/independence/pni-independent-review.mjs'
]);
const auditedArchive='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';

export function gitBlobSha1(text){
 const b=Buffer.from(text,'utf8');
 return createHash('sha1').update(Buffer.from('blob '+b.length+'\0','utf8')).update(b).digest('hex');
}
export function normativeFingerprint(sources){
 // sorted exact bytes of Git blobs; no docket or test file enters this value.
 const summary=PROTECTED_SOURCES.map(p=>p+':'+gitBlobSha1(sources[p]??'')).join('\n');
 return createHash('sha256').update(summary,'utf8').digest('hex');
}
const stripComments=source=>source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
export function verifyIndependence(manifest,sources){
 const errors=[];
 const add=(code,reason)=>errors.push({code,reason});
 if(manifest?.schema!=='KT83_PNI_MANIFEST_V1')add('MANIFEST_SCHEMA','Непозната версия на нормативната защита');
 if(manifest?.archive_sha256!==auditedArchive)add('MASTER_HASH','Подменен или неустановен архив V11');
 if(manifest?.auto_applicability_enabled!==false||manifest?.approved_rule_graph!==false)
   add('UNAPPROVED_ACTIVATION','Автоматична правна приложимост е включена преди независима експертна приемка');
 const declared=manifest?.normative_source_roots||[];
 if(!Array.isArray(declared)||JSON.stringify(declared)!==JSON.stringify(PROTECTED_SOURCES))
   add('SOURCE_SCOPE','Обхватът на нормативните модули е променен без протоколна версия');
 if(!manifest?.expected_git_blob_sha1||Object.keys(manifest.expected_git_blob_sha1).sort().join('|')!==[...PROTECTED_SOURCES].sort().join('|'))
   add('HASH_SCOPE','Липсва заключен цифров отпечатък за модул');
 for(const p of PROTECTED_SOURCES){
  const source=sources[p];
  if(typeof source!=='string'){add('SOURCE_MISSING','Липсва нормативен модул '+p);continue;}
  if(gitBlobSha1(source)!==manifest?.expected_git_blob_sha1?.[p])
    add('UNREVIEWED_NORMATIVE_CHANGE','Нормативен модул е изменен без нова експертна приемка: '+p);
  // Only the closed production dependencies may be imported from normative modules.
  const withoutComments=stripComments(source);
  const imports=[...withoutComments.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)];
  const allowed=new Set(['./v11-trusted-source-registry.mjs','./v11-verified-fee-schedule.mjs','./stage4-independent-legal-engine.mjs','../integration/stage4-independent-legal-engine.mjs','../integration/v11-trusted-source-registry.mjs','./pni-normative-conditions.mjs']);
  for(const m of imports)if(!allowed.has(m[1]))
    add('DEPENDENCY_POLLUTION','Недопустим внос в нормативен модул '+p+': '+m[1]);
  if(/\b(?:fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(withoutComments))
    add('RUNTIME_EXTERNAL_MUTATION','Нормативният модул ползва променящ се външен/локален източник: '+p);
 }
 const normativeGraph=sources['kt80/independence/pni-normative-conditions.mjs'];
 if(typeof normativeGraph==='string'){
  const graphCode=stripComments(normativeGraph);
  if(!/APPROVED_CONDITIONS\s*=\s*Object\.freeze\(\[\s*\]\)/.test(graphCode)||
     !/LEGAL_DOMAINS\s*=\s*Object\.freeze\(\[\s*\]\)/.test(graphCode))
   add('UNREVIEWED_RULE_GRAPH','Въведени са правни правила или домейни без доказана независима приемка');
  if(!/statutesExhaustivelyMapped:\s*false/.test(graphCode)||
     !/reviewedByQualifiedExpert:\s*false/.test(graphCode))
   add('FORGED_COVERAGE','Пълнотата на нормативния граф е обявена без приемка');
 }
 const reviewCode=sources['kt80/independence/pni-independent-review.mjs'];
 if(typeof reviewCode==='string'){
  const noComments=stripComments(reviewCode);
  if(!noComments.includes("exact(data,['confirmedSubject','scopeConfirmed','evidence'])"))
   add('CASE_RULE_INJECTION','Автоматичният автор може да приеме правила или процедури от преписката');
  if(!noComments.includes('readyForStage5Draft:eligible && evaluation.readyForStage5Draft'))
   add('INCOMPLETE_LEGAL_COVERAGE','Проектът може да прескочи проверката на нормативната пълнота');
 }
 const discovery=sources['kt80/integration/kt83-v1-4-hypothesis-discovery.mjs'];
 if(typeof discovery==='string'){
  const code=stripComments(discovery);
  if(/lookupVerifiedArticle\s*\(\s*['"][^'"]+['"]|registryId\s*:\s*['"][^'"]+['"]|\bdetectors\s*=|FIELD_ID\s*=|kt83_annex2_screening_applicability/.test(code))
    add('HIDDEN_ARTICLE_PRIORITY','Автоматичният откривател съдържа зададен правен фаворит или семантичен shortcut');
  if(!/\bcandidates\s*:\s*\[\s*\]/.test(code)||!/AWAITING_UNBIASED_NORMATIVE_MAPPING/.test(code))
    add('FAIL_CLOSED','Откривателят не е надеждно блокиран до одобрена универсална правна схема');
 }
 return {ok:errors.length===0,errors,normativeFingerprint:normativeFingerprint(sources),
   scope:'PROTECTED_SOURCES_ONLY',coverage:'TECHNICAL_ISOLATION_NOT_LEGAL_COMPLETENESS',
   permitsAutomaticLegalConclusion:false};
}
export function loadSnapshot(root=base){
 const manifest=JSON.parse(readFileSync(resolve(root,'kt80/independence/pni-locked-manifest.json'),'utf8'));
 const sources=Object.fromEntries(PROTECTED_SOURCES.map(p=>[p,readFileSync(resolve(root,p),'utf8')]));
 return {manifest,sources};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=verifyIndependence(...Object.values(loadSnapshot()));
 if(!result.ok){
  console.error('ПНИ: БЛОКИРАНО\n'+result.errors.map(e=>e.code+': '+e.reason).join('\n'));
  process.exitCode=1;
 }else{
  console.log('ПНИ: ПРОВЕРЕНО — техническа изолация на нормативните модули');
  console.log('Отпечатък: '+result.normativeFingerprint);
  console.log('ВАЖНО: това НЕ удостоверява правна пълнота или правна безгрешност.');
 }
}
