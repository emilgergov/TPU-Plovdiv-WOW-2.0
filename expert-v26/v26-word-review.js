/* V26.4 expert review: no unverified text enters the Word template. */
(()=>{'use strict';
const labels=['Строителство и дейности','Електроснабдяване','Водоснабдяване','Отпадъчни води'];
let fields=[],confirmed=null;
function mount(){
 const button=document.getElementById('proposal');if(!button||document.getElementById('v26WordReview'))return;
 const box=document.createElement('details');box.id='v26WordReview';box.style.cssText='margin:12px 0;padding:12px;border:1px solid #82998a;border-radius:8px';
 const summary=document.createElement('summary');summary.textContent='Проверка на четирите абзаца за Word предложението';box.append(summary);
 const hint=document.createElement('p');hint.textContent='Попълнете само доказани обстоятелства от преписката. Прегледът е задължителен преди Word. Празни или непотвърдени абзаци блокират генерирането.';box.append(hint);
 fields=labels.map(label=>{const wrap=document.createElement('div');wrap.style.margin='8px 0';const title=document.createElement('label');title.textContent=label;title.style.display='block';const area=document.createElement('textarea');area.rows=3;area.style.cssText='display:block;width:100%;box-sizing:border-box';area.addEventListener('input',()=>{confirmed.checked=false});wrap.append(title,area);box.append(wrap);return area});
 const check=document.createElement('label');confirmed=document.createElement('input');confirmed.type='checkbox';check.append(confirmed,document.createTextNode(' Потвърждавам, че четирите абзаца са проверени по документите от преписката.'));box.append(check);
 button.parentNode.insertBefore(box,button);
}
function getConfirmedParagraphs(){
 if(!confirmed||!confirmed.checked)throw Error('Отворете „Проверка на четирите абзаца“ и потвърдете съдържанието.');
 const values=fields.map(f=>f.value.trim());if(values.some(x=>!x))throw Error('Попълнете четирите абзаца за Word предложението.');return values;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
document.addEventListener('v26:dossier-loaded',event=>{
 const draft=event.detail?.context?.characterization;
 const topics=[['construction','Строителни дейности'],['electricity','Електрозахранване'],['water_supply','Водоснабдяване'],['wastewater','Отпадъчни води']];
 const box=document.getElementById('v26WordReview');if(!box)return;
 box.querySelectorAll('.v26-evidence-suggestion').forEach(el=>el.remove());
 topics.forEach(([key],i)=>{
  const section=draft?.sections?.find(x=>x.key===key);if(!section?.sources?.length||!fields[i])return;
  const wrapper=document.createElement('div');wrapper.className='v26-evidence-suggestion';wrapper.style.cssText='font-size:0.9em;margin:3px 0 10px;padding:7px;border-left:3px solid #819d89';
  const title=document.createElement('strong');title.textContent='Откъси от преписката — за проверка:';wrapper.append(title);
  section.sources.slice(0,3).forEach(source=>{const p=document.createElement('p');p.textContent=source.file+' · '+(source.date||'дата неустановена')+': '+source.excerpt.slice(0,380);wrapper.append(p)});
  fields[i].parentNode.append(wrapper);
 });
});
document.addEventListener('v26:gis-invalidated',()=>{if(confirmed)confirmed.checked=false;for(const f of fields)f.value='';});
window.V26WordReview=Object.freeze({getConfirmedParagraphs});
})();
