/** Isolated KT134 private R2/D1 orphan reconciliation. No live wiring. */
const prefix='kt134-auto/';
export function createKT134OrphanReconciler({r2,db,now=()=>Date.now(),minAgeMs=86400000,withExclusiveCleanupLock}={}){
 if(typeof r2?.list!=='function'||typeof r2?.delete!=='function'||typeof db?.prepare!=='function'||
    !Number.isSafeInteger(minAgeMs)||minAgeMs<3600000)throw Error('Липсва защитен архив, база или безопасен праг');
 async function referenced(key){
  const row=await db.prepare('SELECT COUNT(*) AS n FROM kt134_auto_drafts WHERE document_key=?').bind(key).first();
  if(!row||!Number.isSafeInteger(Number(row.n))||Number(row.n)<0)throw Error('Неуспешна проверка на препратките');
  return Number(row.n)>0;
 }
 async function inspect({dryRun,limit}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Невалиден лимит');
  const report={scanned:0,protected:0,young:0,candidates:0,deleted:0,keys:[]};
  let cursor;
  do{
   const page=await r2.list({prefix,cursor,limit:Math.min(limit-report.scanned,1000)});
   if(!page||!Array.isArray(page.objects))throw Error('Неуспешно изброяване на архива');
   for(const obj of page.objects){
    if(report.scanned>=limit)break;
    report.scanned++;
    const key=obj?.key;
    if(typeof key!=='string'||!/^kt134-auto\/[0-9a-f-]{36}\/[0-9a-f]{64}\.docx$/i.test(key)){
     report.protected++;continue;
    }
    const age=now()-new Date(obj.uploaded).getTime();
    if(!Number.isFinite(age)||age<minAgeMs){report.young++;continue;}
    if(await referenced(key)){report.protected++;continue;}
    report.candidates++;report.keys.push(key);
    if(!dryRun){
     // A private host must serialize saves and cleanup, not merely recheck D1.
     if(await referenced(key)){report.protected++;continue;}
     await r2.delete(key);report.deleted++;
    }
   }
   cursor=page.truncated?page.cursor:undefined;
   if(page.truncated&&!cursor)throw Error('Липсва курсор на архива');
  }while(cursor&&report.scanned<limit);
  return Object.freeze(report);
 }
 return Object.freeze({async reconcile({dryRun=true,limit=100}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Невалиден лимит');
  if(dryRun)return inspect({dryRun:true,limit});
  // Destructive operations require host-level cross-process exclusion from
  // ALL draft writers (including R2 put before D1 insert), not merely double D1 reads.
  if(typeof withExclusiveCleanupLock!=='function')throw Error('Изтриването изисква сървърна блокировка на всички записи');
  return withExclusiveCleanupLock(async()=>inspect({dryRun:false,limit}));
 }});
}
