/* KT80 V11 - direct adapter to reviewed V26ParcelEditor.normalize, no GIS or legal inference */
(function(root){'use strict';
const ids={entry:'kt80ParcelInput',run:'kt80ParcelNormalize',result:'kt80ParcelResults',source:'kt80ParcelSource'};
const byId=id=>document.getElementById(id);
function safeText(element,value){element.textContent=String(value==null?'':value);}
function render(result){
 const host=byId(ids.result);if(!host)return;host.replaceChildren();
 const title=document.createElement('strong');title.textContent='Идентификатори за потвърждение: '+result.ids.length;host.append(title);
 const list=document.createElement('div');list.className='kt80-parcel-chips';
 result.ids.forEach(id=>{const span=document.createElement('span');span.className='kt80-parcel-chip';safeText(span,id);list.append(span)});
 host.append(list);
 for(const [label,items] of [['Нормализации',result.changes],['Нееднозначни — ръчна проверка',result.uncertain],['Невалидни — ръчна проверка',result.invalid]]){
  if(!items.length)continue;const el=document.createElement('p');const strong=document.createElement('strong');safeText(strong,label+': ');el.append(strong,document.createTextNode(items.join('; ')));host.append(el);
 }
 const foot=document.createElement('small');foot.textContent='Това е текстова нормализация, НЕ проверка в кадастъра, ПИ MASTER или ГИС. Нито един имот не е автоматично обявен за водещ.';host.append(foot);
}
function run(){
 const host=byId(ids.result);
 if(!root.V26ParcelEditor||typeof root.V26ParcelEditor.normalize!=='function'){if(host)safeText(host,'Модулът за нормализация не е зареден. Не се извършва заместващо предположение.');return}
 const raw=byId(ids.entry)?.value||'';
 const parsed=root.V26ParcelEditor.normalize(raw);
 render(parsed);
 root.KT80ParcelDraft=Object.freeze({source:'manual_unverified',engine:'V26ParcelEditor.normalize',ids:Object.freeze([...parsed.ids]),changes:Object.freeze([...parsed.changes]),uncertain:Object.freeze([...parsed.uncertain]),invalid:Object.freeze([...parsed.invalid]),expert_confirmed:false,spatially_verified:false});
}
function boot(){const btn=byId(ids.run);if(btn)btn.addEventListener('click',run)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(window);
