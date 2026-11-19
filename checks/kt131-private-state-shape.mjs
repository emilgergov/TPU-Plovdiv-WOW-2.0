import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const base='https://api.cloudflare.com/client/v4/accounts/90df5489417e4b53179a852c446aeed1';
const headers={Authorization:'Bearer '+process.env.CF_TOKEN};
async function api(path,options={}){const response=await fetch(base+path,{...options,headers:{...headers,...options.headers}});const data=await response.json();if(!response.ok||!data.success)throw Error('Diagnostic API failure HTTP '+response.status);return data.result}
const settings=await api('/workers/scripts/tpu-plovdiv-kt125-local-auth/settings');
const db=settings.bindings.find(b=>b.name==='KT125_DB'&&b.type==='d1')?.id;if(!db)throw Error('Database binding missing');
async function select(sql,params=[]){if(!/^SELECT\s/i.test(sql))throw Error('Read-only diagnostics only');return (await api('/d1/database/'+db+'/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params})}))[0].results}
const ids=await select('SELECT case_id FROM kt126_registry');
const target=ids.find(r=>createHash('sha256').update(r.case_id).digest('hex')===process.env.KT131_DIAGNOSTIC_TARGET);
if(!target)throw Error('Requested case not found');
const versions=await select("SELECT revision,kind,content_json FROM kt126_versions WHERE case_id=? AND kind='state' ORDER BY revision DESC LIMIT 200",[target.case_id]);
// Never print identifiers, identities, subjects, text, document names or payloads.
for(const row of versions){
 try{
  let saved=JSON.parse(row.content_json);
  if(saved?.format==='KT126-GZIP-1')saved=JSON.parse(gunzipSync(Buffer.from(saved.payload,'base64'),{maxOutputLength:10000000}).toString());
  const w=saved?.state||{},s4=saved?.stage4,s5=saved?.stage5;
  console.log('STATE_SHAPE',JSON.stringify({revision:row.revision,format:saved?.format||null,step:saved?.navigation?.step??w.step??null,intake:!!w.intake,subjectConfirmed:!!w.subjectConfirmed,parcelsConfirmed:!!w.parcelsConfirmed,lawConfirmed:!!w.lawConfirmed,routeConfirmed:!!w.routeConfirmed,stage4:!!s4,stage4Approved:!!s4?.approved,stage5:!!s5,documentVersions:Array.isArray(s5?.versions)?s5.versions.length:0,documentTextLengths:Array.isArray(s5?.versions)?s5.versions.map(v=>String(v.text||'').length):[],subjectFieldLength:String(saved?.values?.kt80SubjectText||'').length}));
 }catch{console.log('STATE_SHAPE',JSON.stringify({revision:row.revision,decodeError:true}))}
}
const artifacts=await select('SELECT COUNT(*) count FROM kt126_artifacts WHERE case_id=?',[target.case_id]);
console.log('ARCHIVED_DOCUMENT_COUNT',Number(artifacts[0]?.count||0));
