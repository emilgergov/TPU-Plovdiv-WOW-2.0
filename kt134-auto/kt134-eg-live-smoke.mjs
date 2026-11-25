// KT134 end-to-end LIVE EG acceptance with fully sourced SYNTHETIC dossier.
// Public/production KT133 and any real dossiers are untouched.
import {writeFile,mkdir} from 'node:fs/promises';
import * as fflate from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
import {buildKt134CompleteStage4Request} from './kt134-complete-dossier-stage4.mjs';
import {composeKt134CaseAwareStage5Draft} from './kt134-case-aware-word-body.mjs';
const base=process.env.KT134_EG_BASE||'https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev';
const token=process.env.LIVE_EG_TOKEN||'';
if(!token)throw Error('KT134 isolated EG token unavailable');
const id='KT134-SYNTHETIC-ACCEPTANCE',revision='SYNTHETIC-FULL-2';
const bundle={
 caseId:id,registryNumber:'ТЕСТ-2026-0004',
 subject:'Вътрешно преустройство на съществуващо складово помещение',
 scope:'Преустройство в границите на съществуваща складова сграда, без предвидено ново строителство, с вътрешно преразпределение на помещенията; изцяло синтетичен тестов казус.',
 gisMode:'required',
 documents:[
  {sourceId:'TEST-NOTICE-01',fileName:'ТЕСТ-Уведомление.pdf',type:'уведомление',date:'25.11.2026',
   text:'СИНТЕТИЧНА ПРЕПИСКА, БЕЗ РЕАЛЕН ВЪЗЛОЖИТЕЛ. Предложение за вътрешно преустройство на вече построена складова сграда в ПИ 99999.999.999, измислено населено място Тестово село, община Тестова община. ИП обхваща вътрешно разпределение на помещенията. Не се заявяват нови строителни площи, няма промяна на предназначението или НТП на имота. Няма проектни данни за производствена дейност, нов технологичен процес, емисии, водоползване или съхранение на опасни вещества. Това не означава доказано отсъствие на въздействия.'},
  {sourceId:'TEST-TECH-02',fileName:'ТЕСТ-Техническо-описание.pdf',type:'приложение',date:'25.11.2026',
   text:'СИНТЕТИЧНО ТЕХНИЧЕСКО ОПИСАНИЕ. Имот 99999.999.999 е с площ 1500 кв. м по тестов ПИ MASTER. В съществуващата сграда се променят само вътрешни преградни стени. Липсват потвърдени данни за капацитет, конкретно технологично оборудване и технически параметри. Площта на имота не е застроена площ и не е разгъната застроена площ.'}
 ],
 parcels:[{identifier:'99999.999.999',settlement:'Тестово село',municipality:'Тестова община',areaSqm:1500,
  landUse:'За складова база (синтетично)',sourceId:'TEST-PI-MASTER-01'}],
 gis:{sourceId:'TEST-GIS-PDF1-01',pdf1Ref:'TEST-PDF1-NONREAL',
  projection:'WGS_1984_UTM_Zone_35N',
  protectedZones:[{name:'Синтетична ЗЗ — зона А',intersects:false,distanceMeters:1250,sourceId:'TEST-GIS-PDF1-01'}],
  protectedAreas:[{name:'Синтетична ЗТ — територия Б',intersects:false,distanceMeters:840,sourceId:'TEST-GIS-PDF1-01'}],
  notes:'САМО ТЕСТОВИ СТОЙНОСТИ. Не са изчислявани с реален кадастър или граници на Натура 2000.'},
 piMaster:{sourceId:'TEST-PI-MASTER-01',caseId:id,verified:false,note:'Измислен тестов запис'},
 pdf2Ref:'TEST-PDF2-LEGAL-CONTEXT',
 normativeArchive:{name:'V11 MASTER',sha256:'8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c',
 verifiedReferences:[]},
 facts:[{sourceId:'TEST-TECH-02',sourceLocation:'т. 2',description:'Установен обхват',
 value:'Преразпределяне на вътрешни помещения без ново застрояване по синтетично техническо описание',
 confirmed:true}]
};
const stage4=buildKt134CompleteStage4Request({caseId:id,revision,bundle,
 requestId:'kt134-full-synthetic-stage4'});
const dir='kt134-auto/live-test-deliverables';
await mkdir(dir,{recursive:true});
await writeFile(dir+'/full-dossier-input-summary.json',JSON.stringify({
 caseId:id,mode:'COMPLETE_SYNTHETIC_NOT_REAL_GIS',documents:bundle.documents.length,
 cadastralIdentifiers:stage4.parcelIds,gisProtectedZoneCount:bundle.gis.protectedZones.length,
 gisProtectedAreaCount:bundle.gis.protectedAreas.length,pdf1Ref:bundle.gis.pdf1Ref,
 pdf2Ref:bundle.pdf2Ref,notActualProtectedSites:true
},null,2));
async function post(route,data){
 for(let attempt=1;attempt<=18;attempt++){
  const response=await fetch(base+route,{method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(data),signal:AbortSignal.timeout(200000)});
  const payload=await response.json().catch(()=>({}));
  if(response.ok)return payload;
  if(response.status===401&&attempt<18){
   console.log('KT134: EG test token propagation pending (retry '+attempt+'/18)');
   await new Promise(resolve=>setTimeout(resolve,3000));
   continue;
  }
  console.log('KT134 response diagnostic',JSON.stringify({
   route,httpStatus:response.status,qualityStage:payload.qualityStage,
   issues:payload.qualityIssues,reviewVerdict:payload.normativeAudit?.reviewVerdict
  }).slice(0,1400));
  throw Error(route+' HTTP '+response.status+' '+String(payload.error||payload.message||'unknown'));
 }
}
console.log('KT134 FULL SYNTHETIC: live Stage4 documents+parcel+GIS ZZ/ZT => EG Author + reviewer');
const a=await post('/stage4-proposal',stage4);
if(a.caseId!==id)throw Error('Stage4 wrong case');
const d=a.reviewerIntermediate;
if(!d||!a.reviewerIntermediateProof||!d.intermediateConfirmed)
 throw Error('Reviewer did not provide signed intermediate proposal');
const line=d.reviewedText.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b[^\n]*/iu)?.[0];
if(!line||Number(line.match(/\d{1,2}/)?.[0])!==d.selectedPanelId)
 throw Error('Reviewer selected panel inconsistent');
const documentTitle=line.replace(/^ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]?\s*/iu,'').trim();
const stage5Request={
 task:'draft_stage5_document',caseId:id,requestId:'kt134-full-synthetic-stage5',
 evidenceRevision:revision,stage4Version:1,subject:stage4.subject,scope:stage4.scope,
 parcelIds:stage4.parcelIds,confirmedStage4Text:d.reviewedText,
 selectedPanelLine:line.trim(),selectedPanelId:d.selectedPanelId,documentTitle,
 incomingReference:'ОВОС-0000-00/25.11.2026 г.',
 reviewerIntermediate:d,reviewerIntermediateProof:a.reviewerIntermediateProof,
 automaticReviewerIntermediate:true,expertConfirmed:false,projectOnly:true,
 qualificationRecord:a.qualificationRecord,qualificationProof:a.qualificationProof,
 qualificationGate:a.qualificationGate
};
console.log('KT134 FULL SYNTHETIC: live Stage5 reviewer proposal, panel',d.selectedPanelId);
const b=await post('/stage5-document',stage5Request);
if(b.caseId!==id||b.projectOnly!==true||b.documentIssued!==false||
 b.automaticReviewerIntermediate!==true||!b.draft?.startsWith('Относно:'))
 throw Error('Stage5 not a reviewer-authorized draft');
const enriched=composeKt134CaseAwareStage5Draft({stage5Text:b.draft,stage4Request:stage4});
if(/\\b(?:MISSING_[A-Z_]+|PANEL_\\d\\d_[A-Z_]+|UNSUPPORTED_[A-Z_]+)\\b/u.test(enriched))
 throw Error('Technical reviewer codes leaked into institutional Word');
if((enriched.match(/Относно:/gu)||[]).length!==1||!enriched.split('\\n')[0].includes('“'))
 throw Error('Unmatched or duplicate subject quotation in Word draft');
const required=['99999.999.999','Тестово село','Тестова община','1500 кв. м',
 'Синтетична ЗЗ — зона А','1250 м','Синтетична ЗТ — територия Б','840 м',
 'TEST-PDF1-NONREAL','TEST-PDF2-LEGAL-CONTEXT'];
const missing=required.filter(x=>!enriched.includes(x));
if(missing.length)throw Error('Factual sections absent from final draft: '+missing.join(', '));
globalThis.window=globalThis;globalThis.fflate=fflate;
const adapter=createDraftWordAdapter({fflate,templateWindow:globalThis});
const doc=await adapter.buildDraft({status:'draft',panelId:d.selectedPanelId,
 documentTitle:b.reviewerProposalOnly===true?b.documentTitle:documentTitle,content:enriched});
if(doc.length<1000)throw Error('DOCX missing');
await writeFile(dir+'/KT134_FULL_SYNTHETIC_GIS_WORD.docx',doc);
const rawIssues=Array.isArray(d.unresolvedIssues)?d.unresolvedIssues:[];
const audit={
 caseId:id,mode:'LIVE_EG_WITH_COMPLETE_SYNTHETIC_DOSSIER',
 authorCalled:true,reviewerIntermediateConfirmed:true,stage5Called:true,
 selectedPanelId:d.selectedPanelId,wordBytes:doc.length,expertApproved:false,
 realDossierProcessed:false,realGISProcessed:false,
 docsSupplied:bundle.documents.length,parcelsSupplied:bundle.parcels.length,
 protectedZonesSupplied:bundle.gis.protectedZones.length,
 protectedAreasSupplied:bundle.gis.protectedAreas.length,
 allSpecifiedDossierFactsPresentInWord:true,
 legalConclusionAccepted:false,
 reviewerReportedUnresolvedLegalIssues:rawIssues.length,
 reviewerProposalOnly:b.reviewerProposalOnly===true,
 reviewerProposedPanel:d.selectedPanelId,
 note:'Technical acceptance only; neither the fabricated spatial values nor the legal conclusion have been independently certified.'
};
await writeFile(dir+'/full-dossier-result.json',JSON.stringify(audit,null,2));
console.log('KT134 FULL SYNTHETIC LIVE PASS: real EG stage4/reviewer/stage5 + Word containing dossier, parcel and both GIS categories; normative approval NOT claimed.');
