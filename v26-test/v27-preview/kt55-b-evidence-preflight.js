/* KT55: B evidence intake and preflight only. Approved KT42 Word writer unchanged. */
(function(root){'use strict';
const idsOf=results=>(results||[]).map(r=>String(r.input||r.cadnum||'').trim()).filter(Boolean).join(', ');
const clean=x=>String(x??'').trim();
const placeholder=x=>!x||/\[(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ЗА ПОПЪЛВАНЕ)|НЯМА ДАННИ|неустановено/i.test(x);
const labels=[
 'Характеристика 1 · предмет и дейности','Характеристика 2 · електрозахранване','Характеристика 3 · водоснабдяване','Характеристика 4 · отпадъчни води',
 'Правно основание 1','Правно основание 2','Правно основание 3','Правно основание 4',
 'Въздействие 1','Въздействие 2','Въздействие 3','Въздействие 4','Въздействие 5',
 'Мотивиран процедурен извод'
];
let saved=null;
function readyFor(results){return saved&&saved.parcels===idsOf(results);}
function show(results){
 const modal=document.getElementById('kt55-evidence-dialog');
 if(!modal)throw Error('КТ55: липсва редакторът за доказателствените данни.');
 const parcel=idsOf(results);
 if(!saved||saved.parcels!==parcel)saved=null;
 modal.querySelector('[data-kt55-parcels]').textContent=parcel;
 const inputs=Array.from(modal.querySelectorAll('textarea[data-kt55-i]'));
 if(saved){inputs.forEach((el,i)=>el.value=saved.values[i]);modal.querySelector('#kt55-confirm').checked=true;}
 modal.showModal();
}
function missing(values){
 const result=[];
 values.forEach((value,i)=>{if(placeholder(value))result.push(labels[i]);});
 return result;
}
function capture(results){
 const dlg=document.getElementById('kt55-evidence-dialog');
 const values=Array.from(dlg.querySelectorAll('textarea[data-kt55-i]')).map(e=>clean(e.value));
 const absent=missing(values);
 const status=dlg.querySelector('[data-kt55-status]');
 if(absent.length){status.textContent='Непотвърдени: '+absent.join('; ')+'.';return false;}
 if(!dlg.querySelector('#kt55-confirm').checked){status.textContent='Потвърждението от експерта е задължително.';return false;}
 saved={parcels:idsOf(results),values};
 dlg.close();return true;
}
function prepare(draft,results){
 if(!readyFor(results))return {ok:false,missing:['Липсват потвърдени доказателствени полета за текущия набор имоти.']};
 const v=saved.values,absent=missing(v);
 if(absent.length)return {ok:false,missing:absent};
 const paragraphs=v.slice(0,4),legalParagraphs=v.slice(4,8),impactFindings=v.slice(8,13),procedureFinding=v[13];
 const metadata={...(draft.metadata||{}),legalParagraphs,legalFindingSources:legalParagraphs.map(_=>'Експертно потвърдено по текущата преписка (КТ55)'),impactFindings,procedureFinding};
 return {ok:true,draft:{...draft,paragraphs,metadata}};
}
function reset(){saved=null;}
function mount(){
 if(document.getElementById('kt55-evidence-dialog'))return;
 const d=document.createElement('dialog');d.id='kt55-evidence-dialog';d.style='width:min(850px,95vw);max-height:88vh;overflow:auto;border:1px solid #9caf9e;border-radius:12px;padding:18px;background:white;color:#1a372b';
 const h=document.createElement('h2');h.textContent='КТ55 · доказателствени данни за вариант Б';d.appendChild(h);
 const intro=document.createElement('p');intro.textContent='Това не е редактор на образците. Попълнете само съдържание, действително потвърдено за текущата преписка. Липсващи данни не се заместват с образцов текст.';d.appendChild(intro);
 const parcel=document.createElement('p');parcel.innerHTML='<strong>Имот(и): </strong><span data-kt55-parcels></span>';d.appendChild(parcel);
 labels.forEach((label,i)=>{
  const wrap=document.createElement('div');wrap.style='margin:12px 0';
  const l=document.createElement('label');l.textContent=label;l.htmlFor='kt55-f'+i;l.style='display:block;font-weight:bold';
  const t=document.createElement('textarea');t.id='kt55-f'+i;t.dataset.kt55I=i;t.rows=3;t.style='display:block;width:100%;border:1px solid #afc2b3;border-radius:6px;padding:7px';
  wrap.append(l,t);d.appendChild(wrap);
 });
 const confirm=document.createElement('label');confirm.style='display:flex;gap:10px;align-items:flex-start;margin:12px 0';const cb=document.createElement('input');cb.type='checkbox';cb.id='kt55-confirm';confirm.append(cb,document.createTextNode('Потвърждавам, че всички въведени текстове са проверени за тази преписка. Не са копирани непроверени фактически или процедурни изводи от еталоните.'));d.appendChild(confirm);
 const status=document.createElement('p');status.dataset.kt55Status='1';status.setAttribute('role','status');d.appendChild(status);
 const done=document.createElement('button');done.type='button';done.textContent='Потвърди доказателствените данни';done.onclick=()=>{const found=root.KT55CurrentResults||[];capture(found);};d.appendChild(done);
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Затвори без потвърждение';cancel.style='margin-left:8px';cancel.onclick=()=>d.close();d.appendChild(cancel);
 document.body.appendChild(d);
}
root.KT55BPreflight=Object.freeze({show(results){root.KT55CurrentResults=results;show(results);},prepare,readyFor,reset,mount});
document.addEventListener('DOMContentLoaded',mount);
})(window);
