/* KT67-2.2 case metadata and classic-characterization normalization.
 * Only variable data from the actual dossier; no changes to approved templates.
 */
(function(root){'use strict';
function title(value){
 let t=String(value||'').trim().replace(/^Относно:\s*/i,'');
 const q=t.match(/^[„"“](.+?)[“"”]\s+(?:в\s+(?:ПИ|поземлен|имот)|,\s*(?:населено|местност))/iu);
 if(q)t=q[1];
 else t=t.replace(/\s+в\s+(?:ПИ|поземлен(?:и|ия)?\s+имот(?:и)?|имот(?:и)?)\s+(?:с\s+)?идентификатор(?:и)?[\s\S]*$/iu,'');
 return t.replace(/^[„“"\s]+|[„“"\s]+$/g,'').trim();
}
function characterization(value){
 let t=String(value||'').trim();
 if(/^С реализацията на инвестиционното предложение/i.test(t))return t;
 t=t.replace(/^(?:Инвестиционното предложение включва|Предложението включва|Проектът предвижда|Предвижда се)\s+/iu,'');
 return 'С реализацията на инвестиционното предложение се предвижда '+t.replace(/^Изграждането\b/iu,'изграждане');
}
function normalize({paragraphs=[],metadata={}}={}){
 if(!Array.isArray(paragraphs)||paragraphs.length!==4)throw Error('КТ67-2.2: очакват се 4 цели абзаца.');
 return {paragraphs:[characterization(paragraphs[0]),...paragraphs.slice(1)],metadata:{...metadata,subject:title(metadata.subject)}};
}
root.KT6722CaseNormalize=Object.freeze({title,characterization,normalize});
})(window);
