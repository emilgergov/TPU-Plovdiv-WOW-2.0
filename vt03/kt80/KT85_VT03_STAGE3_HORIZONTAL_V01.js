/* WOW V61.7 VT03-R3: stage 3 horizontal GIS workbench. 
   Presentation-only reparenting: retain all existing IDs, event handlers and GIS/PDF1 engines. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const stage=document.querySelector('.kt80-stage-panel[data-panel="3"]');
if(!stage)return;
const css=document.createElement('style');css.id='kt85-stage3-workbench-css';
css.textContent=`
.kt80-stage-panel[data-panel="3"] .kt85-stage3-workbench{display:block;margin:4px 0 12px}
.kt80-stage-panel[data-panel="3"] .kt80-free-gis{border:0;background:transparent;margin:0;padding:0}
.kt80-stage-panel[data-panel="3"] .kt80-free-gis > h3,
.kt80-stage-panel[data-panel="3"] .kt80-free-gis > p:not([id]){display:none!important}
.kt80-stage-panel[data-panel="3"] .kt85-gis-main{display:grid!important;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr)!important;align-items:start;gap:12px;width:100%;min-width:0}
.kt80-stage-panel[data-panel="3"] .kt85-gis-map-card{min-width:0;position:relative;overflow:hidden;background:#f0f5ec;border:1px solid #8b9b7a;border-radius:10px}
.kt80-stage-panel[data-panel="3"] .kt85-gis-sidebar{min-width:0;display:flex;flex-direction:column;gap:10px;align-self:start}
.kt80-stage-panel[data-panel="3"] .kt85-gis-sidebar > :is(section,div,details,label){margin:0!important;width:100%;min-width:0}
.kt80-stage-panel[data-panel="3"] .kt85-primary-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0}
.kt80-stage-panel[data-panel="3"] .kt85-primary-actions>button{margin:0!important;padding:11px 9px!important;font:750 14px/1.35 "Segoe UI",Arial,sans-serif!important;min-height:48px}
.kt80-stage-panel[data-panel="3"] .kt85-primary-actions #kt80FindParcels{grid-column:1/-1;background:#dfbc72!important;color:#153a29!important}
.kt80-stage-panel[data-panel="3"] .kt85-primary-actions #kt80PDF1{grid-column:1/-1;background:#dfbc72!important;color:#153a29!important}
.kt80-stage-panel[data-panel="3"] .kt85-primary-actions #kt80ToLaw{grid-column:1/-1;background:#244d38!important;color:#f8e9be!important;border:1px solid #c7a866!important}
.kt80-stage-panel[data-panel="3"] .kt85-side-card{padding:12px 14px;border:1px solid #64866e;border-radius:9px;background:#173b2e;color:#e7eee1;font:400 14px/1.45 "Segoe UI",Arial,sans-serif}
.kt80-stage-panel[data-panel="3"] .kt85-side-card h3{font:750 16px/1.3 "Segoe UI",Arial,sans-serif!important;color:#f1d28d!important;margin:0 0 8px}
.kt80-stage-panel[data-panel="3"] #kt80GISDetail{padding:0;background:transparent;color:#eeeedd;overflow-wrap:anywhere}
.kt80-stage-panel[data-panel="3"] #kt80GISDetail :is(p,div){color:inherit}
.kt80-stage-panel[data-panel="3"] #kt80GISResults{display:contents!important}
.kt80-stage-panel[data-panel="3"] .kt80-gis-detail{background:#f1f5ed!important;color:#173b2b!important;border:1px solid #8aa18b;border-radius:9px;overflow:auto;max-height:360px;padding:11px 13px}
.kt80-stage-panel[data-panel="3"] .kt80-gis-detail #kt80GISDetail{color:#173b2b!important}
.kt80-stage-panel[data-panel="3"] .kt80-gis-detail #kt80GISDetail :is(p,div){color:#173b2b}
.kt80-stage-panel[data-panel="3"] .kt80-gis-map-wrap{margin:0!important;border:0!important;border-radius:9px!important}
.kt80-stage-panel[data-panel="3"] .kt80-gis-map-wrap #kt80GISMap{width:100%;max-height:520px;min-height:310px}
.kt80-stage-panel[data-panel="3"] .kt80-map-actions{display:flex;flex-wrap:wrap;gap:4px}
.kt80-stage-panel[data-panel="3"] .kt80-map-actions button{font-size:12px!important;padding:6px 9px!important;margin:0!important;min-height:34px}
.kt80-stage-panel[data-panel="3"] .kt80-map-actions label{font-size:12px}
.kt80-stage-panel[data-panel="3"] .kt80-gis-toolbar{padding:10px;gap:8px}
.kt80-stage-panel[data-panel="3"] .kt80-gis-toolbar strong{font-size:13px}
.kt80-stage-panel[data-panel="3"] #kt80GISMapCaption{font-size:11px!important;padding:8px 10px!important}
.kt80-stage-panel[data-panel="3"] .kt85-auxiliary{border:1px solid #63816b;border-radius:9px;background:#183d2e;margin-top:10px;padding:11px 14px;color:#f1ebd8}
.kt80-stage-panel[data-panel="3"] .kt85-auxiliary>summary{cursor:pointer;font:750 15px "Segoe UI",Arial,sans-serif;color:#f0d38e}
.kt80-stage-panel[data-panel="3"] .kt85-auxiliary[open]>summary{margin-bottom:10px}
.kt80-stage-panel[data-panel="3"] .kt85-auxiliary .kt80-v580-legal{margin:8px 0!important}
.kt80-stage-panel[data-panel="3"] .kt85-note{font:500 12px/1.4 "Segoe UI",Arial,sans-serif;color:#e0e5d7}
.kt80-stage-panel[data-panel="3"] #kt80PIMasterResults{max-height:310px;overflow-y:auto}
.kt80-stage-panel[data-panel="3"] .kt80-pi-master-profile{padding:6px!important;border:0!important;background:transparent!important}
.kt80-stage-panel[data-panel="3"] .kt80-pi-master-profile h3{font-size:15px!important}
.kt80-stage-panel[data-panel="3"] .kt80-pi-master-profile>p{display:none!important}
.kt80-stage-panel[data-panel="3"] .kt80-pdf1-note{padding:0!important;border:0!important;background:transparent!important}
.kt80-stage-panel[data-panel="3"] .kt80-pdf1-note>strong,.kt80-stage-panel[data-panel="3"] .kt80-pdf1-note>p:not([id]){display:none!important}
.kt80-stage-panel[data-panel="3"] .kt80-check.kt80-alert-confirm{margin:0!important;padding:11px!important;border-radius:8px;font-size:12px!important}
.kt80-stage-panel[data-panel="3"] .kt80-check.kt80-alert-confirm input{width:19px;height:19px}
.kt80-stage-panel[data-panel="3"] .kt80-v580-passport{margin:8px 0!important}
.kt80-stage-panel[data-panel="3"] .kt85-compact-gis-status{font-size:12px;padding:7px 9px;margin:6px 0;border:1px solid #658671;border-radius:7px;background:#1e4935}
.kt80-stage-panel[data-panel="3"] .kt85-compact-gis-status:empty{display:none}
.kt80-stage-panel[data-panel="3"] .kt85-stage3-workbench .kt80-gis-source-status{font-size:12px;margin:6px 0}
@media(max-width:1050px){.kt80-stage-panel[data-panel="3"] .kt85-gis-main{grid-template-columns:1fr!important}.kt80-stage-panel[data-panel="3"] .kt85-gis-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.kt80-stage-panel[data-panel="3"] .kt85-primary-actions{grid-column:1/-1}}
@media(max-width:680px){.kt80-stage-panel[data-panel="3"] .kt85-gis-sidebar{display:flex;flex-direction:column}.kt80-stage-panel[data-panel="3"] .kt85-primary-actions{grid-template-columns:1fr}}
`;document.head.append(css);
function section(cls,heading){const e=document.createElement('section');e.className=cls;if(heading){const h=document.createElement('h3');h.textContent=heading;e.append(h)}return e}
function details(name){const d=document.createElement('details');d.className='kt85-auxiliary';const sum=document.createElement('summary');sum.textContent=name;d.append(sum);return d}
let ready=false;
function setup(){
 if(ready)return true;
 const gis=stage.querySelector('.kt80-free-gis');
 const inline=$('kt80V580GisInline'),map=$('kt80GISMapWrap'),layout=gis?.querySelector('.kt80-gis-layout');
 const find=$('kt80FindParcels'),pdf=$('kt80PDF1'),detail=gis?.querySelector('.kt80-gis-detail');
 const confirm=$('kt80ParcelsConfirmation')?.closest('label'),toLaw=$('kt80ToLaw');
 if(!gis||!inline||!map||!layout||!find||!pdf||!detail||!confirm||!toLaw)return false;
 const shell=section('kt85-stage3-workbench');shell.id='kt85Stage3Workbench';
 const head=section('kt85-side-card','ГИС справка и доказателствен статус');
 head.classList.add('kt85-stage3-header');
 const note=document.createElement('div');note.className='kt85-note';note.textContent='Картата и данните са работна справка. Непотвърдените доказателства не удостоверяват правен режим.';
 head.append(note);
 const main=section('kt85-gis-main');main.id='kt85Stage3Main';
 const side=section('kt85-gis-sidebar');side.id='kt85Stage3Sidebar';
 const area=section('kt85-gis-map-card');area.id='kt85Stage3Map';
 layout.classList.add('kt85-gis-main');
 const profile=section('kt85-side-card','Избран имот и пространствени данни');
 profile.append(detail);
 const actions=section('kt85-primary-actions');actions.id='kt85Stage3Actions';
 const pdfBlock=pdf.closest('.kt80-pdf1-note');
 const pdfStatus=$('kt80PDF1Status');
 const docDetails=details('ПИ MASTER · кадастър, ЗЗ и ЗТ');
 const pi=gis.querySelector('.kt80-pi-master-profile');if(pi)docDetails.append(pi);
 const result=gis.querySelector('#kt80GISResults');
 const status=$('kt80GISStatus');
 const gisSource=$('kt80FullGISReady');
 const statusBox=section('kt85-compact-gis-status');
 if(status)statusBox.append(status);
 const sourceBox=section('kt85-compact-gis-status');
 if(gisSource)sourceBox.append(gisSource);
 // Relocate existing DOM nodes rather than cloning them, preserving all JS handlers.
 layout.replaceChildren();
 layout.append(map,side);
 side.append(profile,statusBox,sourceBox);
 if(result)side.append(result);
 const actionPanel=section('kt85-side-card','Основни действия');
 actionPanel.append(actions,confirm);
 actions.append(find);
 if(pdfBlock){actionPanel.append(pdfBlock);actions.append(pdf);}
 actions.append(toLaw);
 side.append(actionPanel,docDetails);
 if(pdfStatus){pdfStatus.classList.add('kt85-note');}
 const info=details('Методика, нормативна ориентация и доказателствени ограничения');
 const legal=stage.querySelector('.kt80-v580-legal');
 const fallback=$('kt80V580Fallback');
 const passport=stage.querySelector('.kt80-v580-passport');
 const loc=stage.querySelector('.kt82-location-card');
 const ids=stage.querySelector('.kt82-identifiers');
 const context=$('kt81ContextScreen');
 for(const node of [legal,loc,ids,fallback,passport,context]){if(node)info.append(node)}
 const backup=gis.querySelector('.kt80-gis-backup');if(backup)info.append(backup);
 const standalone=gis.querySelector('#v26LocalIndexMount');if(standalone)info.append(standalone);
 // Keep the GIS inline wrapper: the existing engine uses its hidden state.
 inline.before(shell);shell.append(head,inline);inline.append(gis);gis.append(layout);
 shell.insertAdjacentElement('afterend',info);
 const intake=stage.querySelector('.kt80-parcel-intake');if(intake&&!intake.closest('details'))info.append(intake);
 const redundant=stage.querySelector(':scope > .kt80-v580-legal');if(redundant)info.append(redundant);
 // Separate visual meaning from evidentiary output; no status is rewritten.
 ready=true;
 root.KT85Stage3UX=Object.freeze({ready:true,version:'VT03-R3',layout:()=>({map:!!$('kt85Stage3Map'),sidebar:!!$('kt85Stage3Sidebar'),actions:!!$('kt85Stage3Actions')})});
 return true;
}
function activate(){if(setup())return;let tries=0;const timer=setInterval(()=>{tries++;if(setup()||tries>=20)clearInterval(timer)},180)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});else activate();
})(window);
