/* KT67-2.2: independent inspection of AI legal claims and thematic impact order.
   Project status does NOT convert unsupported legal assertions into verified law. */
(function(root){'use strict';
const normal=t=>String(t||'').toLocaleLowerCase('bg');
function inspect(plan){
 const issues=[];
 const legal=plan?.expert?.legal||[],procedure=plan?.expert?.procedure||[],impacts=plan?.expert?.impacts||[];
 const provisions=Number(plan?.provenance?.verifiedProvisionCount||0);
 for(const [section,list] of [['LEGAL',legal],['PROCEDURE',procedure]]){
  for(const paragraph of list){
   const t=normal(paragraph);
   if(t.includes('е необходима оценка за съвместимост')||
      t.includes('задължителна оценка за съвместимост')||
      t.includes('препоръча провеждане на процедура за оценка за съвместимост')||
      t.includes('следва да се проведе процедура за оценка за съвместимост'))
    issues.push({code:'UNSUPPORTED_CATEGORICAL_OS',section});
   if(provisions===0&&(/(?:на основание|съгласно|по смисъла на)\s+чл\.?\s*\d+/iu).test(t))
    issues.push({code:'UNVERIFIED_ARTICLE',section});
   if(/съдебно-юридическ|присъдени правомощия|проекто-експертн/u.test(t))
    issues.push({code:'INAPPROPRIATE_LEGAL_LANGUAGE',section});
  }
 }
 const patterns=[
  /местообитан|хабитат/u,/видов|видове|птици|безпокойств/u,
  /целост|природозащитн|цели на опазван/u,
  /кохерент|свързаност|екологична мрежа/u,
  /кумулатив|съвкупн/u
 ];
 if(impacts.length===6)for(let i=0;i<5;i++){
  if(!patterns[i].test(normal(impacts[i+1])))issues.push({code:'IMPACT_TOPIC_ORDER',section:'IMPACTS',position:i+2});
 }
 return {ok:issues.length===0,issues};
}
root.KT6722LegalQuality=Object.freeze({inspect});
})(window);
