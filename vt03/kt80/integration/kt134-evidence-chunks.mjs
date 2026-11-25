// KT134: enumerate EVERY readable document span, never silently truncate.
const str=x=>String(x??"");
export function buildEvidenceChunks(documents,maxChars=5000){
 if(!Array.isArray(documents))return {chunks:[],unreadable:[],totalDocuments:0};
 const chunks=[],unreadable=[];
 for(let i=0;i<documents.length;i++){
  const d=documents[i]||{},name=str(d.source||d.name||d.file||"").trim();
  const content=str(d.text).replace(/\r\n/g,"\n");
  const sourceId=name||"Документ "+(i+1);
  if(!content.trim()){unreadable.push({documentIndex:i,source:sourceId,reason:"NO_EXTRACTED_TEXT"});continue}
  if(d.truncated===true||(Number.isFinite(Number(d.totalChars))&&Number(d.totalChars)>content.length))
   unreadable.push({documentIndex:i,source:sourceId,reason:"EXTRACTED_TEXT_TRUNCATED",suppliedChars:content.length,totalChars:Number(d.totalChars)||null});
  if(/НЕПРОЧЕТЕН|ПРОВЕРКА:|OCR на приложението е отложен/iu.test(str(d.readStatus)))
   unreadable.push({documentIndex:i,source:sourceId,reason:"EXTRACTION_REQUIRES_REVIEW",status:str(d.readStatus).slice(0,300)});
  for(let start=0;start<content.length;){
   const hardEnd=Math.min(content.length,start+maxChars);
   let end=hardEnd;
   if(hardEnd<content.length){
    const minBreak=start+Math.floor(maxChars*0.65);
    const paragraph=content.lastIndexOf("\n",hardEnd-1);
    const sentence=content.lastIndexOf(". ",hardEnd-1);
    if(paragraph>=minBreak)end=paragraph+1;
    else if(sentence>=minBreak)end=sentence+2;
   }
   if(end<=start)end=hardEnd;
   chunks.push({documentIndex:i,source:sourceId,start,end,totalChars:content.length,
    text:content.slice(start,end),untrustedDocumentText:true});
   start=end;
  }
 }
 return {chunks,unreadable,totalDocuments:documents.length};
}
export function verifyEvidenceDigest(chunk,reply){
 const claims=[];
 for(const raw of Array.isArray(reply?.claims)?reply.claims.slice(0,12):[]){
  const quote=str(raw?.quote).trim(),summary=str(raw?.summary).trim();
  if(quote.length<12||quote.length>500||summary.length<12||summary.length>600)continue;
  const at=chunk.text.indexOf(quote);
  if(at<0)continue; // no paraphrase can masquerade as a quotation
  claims.push({source:chunk.source,documentIndex:chunk.documentIndex,
   start:chunk.start+at,end:chunk.start+at+quote.length,quote,summary,
   verifiedQuoteMatch:true,expertConfirmed:false});
 }
 return {chunk:{documentIndex:chunk.documentIndex,source:chunk.source,
  start:chunk.start,end:chunk.end,totalChars:chunk.totalChars},
  claims,examined:reply?.examined===true,notes:str(reply?.notes).slice(0,450)};
}
export function evidenceCoverage(expected,receipts){
 const byKey=x=>[x.documentIndex,x.start,x.end,x.totalChars].join(":");
 const ack=new Map((receipts||[]).filter(x=>x?.examined===true).map(x=>[byKey(x.chunk),x]));
 const unexamined=expected.chunks.filter(x=>!ack.has(byKey(x))).map(x=>({
  source:x.source,start:x.start,end:x.end,documentIndex:x.documentIndex}));
 return {complete:unexamined.length===0&&expected.unreadable.length===0,
  expectedChunks:expected.chunks.length,examinedChunks:expected.chunks.length-unexamined.length,
  unreadableDocuments:expected.unreadable,unexamined,
  claims:(receipts||[]).flatMap(x=>Array.isArray(x?.claims)?x.claims:[])};
}

/** Bound the ONE-request evidence digest without excluding all later documents.
 * Important: complete=false means further source retrieval may be needed. */
export function packAnchoredClaims(claims,byteLimit=26000){
 const input=Array.isArray(claims)?claims:[];
 const groups=new Map();
 for(const c of input){
  const key=String(c?.documentIndex??"")+":"+String(c?.source??"");
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(c);
 }
 const queues=[...groups.values()].map(items=>items.sort((a,b)=>Number(a?.start)-Number(b?.start)));
 const packed=[],encoder=new TextEncoder();
 let more=true;
 while(more){
  more=false;
  for(const queue of queues){
   if(!queue.length)continue;
   more=true;
   const candidate=queue.shift();
   if(encoder.encode(JSON.stringify([...packed,candidate])).length<=byteLimit)
    packed.push(candidate);
  }
 }
 return {claims:packed,selected:packed.length,total:input.length,complete:packed.length===input.length,
  omitted:input.length-packed.length};
}
