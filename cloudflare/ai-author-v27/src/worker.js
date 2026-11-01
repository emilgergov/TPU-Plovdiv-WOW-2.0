const TEST_PAGE="<!doctype html><html lang=\"bg\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ТПУ Пловдив — V27 AI тест</title><style>body{font:16px system-ui,sans-serif;background:#f5f7f5;color:#183323;max-width:860px;margin:35px auto;padding:0 18px}main{background:white;padding:28px;border-radius:14px;box-shadow:0 3px 22px #0001}label{display:block;margin:18px 0 6px;font-weight:600}input,textarea,select{box-sizing:border-box;width:100%;padding:11px;border:1px solid #aebbb2;border-radius:7px;font:inherit}textarea{min-height:95px}button{background:#226c46;color:white;border:0;border-radius:8px;padding:13px 20px;font:inherit;cursor:pointer;margin-top:18px}button:disabled{opacity:.6}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f4;padding:16px;border-radius:8px;min-height:50px}.note{color:#526459;font-size:14px}</style></head><body><main><h1>ТПУ Пловдив — AI автор V27</h1><p>Проверка с изцяло синтетични данни. Този екран не съхранява токена или преписката.</p><label for=\"token\">Защитен токен за достъп</label><input id=\"token\" type=\"password\" autocomplete=\"off\" placeholder=\"Токенът от първоначалната настройка\"><p class=\"note\">Не изпращайте токена в чат или снимка. Ако не е запазен, той не може да бъде прочетен обратно от Cloudflare.</p><label for=\"mode\">Вариант</label><select id=\"mode\"><option value=\"expert\">Експертен проект</option><option value=\"classic\">Класически проект</option></select><label for=\"subject\">Предмет</label><input id=\"subject\" value=\"Синтетично инвестиционно предложение за малък склад\"><label for=\"parcel\">Тестов имот</label><input id=\"parcel\" value=\"99999.999.9999\"><label for=\"gis\">ГИС констатации</label><textarea id=\"gis\">НЯМА ДАННИ. Не е извършен реален пространствен анализ. Не е установено отношение към защитени зони.</textarea><button id=\"send\">Генерирай тестов проект</button><h2>Резултат</h2><pre id=\"out\" aria-live=\"polite\">Очаква заявка.</pre><p class=\"note\">Резултатът е чернова за експертна проверка, а не официално становище.</p></main><script>const $=id=>document.getElementById(id);$('send').addEventListener('click',async()=>{const token=$('token').value.trim();if(!token){$('out').textContent='Необходим е защитеният токен. Не го публикувайте.';return;}const btn=$('send');btn.disabled=true;$('out').textContent='Изпращане на тестовата заявка…';try{const res=await fetch('/author',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({mode:$('mode').value,facts:{subject:$('subject').value,parcelIds:[$('parcel').value],gisFindings:$('gis').value,legalReferences:'НЯМА ДАННИ — синтетичен тест',evidenceNotes:'Само синтетични данни. За експертна проверка.'}})});const data=await res.json();$('out').textContent=res.ok?data.draft:('HTTP '+res.status+': '+(data.error||'Грешка')+(data.providerStatus?' ('+data.providerStatus+')':''));}catch(e){$('out').textContent='Грешка при връзката: '+e.message;}finally{btn.disabled=false;}});</script></body></html>";
// TPU Plovdiv AI Author V27 — isolated test-only authoring gateway.
// Never send an OpenAI key to the browser. Authorization is fail-closed.
const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Access-Control-Allow-Origin":"null" };
const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers});
const MAX_BYTES = 16000;
const allowed = new Set(["classic","expert"]);
const text = (value,max=3000) => typeof value === "string" ? value.slice(0,max).trim() : "";
function validate(input) {
  if(!input || typeof input !== "object" || Array.isArray(input)) return null;
  if(!allowed.has(input.mode)) return null;
  if(!input.facts || typeof input.facts !== "object" || Array.isArray(input.facts)) return null;
  const f=input.facts;
  const parcelIds=Array.isArray(f.parcelIds)?f.parcelIds.filter(x=>typeof x==="string").slice(0,40).map(x=>x.slice(0,45)):[];
  if(!parcelIds.length || !text(f.subject,1000)) return null;
  return {mode:input.mode, facts:{
    subject:text(f.subject,1000), parcelIds, location:text(f.location,500),
    investor:text(f.investor,250), procedure:text(f.procedure,100),
    gisFindings:text(f.gisFindings,3000), legalReferences:text(f.legalReferences,3000),
    evidenceNotes:text(f.evidenceNotes,1500), registration:text(f.registration,150)
  }};
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(request.method==="GET" && url.pathname==="/test") return new Response(TEST_PAGE,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'","X-Frame-Options":"DENY"}});
  if(request.method==="GET" && (url.pathname==="/" || url.pathname==="/health")) {
   return reply({service:"TPU Plovdiv AI Author V27",status:"online",apiKeyConfigured:Boolean(env.OPENAI_API_KEY),aiGenerationEnabled:Boolean(env.OPENAI_API_KEY && env.AI_AUTHOR_ACCESS_TOKEN)});
  }
  if(url.pathname!=="/author") return reply({error:"Not found"},404);
  if(request.method!=="POST") return reply({error:"Method not allowed"},405);
  // No paid calls until a separate access token is configured and supplied.
  if(!env.OPENAI_API_KEY || !env.AI_AUTHOR_ACCESS_TOKEN) return reply({error:"Authoring not enabled: access control is not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if(auth!==`Bearer ${env.AI_AUTHOR_ACCESS_TOKEN}`) return reply({error:"Unauthorized"},401);
  const length=Number(request.headers.get("content-length")||0);
  if(length>MAX_BYTES) return reply({error:"Payload too large"},413);
  let raw;
  try { raw=await request.text(); } catch {return reply({error:"Cannot read request"},400)}
  if(raw.length>MAX_BYTES) return reply({error:"Payload too large"},413);
  let input;
  try {input=validate(JSON.parse(raw))} catch {}
  if(!input) return reply({error:"Invalid structured facts; expected mode, facts.subject and facts.parcelIds"},400);
  const system=`You are a Bulgarian environmental administrative drafting assistant. Generate only a DRAFT for expert verification. Use ONLY provided facts and legal references. Never invent cadastral, geographic, legal or registration details. Mark missing required data as НЯМА ДАННИ. Do not confuse защитени зони with защитени територии. Keep the GIS findings and references distinct. Return clear Bulgarian administrative prose, not HTML. ${input.mode==="classic"?"Use restrained canonical administrative style, preserving the supplied facts.":"Write a well-reasoned expert project with clear factual and legal reasoning, without claiming independent verification."}`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try {
   const upstream=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",signal:controller.signal,
    headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-4.1-mini",store:false,max_output_tokens:1800,
      input:[{role:"system",content:system},{role:"user",content:JSON.stringify(input.facts)}]})
   });
   if(!upstream.ok) return reply({error:"AI provider request failed",providerStatus:upstream.status},502);
   const data=await upstream.json();
   const output=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim();
   if(!output) return reply({error:"No text returned by AI provider"},502);
   return reply({mode:input.mode,draft:output,reviewRequired:true,source:"user-supplied structured test facts"});
  } catch {return reply({error:"AI request timed out or failed"},504)}
  finally {clearTimeout(timeout)}
 }
};
