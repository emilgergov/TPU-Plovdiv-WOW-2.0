/* VT03 rescue: presentation only, no legal/GIS/Word logic edits. */
(function(root){'use strict';
const style=document.createElement('style');
style.id='kt84-vt03-ux-rescue';
style.textContent=`
#kt80DashboardFive .kt80-dashboard-tile{background:#204733!important;color:#f1e9d3!important;border-color:#60836b!important}
#kt80DashboardFive .kt80-dashboard-tile[data-kt83-state="next"]{background:#dbbd7c!important;color:#143b2b!important;border-color:#f5dd9c!important}
#kt80DashboardFive .kt80-dashboard-tile[data-kt83-state="done"]{background:#367257!important;color:#fff7e2!important;border-color:#9ac4a5!important}
#kt80DashboardFive .kt80-dashboard-tile[data-kt83-state="future"]{background:#204733!important;color:#f1e9d3!important}
#kt80DashboardRoutes{grid-template-columns:repeat(5,minmax(0,1fr))}
.kt84-vt03-route-fold{padding:10px 14px;background:#183e2d;border:1px solid #8a9369;border-radius:11px;margin-top:12px}
.kt84-vt03-route-fold>summary{font:700 17px/1.4 "Segoe UI",Arial,sans-serif;color:#f1d293;cursor:pointer}
.kt84-vt03-route-fold[open]>summary{margin-bottom:14px}
.kt80-stage-panel[data-panel="2"] .kt80-v56-fields{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;align-items:start!important}
.kt80-stage-panel[data-panel="2"] #kt80SubjectText,
.kt80-stage-panel[data-panel="2"] #kt80ScopeText{min-height:195px!important;height:195px!important;max-height:320px!important;resize:vertical!important;line-height:1.55!important;font-size:15px!important}
.kt80-stage-panel[data-panel="2"] #kt80ScopeText:disabled{max-height:195px!important}
.kt80-stage-panel[data-panel="2"] .kt80-subject-controls{display:flex!important;flex-wrap:wrap!important;gap:7px!important}
.kt80-stage-panel[data-panel="2"] .kt80-subject-controls button{flex:1 1 145px!important;font-size:13px!important}
#kt84ScopeUnlock{display:block;width:100%;max-width:760px;background:#d9bc79!important;color:#193a2b!important;border:2px solid #f0d38b!important;border-radius:9px;padding:11px 14px;font-weight:750;margin:12px 0!important}
#kt84ScopeUnlock[hidden]{display:none!important}
.kt80-stage-panel[data-panel="1"] .kt84-work-step{padding:7px 11px!important;margin:6px 0!important}
.kt80-stage-panel[data-panel="1"] .kt80-version-proof{display:none!important}
@media(max-width:850px){
 #kt80DashboardRoutes{grid-template-columns:repeat(2,minmax(0,1fr))}
 .kt80-stage-panel[data-panel="2"] .kt80-v56-fields{grid-template-columns:1fr!important}
}
`;
document.head.append(style);
function foldRoutes(){
 const routes=document.getElementById('kt80DashboardRoutes');
 if(!routes||routes.closest('.kt84-vt03-route-fold'))return;
 const heading=routes.previousElementSibling?.id==='kt80DashboardCount'
  ?routes.previousElementSibling.previousElementSibling:routes.previousElementSibling;
 const count=document.getElementById('kt80DashboardCount');
 const fold=document.createElement('details');fold.className='kt84-vt03-route-fold';
 fold.id='kt84VT03Specialized';
 const label=document.createElement('summary');label.textContent='Специализирани резултати и инструменти — покажи 22-те възможности';
 fold.append(label);
 heading?.before(fold);if(heading?.tagName==='H3')heading.remove();
 if(count)fold.append(count);
 fold.append(routes);
 fold.addEventListener('toggle',()=>{
  label.textContent=fold.open?'Специализирани резултати и инструменти — скрий списъка':'Специализирани резултати и инструменти — покажи 22-те възможности';
 });
}
function init(){foldRoutes();root.KT83UXBatch?.tileStatus?.();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
