/* V26 PDF2 browser preparation: no server, no invented legal verification. */
(()=>{'use strict';
const state={gis:null,register:null};
const host=document.getElementById('v26Annex2Static');
const info=document.getElementById('v26Annex2Info');
const button=document.getElementById('v26Annex2Button');
if(!host||!info||!button)return;
function update(){
 const count=state.register?.records?.length||0,verified=state.register?.verified||0;
 const hasGIS=!!state.gis;
 button.disabled=!(hasGIS&&count);
 info.textContent='ГИС резултат: '+(hasGIS?'получен':'ПРЕДСТОИ')+' · Нормативни записи: '+count+' · Проверени записи: '+verified+' · Непроверени: '+(count-verified)+'. '+(button.disabled?'За подготовка са нужни и двата източника.':'Подготвя се справочно приложение, не правно заключение.');
}
document.addEventListener('v26:gis-ready',e=>{state.gis=e.detail;update()});
document.addEventListener('v26:gis-invalidated',()=>{state.gis=null;update()});
document.addEventListener('v26:normative-register-ready',e=>{state.register=e.detail;update()});
document.addEventListener('v26:normative-register-error',()=>{state.register=null;update()});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
button.onclick=()=>{
 if(!state.gis||!state.register?.records?.length)return;
 const ids=(state.gis.results||[]).map(r=>r.cadnum||r.input).filter(Boolean);
 const rows=state.register.records.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.title)+'</td><td>'+esc(r.source)+'</td><td>'+esc(r.verified===true?'Потвърден':'ПРЕДСТОИ')+'</td></tr>').join('');
 const html='<!doctype html><html lang="bg"><head><meta charset="utf-8"><title>ТПУ Пловдив · Приложение №2</title><style>body{font:12px Arial;margin:24mm;color:#172b23}h1{font-size:19px}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #bbb;padding:6px;overflow-wrap:anywhere;text-align:left}th{background:#eee}p{line-height:1.5}@page{size:A4;margin:18mm}</style></head><body><h1>ТПУ Пловдив — Приложение №2</h1><p><b>Справочен проект. Не е издадено становище или правно заключение.</b></p><p>Имотни идентификатори: '+esc(ids.join(', ')||'ПРЕДСТОИ')+'</p><p>ГИС източник: '+esc(state.gis.source||'ПРЕДСТОИ')+'. Нормативните записи без потвърждение остават ПРЕДСТОИ.</p><table><thead><tr><th>Код</th><th>Документ</th><th>Официален източник</th><th>Статус</th></tr></thead><tbody>'+rows+'</tbody></table><p>За PDF използвайте „Печат“ → „Запазване като PDF“ в браузъра. Геометрични и нормативни изводи не се удостоверяват с това приложение.</p></body></html>';
 const popup=window.open('','_blank');if(!popup){info.textContent='Браузърът блокира новия прозорец. Разрешете изскачащи прозорци за този сайт.';return}
 popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
};
if(window.V26NormativeRegister?.status==='ready'){const records=window.V26NormativeRegister.records;state.register={records,verified:records.filter(r=>r.verified===true).length};}
update();
})();
