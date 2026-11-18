export function installStage3Context(){
 'use strict';const root=window,$=id=>document.getElementById(id),stage=document.querySelector('.kt80-stage-panel[data-panel="3"]');if(!stage)return;
 let context=null,entry=null,actions=null,actionHome=null,scheduled=false;
 const contextConfirmation='Прегледах предложеното местоположение и доказателствените ограничения. Потвърждавам прегледа за правна квалификация, без да удостоверявам имотна геометрия.';
 function sync(){
  const workbench=$('kt85Stage3Workbench'),fallback=$('kt80V580Fallback'),normalActions=$('kt85Stage3Actions');if(!workbench||!fallback||!normalActions)return;
  if(!context){
   const css=document.createElement('style');css.textContent='#kt129ContextWorkspace,#kt129ParcelEntry{margin:10px 0;padding:13px;border:1px solid #799079;border-radius:9px;background:#193f30;color:#f5efdd}#kt129ContextWorkspace[hidden]{display:none!important}#kt129ContextWorkspace p{line-height:1.5}#kt129ContextWorkspace .kt129-note{padding:10px;border-left:3px solid #d9b771;background:#244b39}#kt129ContextWorkspace .kt129-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}#kt129ContextWorkspace .kt129-actions #kt80FindParcels,#kt129ContextWorkspace .kt129-actions #kt80PDF1{display:none!important}#kt129ContextWorkspace .kt129-actions .kt85-primary-actions{display:flex!important;flex-wrap:wrap}#kt129ContextWorkspace .kt129-actions label{flex:1 0 100%;background:#8b292d;color:#fff3df;padding:12px;border-radius:7px}#kt129ParcelEntry>details{margin:0}';document.head.append(css);
   entry=document.createElement('section');entry.id='kt129ParcelEntry';context=document.createElement('section');context.id='kt129ContextWorkspace';
   const note=document.createElement('p');note.className='kt129-note';note.textContent='КОНТЕКСТЕН РЕЖИМ · няма надеждно установен комплект кадастрални идентификатори. Прегледайте местоположението и доказателствата или въведете проверен идентификатор. Имотна геометрия и пространствено непресичане не са удостоверени.';
   actions=document.createElement('div');actions.className='kt129-actions';context.append(note,actions);workbench.before(entry,context);
  }
  const isContext=!fallback.hidden,aux=stage.querySelector('.kt85-auxiliary');
  const identifiers=stage.querySelector('.kt82-identifiers')||stage.querySelector('.kt80-parcel-intake');
  const entryDestination=isContext?entry:aux;
  if(identifiers&&entryDestination&&identifiers.parentElement!==entryDestination)entryDestination.append(identifiers);
  for(const node of [stage.querySelector('.kt82-location-card'),fallback,stage.querySelector('.kt80-v580-passport'),$('kt81ContextScreen')]){
   const destination=isContext?context:aux;if(node&&destination&&node.parentElement!==destination){if(isContext)context.insertBefore(node,actions);else destination.append(node);}
  }
  if(context.hidden===isContext)context.hidden=!isContext;
  if(entry.hidden===isContext)entry.hidden=!isContext;
  if(isContext&&identifiers?.tagName==='DETAILS'&&!identifiers.open)identifiers.open=true;
  const checkbox=$('kt80ParcelsConfirmation'),confirmation=checkbox?.closest('label'),next=$('kt80ToLaw');
  if(!actionHome&&normalActions.parentElement!==actions)actionHome=normalActions.parentElement;
  if(next&&next.parentElement!==normalActions)normalActions.append(next);
  if(confirmation&&confirmation.parentElement!==normalActions)normalActions.insertBefore(confirmation,next||null);
  if(isContext){
   if(normalActions.parentElement!==actions)actions.append(normalActions);
   if(confirmation&&confirmation.textContent.trim()!==contextConfirmation)confirmation.replaceChildren(checkbox,document.createTextNode(' '+contextConfirmation));
  }else if(actionHome&&normalActions.parentElement!==actionHome)actionHome.insertBefore(normalActions,actionHome.firstChild);

 }
 function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;sync()})}
 const observer=new MutationObserver(schedule);observer.observe(stage,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 document.addEventListener('kt80:stage-open',schedule);document.addEventListener('kt80:location-gap',schedule);document.addEventListener('kt80:case-change',schedule);document.addEventListener('kt80:case-reset',schedule);
 root.KT129Stage3UX=Object.freeze({refresh:sync,isContext:()=>!!context&&!context.hidden});schedule();
}
export const stage3ContextSource='('+installStage3Context.toString()+')();';
export function overlayStage3Context(source){if(!source.includes("css.id='kt85-stage3-workbench-css'")||source.includes('KT129Stage3UX'))throw Error('KT129 stage3 overlay mismatch');return source+'\n'+stage3ContextSource;}
