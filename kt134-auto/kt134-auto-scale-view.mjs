// KT134 isolated progress-panel renderer, insert beneath the FIVE existing tiles only
// in the future isolated candidate. It never modifies or reconstructs KT133 tiles.
const names=['Внасяне','Предмет','ГИС','Нормативна преценка','Краен документ'];
const safe=x=>String(x??'').slice(0,350);
export function createAutoScaleView({document,container,onInput,readOnly=false}){
 if(!document?.createElement||!container?.appendChild)throw Error('Липсва валиден контейнер за скалата');
 const panel=document.createElement('section');panel.className='kt134-auto-scale';
 panel.setAttribute('aria-label','Автоматична обработка на преписката');
 panel.innerHTML='<style>'+
  '.kt134-auto-scale{background:linear-gradient(115deg,#113b2a,#174832);color:#f5e9ca;border:1px solid #b89b57;border-radius:12px;padding:14px 17px;font:12px/1.45 Verdana,Arial,sans-serif;max-width:100%;box-sizing:border-box}'+
  '.kt134-auto-scale .kt134-lane{display:grid;grid-template-columns:64px repeat(5,minmax(0,1fr)) 64px;gap:5px;align-items:center}'+
  '.kt134-auto-scale .kt134-gate{border:1px solid #bb9f58;border-radius:28px 28px 7px 7px;text-align:center;padding:8px 3px;background:#1c5438;font-weight:600;color:#efdc9d}'+
  '.kt134-auto-scale .kt134-node{height:29px;border:1px solid #6d8b73;border-radius:30px;text-align:center;background:#22503a;color:#e5e8d5;display:flex;align-items:center;justify-content:center;gap:4px}'+
  '.kt134-auto-scale .kt134-node[data-state="completed"]{border-color:#9abf8a;background:#32784d;color:white}'+
  '.kt134-auto-scale .kt134-node[data-state="active"],.kt134-auto-scale .kt134-node[data-state="review"]{border-color:#e6c35f;background:#746127;color:#fff0b9}'+
  '.kt134-auto-scale .kt134-node[data-state="issue"]{border-color:#e7a69a;color:#ffe7db}'+
  '.kt134-auto-scale .kt134-node[data-state="not_applicable"]{border-color:#a8a178;color:#d8dbcb}'+
  '.kt134-auto-scale .kt134-current{margin-top:9px;border-top:1px solid #526f50;padding-top:8px;display:flex;gap:9px;align-items:center}'+
  '.kt134-auto-scale .kt134-track{height:3px;background:#365c45;flex:1;border-radius:4px;overflow:hidden}'+
  '.kt134-auto-scale .kt134-fill{height:100%;background:#d6b660;width:0%;transition:width .25s ease-out}'+
  '.kt134-auto-scale .kt134-info{flex:4;white-space:normal;min-width:0;color:#f2e3c0}'+
  '@media(max-width:640px){.kt134-auto-scale .kt134-lane{grid-template-columns:45px repeat(5,minmax(0,1fr)) 45px;gap:2px}.kt134-auto-scale .kt134-node{font-size:10px}.kt134-auto-scale .kt134-gate{font-size:10px}.kt134-auto-scale{padding:10px 6px}}'+
  '@media(prefers-reduced-motion:reduce){.kt134-auto-scale .kt134-fill{transition:none}}'+
  '</style>';
 const lane=document.createElement('div');lane.className='kt134-lane';
 const entrance=document.createElement('div');entrance.className='kt134-gate';entrance.textContent='Вход';lane.append(entrance);
 const nodes=[];
 for(let i=0;i<5;i++){const n=document.createElement('div');n.className='kt134-node';
  n.dataset.state='pending';n.title=names[i];n.setAttribute('aria-label','Етап '+(i+1)+': '+names[i]+' — предстои');
  n.textContent=String(i+1);nodes.push(n);lane.append(n)}
 const exit=document.createElement('div');exit.className='kt134-gate';exit.textContent='Изход';lane.append(exit);
 const lower=document.createElement('div');lower.className='kt134-current';
 const desc=document.createElement('div');desc.className='kt134-info';desc.setAttribute('aria-live','polite');
 desc.textContent='Очаква се преписка';
 const track=document.createElement('div');track.className='kt134-track';const fill=document.createElement('div');fill.className='kt134-fill';track.append(fill);lower.append(desc,track);
 panel.append(lane,lower);container.append(panel);
 function update(snapshot){
  if(!snapshot||!Array.isArray(snapshot.steps)||snapshot.steps.length!==5)
   throw Error('Невалиден доказателствен статус');
  const allowed=['pending','active','review','completed','not_applicable','issue'];
  snapshot.steps.forEach((s,i)=>{
   if(s.id!==i+1||!allowed.includes(s.status))throw Error('Непознат етап или статус');
   nodes[i].dataset.state=s.status;
   nodes[i].setAttribute('aria-label','Етап '+(i+1)+': '+names[i]+' — '+s.status);
  });
  const complete=snapshot.steps.filter(s=>s.status==='completed'||s.status==='not_applicable').length;
  fill.style.width=(complete*20)+'%';
  const last=snapshot.lastEvent;
  desc.textContent=last?.subtitle?safe(last.subtitle):
   (complete===5?'Изготвен е проект за окончателен експертен преглед':'Автоматичен анализ на преписката');
  exit.dataset.ready=complete===5?'true':'false';
  return {completed:complete,ready:complete===5};
 }
 function destroy(){panel.remove()}
 return Object.freeze({panel,update,destroy});
}
