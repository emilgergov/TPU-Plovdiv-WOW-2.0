/* WOW 3.0 presentation bridge: DOM-only compatibility corrections.
   Preserves existing application, source registries, and all official data. */
(function () {
  'use strict';
  // Visual QA: keep the in-app heading and exit action on separate rows on phones.
  // The catalogue is a standalone screen: do not show the old zone-picker below it.
  const visualStyle=document.createElement('style');
  visualStyle.id='wow-visual-qa-20261017';
  visualStyle.textContent=`
    #wowBackToApprovedTree{display:none!important}
    #wowUnifiedApp button[data-route="home"], #wowUnifiedApp .wow-u-home{display:none!important}
    /* Keep one contextual Back action. The in-panel button owns navigation history. */
    #wowUnifiedApp #wowUnifiedBackFloating, #wowUnifiedApp .wow-u-back-floating, #wowUnifiedApp .wow-floating-back{display:none!important}
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
        if(view!=='measures' && (/За тази зона няма достъпни записи за мерки в текущия регистър/.test(p.textContent)||/За тази зона няма налични записи за мерки в текущия регистър/.test(p.textContent)))p.textContent=messages[view];
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
    // Search results are independent of the route's previously selected zone.
    // Show the currently displayed result consistently in breadcrumb and guides,
    // without mutating the application's underlying zone selection.
    if(messages[view]){
      const input=content.querySelector('input[aria-label="Търсене на зона"]');
      const query=input&&input.value.trim();
      const card=content.querySelector('h3');
      const label=card&&card.textContent.trim();
      const crumb=document.getElementById('wowUnifiedBreadcrumb');
      const natu=document.getElementById('wowNatuContext');
      const guide=document.getElementById('wowNewGuideContext');
      if(query&&label){
        const title=view==='measures'?'Мерки и цели':view==='indicators'?'Индикатори':'Финансиране';
        if(crumb)crumb.textContent=title+' · Резултат от търсене: '+label;
        if(natu)natu.textContent='Нату: Показвам резултата за '+label+'.';
        if(guide)guide.textContent='Природен водач: Търсенето не променя избраната зона в другите маршрути.';
      }
    }
    // Keep contextual Back and explicit Tree; do not hide the Tree action.
  }
  let pending=false;
  const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh()})});
  observer.observe(content,{childList:true,subtree:true});
  content.addEventListener('input',()=>queueMicrotask(refresh));
  // A Tree action always exits the legacy iframe to the approved cinematic tree.
  // A separate "main screen" route is obsolete in the linear fruit model.
  document.addEventListener('click',function(event){
    const button=event.target.closest('button,a,[role="button"]');
    if(!button||!button.closest('#wowUnifiedApp'))return;
    const label=(button.textContent||'').replace(/\\s+/g,' ').trim();
    if(/^(?:🌳\\s*)?(?:Към\\s+)?Дървото$/i.test(label)){
      event.preventDefault();event.stopImmediatePropagation();
      try{window.parent.document.getElementById('backTree').click()}catch(_){}
    }else if(/^Към основния екран$/i.test(label)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  function removeLegacyHome(){
    for(const button of document.querySelectorAll('#wowUnifiedApp button,#wowUnifiedApp a')){
      if(/^Към основния екран$/i.test((button.textContent||'').trim()))button.hidden=true;
    }
  }
  const homeObserver=new MutationObserver(removeLegacyHome);
  homeObserver.observe(content,{childList:true,subtree:true});
  removeLegacyHome();
  // Remove the obsolete white floating Back button, which does not use
  // WOWUnified's history. Keep the application's own contextual Back button.
  function hideLegacyFloatingBack(){
    for(const b of document.querySelectorAll('button, a, [role="button"]')){
      const label=(b.textContent||'').replace(/\\s+/g,' ').trim();
      if(!/^←\\s*НАЗАД$/i.test(label))continue;
      if(b.closest('#wowUnifiedContent'))continue;
      const css=getComputedStyle(b);
      if(css.position==='fixed'||css.position==='absolute'){
        b.style.setProperty('display','none','important');
        b.setAttribute('aria-hidden','true');
        b.tabIndex=-1;
      }
    }
  }
  hideLegacyFloatingBack();
  const legacyObserver=new MutationObserver(hideLegacyFloatingBack);
  legacyObserver.observe(document.body,{childList:true,subtree:true});
  refresh();
})();