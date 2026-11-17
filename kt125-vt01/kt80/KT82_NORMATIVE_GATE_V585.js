/* КТ82 · V58.5 — двоичен нормативен вход СЛЕД предмета, ПРЕДИ условния ГИС.
 * Доказателствено предложение, експертна корекция, без предрешена процедура.
 * Съществуващият независим ГИС №15 остава достъпен. */
(function(root){'use strict';
const normalize=t=>String(t??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
const lower=t=>normalize(t).toLocaleLowerCase('bg');
function evaluate(subject,scope){
 const s=lower(subject),b=lower(scope),text=s+' '+b;
 const contains=re=>re.test(text);
 const spatial=contains(/защитен[а-я]* зон|натура\s*2000|защитен[а-я]* територи|позем[а-я]* имот|кадастр|площ|землищ|строеж|строителств|трафопост|електропровод|водовземан|заустван|терен|площадк|екосистем|местообитани|сеч|отпадъци.*терен|увреждан[а-я]* природ|замърсяван[а-я]* почв/iu);
 const administrative=contains(/административн[а-я]*|процедурн[а-я]*|документн[а-я]*|срок[а-я]*|кореспонденц|писмо|обжалван|заявлени[а-я]*|отговор|достъп до информация|информация по з[о]дои/iu);
 const complaint=contains(/сигнал|жалба|искане|възражение|заявлени[а-я]*/iu);
 const ecological=contains(/нарушени[а-я]* режим|увреждан[а-я]*|заплах[а-я]*|биологичн[а-я]*|отпадъчн[а-я]* вод|емиси[а-я]*|отпадъци|природн[а-я]*|защитен[а-я]*/iu);
 const spatialLocation=contains(/\bпи\b|имот|обект|гр[.]|с[.]|местност|адрес на обекта|координат|екатте/iu);
 const required=spatial||(complaint&&ecological&&spatialLocation)||(!complaint&&!administrative);
 const conclusion=required?'REQUIRED':'NOT_REQUIRED';
 const reason=required?
   spatial?'От предмета или обхвата произтича пространствен въпрос, за който ГИС е относим към последващата правна преценка.':
   'Предметът предполага обект или дейност с възможно териториално измерение; препоръчва се пространствена проверка.':
   'По потвърдените предмет и обхват административният въпрос може да бъде разгледан по документи, без задължителен пространствен анализ.';
 const caveat=required?
   'ГИС установява пространствените факти; не определя автоматично процедура, компетентност или административен изход.':
   'Това не означава, че пространствената проверка е забранена. При ново относимо обстоятелство може да бъде използван независимият ГИС №15.';
 return Object.freeze({decision:conclusion,reason,caveat,
  evidence:normalize(subject),scope:normalize(scope),method:'ПРЕДВАРИТЕЛНА НОРМАТИВНА ОРИЕНТАЦИЯ; подлежи на експертен преглед'});
}
root.KT82NormativeGateClassifier=Object.freeze({evaluate});
function init(){
 const $=id=>document.getElementById(id),state=()=>root.KT80WorkflowState||null;
 if(!$('kt80SubjectText')||!$('kt80ScopeText')||typeof root.KT80WorkflowGo!=='function')return;
 const dialog=document.createElement('dialog');dialog.id='kt82NormativeGateDialog';dialog.className='kt82-normative-gate';
 dialog.setAttribute('aria-labelledby','kt82GateTitle');
 dialog.innerHTML='<div class="kt82-gate-content"><div class="kt82-gate-head"><p class="kt82-gate-label">КТ82 · НОРМАТИВНА ОРИЕНТАЦИЯ</p><h2 id="kt82GateTitle">Кой анализ е необходим?</h2><p class="kt82-gate-intro">Предложение въз основа на потвърдените предмет и обхват. Експертът определя следващата стъпка.</p></div><div class="kt82-gate-body"><div class="kt82-gate-pair"><strong>Предложение</strong><p id="kt82GateProposal"></p></div><div class="kt82-gate-pair"><strong>Основание</strong><p id="kt82GateReason"></p></div><label class="kt82-gate-choice-label" for="kt82GateChoice">Решение след експертен преглед</label><select id="kt82GateChoice"><option value="REQUIRED">ГИС анализ е необходим → етап №3</option><option value="NOT_REQUIRED">ГИС анализ не е необходим → етап №4</option></select><p class="kt82-gate-note" id="kt82GateNote"></p></div><div class="kt82-gate-actions"><button type="button" id="kt82GateCancel">Върни към предмета</button><button type="button" id="kt82GateConfirm">Потвърди и продължи</button></div></div>';
 document.body.append(dialog);
 const style=document.createElement('style');style.id='kt82-normative-gate-style';
 style.textContent='.kt82-normative-gate{border:1px solid #9cb399;border-left:5px solid #71957b;background:#f0f3ea;color:#1f3d2c;border-radius:8px;box-shadow:0 10px 45px #071b1580;padding:0;width:min(570px,94vw);max-height:85vh;font:400 14px/1.48 "Segoe UI",Arial,sans-serif}.kt82-normative-gate::backdrop{background:#071810af}.kt82-gate-content{padding:19px 22px}.kt82-gate-label{font:700 11px "Segoe UI",Arial,sans-serif;color:#506852;margin:0 0 7px;letter-spacing:.035em}.kt82-gate-head h2{font:700 20px "Segoe UI",Arial,sans-serif!important;color:#224431!important;margin:0 0 7px}.kt82-gate-intro,.kt82-gate-note{color:#4c604f;font:400 13px/1.45 "Segoe UI",Arial,sans-serif!important;margin:5px 0 13px}.kt82-gate-body{border-top:1px solid #becfbd;padding-top:6px}.kt82-gate-pair{border-bottom:1px solid #d2ddd0;padding:9px 0}.kt82-gate-pair strong,.kt82-gate-choice-label{font:700 13px "Segoe UI",Arial,sans-serif!important;color:#264634!important}.kt82-gate-pair p{font:400 13px/1.5 "Segoe UI",Arial,sans-serif!important;color:#2c4b36!important;margin:4px 0}.kt82-gate-choice-label{display:block;margin:12px 0 6px}.kt82-normative-gate select{display:block;width:100%;height:42px;border:1px solid #8ca78e;border-radius:5px;background:#fffef9;color:#214331;font:600 14px "Segoe UI",Arial,sans-serif;padding:6px 9px}.kt82-gate-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}.kt82-gate-actions button{font:700 13px "Segoe UI",Arial,sans-serif;border-radius:5px;padding:10px 14px;cursor:pointer;background:#e1e8dc;color:#31513a;border:1px solid #97ad99}.kt82-gate-actions button:last-child{background:#27593e;color:#fff8e5;border-color:#27593e}@media(max-width:500px){.kt82-gate-content{padding:14px}.kt82-gate-actions button{flex:1}}';
 style.textContent += "\n /* KT83 acceptance: visually harmonized decision dialog; no change to logic/fields. */\n .kt82-normative-gate{\n   width:min(540px,calc(100vw - 28px));max-height:min(84vh,720px);\n   border:1px solid #bba16d;border-left:3px solid #dabb79;\n   border-radius:12px;background:#14382b;color:#f5edd4;\n   box-shadow:0 18px 65px #04140fb8;\n   font:400 15px/1.48 \"Segoe UI\",Arial,sans-serif;\n }\n .kt82-normative-gate::backdrop{background:#04160fbb;backdrop-filter:blur(2px)}\n .kt82-normative-gate .kt82-gate-content{padding:22px 25px}\n .kt82-normative-gate .kt82-gate-label{\n   color:#dfc17f!important;font:700 11px/1.3 \"Segoe UI\",Arial,sans-serif!important;\n   letter-spacing:.035em;margin-bottom:5px\n }\n .kt82-normative-gate .kt82-gate-head h2{\n   color:#f4d390!important;font:700 21px/1.25 \"Segoe UI\",Arial,sans-serif!important;\n   margin:0 0 8px\n }\n .kt82-normative-gate .kt82-gate-intro{\n   color:#d4e1d3!important;font:400 14px/1.45 \"Segoe UI\",Arial,sans-serif!important;\n   margin:0 0 14px\n }\n .kt82-normative-gate .kt82-gate-body{\n   border-top:1px solid #52705b;padding-top:12px\n }\n .kt82-normative-gate .kt82-gate-pair{\n   padding:9px 12px;margin-bottom:8px;background:#204838;\n   border:1px solid #426d51;border-radius:8px\n }\n .kt82-normative-gate .kt82-gate-pair strong,\n .kt82-normative-gate .kt82-gate-choice-label{\n   color:#f0d396!important;font:700 13px/1.4 \"Segoe UI\",Arial,sans-serif!important\n }\n .kt82-normative-gate .kt82-gate-pair p{\n   color:#ecf2e7!important;font:400 14px/1.45 \"Segoe UI\",Arial,sans-serif!important;\n   margin:3px 0 0\n }\n .kt82-normative-gate .kt82-gate-choice-label{margin:13px 0 7px}\n .kt82-normative-gate #kt82GateChoice{\n   width:100%;height:auto;min-height:48px;padding:11px 13px;\n   border-radius:8px;border:1px solid #e6c681;background:#e0bc70;\n   color:#183a2c;font:700 14px/1.4 \"Segoe UI\",Arial,sans-serif;\n   cursor:pointer\n }\n .kt82-normative-gate #kt82GateChoice:focus-visible{\n   outline:3px solid #f1e4b0;outline-offset:2px\n }\n .kt82-normative-gate .kt82-gate-note{\n   color:#cbdfce!important;font:400 13px/1.45 \"Segoe UI\",Arial,sans-serif!important;\n   margin:11px 0 0\n }\n .kt82-normative-gate .kt82-gate-actions{margin-top:16px;gap:9px}\n .kt82-normative-gate .kt82-gate-actions button{\n   min-height:43px;padding:10px 15px;border-radius:8px;\n   font:700 14px/1.25 \"Segoe UI\",Arial,sans-serif\n }\n .kt82-normative-gate #kt82GateCancel{\n   color:#f3e9cf;background:#264c3b;border:1px solid #7e9983\n }\n .kt82-normative-gate #kt82GateConfirm{\n   color:#17392b;background:#dfbd77;border:1px solid #e9ce99\n }\n .kt82-normative-gate .kt82-gate-actions button:focus-visible{\n   outline:3px solid #f1e4b0;outline-offset:2px\n }\n @media(max-width:500px){\n   .kt82-normative-gate .kt82-gate-content{padding:16px}\n   .kt82-normative-gate .kt82-gate-actions{display:grid;grid-template-columns:1fr}\n }\n";
 document.head.append(style);
 const choice=$('kt82GateChoice'),proposal=$('kt82GateProposal'),reason=$('kt82GateReason'),note=$('kt82GateNote'),confirm=$('kt82GateConfirm');
 let suggestion=null,opening=false;
 const subject=()=>normalize($('kt80SubjectText')?.value);
 const scope=()=>normalize($('kt80ScopeText')?.value);
 function open(){
  if(!state()?.subjectConfirmed)return false;
  suggestion=evaluate(subject(),scope());choice.value=suggestion.decision;
  proposal.textContent=suggestion.decision==='REQUIRED'?'ГИС анализът е необходим.':'ГИС анализът не е необходим.';
  reason.textContent=suggestion.reason;
  note.textContent=suggestion.caveat;
  opening=true;
  if(!dialog.open){try{dialog.showModal()}catch(e){dialog.setAttribute('open','')}} 
  opening=false;return true;
 }
 function close(){if(dialog.open){try{dialog.close()}catch(e){dialog.removeAttribute('open')}}}
 choice.addEventListener('change',()=>{
  const overridden=choice.value!==suggestion?.decision;
  note.textContent=(overridden?'Експертна корекция на предложението. ':'')+
   (choice.value==='REQUIRED'?'ГИС MASTER се изпълнява в етап №3. Независимият ГИС №15 остава достъпен.':'Пространственият анализ не е необходим за текущия правен въпрос; преминаване към етап №4 без изискване за PDF1.');
 });
 $('kt82GateCancel').addEventListener('click',close);
 dialog.addEventListener('cancel',()=>{});
 confirm.addEventListener('click',()=>{
  const st=state();if(!st?.subjectConfirmed||!suggestion)return;
  const picked=choice.value==='NOT_REQUIRED'?'NOT_REQUIRED':'REQUIRED';
  const item=Object.freeze({decision:picked,proposed:suggestion.decision,
    expertConfirmed:true,expertOverride:picked!==suggestion.decision,
    reason:choice.value===suggestion.decision?suggestion.reason:'Експертна корекция на предварителното предложение. Приложимостта на ГИС се определя от експерта въз основа на преписката.',
    subject:subject(),scope:scope(),source:'Потвърден предмет и обхват · етап №2',independentGISPanel:15});
  st.normativeGate=item;
  if(picked==='NOT_REQUIRED')st.parcelsConfirmed={mode:'GIS_NOT_REQUIRED',ids:[],expertConfirmed:true,spatiallyVerified:false,reason:item.reason,notApplicable:true};
  else st.parcelsConfirmed=null;
  st.lawConfirmed=null;st.routeConfirmed=null;st.activeRoute=null;
  const law=$('kt80LawConfirmed');if(law)law.checked=false;
  close();root.KT80WorkflowGo(picked==='REQUIRED'?3:4);
 });
 function invalidate(){
  const st=state();if(!st)return;
  st.normativeGate=null;
  if(st.parcelsConfirmed?.mode==='GIS_NOT_REQUIRED')st.parcelsConfirmed=null;
 }
 $('kt80SubjectText').addEventListener('input',invalidate);
 $('kt80ScopeText').addEventListener('input',invalidate);
 document.addEventListener('kt80:case-change',()=>{invalidate();close()});
 document.addEventListener('kt80:case-reset',()=>{invalidate();close()});
 root.KT82NormativeGate=Object.freeze({open,getResult:()=>state()?.normativeGate||null,evaluate});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);