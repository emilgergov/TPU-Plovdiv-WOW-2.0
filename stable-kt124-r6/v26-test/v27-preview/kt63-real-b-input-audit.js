/* KT63: read-only inspection of the actual dossier before the original KT42
 * writer. This never changes Word paragraphs, metadata, or the generation route.
 * No AI prose is relabeled as evidence, and no sample legal findings are copied. */
(function(root){'use strict';
const clean=v=>String(v==null?'':v).replace(/\s+/gu,' ').trim();
const unconfirmed=v=>!clean(v)||/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|\[ЗА ПОПЪЛВАНЕ|\[ОТКЪС ОТ ПРЕПИСКАТА|НЯМА ДАННИ/iu.test(clean(v));
const label=[
'Предмет и строителни дейности','Електрозахранване','Водоснабдяване','Отпадъчни води',
'Правна аргументация 1','Правна аргументация 2','Правна аргументация 3','Правна аргументация 4',
'Въздействия 1','Въздействия 2','Въздействия 3','Въздействия 4','Въздействия 5',
'Мотивиран процедурен извод'];
function examine({draft,context=null,scenario='Б'}={}){
 const m=draft?.metadata||{},ps=Array.isArray(draft?.paragraphs)?draft.paragraphs:[],
 law=Array.isArray(m.legalParagraphs)?m.legalParagraphs:[],
 impacts=Array.isArray(m.impactFindings)?m.impactFindings:[],
 legalSources=Array.isArray(m.legalFindingSources)?m.legalFindingSources:[];
 const rows=[
 ...Array.from({length:4},(_,i)=>({label:label[i],text:clean(ps[i]),required:true,ready:!unconfirmed(ps[i]),proof:'Изисква експертна проверка на документалния източник'})),
 ...Array.from({length:4},(_,i)=>({label:label[4+i],text:clean(law[i]),required:true,ready:!unconfirmed(law[i])&&clean(legalSources[i])!=='',proof:clean(legalSources[i])||'Няма подаден доказателствен източник'})),
 ...Array.from({length:5},(_,i)=>({label:label[8+i],text:clean(impacts[i]),required:true,ready:!unconfirmed(impacts[i]),proof:'Изисква проверена констатация за конкретния имот'})),
 {label:label[13],text:clean(m.procedureFinding),required:true,ready:!unconfirmed(m.procedureFinding),proof:clean(m.procedureFindingSource)||'Няма потвърден процедурен извод'}
 ];
 // This is a contract/status inspection, not a certificate of truth.
 const inspectable=rows.filter(x=>x.ready).length;
 const warnings=[];
 if(!clean(m.subject))warnings.push('Не е подаден потвърден предмет на ИП');
 if(!/\b\d{5}\.\d+\.\d+\b/u.test(clean(m.parcelIds)))warnings.push('Липсва потвърден кадастрален идентификатор в Word метаданните');
 const count=Array.isArray(context?.commonEvidence?.findings)?context.commonEvidence.findings.length:0;
 return {scenario,rows,inspectable,total:rows.length,warnings,caseIds:clean(m.parcelIds),
 subject:clean(m.subject),evidenceFindings:count,originalWriter:'KT41_EXACT_KT35_KT39 / KT41_EXACT_V27_R02'};
}
function show(d){
 let box=document.getElementById('kt63-audit');
 if(!box){box=document.createElement('section');box.id='kt63-audit';box.style='margin:12px 0;padding:14px;border:1px solid #afc4b8;border-radius:10px;background:#f6faf7;color:#173c30;font:14px system-ui;line-height:1.5';const btn=document.getElementById('proposal');btn?.insertAdjacentElement('beforebegin',box);}
 if(!box)return;
 box.replaceChildren();
 const h=document.createElement('h3');h.style='font-size:17px;margin:0 0 7px';h.textContent='КТ63 · действителен вход към оригиналния Word Б';box.append(h);
 const summary=document.createElement('p');summary.textContent='Налични за подаване: '+d.inspectable+' / '+d.total+'. Това НЕ е потвърждение за правна достоверност. Няма автоматични текстови замени.';box.append(summary);
 const id=document.createElement('p');id.textContent='Имот(и): '+(d.caseIds||'не са подадени');box.append(id);
 const subject=document.createElement('p');subject.textContent='Предмет: '+(d.subject||'не е подаден');box.append(subject);
 for(const w of d.warnings){const el=document.createElement('p');el.textContent='Проверка: '+w;el.style.color='#934623';box.append(el);}
 const details=document.createElement('details');details.open=true;
 const title=document.createElement('summary');title.textContent='14 входни позиции — действително съдържание (само за преглед)';details.append(title);
 for(const row of d.rows){const p=document.createElement('details');p.style='margin:5px 0';const t=document.createElement('summary');t.textContent=(row.ready?'● ':'○ ')+row.label+(row.ready?' · подаден текст':' · липсва или не е потвърден');p.append(t);const text=document.createElement('p');text.textContent=row.text||'(празно)';p.append(text);const proof=document.createElement('p');proof.textContent=row.proof;proof.style='font-size:12px;color:#52695b';p.append(proof);details.append(p);}
 box.append(details);
 const footer=document.createElement('p');footer.style='font-size:12px;color:#52695b;margin-top:8px';footer.textContent='КТ63 не променя КТ56, КТ42, PDF1, PDF2 или ZIP генератора. Оригиналният бутон „Изготви проектите · Word“ остава непроменен и може да откаже генериране при липса на основания.';box.append(footer);
 box.scrollIntoView({block:'nearest'});
}
function mount(){
 const proposal=document.getElementById('proposal');
 if(!proposal||document.getElementById('kt63Check'))return;
 const btn=document.createElement('button');btn.type='button';btn.id='kt63Check';
 btn.style='display:block;width:100%;padding:10px 12px;margin:8px 0;background:#e7efe8;color:#154f38;border:1px solid #96b5a3;border-radius:8px;cursor:pointer;font-weight:700';
 btn.textContent='КТ63 · Провери входа към оригиналния Б (без редакции)';
 proposal.insertAdjacentElement('beforebegin',btn);
 btn.addEventListener('click',()=>{
  try{
   if(!root.V26WordReview?.getWorkingDraft)throw Error('Не е зареден модулът за текущата преписка');
   if(root.V26TemplateWord?.layout!=='KT41_EXACT_KT35_KT39'||root.V26ExpertWord?.layout!=='KT41_EXACT_V27_R02')
    throw Error('Оригиналният Word генератор е заместен: проверката е прекратена');
   const audit=examine({draft:root.V26WordReview.getWorkingDraft(),context:root.V26WorkingContext?.commonEvidence?root.V26WorkingContext:root.V26WorkingContext,scenario:'Б'});
   show(audit);
  }catch(e){let p=document.getElementById('kt63-error');if(!p){p=document.createElement('p');p.id='kt63-error';btn.insertAdjacentElement('afterend',p);}p.textContent='КТ63: '+String(e.message||e);}
 });
}
root.KT63InputAudit=Object.freeze({examine,show,mount});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(window);
