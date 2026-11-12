/* KT80 / KT53.3 — preliminary evidence and procedural relevance, NOT legal qualification.
 * Topic keyword occurrences, especially in generic templates and questions, are
 * not evidence that a work is planned. Only explicit expert verification can elevate it.
 */
(function(root){'use strict';
const norm=s=>String(s??'').replace(/\s+/gu,' ').trim();
const test=(re,s)=>re.test(s);
const TEMPLATE=/(?:посочете|посочва\s+се|опишете|описва\s+се|информация\s+за|данни\s+за|при\s+необходимост|ако\s+е\s+приложимо|необходимо\s+е\s+да\s+се\s+(?:посочи|представи)|представете|да\s+се\s+представи|формуляр|образец|въпросник|изисквания\s+към|дали\s+се|следва\s+ли|необходимост\s+от\s+(?:изграждане|други|свързани)|предвидени\s+изкопни\s+работи.*(?:площ|дълбочина)|очаквано\s+трансгранично|обща\s+използвана\s+площ|свързани\s+с\s+основния\s+предмет\s+спомагателни)/iu;
const NEGATIVE=/(?:не\s+се\s+предвижда|няма\s+да\s+се|не\s+е\s+предвиден|не\s+се\s+изгражда|без\s+заустване)/iu;
const INTENTION=/(?:предвижда\s+се|ще\s+се|предвиден[а-я]*|проектн[а-я]*|инвестиционното\s+предложение\s+включва|дейностите\s+включват|ще\s+бъдат|предстои\s+да|да\s+се\s+подмени|предмет\s+на\s+настоящия\s+проект\s+е)/iu;
const PROJECT_SPECIFIC=/(?:предмет\s+на\s+настоящия\s+проект\s+е|инвестиционното\s+предложение\s+предвижда|предвижда\s+се\s+(?:подмяна|ремонт|монтаж|изграждане)|да\s+се\s+подмени\s+(?:съществуващ|наличен|мрежов)|ще\s+се\s+подмени\s+(?:съществуващ|наличен|мрежов))/iu;
const MAIN=/(?:основен|текущ)\s+ремонт|реконструкц|изграждане\s+на\s+нов/iu;
const TOPICS={
 replacement:{name:'Подмяна на съоръжения',weight:'съществено при доказване'},
 installation:{name:'Монтаж и оборудване',weight:'съществено при доказване'},
 electrical_equipment:{name:'Електрически съоръжения',weight:'съществено'},
 water_connection:{name:'Водоснабдяване',weight:'условно — само при доказана връзка'},
 wastewater_connection:{name:'Отпадъчни води и заустване',weight:'условно — само при доказана връзка'},
 electricity_connection:{name:'Присъединяване към електрическата мрежа',weight:'съществено при доказване'},
 access:{name:'Транспортен достъп',weight:'условно — при нови съоръжения/достъп'}
};
const INFRA=new Set(['water_connection','wastewater_connection','electricity_connection','access']);
function classify(fact,key){
 const excerpt=norm(fact?.excerpt);
 if(!excerpt)return 'NO_EVIDENCE';
 const reliable=fact?.readerState==='TEXT_EXTRACTED'&&!fact?.evidenceExcluded;
 if(!reliable)return 'REVIEW_SOURCE';
 // Project-specific assertion takes priority over generic questionnaire terms.
 if(PROJECT_SPECIFIC.test(excerpt)){
  if(INFRA.has(key)){
   const actual=/(?:предвижда\s+се|ще\s+се|предмет\s+на\s+настоящия\s+проект\s+е|инвестиционното\s+предложение\s+предвижда)[^.!?]{0,100}(?:водоснабдяван|водопровод|заустван|отпадъчни\s+води|канализац|присъединяван|достъп|нов\s+път)/iu.test(excerpt);
   return actual?'EXPLICIT_UNVERIFIED':'MENTION_ONLY';
  }
  if(key==='replacement'||key==='electrical_equipment'||key==='installation')return 'EXPLICIT_UNVERIFIED';
 }
 if(TEMPLATE.test(excerpt)||NEGATIVE.test(excerpt))return 'TEMPLATE_OR_NEGATIVE';
 if(INTENTION.test(excerpt)){
  // A generic form field with the word 'предвидени' is not sufficient evidence.
  if(INFRA.has(key))return 'MENTION_ONLY';
  if(key==='replacement'||key==='electrical_equipment'||key==='installation')return 'REVIEW_SOURCE';
 }
 if(key==='electrical_equipment'&&MAIN.test(excerpt))return 'REVIEW_SOURCE';
 return 'MENTION_ONLY';
}
function assess(reconstruction,subject){
 const topics=[],excluded=[],review=[],verified=[];
 for(const section of reconstruction?.sections||[])for(const item of section.items||[]){
  const rule=TOPICS[item.key];if(!rule)continue;
  const evidence=item.evidence||[];
  const kinds=evidence.map(f=>classify(f,item.key));
  const positive=evidence.filter((f,i)=>kinds[i]==='EXPLICIT_UNVERIFIED');
  const mentions=evidence.filter((f,i)=>kinds[i]==='MENTION_ONLY'||kinds[i]==='REVIEW_SOURCE');
  if(!evidence.length)continue;
  const entry={key:item.key,name:rule.name,proceduralWeight:rule.weight,positives:positive.length,mentions:mentions.length,all:evidence.length,
   sources:positive.slice(0,3).map(f=>({file:f.file,page:f.page,excerpt:f.excerpt}))};
  if(positive.length){review.push(entry);topics.push(entry)}
  else excluded.push({...entry,sources:evidence.slice(0,3).map(f=>({file:f.file,page:f.page,excerpt:f.excerpt})),reason:'Не е установена предвидена дейност: откъсът може да е шаблон, въпрос, отрицателно твърдение или споменаване без необходимия контекст. Това НЕ доказва отсъствие на дейността.'});
 }
 const approved=(reconstruction?.confirmedParameters||[]).filter(p=>p?.original&&!p.evidenceExcluded&&p.role!=='ambiguous'&&!p.compoundDesignation);
 for(const p of approved)verified.push({label:String(p.type||'Технически параметър'),value:String(p.original),role:p.role});
 const t=norm(subject).toLocaleLowerCase('bg');
 const electrical=/трафопост|електрическ[а-я]*\s+съоръжен|трансформатор/iu.test(t);
 const crucial=electrical?[
  {key:'works',label:'Точен вид и граници на ремонтните работи',status:'ЗА ЕКСПЕРТНА ПРОВЕРКА'},
  {key:'capacities',label:'Променят ли се мощности, брой и технически характеристики на съоръженията?',status:'НЕУСТАНОВЕНО — НЕ ОЗНАЧАВА „НЕ“'},
  {key:'construction',label:'Предвидени ли са ново строителство или разширение?',status:'НЕУСТАНОВЕНО — НЕ ОЗНАЧАВА „НЕ“'},
  {key:'boundaries',label:'Променя ли се пространственият обхват на намесата?',status:'ЗА СВЪРЗВАНЕ С ПИ MASTER И ГИС'}
 ]:[{key:'activity',label:'Характер, мащаб и пространствен обхват на основната дейност',status:'ЗА ЕКСПЕРТНА ПРОВЕРКА'}];
 return Object.freeze({schema:'KT80-KT53.3-RELEVANCE',subject:norm(subject),verified,review,excluded,crucial,
  proceduralDecision:null,mayDetermineProcedure:false,
  note:'Това е предварителен филтър за факти и съществени липси, а не правна квалификация. Непосоченото не е доказано отсъстващо.'});
}
root.KT80Relevance=Object.freeze({assess,classify});
})(window);
