// KT134 — evidence-driven status feed for the accepted compact dual-scale dashboard.
// No fake progress timers and no changes to published KT133 visuals.
const PHASES=Object.freeze([
 {id:1,key:'intake',label:'Внасяне и анализ на преписката'},
 {id:2,key:'subject',label:'Предмет и обхват'},
 {id:3,key:'spatial',label:'Имоти и пространствен анализ'},
 {id:4,key:'legal',label:'Нормативна и процедурна преценка'},
 {id:5,key:'result',label:'Предложение и документ'}
]);
const clean=x=>String(x??'').trim();
export function createAutoProgress({caseId,onChange=()=>{}}={}){
 if(!clean(caseId))throw Error('Липсва преписка за автоматичната скала');
 if(typeof onChange!=='function')throw Error('Липсва съобщител на състоянието');
 let seq=0;
 const states=PHASES.map(p=>Object.freeze({...p,status:'pending',subtitle:''}));
 const history=[];
 const emit=()=>{
  const snapshot=Object.freeze({caseId,sequence:seq,steps:Object.freeze([...states]),lastEvent:history.at(-1)||null});
  onChange(snapshot);
  return snapshot;
 };
 const set=(phase,action,{verified=false,notApplicable=false,subtitle='',eventId='',source=''}={})=>{
  const n=Number(phase);
  if(!Number.isInteger(n)||n<1||n>5)throw Error('Непознат етап на автоматичната скала');
  if(!['start','complete','review','issue'].includes(action))throw Error('Непознато действие');
  // Only unique, source-bound actual backend events may mark completed stages.
  if(action==='complete'&&(!verified||!clean(eventId)||!clean(source)))
   throw Error('Завършен етап изисква реално потвърдено събитие и произход');
  const prev=states[n-1];
  if(['completed','not_applicable'].includes(prev.status)&&action!=='complete')throw Error('Потвърден етап не се променя автоматично');
  if(action==='complete'){
   for(let i=0;i<n-1;i++)if(!['completed','not_applicable'].includes(states[i].status))
    throw Error('Предходните етапи нямат потвърден резултат');
  }
  if(clean(eventId)&&history.some(e=>e.eventId===eventId))throw Error('Повторено събитие');
  const status=action==='complete'?(notApplicable?'not_applicable':'completed'):
   action==='start'?'active':action==='review'?'review':'issue';
  const event=Object.freeze({seq:++seq,phase:n,action,status,eventId:clean(eventId),source:clean(source),subtitle:clean(subtitle)});
  history.push(event);
  states[n-1]=Object.freeze({...prev,status,subtitle:clean(subtitle)});
  return emit();
 };
 return Object.freeze({snapshot:emit,start:(phase,subtitle)=>set(phase,'start',{subtitle}),
  complete:(phase,proof)=>set(phase,'complete',proof),
  issue:(phase,subtitle)=>set(phase,'issue',{subtitle}),
  review:(phase,subtitle)=>set(phase,'review',{subtitle})});
}
