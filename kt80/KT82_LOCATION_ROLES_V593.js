/* КТ82-11 · V59.3 — роли на местоположенията по принципа на V27.35.
 * Само доказателствено предложение. Не удостоверява геометрия.
 */
(function(root){'use strict';
const clean=x=>String(x??'').replace(/\s+/gu,' ').trim();
const lower=x=>clean(x).toLocaleLowerCase('bg');
const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function rank(entries,documents){
 const ranked=[];
 for(const entry of entries||[]){
  const name=lower(entry?.settlement).replace(/^(гр\.|с\.)\s*/,'').trim();
  const ekatte=clean(entry?.ekatte);
  if(name.length<3||!ekatte)continue;
  const hits=[];let score=0,siteScore=0;
  for(const doc of documents||[]){
   const text=clean(doc.text);if(!text)continue;
   const lc=lower(text);
   const rex=new RegExp('(?:гр\\.|с\\.|град|село)\\s+'+esc(name)+'(?=$|[^а-я])','giu');
   const positions=[];let match;
   while((match=rex.exec(lc))&&positions.length<3)positions.push({index:match.index,length:match[0].length});
   for(const pos of positions){
    const before=lc.slice(Math.max(0,pos.index-120),pos.index);
    const after=lc.slice(pos.index+pos.length,pos.index+pos.length+65);
    const near=before+' '+after;
    const administrative=/(?:до\s+(?:директора|министъра)|риосв|мосв|адресат|получател|кореспонденц|седалище|подател|адрес за контакт)/iu.test(before.slice(-80));
    const site=/(?:местоположение\s+на\s+(?:обекта|инвестиционното|съоръжението)|обект(?:ът|а)?\s+(?:се\s+намира|е разположен)|изграждане|ремонт|реконструкция|подмяна|реализация|площадка|трафопост|\bтп\b|\bупи\b|землище|местност|трасе)/iu.test(before.slice(-95))||
      /(?:\bкв\.\s*\d+|местност|упи|имот|площадка|землище|трафопост)/iu.test(after.slice(0,55));
    const companion=/(?:съседен|съпътстващ|прилежащ|допълнителна площадка|външно трасе)/iu.test(before.slice(-75));
    const weight=Math.max(1,Number(doc.weight)||3);
    let role='КОНТЕКСТ',points=0;
    if(administrative){role=/риосв|мосв|директора|министъра|адресат/iu.test(before.slice(-80))?'АДМИНИСТРАТИВЕН ОРГАН':'КОРЕСПОНДЕНЦИЯ';points=-Math.min(25,weight+7);}
    else if(companion){role='СЪПЪТСТВАЩ';points=4;}
    else if(site){role='ОБЕКТ';points=weight+12;}
    else {points=Math.min(3,weight);}
    score+=points;if(role==='ОБЕКТ')siteScore+=points;
    hits.push({role,points,source:clean(doc.sourceName||doc.source||'Преписка'),excerpt:text.slice(Math.max(0,pos.index-60),Math.min(text.length,pos.index+pos.length+85))});
   }
  }
  if(hits.length)ranked.push({entry,score,siteScore,hits});
 }
 ranked.sort((a,b)=>b.siteScore-a.siteScore||b.score-a.score||clean(a.entry.ekatte).localeCompare(clean(b.entry.ekatte)));
 const first=ranked[0],second=ranked[1];
 const clear=!!first&&first.siteScore>=16&&(!second||first.siteScore>=second.siteScore+9);
 return Object.freeze({ranked,leading:clear?first:null,ambiguous:!clear,reason:clear?
  'Предложение за водещо местоположение според доказателствата за обекта.':
  ranked.length?'Няма достатъчно еднозначна връзка между обекта и населеното място.':'Не е установено доказателствено подкрепено населено място.'});
}
root.KT82LocationRoles=Object.freeze({rank});
})(window);