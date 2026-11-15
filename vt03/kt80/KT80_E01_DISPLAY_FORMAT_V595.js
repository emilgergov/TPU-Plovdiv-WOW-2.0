/* KT82 V59.5 isolated display adapter; includes verified Kalofer EKATTE. */
/* KT80 V23: presentation-only formatting; no changes to GIS geometry or raw source data. */
(function(root){'use strict';
const missing='НЯМА ДАННИ';
const has=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
const number=v=>{if(!has(v))return null;const n=typeof v==='number'?v:Number(String(v).trim().replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const formatter=new Intl.NumberFormat('bg-BG',{minimumFractionDigits:0,maximumFractionDigits:2});
function numeric(v){const n=number(v);return n===null?missing:formatter.format(n)}
function area(v){return numeric(v)}
function percent(v){const n=number(v);return n===null?missing:formatter.format(n)+' %'}
const verifiedSettlements=Object.freeze({'56784':'пловдив','35496':'калофер'});
function ekatte(id,profile){
 const supplied=[profile?.ekatte,profile?.EKATTE,profile?.ekattefn].find(has);
 const candidate=String(id||'').match(/^(\d{5})\./)?.[1]||null;
 if(supplied){const code=String(supplied).trim().padStart(5,'0');return /^\d{5}$/.test(code)&&(!candidate||code===candidate)?code:missing}
 if(!candidate)return missing;
 const settlement=String(profile?.settlement||profile?.settlement_name||profile?.naseleno_myasto||'').toLocaleLowerCase('bg-BG').replace(/^(гр\.|с\.)\s*/,'').trim();
 return verifiedSettlements[candidate]===settlement?candidate:missing;
}
function locality(v){if(!has(v))return missing;const s=String(v).trim();if(/^рогошко шосе\s*[-–]\s*север$/i.test(s))return 'Рогошко шосе – север';return s}
root.KT80Display=Object.freeze({missing,numeric,area,percent,ekatte,locality,number});
})(window);
