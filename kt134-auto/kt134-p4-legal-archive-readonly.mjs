/**
 * KT134 P4: direct read of the existing immutable LEGAL MASTER V11.
 * No case files and no person data; screening only, not legal applicability.
 * No writes to Cloudflare, D1 or R2.
 */
import {getLegalContext,getArticleFromV11} from '../cloudflare/ai-author-v27/src/legal-v11-loader.mjs';
const SOURCE_ARCHIVE_SHA256='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
const v=await getLegalContext({
 archiveSHA256:SOURCE_ARCHIVE_SHA256,
 subject:'Инвестиционно предложение: складове за промишлени стоки и офисна част',
 scope:'Новостроящи сгради в урбанизиран поземлен имот',
 caseTexts:['Уведомление за инвестиционно предложение; складове и офиси; водоплътна яма.']
});
if(v.archiveSHA256!==SOURCE_ARCHIVE_SHA256||v.legalProvisions.length<10)throw Error('Непълен нормативен MASTER');
if(v.legalProvisions.some(p=>p.applicabilityVerified!==false||!p.originalSourceSHA256||
 !p.contentSHA256||!p.sourcePath||!p.fullLegalText))
 throw Error('Невалидна архивна проверка или фиктивно заключение за приложимост');
for(const [id,article] of [['zoos','92'],['zoos','93'],['zbr','31'],['ovos','4'],['ovos','5'],['ovos','6'],['nos','2']]){
 const entry=await getArticleFromV11(id,article);
 if(!entry.text||entry.text.length<25)throw Error('Липсва член в реалния нормативен MASTER: '+id+' '+article);
}
console.log('KT134 P4 normative corpus:',JSON.stringify({
 outcome:'VERIFIED_ARCHIVE_CONTEXT_ONLY',
 corpusSha256:v.archiveSHA256,corpusEntries:v.indexedDocuments,
 checkedExtracts:v.legalProvisions.length,
 checkedCoreArticles:['ЗООС чл. 92','ЗООС чл. 93','ЗБР чл. 31','Наредба за ОВОС чл. 4–6','Наредба за ОС чл. 2'],
 applicabilityVerified:false,
 gisVerified:false,
 expertConfirmed:false,
 note:'Настоящото е извличане на действителни разпоредби от нормативния MASTER, не е преценка за приложимост.'
},null,2));
