import {escapeHtml as e,renderKT125PrivatePage,kt125PrivateHtmlResponse} from '../private-admin-page.mjs';
import {normalizeKT125Email} from './common.mjs';

class InputError extends Error {}
export const presentationDefaults=Object.freeze({subject:'Покана за представяне на WOW — разработка на РИОСВ – Пловдив',intro:'РИОСВ – Пловдив Ви кани на представяне на разработвания експертен административен модул WOW, който обединява обработката на документи, пространствения анализ и нормативната преценка в един последователен работен процес.',date:'',time:'',venue:'',contact:'РИОСВ – Пловдив',panels:[
 ['01 · Преписката','Приемане и прочит на документите, отчет за надеждността на извлечения текст, вътрешна номерация и потвърден Деловоден №.'],
 ['02 · Предметът','Извличане и формулиране на предмета и обхвата, проследим източник, редакция и изрично експертно потвърждение.'],
 ['03 · Територията','Идентифициране на имотите, административни данни, карти и пространствени пресичания със защитени зони и защитени територии.'],
 ['04 · Преценката','Съпоставяне на фактите с нормативните предпоставки, аргументирани предложения и експертен контрол върху избора на процедура.'],
 ['05 · Резултатът','Подготовка на проекти на документи и приложения, запазване на преписката и история на обработката.']
],development:'Поетапно развитие към 22 административни панела: писма и административни действия · решения по ОС и ОВОС · екологична оценка · справки и архиви · жалби, сигнали и възражения.',cta:'Ако желаете да се запознаете с модула WOW и да участвате в неговото представяне и тестване, подайте заявка за достъп.'});
const fieldNames=['subject','intro','date','time','venue','contact','development','cta',...presentationDefaults.panels.flatMap((_,i)=>['title'+i,'body'+i])];
export function validateDraft(form){
 const allowed=new Set([...fieldNames,'revision','recipient','new_emails','action']);
 if([...form.keys()].some(k=>!allowed.has(k))||fieldNames.some(k=>form.getAll(k).length!==1)||['revision','new_emails','action'].some(k=>form.getAll(k).length!==1))throw new InputError('Проверете полетата на поканата.');
 const data={};for(const key of fieldNames){const max=key==='intro'?1800:key==='subject'?180:800;const v=form.get(key);if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))throw new InputError('Невалидно или прекалено дълго поле.');data[key]=v.trim();}
 if(!data.subject||!data.intro||/[\r\n]/.test(data.subject))throw new InputError('Въведете тема и въведение.');
 data.panels=presentationDefaults.panels.map((_,i)=>[data['title'+i],data['body'+i]]);
 if(data.panels.some(p=>p.some(x=>!x)))throw new InputError('Попълнете петте панела.');
 const extra=String(form.get('new_emails')||'');if(extra.length>14000)throw new InputError('Прекалено много адреси.');
 const raw=[...form.getAll('recipient'),...extra.split(/[\s;,]+/).filter(Boolean)];
 const recipients=[];for(const rawEmail of raw){const email=normalizeKT125Email(rawEmail);if(!email)throw new InputError('Невалиден имейл адрес: '+String(rawEmail).slice(0,120));if(!recipients.includes(email))recipients.push(email);}
 if(recipients.length>50)throw new InputError('Изберете най-много 50 получатели за една покана.');
 const revision=Number(form.get('revision'));if(!Number.isSafeInteger(revision)||revision<0)throw new InputError('Невалидна версия на черновата.');
 return {data,recipients,revision};
}
export function presentationHtml(data,origin){
 const d={...presentationDefaults,...data};const event=[d.date&&'Дата: '+d.date,d.time&&'Час: '+d.time,d.venue&&'Място / онлайн участие: '+d.venue].filter(Boolean);
 return `<article class="wow-invitation" style="max-width:720px;margin:0 auto;background:#123629;color:#f5f0de;font:13px/1.45 Verdana,Arial,sans-serif;border:1px solid #c4a467;border-top:4px solid #d9b771;border-radius:12px;padding:24px;box-sizing:border-box">
 <div style="color:#e4c780;letter-spacing:2px;font-size:11px">РИОСВ – ПЛОВДИВ · ПОКАНА ЗА ПРЕЗЕНТАЦИЯ</div>
 <h1 style="font:700 30px Georgia,serif;color:#f5d588;margin:12px 0 5px">WOW</h1><h2 style="font:700 20px Georgia,serif;color:#f5d588;margin:0 0 10px">Експертен административен модул</h2>
 <p style="color:#f5d588;margin:0 0 14px">От постъпилата преписка до обоснован проект на административен документ.</p><p>${e(d.intro)}</p>
 <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 6px">${d.panels.map(([title,body])=>`<tr><td style="background:#244b39;padding:10px;border-left:3px solid #d9b771;border-radius:5px"><strong style="color:#f5d588">${e(title)}</strong><div style="margin-top:4px">${e(body)}</div></td></tr>`).join('')}</table>
 <div style="border-top:1px solid #78815b;padding-top:10px;margin-top:10px"><strong style="color:#f5d588">Един общ механизъм · развитие към 22 административни панела</strong><p style="font-size:11px;margin:5px 0">${e(d.development)}</p></div>
 <p style="font-weight:bold">Експертът проверява, потвърждава и решава.</p>
 ${event.length?`<div style="padding:10px;background:#244b39;border-radius:6px">${event.map(x=>`<div>${e(x)}</div>`).join('')}</div>`:'<p style="font-size:11px">Датата, часът и мястото на представянето ще бъдат уточнени допълнително.</p>'}
 <div style="margin-top:14px;padding-top:12px;border-top:1px solid #78815b"><strong style="color:#f5d588">Заявете интерес и достъп</strong><p>${e(d.cta)}</p><a href="${e(origin)}/auth/register" style="display:inline-block;background:#d9b771;color:#123629;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Заяви достъп до WOW</a><p style="font-size:10px">След одобрение от администратор ще получите имейл с връзка за активиране. Вече регистрираните потребители могат да използват <a href="${e(origin)}/auth/login" style="color:#f5d588">входа към модула</a>.</p></div>
 <footer style="font-size:10px;color:#d2dfd2;border-top:1px solid #78815b;padding-top:9px">Разработка на РИОСВ – Пловдив${d.contact?' · '+e(d.contact):''}</footer></article>`;
}
function editor({data,recipients,revision,directory,message,origin}){
 const d={...presentationDefaults,...data};const text=(key,label,max=800)=>`<label class="full-field">${label}<textarea name="${key}" maxlength="${max}" required>${e(d[key])}</textarea></label>`;
 const registered=new Set(directory.map(x=>x.email));
 return `${message?`<p class="notice" role="status">${e(message)}</p>`:''}<div class="state"><strong>Стандартна бланка · РИОСВ – Пловдив</strong><p>Постоянна бланка с пет панела, институционално оформление и връзка за регистрация. Редактирате конкретната покана, без да променяте стандартната бланка.</p><a href="/kt125/admin/presentation/template">Преглед на стандартната бланка</a></div><p>Подгответе получателите и съдържанието. Това е чернова за преглед; от този екран още не се изпращат имейли.</p>
 <form method="post" action="/kt125/admin/presentation/save"><input type="hidden" name="revision" value="${revision}">
 <fieldset><legend>1 · Получатели</legend><p>Изберете регистрирани потребители и/или въведете нови адреси. Повтарящите се адреси се обединяват. До 50 получатели.</p>
 <div class="recipient-list">${directory.length?directory.map(x=>`<label><input type="checkbox" name="recipient" value="${e(x.email)}"${recipients.includes(x.email)?' checked':''}> <strong>${e(x.display_name||x.email)}</strong> · ${e(x.email)}</label>`).join(''):'<p>Няма налични регистрирани адреси.</p>'}</div>
 <label class="full-field">Нови имейл адреси — на отделни редове или разделени със запетая<textarea name="new_emails" maxlength="14000" placeholder="name@example.bg">${e(recipients.filter(x=>!registered.has(x)).join('\n'))}</textarea></label></fieldset>
 <fieldset><legend>2 · Съдържание</legend><label class="full-field">Тема<input name="subject" maxlength="180" required value="${e(d.subject)}"></label>${text('intro','Въведение',1800)}
 ${d.panels.map(([title,body],i)=>`<div class="invite-edit-panel"><label>Заглавие на панел ${i+1}<input name="title${i}" maxlength="800" required value="${e(title)}"></label><label>Текст<textarea name="body${i}" maxlength="800" required>${e(body)}</textarea></label></div>`).join('')}
 ${text('development','Развитие към 22 панела')}${text('cta','Покана за регистрация')}
 ${[['date','Дата'],['time','Час'],['venue','Място / онлайн участие'],['contact','Контакт']].map(([key,label])=>`<label class="wide-field">${label}<input name="${key}" maxlength="800" value="${e(d[key])}"></label>`).join('')}
 </fieldset><div class="full-field"><button name="action" value="save">Запази черновата</button> <button name="action" value="preview">Запази и прегледай поканата</button></div></form>
 <p class="disabled">Избраните получатели и черновата се пазят за Вашия администраторски профил. Поканата не създава профили и не одобрява автоматично достъп.</p>`;
}
export async function presentationHttp({request,env,who,config,now}){
 if(!['egmaster','administrator'].includes(who.role))return new Response('Няма административен достъп.',{status:403});
 const path=new URL(request.url).pathname,db=env.KT125_DB;
 const allowed=['/kt125/admin/panel/presentation','/kt125/admin/presentation/save','/kt125/admin/presentation/preview','/kt125/admin/presentation/template'];
 if(!allowed.includes(path))return new Response('Няма такъв екран.',{status:404});
 if(!['GET','POST'].includes(request.method)||request.method==='POST'&&path!=='/kt125/admin/presentation/save'||request.method==='GET'&&path.endsWith('/save'))return new Response(null,{status:405});
 if(request.method==='POST'&&(request.headers.get('Origin')!==config.origin||request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'))return new Response('Заявката е отказана.',{status:403});
 await db.prepare(`CREATE TABLE IF NOT EXISTS kt127_presentation_drafts(organization_id TEXT NOT NULL,actor_id TEXT NOT NULL,data_json TEXT NOT NULL,recipients_json TEXT NOT NULL,revision INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL,PRIMARY KEY(organization_id,actor_id))`).run();
 let row=await db.prepare('SELECT * FROM kt127_presentation_drafts WHERE organization_id=? AND actor_id=?').bind(config.org,who.userId).first();
 let message='';let status=200;
 if(request.method==='POST'){
  try{
   if(!/^application\/x-www-form-urlencoded(?:;.*)?$/i.test(request.headers.get('Content-Type')||''))throw new InputError('Невалиден формат.');
   const reader=request.body?.getReader();let size=0,body='';const decoder=new TextDecoder('utf-8',{fatal:true});if(reader)while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>64000){await reader.cancel();throw new InputError('Прекалено голяма заявка.');}body+=decoder.decode(r.value,{stream:true});}body+=decoder.decode();
   const form=new URLSearchParams(body),v=validateDraft(form);if(!['save','preview'].includes(form.get('action')))throw new InputError('Невалидно действие.');
   const result=await db.prepare(`INSERT INTO kt127_presentation_drafts(organization_id,actor_id,data_json,recipients_json,revision,updated_at_ms)
    SELECT ?,?,?,?,1,? WHERE ?=0 AND EXISTS(SELECT 1 FROM kt125_users WHERE user_id=? AND organization_id=? AND active=1 AND role IN ('egmaster','administrator'))
    ON CONFLICT(organization_id,actor_id) DO NOTHING`).bind(config.org,who.userId,JSON.stringify(v.data),JSON.stringify(v.recipients),now,v.revision,who.userId,config.org).run();
   let changes=result.meta.changes;
   if(v.revision>0){const r=await db.prepare(`UPDATE kt127_presentation_drafts SET data_json=?,recipients_json=?,revision=revision+1,updated_at_ms=? WHERE organization_id=? AND actor_id=? AND revision=? AND EXISTS(SELECT 1 FROM kt125_users WHERE user_id=? AND organization_id=? AND active=1 AND role IN ('egmaster','administrator'))`).bind(JSON.stringify(v.data),JSON.stringify(v.recipients),now,config.org,who.userId,v.revision,who.userId,config.org).run();changes=r.meta.changes;}
   if(changes!==1)throw new InputError('Черновата е променена в друг прозорец или правата са променени. Презаредете екрана.');
   return new Response(null,{status:303,headers:{Location:form.get('action')==='preview'?'/kt125/admin/presentation/preview':'/kt125/admin/panel/presentation','Cache-Control':'no-store, private'}});
  }catch(error){message=error instanceof InputError?error.message:'Черновата не е записана. Презаредете и проверете състоянието.';status=400;}
 }
 const data=row?JSON.parse(row.data_json):presentationDefaults,recipients=row?JSON.parse(row.recipients_json):[];
 if(path.endsWith('/preview')||path.endsWith('/template'))return kt125PrivateHtmlResponse(`<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOW · Преглед на поканата</title><style>body{margin:20px;background:#0b271d;color:#f5f0de;font:13px Verdana}a{color:#f5d588}.tools{max-width:720px;margin:0 auto 16px}@page{size:A4;margin:10mm}@media print{body{margin:0;background:white}.tools{display:none}.wow-invitation{max-width:none!important;font-size:11px!important;padding:18px!important;break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}.wow-invitation h1{font-size:25px!important}.wow-invitation p{margin:8px 0}}</style><body><div class="tools"><a href="/kt125/admin/panel/presentation">← Към редакцията</a><p>${path.endsWith('/template')?'СТАНДАРТНА БЛАНКА · РИОСВ – Пловдив':'ЧЕРНОВА · '+recipients.length+' получатели'} · Няма изпратени имейли. За печат: Ctrl+P → A4.</p></div>${presentationHtml(path.endsWith('/template')?presentationDefaults:data,config.origin)}</body></html>`);
 const rows=await db.prepare(`SELECT email,display_name FROM kt125_local_accounts WHERE organization_id=? AND state='approved' UNION SELECT email,display_name FROM kt125_staff_profiles WHERE organization_id=? ORDER BY email LIMIT 500`).bind(config.org,config.org).all();
 const directory=[...new Map((rows.results||[]).filter(x=>normalizeKT125Email(x.email)).map(x=>[x.email.toLowerCase(),{...x,email:x.email.toLowerCase()}])).values()];
 return kt125PrivateHtmlResponse(renderKT125PrivatePage({section:'presentation',presentationContent:editor({data,recipients,revision:row?.revision||0,directory,message,origin:config.origin})}),status);
}
