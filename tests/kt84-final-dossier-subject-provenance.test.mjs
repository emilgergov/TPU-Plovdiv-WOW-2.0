import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function subjectEngine(){
 const elements=new Map();
 function node(){return {value:'',textContent:'',children:[],style:{},
  replaceChildren(){this.children=[]},append(n){this.children.push(n)},
  dispatchEvent(){},addEventListener(){},focus(){}}}
 for(const id of ['kt80SubjectText','kt80SubjectProposalStatus','kt80SubjectProposalSources'])
  elements.set(id,node());
 const document={readyState:'loading',getElementById:id=>elements.get(id)||null,
  addEventListener(){},createElement:()=>node()};
 const root={};
 const context=vm.createContext({window:root,document,Event:class{constructor(type){this.type=type}}});
 vm.runInContext(readFileSync(new URL('../kt80/KT80_E01_IP_MASTER_SUBJECT_V32.js',import.meta.url),'utf8'),context);
 // Script's registration is deferred by design: fire DOMContentLoaded in fake DOM.
 // Install only the engine's export through the stored event callback.
 return {root,elements,document};
}
function load(){
 const listeners={};
 const items=new Map();
 function element(){return {value:'',textContent:'',children:[],
  append(v){this.children.push(v)},replaceChildren(){this.children=[]},
  addEventListener(){},dispatchEvent(){},focus(){}}}
 for(const id of ['kt80SubjectText','kt80SubjectProposalStatus','kt80SubjectProposalSources'])
  items.set(id,element());
 const document={readyState:'loading',getElementById:id=>items.get(id)||null,
  createElement:()=>element(),addEventListener:(name,fn)=>{listeners[name]=fn}};
 const root={};
 vm.runInNewContext(readFileSync(new URL('../kt80/KT80_E01_IP_MASTER_SUBJECT_V32.js',import.meta.url),'utf8'),
  {window:root,document,Event:class{constructor(name){this.type=name}}});
 listeners.DOMContentLoaded();
 return {engine:root.KT80SubjectMaster,items};
}
const candidate=(file,title)=>({source:file,title});
const sourceText=(source)=>({source,text:'Доказателствен текст с конкретна дейност по проекта и местоположение.'});
const file=(filename,status)=>({filename,status});

test('ВА-008/009: extracted legacy DOC remains explicitly for original review',()=>{
 const {engine,items}=load();
 const intake={subject_candidates:[candidate('Уведомление.doc','Реконструкция на съществуващи сгради')],
  files:[file('Уведомление.doc','текстът е прочетен; ПРОВЕРКА: DOC — проверете таблиците')],
  document_texts:[sourceText('Уведомление.doc')]};
 const p=engine.propose(intake);
 assert.equal(p.sourceReadStatus,'REVIEW_REQUIRED');
 assert.match(p.warning,/проверка в оригинала/);
 engine.show(p,{apply:true});
 assert.match(items.get('kt80SubjectProposalStatus').textContent,/ЗА ПРОВЕРКА В ОРИГИНАЛА/);
 assert.equal(items.get('kt80SubjectText').value,p.text,
  'read-but-review-required candidate remains editable, never auto-confirmed');
 assert.equal(p.expertConfirmed,false);
});
test('ВА-009: a filename or subject_candidate alone cannot become verified extracted text',()=>{
 const {engine,items}=load();
 const intake={subject_candidates:[candidate('Уведомление.doc','Изграждане на нова обслужваща сграда')],
  files:[file('Уведомление.doc','НЕПРОЧЕТЕН: DOC прочит неуспешен')],
  document_texts:[]};
 const p=engine.propose(intake);
 assert.equal(p.sourceReadStatus,'NOT_READ');
 engine.show(p,{apply:true});
 assert.equal(items.get('kt80SubjectText').value,'',
  'unread source must not silently populate the editable subject');
 assert.match(items.get('kt80SubjectProposalStatus').textContent,/НЕ Е УДОСТОВЕРЕН ПРОЧИТ/);
 assert.equal(p.candidates.length,1,'an untrusted candidate remains visible for expert correction');
});
test('ВА-009: actual readable PDF is preferred over unverified DOC',()=>{
 const {engine}=load();
 const intake={subject_candidates:[
   candidate('Уведомление.doc','Строителство на нов обект с непроверен документ'),
   candidate('Потвърдено уведомление.pdf','Подмяна на съществуващо производствено оборудване')],
  files:[file('Уведомление.doc','НЕПРОЧЕТЕН: невъзможен прочит'),
   file('Потвърдено уведомление.pdf','текстът е прочетен')],
  document_texts:[sourceText('Потвърдено уведомление.pdf')]};
 const p=engine.propose(intake);
 assert.equal(p.source,'Потвърдено уведомление.pdf');
 assert.equal(p.sourceReadStatus,'TEXT_EXTRACTED');
 assert.equal(p.expertConfirmed,false,'even correctly extracted text requires expert confirmation');
});
test('ВА-009: PDF with OCR warning is not promoted to unconditional read',()=>{
 const {engine}=load();
 const intake={subject_candidates:[candidate('Скан.pdf','Разширяване на съществуваща инсталация')],
  files:[file('Скан.pdf','OCR: 2 сканирани страници; експертна проверка')],
  document_texts:[sourceText('Скан.pdf')]};
 assert.equal(engine.propose(intake).sourceReadStatus,'REVIEW_REQUIRED');
});
