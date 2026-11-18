const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Inline styles and presentation tables keep the message readable in mail clients. */
export function accountMailHtml({name,link,reset=false}){
 const url=new URL(link);if(url.protocol!=='https:')throw Error('HTTPS mail link required');
 const title=reset?'Нова парола за Вашия профил':'Добре дошли в WOW';
 const button=reset?'Задай нова парола':'Активирай профила';
 const intro=reset?'Получихме искане за възстановяване на паролата Ви.':'Заявката Ви за достъп до експертния модул е одобрена.';
 const instructions=reset?'Отворете бутона и изберете нова лична парола. След промяната влезте с потребителското си име и новата парола.':'Отворете бутона и въведете потребителското име и паролата, които избрахте при заявката. С това потвърждавате имейла си и активирате профила.';
 const notice=reset?'Връзката е еднократна и е валидна 30 минути. След промяната всички отворени сесии се прекратяват.':'Връзката за активиране е валидна 7 дни от одобрението. Този срок важи само за връзката — активираният профил няма седемдневно ограничение.';
 const footer=reset?'Ако не сте поискали нова парола, не предприемайте действие. Настоящата Ви парола остава същата.':'При следващите влизания използвайте само потребителското си име и парола — без нов код по имейл.';
 return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#09271d;color:#f5f0de">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09271d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background-color:#123629;border:1px solid #8c865c;border-top:4px solid #d9b771;border-radius:12px">
<tr><td style="padding:30px 32px 18px;font-family:Verdana,Arial,sans-serif"><div style="font-size:12px;letter-spacing:2px;color:#d9b771">WOW · ТПУ ПЛОВДИВ</div><h1 style="margin:14px 0 0;font-family:Georgia,serif;font-size:30px;line-height:1.2;color:#f5d588">${title}</h1><div style="margin-top:10px;font-size:13px;color:#c7d5c9">Експертен модул</div></td></tr>
<tr><td style="padding:4px 32px 24px;font:15px/1.7 Verdana,Arial,sans-serif;color:#f5f0de">
<p style="margin:0 0 16px">Здравейте, ${escape(name)}!</p><p style="margin:0 0 16px">${intro}</p><p style="margin:0 0 24px">${instructions}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#d9b771" style="border-radius:7px"><a href="${escape(link)}" style="display:inline-block;padding:14px 26px;border:1px solid #f0ce8a;border-radius:7px;color:#153828;font:bold 15px/1.4 Verdana,Arial,sans-serif;text-decoration:none">${button}</a></td></tr></table>
<p style="margin:24px 0 16px;padding:14px 16px;border-left:3px solid #d9b771;background-color:#1c4332;font-size:13px;color:#e0eade">${notice}</p>
<p style="margin:0 0 16px">${footer}</p><p style="margin:0 0 16px;font-size:12px;color:#c7d5c9">Парола: от 12 до 128 знака. Няма задължителни главни букви, цифри или специални знаци. Може да използвате запомняща се фраза с интервали.</p><p style="margin:0;font-size:12px;color:#c7d5c9">Вашата парола не се изпраща по имейл и не е достъпна за администратора.</p>
</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #56745e;font:12px/1.6 Verdana,Arial,sans-serif;color:#c7d5c9">Ако бутонът не се отваря, копирайте целия адрес в браузъра:<br><a href="${escape(link)}" style="color:#e6c680;word-break:break-all;overflow-wrap:anywhere">${escape(link)}</a><p style="margin:18px 0 0;color:#d9b771">WOW · ТПУ Пловдив<br><span style="color:#c7d5c9">Автоматично съобщение за Вашия профил</span></p></td></tr>
</table></td></tr></table></body></html>`;
}
