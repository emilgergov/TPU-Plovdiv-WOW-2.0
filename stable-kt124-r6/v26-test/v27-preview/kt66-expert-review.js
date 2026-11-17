/* KT66: explicit human review of case-specific findings. No generator patching.
   Approved KT39-B / V27-R02 content, structure, and paragraph layout remain owned by KT42.
   The AI draft is displayed intact; it is not split into artificial paragraphs. */
(function(root){'use strict';
const clean=x=>String(x??'').trim();
const invalid=x=>!clean(x)||/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|\[ЗА ПОПЪЛВАНЕ|\[ОТКЪС ОТ ПРЕПИСКАТА|НЯМА ДАННИ/i.test(clean(x));
const labels=[
 'Предмет на ИП и строителни дейности','Електрозахранване','Водоснабдяване','Отпадъчни води',
 'Правна констатация 1','Правна констатация 2','Правна констатация 3','Правна констатация 4',
 'Въздействия — местообитания','Въздействия — видове','Въздействия — цялост и цели','Въздействия — кохерентност','Въздействия — кумулативност',
 'Процедурен извод'
];
function structuredAI(raw){
 const text=String(raw||'');
 const ms=[...text.matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)];
 const res={};
 for(let i=0;i<ms.length;i++)res[ms[i][1]]=text.slice(ms[i].index+ms[i][0].length,ms[i+1]?.index??text.length).trim();
 return res;
}
function check(values,refs,confirmed,ai){
 const issues=[];
 if(values.length!==14||refs.length!==4)issues.push('Непълни полета за експертен преглед.');
 for(let i=0;i<14;i++){
  if(invalid(values[i]))issues.push('Липсва съдържание: '+labels[i]);
  else if(clean(values[i]).length<45)issues.push('Недостатъчно индивидуализирана формулировка: '+labels[i]);
 }
 for(let i=0;i<4;i++)if(invalid(refs[i]))issues.push('Липсва проверен източник: '+labels[4+i]);
 if(!confirmed)issues.push('Изричното потвърждение на съдържанието не е дадено.');
 const a=structuredAI(ai);
 for(const k of ['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'])if(!a[k])issues.push('AI проектът няма раздел '+k);
 // No automatic decision may be inferred from GIS intersection alone.
 return issues;
}
function create({workingDraft,aiDraft,kt60,results=[]}={}){
 const ctx=workingDraft||{},m=ctx.metadata||{},fields=[
 ...Array.from({length:4},(_,i)=>ctx.paragraphs?.[i]||''),
 ...Array.from({length:4},(_,i)=>m.legalParagraphs?.[i]||''),
 ...Array.from({length:5},(_,i)=>m.impactFindings?.[i]||''),
 m.procedureFinding||''
 ];
 const sources=Array.from({length:4},(_,i)=>m.legalFindingSources?.[i]||'');
 return new Promise((resolve,reject)=>{
  const prior=document.getElementById('kt66-approval');if(prior)prior.remove();
  const dialog=document.createElement('dialog');dialog.id='kt66-approval';
  dialog.style='width:min(1100px,96vw);max-width:96vw;max-height:91vh;overflow:auto;border:2px solid #267154;border-radius:14px;padding:22px;background:#fff;color:#153a2e;font:14px system-ui';
  const title=document.createElement('h2');title.textContent='КТ66 · Експертен преглед на вариант Б — без автоматично заместване на текстове';dialog.append(title);
  const intro=document.createElement('p');intro.textContent='Сценарий Б се определя от ГИС. КТ60 е отчел '+(kt60?.report?.verified??0)+' от '+(kt60?.report?.required??14)+' автоматично потвърдени позиции. Това НЕ отменя експертната проверка. Оригиналният AI текст е долу, без разрязване или пренаписване. За Word се използват само въведените и потвърдени индивидуални констатации.';dialog.append(intro);
  const ids=document.createElement('p');ids.style='font-weight:700';ids.textContent='Имот(и): '+(results.map(r=>r.input||r.cadnum).join(', ')||m.parcelIds||'няма данни');dialog.append(ids);
  const aiBox=document.createElement('details');aiBox.open=true;const summary=document.createElement('summary');summary.textContent='Оригинална AI чернова — четири раздела, само за сверяване';aiBox.append(summary);
  const pre=document.createElement('pre');pre.style='white-space:pre-wrap;overflow-wrap:anywhere;max-height:290px;overflow:auto;padding:12px;background:#f3f7f4;border:1px solid #d7e5da';pre.textContent=aiDraft;aiBox.append(pre);dialog.append(aiBox);
  const data=document.createElement('div');data.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px';
  const inputs=[],references=[];
  fields.forEach((v,i)=>{
   const wrap=document.createElement('div');wrap.style='padding:9px;border:1px solid #d5e5da;border-radius:7px';
   const label=document.createElement('label');label.style='display:block;font-weight:700;margin-bottom:6px';label.textContent=(i+1)+'. '+labels[i];wrap.append(label);
   const t=document.createElement('textarea');t.rows=5;t.style='width:100%;box-sizing:border-box;font:13px system-ui';t.value=invalid(v)?'':v;t.placeholder='Попълва се след проверка на преписката и относимите норми';wrap.append(t);inputs[i]=t;
   if(i>=4&&i<=7){
    const cap=document.createElement('label');cap.textContent='Документален/нормативен източник — наименование, разпоредба, редакция';cap.style='display:block;font-size:12px;margin-top:5px';wrap.append(cap);
    const ref=document.createElement('input');ref.type='text';ref.style='width:100%;box-sizing:border-box';ref.value=invalid(sources[i-4])?'':sources[i-4];ref.placeholder='Проверен източник, не AI предположение';wrap.append(ref);references[i-4]=ref;
   }
   data.append(wrap);
  });
  dialog.append(data);
  const footer=document.createElement('p');footer.textContent='Не приемайте изводи, които не са подкрепени от преписката. Прегледът не изменя КТ56. Не се допуска пренасяне на чужди данни, произволно разпределяне на AI изречения или празни проверки.';dialog.append(footer);
  const confirmLabel=document.createElement('label');confirmLabel.style='display:block;font-weight:700;margin:14px 0';
  const checkbox=document.createElement('input');checkbox.type='checkbox';confirmLabel.append(checkbox,document.createTextNode(' Проверих лично 14-те индивидуални констатации и четирите източника; приемам ги като проект за експертно разглеждане.'));dialog.append(confirmLabel);
  const errors=document.createElement('p');errors.style='white-space:pre-wrap;color:#a33528';errors.setAttribute('role','status');dialog.append(errors);
  const buttons=document.createElement('div');buttons.style='display:flex;flex-wrap:wrap;gap:10px';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Откажи — без Word и ZIP';cancel.style='padding:11px';buttons.append(cancel);
  const approve=document.createElement('button');approve.type='button';approve.textContent='Потвърди съдържанието → оригинален Word Б';approve.style='padding:11px;background:#176a49;color:white;border:0;border-radius:6px;font-weight:700';buttons.append(approve);dialog.append(buttons);
  let settled=false;
  function done(value,error){if(settled)return;settled=true;dialog.close();dialog.remove();if(error)reject(error);else resolve(value);}
  cancel.onclick=()=>done(null,Error('КТ66: генерирането е отменено от експерта; няма създаден ZIP.'));
  dialog.addEventListener('cancel',e=>{e.preventDefault();cancel.click()});
  approve.onclick=()=>{
   const values=inputs.map(i=>clean(i.value)),refs=references.map(i=>clean(i.value));
   const issues=check(values,refs,checkbox.checked,aiDraft);
   if(issues.length){errors.textContent='Не може да се използва оригиналният Word за непотвърдени констатации:\n'+issues.join('\n');return;}
   const modified={...m,
     legalParagraphs:[...values.slice(4,8),...(m.legalParagraphs||[]).slice(4)],
     legalFindingSources:[...refs,...(m.legalFindingSources||[]).slice(4)],
     impactFindings:values.slice(8,13),
     procedureFinding:values[13],
     procedureFindingConfirmed:true,
     procedureFindingSource:'Експертно потвърждение по преписката — проверява се преди официално подписване'
   };
   done({paragraphs:values.slice(0,4),metadata:modified,aiDraft,expertReviewed:true,reviewedAt:new Date().toISOString()});
  };
  document.body.append(dialog);dialog.showModal();
 });
}
root.KT66ExpertReview=Object.freeze({create,structuredAI,check});
})(window);
