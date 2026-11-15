import * as nos from "./legal-v11/nos-full.mjs";
import * as zoos from "./legal-v11/zoos-full.mjs";
import * as zbr from "./legal-v11/zbr-full.mjs";
import * as ovos from "./legal-v11/ovos-official-full.mjs";
import * as ovosAnnex2 from "./legal-v11/annex-ovos-2.mjs";
import * as apk from "./legal-v11/apk-full.mjs";
import * as nao from "./legal-v11/nao-full.mjs";
import * as tpu from "./legal-v11/naredba-tpu-full.mjs";
import * as nar from "./legal-v11/nar-full.mjs";
import * as riosv from "./legal-v11/pravilnik-riosv-full.mjs";
import * as zeu from "./legal-v11/zeu-full.mjs";
import * as za from "./legal-v11/za-full.mjs";
import * as zdoi from "./legal-v11/zdoi-full.mjs";
import * as noiisreau from "./legal-v11/noiisreau-full.mjs";
import * as neo from "./legal-v11/neo-full.mjs";
import * as zzt from "./legal-v11/zzt-full.mjs";
import * as ovosAnnex2a from "./legal-v11/ovos-annex-2a.mjs";
import * as ovosAnnex7 from "./legal-v11/ovos-annex-7.mjs";
import * as ovosAnnex9 from "./legal-v11/ovos-annex-9.mjs";
import * as tariff from "./legal-v11/tarifa-moew-full.mjs";
import * as euroBnb from "./legal-v11/euro-bnb-full.mjs";
import * as euroComparison from "./legal-v11/euro-comparative-full.mjs";
const ARCHIVE = Object.freeze({
  nos:{title:"Наредба за ОС",module:nos},
  zoos:{title:"ЗООС",module:zoos},
  zbr:{title:"ЗБР",module:zbr},
  ovos:{title:"Наредба за ОВОС (МОСВ)",module:ovos},
  ovosAnnex2:{title:"Приложение № 2 към чл. 6 Наредба за ОВОС",module:ovosAnnex2},
  apk:{title:"АПК",module:apk},
  nao:{title:"НАО",module:nao},
  tpu:{title:"Наредба за ТПУ",module:tpu},
  nar:{title:"НАР",module:nar},
  riosv:{title:"Правилник за РИОСВ",module:riosv},
  zeu:{title:"ЗЕУ",module:zeu},
  za:{title:"ЗА",module:za},
  zdoi:{title:"ЗДОИ",module:zdoi},
  noiisreau:{title:"НОИИСРЕАУ",module:noiisreau},
  neo:{title:"Наредба за ЕО",module:neo},
  zzt:{title:"ЗЗТ",module:zzt},
  ovosAnnex2a:{title:"Приложение 2а Наредба за ОВОС",module:ovosAnnex2a},
  ovosAnnex7:{title:"Приложение 7 Наредба за ОВОС",module:ovosAnnex7},
  ovosAnnex9:{title:"Приложение 9 Наредба за ОВОС",module:ovosAnnex9},
  tariff:{title:"Тарифа МОСВ",module:tariff},
  euroBnb:{title:"Закон за въвеждане на еврото",module:euroBnb},
  euroComparison:{title:"Евро изменения",module:euroComparison},
});

const SOURCE_ARCHIVE_SHA256="8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c";
const cache=new Map();
const normalize=x=>String(x||"").normalize("NFC");
const hex=bytes=>Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");
const decoder=new TextDecoder();
async function unpack(id){
 if(!ARCHIVE[id])throw new Error("Unknown legal archive entry");
 if(cache.has(id))return cache.get(id);
 const entry=ARCHIVE[id].module;
 const bin=Uint8Array.from(atob(entry.gzipBase64),x=>x.charCodeAt(0));
 const plain=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
 const sha=hex(await crypto.subtle.digest("SHA-256",plain));
 if(sha!==entry.cleanedSHA256)throw new Error("KT105 legal archive integrity mismatch: "+id);
 const text=decoder.decode(plain);
 const value={id,title:ARCHIVE[id].title,archivePath:entry.archiveEntry,
  originalSHA256:entry.rawSHA256,contentSHA256:sha,text};
 cache.set(id,value);
 return value;
}
function articleInText(source,number){
 const n=String(number).toLowerCase();
 const all=[...source.matchAll(/(?:^|\n)[^\S\n]*Чл\.\s*(\d+[а-я]?)(?=\s|\.|\(|\n)/giu)];
 const idx=all.findIndex(x=>x[1].toLowerCase()===n);
 if(idx<0)return null;
 const start=all[idx].index+(all[idx][0].startsWith("\n")?1:0);
 const end=idx+1<all.length?all[idx+1].index:source.length;
 return source.slice(start,end).trim();
}
function annexInText(source,number){
 const all=[...source.matchAll(/(?:^|\n)[^\S\n]*Приложение\s*№\s*(\d+[а-я]?)(?=\s|\n|към)/giu)];
 const i=all.findIndex(x=>x[1]===String(number)&&/към\s+чл\./iu.test(source.slice(x.index,x.index+65)));
 if(i<0)return null;
 const start=all[i].index+(all[i][0].startsWith("\n")?1:0);
 const end=i+1<all.length?all[i+1].index:source.length;
 return source.slice(start,end).trim();
}
function put(target,source,label,body){
 if(!body)return;
 target.push({act:source.title,reference:label,sourcePath:source.archivePath,
  originalSourceSHA256:source.originalSHA256,contentSHA256:source.contentSHA256,
  fullLegalText:body,quotationFromArchive:true,applicabilityVerified:false});
}
const ESSENTIAL=[["nos","2"],["nos","4"],["nos","6а"],["zoos","81"],["zoos","92"],["zoos","93"],["zbr","31"],["ovos","4"],["ovos","5"],["ovos","6"]];
const RELATED={
 plan:[["neo","2"],["neo","3"],["zoos","81"]],
 protected:[["zzt","1"],["zzt","2"],["zbr","12"]],
 administration:[["apk","27"],["apk","34"]],
 protectedZones:[["nos","3"],["nos","5"],["nos","6"]]
};
function relatedArticles(caseText){
 const picks=[];
 if(/план|програм|екологична оценка/iu.test(caseText))picks.push(...RELATED.plan);
 if(/защитена територия|резерват|национален парк/iu.test(caseText))picks.push(...RELATED.protected);
 if(/административно производство|възражение|висящо производство/iu.test(caseText))picks.push(...RELATED.administration);
 if(/защитена зона|BG0{2}\d{5}/iu.test(caseText))picks.push(...RELATED.protectedZones);
 return picks;
}
export async function getLegalContext({archiveSHA256,subject="",scope="",caseTexts=[]}={}){
 if(archiveSHA256!==SOURCE_ARCHIVE_SHA256)throw new Error("V11 archive hash mismatch");
 const caseText=[subject,scope,...caseTexts.slice(0,12)].join(" ").slice(0,36000);
 const picks=[...ESSENTIAL,...relatedArticles(caseText)];
 const ids=[...new Set([...picks.map(x=>x[0]),"zoos","ovosAnnex2"])];
 const sources=new Map();
 for(const id of ids)sources.set(id,await unpack(id));
 const entries=[];
 const unique=new Set();
 for(const [id,n] of picks){
  const k=id+"#"+n;
  if(unique.has(k))continue;
  unique.add(k);
  const source=sources.get(id),body=articleInText(source.text,n);
  put(entries,source,"чл. "+n,body);
 }
 const zoos=sources.get("zoos");
 put(entries,zoos,"Приложение № 1 към ЗООС",annexInText(zoos.text,"1"));
 put(entries,zoos,"Приложение № 2 към ЗООС",annexInText(zoos.text,"2"));
 const ovosAnnex=sources.get("ovosAnnex2");
 put(entries,ovosAnnex,"Приложение № 2 към чл. 6 от Наредбата за ОВОС",ovosAnnex.text);
 const indexedDocuments=Object.keys(ARCHIVE).length;
 return {archiveSHA256,indexedDocuments,legalProvisions:entries,
  fullTextSourcesAvailable:entries.length,allSourceIds:Object.keys(ARCHIVE),
  note:"Точни текстове от архив V11 с проверен SHA-256; приложимостта се преценява за конкретната преписка, а не следва автоматично от източника."};
}
export async function getArticleFromV11(id,article){const source=await unpack(id);return {...source,article,text:articleInText(source.text,article)};}
export async function getFullV11Document(id){return unpack(id);}
export const V11_CORPUS_FILES=Object.freeze(Object.keys(ARCHIVE));
