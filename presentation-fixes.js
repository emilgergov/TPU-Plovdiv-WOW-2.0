/* WOW 2.0 presentation candidate: DOM-only compatibility corrections.
   Preserves existing application, source registries, and all official data. */
(function () {
  'use strict';
  // Visual QA: keep the in-app heading and exit action on separate rows on phones.
  // The catalogue is a standalone screen: do not show the old zone-picker below it.
  const visualStyle=document.createElement('style');
  visualStyle.id='wow-visual-qa-20261017';
  visualStyle.textContent=`
    #wowBackToApprovedTree{display:none!important}
    #wowUnifiedContent:has(> #wowSpeciesCatalogue) > :not(#wowSpeciesCatalogue){display:none!important}
    @media(max-width:700px){
      #wowUnifiedApp .wow-u-head{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;margin-bottom:14px!important}
      #wowUnifiedApp .wow-u-head h1{font-size:clamp(22px,6vw,29px)!important;line-height:1.2!important;padding:0!important}
      #wowUnifiedApp .wow-u-head .wow-u-btn{position:static!important;align-self:flex-start!important;max-width:100%!important;margin:0!important}
      #wowUnifiedContent{clear:both!important}
      #wowUnifiedContent #wowSpeciesCatalogue{margin:0!important;padding:14px!important}
    }`;
  document.head.appendChild(visualStyle);
  const content=document.getElementById('wowUnifiedContent');
  if (!content) return;
  const messages={
    indicators:'За тази зона няма достъпни записи за индикатори в текущия регистър — ПРЕДСТОИ.',
    financing:'За тази зона няма достъпни записи за финансиране в текущия регистър — ПРЕДСТОИ.',
    measures:'За тази зона няма достъпни записи за мерки в текущия регистър — ПРЕДСТОИ.'
  };
  function refresh(){
    const context=window.WOWUnified&&window.WOWUnified.context();
    if(!context)return;
    const view=context.view;
    // Never imply that absent source records are proof that measures or funding do not exist.
    if(messages[view]){
      for(const p of content.querySelectorAll('p')){
        if(p.textContent.trim()===messages.measures && view!=='measures')p.textContent=messages[view];
      }
      const search=content.querySelector('input[aria-label="Търсене на зона"]');
      const code=(search&&search.value.trim().match(/BG\d{7}/i)||[])[0];
      const heading=code&&Array.from(content.querySelectorAll('h3')).find(h=>h.textContent.includes(code));
      const natu=document.getElementById('wowNatuContext'),guide=document.getElementById('wowNewGuideContext');
      if(heading){
        const selected=heading.textContent.trim();
        const label=view==='measures'?'мерките и целите':view==='indicators'?'индикаторите':'финансирането';
        if(natu)natu.textContent='Нату: Разглеждаме '+label+' за '+selected+'.';
        if(guide)guide.textContent='Природен водач: Показани са само наличните записи за '+selected+'. Липсващите данни са отбелязани „ПРЕДСТОИ“.';
      }
    }
    // Hide only the redundant second navigation button; retain the functional Back.
    const buttons=content.querySelectorAll('button');
    for(const b of buttons){
      if(b.textContent.trim()==='🌳 Дървото')b.hidden=true;
    }
  }
  let pending=false;
  const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh()})});
  observer.observe(content,{childList:true,subtree:true});
  content.addEventListener('input',()=>queueMicrotask(refresh));
  refresh();
})();