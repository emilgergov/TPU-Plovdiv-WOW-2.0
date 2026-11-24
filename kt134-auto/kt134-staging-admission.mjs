/**
 * KT134 test environment admission gate.
 * This code makes no network requests or mutations.
 * It deliberately refuses unknown isolation, including R2 without
 * independently verified ownership and separation from production.
 */
const safe=/^[a-z0-9][a-z0-9_-]{2,99}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assessKT134Staging({
  testWorker='', testD1='', testR2='', gatewayWorker='', backendWorker='',
  backendD1='',workerHttp=0,d1Http=0,r2Http=0,
  r2IsolationAttested=false
}={}){
 const checks=[
  {id:'worker-name',ok:safe.test(testWorker)&&safe.test(gatewayWorker)&&safe.test(backendWorker)&&testWorker!==gatewayWorker&&testWorker!==backendWorker,
   note:'Изисква се отделен Worker, различен от КТ133 и КТ125'},
  {id:'worker-get',ok:workerHttp===200,note:'Отделният Worker не е потвърден чрез GET'},
  {id:'d1-name',ok:uuid.test(testD1)&&uuid.test(backendD1)&&testD1!==backendD1,
   note:'Изисква се отделна D1 база, различна от продукционната'},
  {id:'d1-get',ok:d1Http===200,note:'Отделната D1 не е потвърдена чрез GET'},
  {id:'r2-name',ok:safe.test(testR2),note:'Не е зададен отделен частен R2 архив'},
  {id:'r2-get',ok:r2Http===200,note:'Няма потвърден read-only достъп до тестов R2'},
  {id:'r2-isolation',ok:r2IsolationAttested===true,
   note:'Изолацията на R2 от продукционни данни не е удостоверена'}
 ];
 return Object.freeze({
  ready:checks.every(x=>x.ok),
  checks:Object.freeze(checks.map(x=>Object.freeze(x))),
  noDeploymentAllowed:!checks.every(x=>x.ok)
 });
}
