/* KT77-23: do not convert spatial overlap into an automatic legal disposition.
 * Reinforces existing Cloudflare institutional style; checks ONLY free AI author output.
 * Never changes hard Word paragraphs, dossier data or PDF output. */
(function(root){'use strict';
const previous=root.V27AIAuthor;
if(!previous?.generate){console.error('KT77-23: AI client unavailable');return;}
const bad=[
 /(?:всяко|всички)\s+инвестиционн(?:о|и)\s+предложени(?:е|я)[^.!?]{0,180}подлеж(?:и|ат)/iu,
 /(?:попадането|пространственото\s+пресичане)[^.!?]{0,140}(?:задължителн(?:а|о)|изисква\s+задължително)/iu,
 /информационен\s+вакуум/iu,
 /настоящата\s+предварителна\s+административна\s+проверка\s+препоръчва/iu,
 /предоставените\s+правни\s+сведения\s+са\s+изцяло\s+в\s+каталожна\s+форма/iu
];
const problems=s=>bad.map((r,i)=>r.test(s)?i+1:null).filter(Boolean);
async function generate(payload,token){
 let draft=await previous.generate(payload,token),issues=problems(draft);
 if(!issues.length)return draft;
 console.warn('KT77-23: institutional style/legal implication QA rejected phrases',issues);
 const replacement=await previous.generate(payload,token);
 issues=problems(replacement);
 if(issues.length)throw Error('КТ77-23: AI свободният текст не премина контрола за гласа на органа и недопустими общи процедурни изводи ('+issues.join(', ')+'). ZIP не се създава.');
 return replacement;
}
root.V27AIAuthor=Object.freeze({...previous,generate});
})(window);
