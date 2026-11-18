// KT130 release review: presentation and map view only, never changes spatial evidence.
export function coordinateBounds(geometry){
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 function visit(a){if(!Array.isArray(a))return;if(typeof a[0]==='number'&&typeof a[1]==='number'){if(Number.isFinite(a[0])&&Number.isFinite(a[1])){minX=Math.min(minX,a[0]);maxX=Math.max(maxX,a[0]);minY=Math.min(minY,a[1]);maxY=Math.max(maxY,a[1]);}return;}for(const v of a)visit(v);}
 visit(geometry?.coordinates);return minX===Infinity?null:{minX,maxX,minY,maxY};
}
export function subjectQuotation(line){
 if(!line.startsWith('Относно:'))return line;
 const open=line.indexOf('„'),close=line.indexOf('“',open+1);
 if(open<0||close<=open)return line;
 const quoted=line.slice(open+1,close);
 const boundary=/(?:,?\s+находящ[а-я]*\s|,?\s+разположен[а-я]*\s|\s+в(?:ъв)?\s+(?:УПИ|ПИ|поземлен(?:ия)?\s+имот)(?=\s|[.,]|$))/iu.exec(quoted);
 if(!boundary||boundary.index<5)return line;
 return line.slice(0,open)+'„'+quoted.slice(0,boundary.index).trimEnd()+'“'+quoted.slice(boundary.index)+line.slice(close+1);
}
export function overlayReleasePolish(rel,source){
 const once=(a,b)=>{if(source.split(a).length!==2)throw Error('KT130 final review source contract mismatch: '+rel);source=source.replace(a,b);};
 if(['/KT82_A_FREE_GIS_V603.js','/KT80_E01_FREE_GIS_MAP_V22.js'].some(p=>rel.endsWith(p))){
  if(source.includes('const boundsCache=new WeakMap();'))throw Error('Map overlay already applied');
  const start=source.indexOf('function bbox(features){'),end=source.indexOf('\nfunction intersect(',start);
  if(start<0||end<start)throw Error('Map bounds contract');
  source=source.slice(0,start)+'const geometryBounds='+coordinateBounds.toString()+';\nconst boundsCache=new WeakMap();\nfunction bbox(features){let result=null;for(const f of features){const g=f?.geometry;if(!g)continue;let b=boundsCache.get(g);if(b===undefined){b=geometryBounds(g);boundsCache.set(g,b);}if(!b)continue;if(!result)result={...b};else{result.minX=Math.min(result.minX,b.minX);result.maxX=Math.max(result.maxX,b.maxX);result.minY=Math.min(result.minY,b.minY);result.maxY=Math.max(result.maxY,b.maxY);}}return result;}'+source.slice(end);
 }
 if(rel.endsWith('/KT82_A_PDF1_V600.js')){
  once("date=new Date().toLocaleDateString('bg-BG')","date=new Date().toLocaleDateString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\\s*г\\.?$/u,'').trim()");
  once("root.KT80Display.ekatte(id,p)","(root.KT80Display.ekatte(id,p)!=='НЯМА ДАННИ'?root.KT80Display.ekatte(id,p):(/^\\d{5}\\.\\d+\\.\\d+$/.test(id)?id.slice(0,5):'НЯМА ДАННИ'))");
 }
 if(rel.endsWith('/KT80_E01_PDF_RENDERER_V22.js')){
  once("for(const item of def.content||[]){","for(const [itemIndex,item] of (def.content||[]).entries()){");
  once("const title=item.style==='heading',sub=item.style==='sub';","const title=item.style==='heading',sub=item.style==='sub';\n  if(sub&&def.content?.[itemIndex+1]?.table&&y+180>H-100){finish();start()}");
  once("const rows=item.table.body||[],cols=rows[0]?.length||1,available=W-2*M,cellW=available/cols;","const rows=item.table.body||[],cols=rows[0]?.length||1,available=W-2*M,cellW=available/cols;\n   // Keep a table header with its first data row.\n   ctx.font='bold 17px Arial';const headH=Math.max(37,...(rows[0]||[]).map(v=>wrap(ctx,String(v??''),cellW-14).length*24+14));\n   ctx.font='17px Arial';const firstH=Math.max(37,...(rows[1]||[]).map(v=>wrap(ctx,String(v??''),cellW-14).length*24+14));\n   if(y+headH+firstH>H-100){finish();start()}");
  once("const cards=item.parcelGrid, gap=18, cardW=(W-2*M-gap)/2,cardH=298;","const cards=item.parcelGrid, gap=18, columns=cards.length===1?1:2,cardW=(W-2*M-gap*(columns-1))/columns,cardH=cards.length===1?410:298;");
  once("for(let i=0;i<cards.length;i+=2)","for(let i=0;i<cards.length;i+=columns)");
  once("for(let j=0;j<2&&i+j<cards.length;j++)","for(let j=0;j<columns&&i+j<cards.length;j++)");
  once("cardW-22,185","cardW-22,cardH-113");
  once("let rowY=top+247","let rowY=top+cardH-51");
 }
 if(rel.endsWith('/kt119-docx-generator.mjs')){
  once(" const quotedSubject=(line)=>{"," const quotationPresentation="+subjectQuotation.toString()+";\n const quotedSubject=(line)=>{\n   const revised=quotationPresentation(line);if(revised!==line)return revised;");
  once("/„[^“\\n]{2,180}“/gu","/„[^“\\n]{2,1000}“/gu");
  once("if(titleAt>0)addText(p,rest.slice(0,titleAt),false,true);","if(titleAt>0)addText(p,rest.slice(0,titleAt),/^\\s*ИП\\s*$/u.test(rest.slice(0,titleAt)),true);");
 }
 return source;
}
