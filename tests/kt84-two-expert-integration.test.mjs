import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../kt84/private-api-worker.mjs';

const ORIGIN='https://private.example';
const UUID={
 a:'11111111-1111-4111-8111-111111111111',
 b:'22222222-2222-4222-8222-222222222222',
 c:'33333333-3333-4333-8333-333333333333',
 d:'44444444-4444-4444-8444-444444444444'
};
const time=()=>Math.floor(Date.now()/1000);

function fixture(){
 const users=new Map([
 ['expert-a',{user_id:'expert-a',org_id:'riosv-plovdiv',role:'expert',status:'active'}],
 ['expert-b',{user_id:'expert-b',org_id:'riosv-plovdiv',role:'expert',status:'active'}],
 ['reviewer',{user_id:'reviewer',org_id:'riosv-plovdiv',role:'reviewer',status:'active'}],
 ['admin',{user_id:'admin',org_id:'riosv-plovdiv',role:'administrator',status:'active'}],
 ['outsider',{user_id:'outsider',org_id:'other-office',role:'expert',status:'active'}]
 ]);
 const cases=new Map([
 [UUID.a,{id:UUID.a,orgId:'riosv-plovdiv',ownerId:'expert-a',status:'active',
    version:1,subject:'Лична преписка А',updatedAt:time()}],
 [UUID.b,{id:UUID.b,orgId:'riosv-plovdiv',ownerId:'expert-b',status:'active',
    version:1,subject:'Лична преписка Б',updatedAt:time()}],
 [UUID.c,{id:UUID.c,orgId:'other-office',ownerId:'outsider',status:'active',
    version:1,subject:'Друга организация',updatedAt:time()}]
 ]);
 const grants=new Map(),docs=new Map(),objects=new Map(),audits=[],revisions=[];
 let serial=0,dbTouched=0;
 function prepared(sql,args){
   const trimmed=sql.replace(/\s+/g,' ').trim();
   return {
     async first(){
       if(trimmed.includes('FROM users')){
        const u=users.get(args[0]);
        return !u?null:trimmed.includes('AS subject')?{
         subject:u.user_id,orgId:u.org_id,role:u.role,status:u.status
        }:u;
       }
       if(trimmed.includes('FROM cases WHERE case_id='))return cases.get(args[0])||null;
       if(trimmed.includes('FROM case_documents WHERE document_id=')){
        const d=docs.get(args[0]);
        return d?.caseId===args[1]?{
         document_id:d.id,object_key:d.key,media_type:d.type,filename:d.filename
        }:null;
       }
       throw Error('Unexpected first '+trimmed);
     },
     async all(){
       if(trimmed.includes('FROM case_grants WHERE case_id=')){
        return {results:[...grants.values()].filter(g=>
         g.caseId===args[0]&&g.orgId===args[1]&&g.granteeId===args[2]&&
         g.status==='active'&&g.expiresAt>args[3]).map(g=>({
          caseId:g.caseId,orgId:g.orgId,granteeId:g.granteeId,
          grantedBy:g.grantedBy,actions_json:JSON.stringify(g.actions),
          expiresAt:g.expiresAt,status:g.status
         }))};
       }
       if(trimmed.includes('SELECT DISTINCT c.case_id')){
        const [id,now,org,owner]=args;
        return {results:[...cases.values()].filter(c=>
         c.orgId===org&&c.status==='active'&&
         (c.ownerId===owner||[...grants.values()].some(g=>
          g.caseId===c.id&&g.orgId===org&&g.granteeId===id&&
          g.status==='active'&&g.expiresAt>now))
        ).map(c=>({...c}))};
       }
       if(trimmed.includes('FROM case_documents WHERE case_id=')){
        return {results:[...docs.values()].filter(d=>d.caseId===args[0])
         .map(d=>({id:d.id,filename:d.filename,mediaType:d.type,bytes:d.bytes,createdAt:d.createdAt}))};
       }
       throw Error('Unexpected all '+trimmed);
     },
     async run(){
       if(trimmed.startsWith('INSERT INTO audit_events')){
        audits.push({actor:args[3],caseId:args[5],action:args[6],result:args[7]});
        return {meta:{changes:1}};
       }
       if(trimmed.startsWith('INSERT INTO case_revisions')){
        revisions.push({caseId:args[0],version:args[1]});return {meta:{changes:1}};
       }
       if(trimmed.startsWith('INSERT INTO case_grants')){
        const [grantId,caseId,orgId,granteeId,grantedBy,raw,expiresAt]=args;
        grants.set(grantId,{grantId,caseId,orgId,granteeId,grantedBy,
         actions:JSON.parse(raw),expiresAt,status:'active'});return {meta:{changes:1}};
       }
       if(trimmed.startsWith('UPDATE case_grants')){
        const [when,id,caseId,orgId]=args;
        const g=grants.get(id);
        if(!g||g.caseId!==caseId||g.orgId!==orgId||g.status!=='active')
         return {meta:{changes:0}};
        g.status='revoked';g.revokedAt=when;return {meta:{changes:1}};
       }
       if(trimmed.startsWith('UPDATE cases')){
        const c=cases.get(trimmed.includes('SET subject=' )?args[2]:args[1]);
        const expected=trimmed.includes('SET subject=')?args[4]:args[3];
        const actor=trimmed.includes('SET subject=')?args[5]:args[4];
        const delegate=trimmed.includes('SET subject=')?args[6]:args[5];
        const now=trimmed.includes('SET subject=')?args[7]:args[6];
        if(!c||c.version!==expected||c.status!=='active'||c.orgId!==
          (trimmed.includes('SET subject=')?args[3]:args[2]))
         return {meta:{changes:0}};
        const allowed=c.ownerId===actor||[...grants.values()].some(g=>
          g.caseId===c.id&&g.orgId===c.orgId&&g.granteeId===delegate&&
          g.grantedBy===c.ownerId&&g.status==='active'&&g.expiresAt>now&&
          g.actions.includes('case.edit'));
        if(!allowed)return {meta:{changes:0}};
        if(trimmed.includes('SET subject='))c.subject=args[0];
        c.version++;c.updatedAt=time();
        return {meta:{changes:1}};
       }
       if(trimmed.startsWith('INSERT INTO cases')){
        const [id,orgId,ownerId,subject,createdAt]=args;
        cases.set(id,{id,orgId,ownerId,subject,version:1,
          status:'active',updatedAt:createdAt});
        return {meta:{changes:1}};
       }
       if(trimmed.startsWith('INSERT INTO case_documents')){
        const [id,caseId,key,filename,type,bytes,createdBy,createdAt]=args;
        docs.set(id,{id,caseId,key,filename,type,bytes,createdBy,createdAt});
        return {meta:{changes:1}};
       }
       throw Error('Unexpected run '+trimmed);
     }
   };
 }
 const db={
   prepare(sql){dbTouched++;return {
     bind(...args){return prepared(sql,args)}
   }},
   async batch(statements){return Promise.all(statements.map(s=>s.run()))}
 };
 const r2={
  async get(key){return objects.has(key)?{body:objects.get(key)}:null},
  async put(key,bytes){objects.set(key,bytes)},
  async delete(key){objects.delete(key)}
 };
 async function call(id,method,path,body,headers={}){
  const opts={method,headers:{...headers}};
  if(body!==undefined){
   opts.body=JSON.stringify(body);
   opts.headers['content-type']='application/json';
  }
  const response=await worker.fetch(new Request(ORIGIN+path,opts),
   {PRIVATE_DB:db,PRIVATE_FILES:r2},
   {access:{getIdentity:async()=>({id})}});
  const raw=await response.text();
  let data;
  try{data=JSON.parse(raw)}catch{data=raw}
  return {status:response.status,data,headers:response.headers};
 }
 return {call,users,cases,grants,docs,objects,audits,revisions,
  touched:()=>dbTouched};
}

test('KT84-04: two experts see only their own case titles and file lists',async()=>{
 const x=fixture();
 const [a,b]=await Promise.all([
  x.call('expert-a','GET','/v1/cases'),
  x.call('expert-b','GET','/v1/cases')
 ]);
 assert.deepEqual(a.data.cases.map(c=>c.id),[UUID.a]);
 assert.deepEqual(b.data.cases.map(c=>c.id),[UUID.b]);
 for(const [user,id] of [['expert-a',UUID.b],['expert-b',UUID.a]]){
  const [caseGet,documents]=await Promise.all([
   x.call(user,'GET','/v1/cases/'+id),
   x.call(user,'GET','/v1/cases/'+id+'/documents')
  ]);
  assert.equal(caseGet.status,404);
  assert.equal(documents.status,404);
 }
 assert.equal((await x.call('outsider','GET','/v1/cases/'+UUID.a)).status,404);
 assert.equal((await x.call('admin','GET','/v1/cases/'+UUID.a)).status,404);
});

test('KT84-04: owner shares only one dossier, revokes and hides it immediately',async()=>{
 const x=fixture();
 const path='/v1/cases/'+UUID.a;
 const allowed=await x.call('expert-a','POST',path+'/grants',{
  granteeId:'expert-b',actions:['case.read'],expiresAt:time()+3600
 });
 assert.equal(allowed.status,201);
 assert.equal((await x.call('expert-b','GET',path)).status,200);
 assert.deepEqual((await x.call('expert-b','GET','/v1/cases')).data.cases.map(c=>c.id),
  [UUID.a,UUID.b]);
 assert.equal((await x.call('expert-b','PATCH',path,{version:1,subject:'Подправка'})).status,403);
 assert.equal((await x.call('expert-b','GET','/v1/cases/'+UUID.c)).status,404);
 const revoke=await x.call('expert-a','DELETE',path+'/grants/'+allowed.data.grantId);
 assert.equal(revoke.status,200);
 assert.equal((await x.call('expert-b','GET',path)).status,404);
 assert.deepEqual((await x.call('expert-b','GET','/v1/cases')).data.cases.map(c=>c.id),[UUID.b]);
 assert.equal(x.cases.get(UUID.a).subject,'Лична преписка А');
});

test('KT84-04: two authorized simultaneous edits cannot overwrite each other',async()=>{
 const x=fixture(),path='/v1/cases/'+UUID.a;
 const granted=await x.call('expert-a','POST',path+'/grants',{
  granteeId:'expert-b',actions:['case.read','case.edit'],expiresAt:time()+3600
 });
 assert.equal(granted.status,201);
 const [a,b]=await Promise.all([
  x.call('expert-a','PATCH',path,{version:1,subject:'Промяна на А'}),
  x.call('expert-b','PATCH',path,{version:1,subject:'Промяна на Б'})
 ]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
 assert.equal(x.cases.get(UUID.a).version,2);
 assert.equal(x.revisions.filter(r=>r.caseId===UUID.a).length,1);
 assert.ok(['Промяна на А','Промяна на Б'].includes(x.cases.get(UUID.a).subject));
});

test('KT84-04: bogus grants do not leak titles through the case list',async()=>{
 const x=fixture();
 x.grants.set(UUID.d,{grantId:UUID.d,caseId:UUID.a,
  orgId:'riosv-plovdiv',granteeId:'expert-b',grantedBy:'not-owner',
  actions:['case.read'],expiresAt:time()+3600,status:'active'});
 const listing=await x.call('expert-b','GET','/v1/cases');
 assert.equal(listing.status,200);
 assert.deepEqual(listing.data.cases.map(c=>c.id),[UUID.b]);
});

test('KT84-04: suspended expert, reader-only colleague and administrator cannot edit',async()=>{
 const x=fixture(),p='/v1/cases/'+UUID.a;
 const shared=await x.call('expert-a','POST',p+'/grants',
  {granteeId:'reviewer',actions:['case.read','case.review'],expiresAt:time()+3600});
 assert.equal(shared.status,201);
 assert.equal((await x.call('reviewer','GET',p)).status,200);
 assert.equal((await x.call('reviewer','PATCH',p,{version:1,subject:'Change'})).status,403);
 assert.equal((await x.call('admin','PATCH',p,{version:1,subject:'Admin change'})).status,403);
 x.users.get('expert-a').status='suspended';
 assert.equal((await x.call('expert-a','GET',p)).status,403);
 assert.equal((await x.call('expert-a','POST',p+'/grants',
  {granteeId:'expert-b',actions:['case.read'],expiresAt:time()+3600})).status,403);
});

test('KT84-04: no personal file bytes leave R2 to ungranted colleagues',async()=>{
 const x=fixture();
 const id=UUID.d,key='riosv-plovdiv/'+UUID.a+'/'+id;
 x.docs.set(id,{id,caseId:UUID.a,key,filename:'secret.pdf',
   type:'application/pdf',bytes:6,createdAt:time()});
 x.objects.set(key,new TextEncoder().encode('SECRET'));
 const path='/v1/cases/'+UUID.a+'/documents/'+id;
 const foreign=await x.call('expert-b','GET',path);
 assert.equal(foreign.status,404);
 const own=await x.call('expert-a','GET',path);
 assert.equal(own.status,200);
 assert.equal(own.data,'SECRET');
 assert.equal(own.headers.get('cache-control'),'private, no-store');
 assert.equal(own.headers.get('content-disposition'),'attachment');
});

test('KT84-04: audit records successful sharing and revocation without dossier text',async()=>{
 const x=fixture(),path='/v1/cases/'+UUID.a;
 const grant=await x.call('expert-a','POST',path+'/grants',
  {granteeId:'expert-b',actions:['case.read'],expiresAt:time()+1200});
 await x.call('expert-a','DELETE',path+'/grants/'+grant.data.grantId);
 assert.ok(x.audits.some(a=>a.action==='case.share'&&a.result==='allowed'));
 assert.ok(x.audits.some(a=>a.action==='case.share.revoke'&&a.result==='allowed'));
 assert.ok(x.audits.every(a=>!JSON.stringify(a).includes('Лична преписка')));
});

test('KT84-04: expired grant is ignored on both list and direct dossier access',async()=>{
 const x=fixture();
 x.grants.set(UUID.d,{grantId:UUID.d,caseId:UUID.a,
  orgId:'riosv-plovdiv',granteeId:'expert-b',grantedBy:'expert-a',
  actions:['case.read'],expiresAt:time()-10,status:'active'});
 assert.deepEqual((await x.call('expert-b','GET','/v1/cases')).data.cases.map(c=>c.id),[UUID.b]);
 assert.equal((await x.call('expert-b','GET','/v1/cases/'+UUID.a)).status,404);
});

test('KT84-04: a grant including a prohibited action does not expose dossier metadata',async()=>{
 const x=fixture();
 x.grants.set(UUID.d,{grantId:UUID.d,caseId:UUID.a,
  orgId:'riosv-plovdiv',granteeId:'expert-b',grantedBy:'expert-a',
  actions:['case.read','case.share'],expiresAt:time()+3600,status:'active'});
 assert.deepEqual((await x.call('expert-b','GET','/v1/cases')).data.cases.map(c=>c.id),[UUID.b]);
 assert.equal((await x.call('expert-b','GET','/v1/cases/'+UUID.a)).status,404);
});
