/* KT51 AI-to-Classic characterization adapter.
 * Does not author facts or change approved templates. It lifts only complete
 * existing sentences from the reviewed AI CHARACTERIZATION section.
 */
(function(root){'use strict';
const str=x=>String(x??'').replace(/\s+/g,' ').trim();
const unverified=x=>!str(x)||/\[(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ОТКЪС ОТ ПРЕПИСКАТА|ЗА ПОПЪЛВАНЕ)|НЯМА ДАННИ|Няма данни в преписката/i.test(str(x));
function sections(raw){
 const hits=[...String(raw||'').matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)];
 if(hits.length!==4||hits.map(x=>x[1]).join(',')!=='CHARACTERIZATION,LEGAL,PROCEDURE,IMPACTS')
  throw Error('КТ51: липсват пълните четири раздела на AI автора.');
 return String(raw).slice(hits[0].index+hits[0][0].length,hits[1].index).trim();
}
function splitSentences(input){
 // Preserve original words; separate only at complete sentence boundaries.
 return str(input).split(/(?<=[.!?])\s+(?=[А-ЯA-Z„"«])/u).map(str).filter(Boolean);
}
function build(aiDraft,confirmed=[]){
 if(Array.isArray(confirmed)&&confirmed.length===4&&confirmed.every(x=>!unverified(x)))
  return {paragraphs:confirmed.map(str),origin:'expert-confirmed'};
 const raw=sections(aiDraft);
 // A source excerpt or explicit review flag may legitimately occur in the AI
 // draft. It is metadata, not a factual proposition. Remove ONLY the technical
 // bracketed marker, leaving the author's actual sentences untouched.
 const removeReviewTags=x=>String(x).replace(/\[(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ОТКЪС ОТ ПРЕПИСКАТА|ЗА ПОПЪЛВАНЕ)[^\]\n]*\]/gi,'').trim();
 let fragments=raw.split(/\n\s*\n/).map(removeReviewTags).map(str).filter(Boolean);
 // Free-standing 'НЯМА ДАННИ' remains non-evidence, never a DOCX paragraph.
 fragments=fragments.filter(x=>!/^НЯМА ДАННИ(?: В ПРЕПИСКАТА)?[.!]?$/i.test(x));
 if(fragments.some(unverified))throw Error('КТ51: AI характеристиката съдържа неподкрепено твърдение в самия текст, не само технически маркер.');
 // Keep all original sentences; split long blocks only when more paragraphs are needed.
 while(fragments.length<4){
  let bestIndex=-1,bestPieces=null;
  fragments.forEach((p,i)=>{
   const pieces=splitSentences(p);
   if(pieces.length>=2&&(!bestPieces||pieces.length>bestPieces.length)){bestPieces=pieces;bestIndex=i;}
  });
  if(bestIndex<0)break;
  const middle=Math.ceil(bestPieces.length/2);
  fragments.splice(bestIndex,1,bestPieces.slice(0,middle).join(' '),bestPieces.slice(middle).join(' '));
 }
 if(fragments.length<4)
  throw Error('КТ51: AI характеристиката няма четири завършени съдържателни абзаца. Нужна е допълнителна AI редакция, а не шаблонно попълване.');
 if(fragments.length>4)fragments=[...fragments.slice(0,3),fragments.slice(3).join(' ')];
 const normalized=fragments.map(str);
 if(normalized.some(x=>x.length<28||unverified(x))||new Set(normalized.map(x=>x.toLocaleLowerCase('bg'))).size!==4)
  throw Error('КТ51: AI характеристиката съдържа празни, повторени или недостатъчни сведения.');
 return {paragraphs:normalized,origin:'ai-review-draft'};
}
root.KT51AICharacterization=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
