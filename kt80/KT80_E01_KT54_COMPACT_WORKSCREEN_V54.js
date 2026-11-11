/* KT80 V54: compact progressive disclosure for the accepted WOW work screen.
 * Only rearranges DOM presentation; no changes to dossier evidence or expert approvals.
 */
(function(root){'use strict';
const PANELS=[
 ['kt80IPMasterEvidence','ИП MASTER · доказателствена картина'],
 ['kt80CH2Passport','Ч2 · доказателствен паспорт'],
 ['kt80CH21Reader','Ч2.1 · интелигентен прочит'],
 ['kt80CH21ParameterQA','КТ51 · технически параметри'],
 ['kt80KT52Reconstruction','КТ52 · реконструкция']
];
function init(){
 const panel=document.querySelector('.kt80-stage-panel[data-panel="2"]');
 const subject=document.getElementById('kt80SubjectText');
 const composer=document.getElementById('kt80KT53Composer');
 if(!panel||!subject||!composer)return;
 const scopeLabel=document.createElement('p');scopeLabel.className='kt80-compact-heading';
 scopeLabel.textContent='Експертен резултат · предмет и обхват';
 const subjectHint=document.getElementById('kt80SubjectHint');
 const marker=subjectHint||subject;
 if(marker.parentNode){marker.insertAdjacentElement('afterend',scopeLabel);scopeLabel.insertAdjacentElement('afterend',composer);}
 const nav=document.createElement('nav');nav.className='kt80-compact-nav';
 nav.setAttribute('aria-label','Бърз достъп до доказателствения анализ');
 const navIntro=document.createElement('span');navIntro.textContent='Доказателствен анализ';navIntro.className='kt80-compact-nav-title';nav.append(navIntro);
 const wrappers=[];
 for(const [id,label] of PANELS){
  const source=document.getElementById(id);
  if(!source||!source.parentNode)continue;
  const details=document.createElement('details');details.className='kt80-compact-details';details.dataset.source=id;
  const summary=document.createElement('summary');summary.textContent=label;details.append(summary);
  source.parentNode.insertBefore(details,source);
  details.append(source);
  const button=document.createElement('button');button.type='button';button.className='kt80-compact-shortcut';button.textContent=label;
  button.setAttribute('aria-label','Отвори '+label);
  button.addEventListener('click',()=>{details.open=true;details.scrollIntoView?.({block:'start',behavior:'smooth'});});
  nav.append(button);
  wrappers.push(details);
 }
 const first=wrappers[0];if(first){first.parentNode.insertBefore(nav,first);}
 const status=document.getElementById('kt80CoverageDiagnostics');
 if(status){status.classList.add('kt80-compact-diagnostic');}
 const controls=document.createElement('div');controls.className='kt80-compact-controls';
 const openAll=document.createElement('button');openAll.type='button';openAll.textContent='Разгъни анализа';
 const closeAll=document.createElement('button');closeAll.type='button';closeAll.textContent='Сгъни анализа';
 openAll.addEventListener('click',()=>wrappers.forEach(d=>d.open=true));
 closeAll.addEventListener('click',()=>{wrappers.forEach(d=>d.open=false);nav.scrollIntoView?.({block:'nearest',behavior:'smooth'});});
 controls.append(openAll,closeAll);nav.append(controls);
 root.KT80CompactScreen=Object.freeze({openAll:()=>wrappers.forEach(d=>d.open=true),closeAll:()=>wrappers.forEach(d=>d.open=false)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
