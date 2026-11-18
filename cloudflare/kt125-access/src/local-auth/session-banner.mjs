const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames={egmaster:'ЕГМАСТЕР',administrator:'Администратор',expert:'Експерт',reviewer:'Преглеждащ',delegated_expert:'Упълномощен експерт'};
/** Show the server-verified identity; never trust browser-supplied role labels. */
export async function withSessionBanner(response,user){
 if(!user?.verified||!response.headers.get('Content-Type')?.toLowerCase().includes('text/html'))return response;
 const text=await response.text();if(!/<body\b/i.test(text))return new Response(text,{status:response.status,headers:response.headers});
 const style=`<style>#wow-session-banner{position:sticky;top:0;z-index:10000;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 18px;box-sizing:border-box;width:100%;padding:9px 24px;background:#092219;color:#f5f0de;border-bottom:1px solid #aa8d52;font:12px/1.5 Verdana,Arial,sans-serif;text-align:left}#wow-session-banner .wow-session-who{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px}#wow-session-banner strong{color:#f5d588;font-weight:700}#wow-session-banner .wow-session-role{padding:2px 9px;border:1px solid #8c865c;border-radius:12px;color:#f5d588;font-weight:700;white-space:nowrap}#wow-session-banner .wow-session-actions{display:flex;align-items:center;gap:14px}#wow-session-banner a{color:#e6cd91;font:12px Verdana,Arial,sans-serif}#wow-session-banner form{display:inline-flex;gap:0;margin:0;padding:0;border:0}#wow-session-banner button{min-height:0;padding:4px 12px;border:1px solid #799079;border-radius:5px;background:transparent;color:#f5f0de;font:12px Verdana,Arial,sans-serif;cursor:pointer}@media(max-width:620px){#wow-session-banner{padding:8px 12px}}
.auth-page.auth-profile,.auth-page.auth-message{position:relative}body.auth-profile #wow-session-banner,body.auth-message #wow-session-banner{position:absolute;top:0;left:0}</style>`;
 const label=roleNames[user.role]||'Потребител';
 const bar=`<aside id="wow-session-banner" aria-label="Текущ потребител"><div class="wow-session-who"><span>Работите като</span><strong>${escape(user.displayName||user.username)}</strong><span>(${escape(user.username)})</span><span class="wow-session-role">${escape(label)}</span></div><div class="wow-session-actions"><a href="/member">Моят профил</a><form method="post" action="/auth/logout"><button type="submit">Изход</button></form></div></aside>`;
 const html=text.replace(/<\/head>/i,style+'</head>').replace(/(<body\b[^>]*>)/i,'$1'+bar);
 const headers=new Headers(response.headers);headers.delete('Content-Length');
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
