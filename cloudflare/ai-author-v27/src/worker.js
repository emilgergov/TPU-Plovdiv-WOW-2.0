// TPU Plovdiv AI Author V27 — isolated test-only authoring gateway.
// Never send an OpenAI key to the browser. Authorization is fail-closed.
const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Access-Control-Allow-Origin":"null" };
const ALLOWED_ORIGIN="https://emilgergov.github.io";
const reply = (body,status=200,origin="") => new Response(JSON.stringify(body),{status,headers:{...headers,...(origin===ALLOWED_ORIGIN?{"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Vary":"Origin"}:{})}});

const MAX_BYTES = 36000;
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
    evidenceNotes:text(f.evidenceNotes,1500), registration:text(f.registration,150),
    dossierExcerpts:Array.isArray(f.dossierExcerpts)?f.dossierExcerpts.slice(0,25).map(d=>({file:text(d.file,180),excerpt:text(d.excerpt,1400)})):[],
    dossierDocuments:Array.isArray(f.dossierDocuments)?f.dossierDocuments.slice(0,18).map(d=>({file:text(d.file,180),type:text(d.type,80),references:Array.isArray(d.references)?d.references.slice(0,5).map(x=>text(x,220)):[]})):[],
    legalSources:Array.isArray(f.legalSources)?f.legalSources.slice(0,12).map(d=>({title:text(d.title,180),source:text(d.source,200),id:text(d.id,80)})):[]
  }};
}
async function handleAuthor(request,env) {
  const url=new URL(request.url);
  if(url.pathname!=="/author") return reply({error:"Not found"},404);
  if(request.method!=="POST") return reply({error:"Method not allowed"},405);
  // No paid calls until a separate access token is configured and supplied.
  const accessTokens=[env.AI_AUTHOR_PASSWORD_V27,env.AI_AUTHOR_ACCESS_TOKEN].filter(v=>typeof v==="string" && v.length>0);
  if(!env.OPENAI_API_KEY || !accessTokens.length) return reply({error:"Authoring not enabled: access control is not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if(!accessTokens.some(token=>auth===`Bearer ${token}`)) return reply({error:"Unauthorized"},401);
  const length=Number(request.headers.get("content-length")||0);
  if(length>MAX_BYTES) return reply({error:"Payload too large"},413);
  let raw;
  try { raw=await request.text(); } catch {return reply({error:"Cannot read request"},400)}
  if(raw.length>MAX_BYTES) return reply({error:"Payload too large"},413);
  let input;
  try {input=validate(JSON.parse(raw))} catch {}
  if(!input) return reply({error:"Invalid structured facts; expected mode, facts.subject and facts.parcelIds"},400);
  const system=`You are a Bulgarian environmental administrative drafting assistant. Generate only a DRAFT for expert verification. Use ONLY provided facts, readable dossier excerpts, source inventory, GIS findings and legal references. A document title or URL alone does not prove the content of a legal provision. Distinguish verified GIS findings from unverified excerpts. Write case-specific substantive text in the four sections; never duplicate sections or add commentary about the AI. CHARACTERIZATION must synthesize actual dossier facts on construction, utilities, water and wastewater when supported, not generic boilerplate. LEGAL must distinguish named legal sources from verified article-level legal provisions; do not claim an article applies unless its text is provided. PROCEDURE must explain the evidence and missing conditions for procedural classification, not guess. IMPACTS must address the actual proposal and the verified GIS relationship, and distinguish potential effects from an assessed conclusion. Avoid generic claims that no normative references were supplied when legalSources is nonempty. Do not invent the name of a nearest zone. Never invent cadastral, geographic, legal or registration details. Mark missing required data as НЯМА ДАННИ. Do not confuse защитени зони with защитени територии. Keep the GIS findings and references distinct. Return clear Bulgarian administrative prose, not HTML. In expert mode, format your answer in exactly four sections using these standalone labels in this order: [[CHARACTERIZATION]], [[LEGAL]], [[PROCEDURE]], [[IMPACTS]]. Each section contains only proposed wording for that part of the expert document. Do not add an introduction or conclusion. Never invent citations, cadastral data or findings; mark unsupported information as НЯМА ДАННИ. ${input.mode==="classic"?"Use restrained canonical administrative style, preserving the supplied facts.":"Write a well-reasoned expert project with clear factual and legal reasoning, without claiming independent verification."}`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try {
   const upstream=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",signal:controller.signal,
    headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-4.1-mini",store:false,max_output_tokens:3000,
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

export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  const origin=request.headers.get("Origin")||"";
  if(request.method==="OPTIONS" && url.pathname==="/author") {
   if(origin!==ALLOWED_ORIGIN) return new Response(null,{status:403});
   return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Methods":"POST","Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Max-Age":"600","Vary":"Origin"}});
  }
  if(origin===ALLOWED_ORIGIN && url.pathname==="/author" && request.method==="POST") {
   // Return the same authenticated response with exact-origin CORS, never wildcard.
   const response=await handleAuthor(request,env);
   const h=new Headers(response.headers);h.set("Access-Control-Allow-Origin",ALLOWED_ORIGIN);h.set("Vary","Origin");
   return new Response(response.body,{status:response.status,headers:h});
  }

  if(request.method==="GET" && (url.pathname==="/" || url.pathname==="/health")) {
   return reply({service:"TPU Plovdiv AI Author V27",status:"online",apiKeyConfigured:Boolean(env.OPENAI_API_KEY),aiGenerationEnabled:Boolean(env.OPENAI_API_KEY && (env.AI_AUTHOR_PASSWORD_V27 || env.AI_AUTHOR_ACCESS_TOKEN))});
  }
  return handleAuthor(request,env);
 }
};
