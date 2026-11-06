'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const demo=new DOMParser().parseFromString('<r><x/></r>','text/xml').documentElement;
Object.defineProperty(Object.getPrototypeOf(demo),'children',{configurable:true,get(){return Array.from(this.childNodes||[]).filter(n=>n.nodeType===1)}});
const base='v26-test/v27-preview';
const fetchData=async name=>{const b=fs.readFileSync(path.join('v26-test',String(name)));return {ok:true,blob:async()=>new Blob([b]),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
const ctx={fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,console,fetch:fetchData,
 V26TemplateWord:{make:async()=>{throw Error('classic base missing')}},
 V26ExpertWord:{make:async()=>{throw Error('expert base missing')}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(base,'v27-kt50-original-kt42.js'),'utf8'),ctx);
const original=ctx.V26ExpertWord.make;
vm.runInContext(fs.readFileSync(path.join(base,'kt75-expert-intro.js'),'utf8'),ctx);
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const parse=async b=>{const z=fflate.unzipSync(new Uint8Array(await b.arrayBuffer()));const xml=new DOMParser().parseFromString(new TextDecoder().decode(z['word/document.xml']),'text/xml');
 const p=Array.from(xml.getElementsByTagNameNS(NS,'body')[0].children).filter(n=>n.localName==='p');
 const txt=p.map(q=>Array.from(q.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent).join(''));
 return {z,p,txt};};
const metadata={subject:'Складове за промишлени стоки и офиси',
 parcelIds:'56784.13.102, 56784.13.105, 56784.13.106',
 location:'гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив',
 recipient:'Възложител: ХХХХХХХХХХ',address:'Адрес: ХХХХХХХХХХХХХХ',
 incomingReference:'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.'};
(async()=>{for(const scenario of ['А','Б']){
 const draft={schema:'KT13_EXPERT_DRAFT_V1',scenario,metadata,aiDraft:'',parcels:[]},options={requireAiAuthor:true};
 const before=await parse(await original(draft,options));
 const after=await parse(await ctx.V26ExpertWord.make(draft,options));
 assert.equal(after.p.length,49);assert.equal(before.p.length,49);
 assert.match(after.txt[17],/Наредбата за условията и реда за извършване на оценка за съвместимостта/);
 assert.match(after.txt[17],/ДВ, бр\. 73 от 11\.09\.2007 г\., изм\. и доп\./);
 assert.match(after.txt[17],/е изготвен настоящият експертен проект\.$/);
 const runs=Array.from(after.p[17].children).filter(x=>x.localName==='r');
 const italics=runs.filter(x=>x.getElementsByTagNameNS(NS,'i').length);
 assert.equal(italics.length,1);assert.match(italics[0].textContent,/Наредбата за ОС, обн\./);
 for(let i=0;i<49;i++)if(i!==17)assert.equal(after.txt[i],before.txt[i],'Unexpected Expert paragraph change '+i);
 assert.deepEqual(Object.keys(after.z).sort(),Object.keys(before.z).sort());
 for(const k of Object.keys(before.z))if(k!=='word/document.xml')assert.deepEqual(Buffer.from(after.z[k]),Buffer.from(before.z[k]),'Changed Expert asset '+k);
 console.log('KT75 Expert '+scenario+' PASS: 49/49 paragraphs, legal intro, citation italics, unchanged remaining 48 paragraphs and assets');
 }
 for(const file of ['kt67-2-original-word-auto-project-test.html','kt67-2-5-a-b-admin-test.html']){
 const html=fs.readFileSync(path.join(base,file),'utf8');
 const a=html.indexOf('v27-preview/kt74-classic-fidelity.js?v=kt74-fidelity-1');
 const b=html.indexOf('v27-preview/kt75-expert-intro.js?v=kt75-expert-1');
 const c=html.indexOf('v27-preview/kt67-2-draft-package.js?v=kt67-2-draft-1');
 assert(a>=0&&a<b&&b<c,file+' wrong script order');
 }
 console.log('KT75 COMPLETE PASS: both public A/B routes and exact Expert DOCX');
})().catch(e=>{console.error(e);process.exitCode=1});
