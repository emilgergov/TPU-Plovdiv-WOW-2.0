/* КТ134 — независим, безстраничен контрол на доказателствата за PDF1.
   Не се включва автоматично в продукционната версия.
   Изричен резултат "НЯМА ДАННИ" при непълни пространствени сведения.
   Не прави правна преценка и не съхранява данни между преписки. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.KT134GISContract=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CAD=/^\d{5}\.\d+\.\d+$/;
  const assertArray=a=>Array.isArray(a)?a:[];
  function validateParcel(parcel){
    const errors=[];
    if(!parcel||typeof parcel!=='object')return {ok:false,errors:['Липсва обект за имот']};
    const id=String(parcel.identifier||'').trim();
    if(!CAD.test(id))errors.push('Невалиден кадастрален идентификатор');
    if(typeof parcel.areaSqM!=='number'||!Number.isFinite(parcel.areaSqM)||parcel.areaSqM<=0)
      errors.push('Липсва надеждна площ');
    if(!parcel.source||typeof parcel.source!=='string'||!parcel.source.trim())
      errors.push('Липсва източник на пространствените данни');
    if(parcel.intersectionStatus!=='intersects'&&parcel.intersectionStatus!=='none'&&parcel.intersectionStatus!=='unknown')
      errors.push('Неопределен статус на пресичането');
    if(parcel.intersectionStatus==='intersects'&&assertArray(parcel.intersections).length===0)
      errors.push('Твърди се пресичане, но липсват доказателствени обекти');
    for(const zone of assertArray(parcel.intersections)){
      if(!zone||!zone.code||!['ZZ','ZT'].includes(zone.type))
        errors.push('Липсва код или вид на защитен обект');
      if(!Number.isFinite(zone.areaSqM)||zone.areaSqM<=0||zone.areaSqM>parcel.areaSqM)
        errors.push('Невалидна площ на пресичане');
    }
    return {ok:errors.length===0,errors};
  }
  function validatePackage(pkg){
    const errors=[];
    if(!pkg||typeof pkg!=='object')return {ok:false,errors:['Липсва ГИС пакет']};
    if(!pkg.caseId||!String(pkg.caseId).trim())errors.push('Липсва вътрешен ИД на преписката');
    const parcels=assertArray(pkg.parcels);
    if(!parcels.length)errors.push('Липсват имоти: ГИС не може да издаде категоричен PDF1');
    const seen=new Set();
    parcels.forEach((p,i)=>{
      const result=validateParcel(p);
      result.errors.forEach(e=>errors.push('Имот '+(i+1)+': '+e));
      if(p&&p.identifier){if(seen.has(p.identifier))errors.push('Дублиран идентификатор: '+p.identifier);seen.add(p.identifier);}
    });
    const unknown=parcels.some(p=>!p||p.intersectionStatus==='unknown');
    const canStateNoIntersection=errors.length===0&&parcels.every(p=>p.intersectionStatus==='none');
    return {ok:errors.length===0,errors,spatialStatus:unknown?'НЯМА ДАННИ':(canStateNoIntersection?'НЯМА ПРЕСИЧАНЕ':(errors.length?'НЕПОТВЪРДЕНО':'ИМА ПРЕСИЧАНЕ')),canStateNoIntersection};
  }
  return Object.freeze({validateParcel,validatePackage});
});
