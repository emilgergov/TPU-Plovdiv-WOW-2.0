/* KT67-2.3: evidence-aware project content QA, without word-by-word censorship.
   A missing keyword is not proof that the AI swapped impact topics.
   Only unambiguous displacement blocks generation; uncertainty is reported for DOCX review.
 */
(function(root){'use strict';
const norm=t=>String(t||'').toLocaleLowerCase('bg').replace(/\s+/g,' ').trim();
const topics=[
 {id:'HABITATS',pattern:/местообитан|хабитат|природн[иаое]+\s+местообитан/u},
 {id:'SPECIES',pattern:/видов|видове|птици|безпокойств|популаци|местообитания\s+на\s+видов/u},
 {id:'INTEGRITY',pattern:/целост|цялост|предмет.{0,12}цел.{0,20}опазван|цели.{0,8}опазван|опазван.{0,15}цел|природозащитн|състояние.{0,20}зон/u},
 {id:'COHERENCE',pattern:/кохерент|свързаност|свързан.{0,20}зон|екологичн.{0,20}мреж|миграционн.{0,25}коридор/u},
 {id:'CUMULATIVE',pattern:/кумулатив|съвкупн|натрупван.{0,20}въздейств|комбиниран.{0,20}въздейств/u}
];
function inspect(plan){
 const issues=[],warnings=[];
 const legal=plan?.expert?.legal||[],procedure=plan?.expert?.procedure||[],impacts=plan?.expert?.impacts||[];
 const provisions=Number(plan?.provenance?.verifiedProvisionCount||0);
 for(const [section,list] of [['LEGAL',legal],['PROCEDURE',procedure]]){
  for(const paragraph of list){
   const t=norm(paragraph);
   if(t.includes('е необходима оценка за съвместимост')||
      t.includes('задължителна оценка за съвместимост')||
      t.includes('препоръча провеждане на процедура за оценка за съвместимост')||
      t.includes('следва да се проведе процедура за оценка за съвместимост'))
    issues.push({code:'UNSUPPORTED_CATEGORICAL_OS',section});
   // These are procedural conclusions, not merely statements of GIS overlap.
   // In the absence of verified provisions, an AI project may identify possible
   // procedures for checking, but cannot infer that one is necessary or advised
   // *because* the site intersects a Natura 2000 zone.
   const overreach=[
     /предполага\s+необходимост(?:та)?\s+от\s+(?:извършване|провеждане)\s+на\s+(?:оценка\s+за\s+съвместимост|съвместимостна\s+оценка)/u,
     /(?:съвместимостн(?:а|ата)\s+оценка|оценката?\s+за\s+съвместимост)\s+е\s+(?:препоръчителна|необходима|задължителна)/u,
     /(?:препоръчва\s+се|целесъобразно\s+е|следва)\s+(?:да\s+се\s+)?(?:извърши|проведе)\s+(?:оценка\s+за\s+съвместимост|съвместимостна\s+оценка)/u,
     /(?:заради|поради|тъй\s+като|понеже)\s+(?:.*?)(?:попада|пресича)(?:.*?)(?:зона|натура\s*2000)(?:.*?)(?:налага|изисква|препоръчва)/u
   ];
   if(provisions===0&&overreach.some(p=>p.test(t)))issues.push({code:'UNSOURCED_PROCEDURE_INFERENCE',section});
   // An uncrosschecked article citation in a clearly marked working draft is
   // a review warning, not a claim that the legal provision has been verified.
   // Unsupported categorical procedural findings above remain blocking.
   if(provisions===0&&(/(?:на основание|съгласно|по смисъла на)\s+чл\.?\s*\d+/iu).test(t))
    warnings.push({code:'UNVERIFIED_ARTICLE',section,reviewRequired:true});
   if(/съдебно-юридическ|присъдени правомощия|проекто-експертн/u.test(t))
    issues.push({code:'INAPPROPRIATE_LEGAL_LANGUAGE',section});
  }
 }
 if(impacts.length===6){
  for(let i=0;i<5;i++){
   const text=norm(impacts[i+1]);
   const hasExpected=topics[i].pattern.test(text);
   if(hasExpected)continue;
   const others=topics.map((topic,index)=>index!==i&&topic.pattern.test(text)?topic.id:null).filter(Boolean);
   // A topic whose expected terms are missing but other topic terms occur is NOT
   // automatically a swap: impact assessments often mention multiple factors.
   // Block only a clear reciprocal swap; otherwise retain text and report review.
   const matchingOtherIndexes=topics.map((topic,index)=>index!==i&&topic.pattern.test(text)?index:-1).filter(x=>x>=0);
   let reciprocal=false;
   for(const j of matchingOtherIndexes){
    const otherText=norm(impacts[j+1]);
    if(topics[i].pattern.test(otherText)&&!topics[j].pattern.test(otherText))reciprocal=true;
   }
   if(reciprocal)issues.push({code:'IMPACT_TOPIC_SWAP',section:'IMPACTS',position:i+2,expected:topics[i].id,observed:others});
   else warnings.push({code:'IMPACT_TOPIC_REVIEW',section:'IMPACTS',position:i+2,expected:topics[i].id,observed:others});
  }
 }
 return {ok:issues.length===0,issues,warnings};
}
root.KT6722LegalQuality=Object.freeze({inspect});
})(window);
