import assert from 'node:assert/strict';
import vm from 'node:vm';
import {evaluateDecision} from '../../ai-author-v27/src/kt123-decision-model.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {displayApplicability,overlayPresentationPolish} from '../src/kt126/presentation-polish.mjs';
import {APPLICABILITY_LABELS,APPLICABILITY_MEANINGS} from '../../ai-author-v27/src/kt130-applicability-meaning.mjs';
const read=p=>readFile(new URL('../../../'+p,import.meta.url),'utf8');
const legacy=['ПОЛОЖИТЕЛНА','ОТРИЦАТЕЛНА','НЕОПРЕДЕЛЕНА'];
const labels=['Приложима','Неприложима','Не може да се определи'];
for(let i=0;i<legacy.length;i++){
 const row='ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: '+legacy[i]+' — Конкретни проверими мотиви за разглежданата преписка.';
 assert(displayApplicability(row).includes(': '+labels[i]+' —'));
 assert.equal(APPLICABILITY_LABELS[legacy[i]].label,labels[i]);
 assert(APPLICABILITY_MEANINGS.includes(legacy[i]+' = '+labels[i]));
 assert.equal(row.includes(legacy[i]),true,'Display does not mutate original archived text');
}
const quoted='Цитат от документ: ОТРИЦАТЕЛНА — без промяна.\nСведения за ПОЛОЖИТЕЛНА проба.';
assert.equal(displayApplicability(quoted),quoted,'Unrelated quotes/facts are not relabelled');
assert.equal(displayApplicability('ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: Неприложима — Мотиви.'),'ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: Неприложима — Мотиви.');
const p='vt03/kt80/integration/kt116-expert-approval-handoff.mjs',before=await read(p),after=overlayPresentationPolish(p,before);
class Element{constructor(tag){this.tag=tag;this.children=[];this.value='';}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=[...nodes]}get textContent(){return this.value+this.children.map(n=>n.textContent).join('')}set textContent(v){this.value=v;this.children=[]}}
const mk=(tag,value)=>{const node=new Element(tag);if(value!==undefined)node.textContent=value;return node};
function render(source,text){const start=source.indexOf(' const titlePattern='),end=source.indexOf(' function display(){',start);assert(start>0&&end>start);const c={mk,val:s=>String(s??'').trim(),applicabilityDisplay:displayApplicability};vm.createContext(c);vm.runInContext(source.slice(start,end)+'\nthis.render=render;',c);const host=mk('div');c.render(host,text);return host;}
const text='ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — Проверена е приложимостта по конкретните факти.\n\nВОДЕЩО ПРЕДЛОЖЕНИЕ:\n\nПредлага се действие с пълно местоположение в гр. Карлово.\n\nВтори мотив за действието.\n\nИЗБРАН ПАНЕЛ: 1 — Писмо\n\nЗАЩО ТОЗИ ПАНЕЛ: Отделни мотиви.';
const baseline=render(before,text),fixed=render(after,text);
assert.equal(baseline.children.find(n=>n.tag==='section').children.length,1,'Reproduce empty leading proposal box');
const leading=fixed.children.find(n=>n.tag==='section');assert.equal(leading.children.length,3,'Heading and both following paragraphs stay together');assert(leading.textContent.includes('гр. Карлово.'));assert(!leading.textContent.includes('Отделни мотиви'),'Next heading ends the proposal group');assert(fixed.textContent.includes('Неприложима'));assert(!fixed.textContent.includes('ОТРИЦАТЕЛНА'));
assert(after.includes('Значение на нормативните оценки'));for(const entry of Object.values(APPLICABILITY_LABELS))assert(after.includes(entry.label+' — '+entry.definition[0].toLowerCase()+entry.definition.slice(1)));
// The entire expert confirmation function and its existing overrides remain unchanged.
const action=s=>{const a=s.indexOf(' confirm.onclick=async()=>{'),b=s.indexOf(' next.onclick=()=>{',a);assert(a>0&&b>a);return s.slice(a,b)};
assert.equal(action(after),action(before));
const worker=await read('cloudflare/ai-author-v27/src/worker.js');const qual=await read('cloudflare/ai-author-v27/src/kt123-evidence-qualification.mjs');
assert(qual.includes('export const QUALIFICATION_SYSTEM=[\n APPLICABILITY_MEANINGS,'));
assert(worker.includes('  MOSV_EDITORIAL_GUIDE,\n  APPLICABILITY_MEANINGS,'));assert(worker.includes('const reviewSystem=[\n    APPLICABILITY_MEANINGS,'));
// Source guard: only one import and one instruction added to the qualifier.
const normalized=qual.replace("import {APPLICABILITY_MEANINGS} from './kt130-applicability-meaning.mjs';\n",'').replace(' APPLICABILITY_MEANINGS,\n','');
assert.equal(createHash('sha256').update(normalized).digest('hex'),'6f201b31383dd33cc2a6d6bec9d962d4f86e6d2b6a26dc4ab44e81eae6f787c5');
assert.equal(createHash('sha256').update(await read('cloudflare/ai-author-v27/src/kt130-applicability-meaning.mjs')).digest('hex'),'2cbc1c32df67bce705283198814afade435a601f67db60f0fe7a8b67696b5f35','Only the reviewed meanings are accepted');
console.log('PASS KT130 applicability: three precise meanings shared by qualifier/author/reviewer, faithful display of archived values, quotes preserved, empty proposal box reproduced/fixed, expert confirmation unchanged');

// Compatibility of a stated route is distinct from proving its case-specific grounds.
const reason='Конкретните предпоставки са съпоставени с проверени факти и точно посочени доказателства.';
const rows=Object.fromEntries(['A1','A2','OS1','OS2'].map(key=>[key,{status:'ОТРИЦАТЕЛНА',reason,count:1}]));
const base={rows,selectedPanel:1,legalSourceVerified:true,authoritativeEvidence:{}};
const negative=evaluateDecision(base);assert(negative.errors.some(e=>e.code==='PANEL_01_CONTRADICTS_LEGAL_FACTS'));
assert.equal(rows.OS2.status,'ОТРИЦАТЕЛНА','No automatic positive OS2 from three negative assessments');
const justified={...rows,OS2:{status:'ПОЛОЖИТЕЛНА',reason:'Основание за произнасяне: конкретно обосновани предпоставки по ал. 2; Предложен резултат от проверката: не е необходимо провеждане на процедура по реда на наредбата.',count:1}};
assert.equal(evaluateDecision({...base,rows:justified}).compatible,true,'Applicable basis and no-procedure result are not contradictory');
assert.equal(evaluateDecision({...base,rows:justified}).canIssueAdministrativeAct,false,'Compatibility never issues or approves an act');
const uncertain={...justified,OS2:{status:'НЕОПРЕДЕЛЕНА',reason:'Не е установен конкретен решаващ факт, необходим за преценката по относимата правна предпоставка.',count:1}};
assert(evaluateDecision({...base,rows:uncertain}).errors.some(e=>e.code==='PANEL_01_CONTRADICTS_LEGAL_FACTS'));assert.equal(uncertain.OS2.status,'НЕОПРЕДЕЛЕНА');
const overlapping={...justified,OS1:{status:'ПОЛОЖИТЕЛНА',reason,count:1}};assert(evaluateDecision({...base,rows:overlapping}).errors.some(e=>e.code==='OS_ART2_MUTUALLY_EXCLUSIVE'));
assert(APPLICABILITY_MEANINGS.includes('Основание за произнасяне: …; Предложен резултат от проверката: …'));
assert(APPLICABILITY_MEANINGS.includes('Първите три отрицателни проверки НЕ са автоматичен алгоритъм'));
assert(after.includes('Приложима“ може да бъде съчетано с обоснован извод'));
const twoAxesText='ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: '+justified.OS2.status+' — '+justified.OS2.reason;
const view=render(after,twoAxesText);assert(view.textContent.includes('Приложима'));assert(view.textContent.includes('Основание за произнасяне:'));assert(view.textContent.includes('Предложен резултат от проверката: не е необходимо'));
console.log('PASS KT130 OS2: applicable basis with no-procedure result allowed, no automatic positive from three negatives, uncertainty/conflicts preserved, original compatibility engine and expert authority unchanged');

assert(APPLICABILITY_MEANINGS.includes('ЗАВЪРШЕНА ВЕРИГА НА ПРЕДЛОЖЕНИЕТО:'));
assert(APPLICABILITY_MEANINGS.includes('възможни, а не предварително предпочетени резултати'));
assert(APPLICABILITY_MEANINGS.includes('не ограничават 22-та панела'));
assert(APPLICABILITY_MEANINGS.includes('не доказва буферна зона на ЗТ'));
assert(APPLICABILITY_MEANINGS.includes('Не избирай „не е необходима процедура“ само защото първите три оценки са отрицателни'));
console.log('PASS KT130 complete proposal: explicit non-predetermined action, exact evidence types and all 22 routes retained; no new expert veto');
