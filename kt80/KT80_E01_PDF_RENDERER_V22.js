/* KT80 V22 isolated, style-matched offline PDF renderer: canvas rasterized pages with native browser fonts, no CDN.
   Keeps Bulgarian glyphs and the parcel map; intended for Chrome 109. */
(()=>{'use strict';
const W=1240,H=1754,M=88,LINE=29;
const enc=new TextEncoder();
function bytes(s){return enc.encode(s)}
function base64Bytes(data){const raw=atob(data.split(',')[1]),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a}
function pdf(images){
 const objects=[],push=s=>{objects.push(s);return objects.length};
 const catalog=push(''),pages=push('');
 const pageIds=[];
 for(const img of images){
  const stream=base64Bytes(img);
  const im=push({head:'<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+stream.length+' >>',stream});
  const commands=bytes('q 595 0 0 842 0 0 cm /Im1 Do Q');
  const contents=push({head:'<< /Length '+commands.length+' >>',stream:commands});
  const page=push('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 '+im+' 0 R >> >> /Contents '+contents+' 0 R >>');
  pageIds.push(page);
 }
 objects[catalog-1]='<< /Type /Catalog /Pages '+pages+' 0 R >>';
 objects[pages-1]='<< /Type /Pages /Kids ['+pageIds.map(i=>i+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 const parts=[],offsets=[0];let pos=0;
 function add(a){parts.push(a);pos+=a.length}
 add(bytes('%PDF-1.4\n'));
 for(let i=0;i<objects.length;i++){
  offsets.push(pos);add(bytes((i+1)+' 0 obj\n'));
  const obj=objects[i];
  if(typeof obj==='string')add(bytes(obj+'\n'));
  else{add(bytes(obj.head+'\nstream\n'));add(obj.stream);add(bytes('\nendstream\n'))}
  add(bytes('endobj\n'));
 }
 const xref=pos;add(bytes('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'));
 for(let i=1;i<offsets.length;i++)add(bytes(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
 add(bytes('trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF'));
 return new Blob(parts,{type:'application/pdf'});
}
function wrap(ctx,text,maxWidth){
 const out=[];for(const paragraph of String(text).split('\n')){
  let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){out.push(line);line=word}else line=next}out.push(line);
 }return out;
}
function drawSVG(ctx,svg,x,y,w,maxHeight){
 return new Promise((resolve,reject)=>{
  const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),im=new Image();
  im.onload=()=>{try{const naturalW=im.naturalWidth||700,naturalH=im.naturalHeight||410;const factor=maxHeight?Math.min(1,maxHeight/(w*naturalH/naturalW)):1;const drawW=w*factor,h=drawW*naturalH/naturalW;ctx.drawImage(im,x+(w-drawW)/2,y,drawW,h);resolve(h)}catch(e){reject(Error('Неуспешно изчертаване на имотната геометрия: '+e.message))}finally{URL.revokeObjectURL(url)}};
  im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('SVG геометрията не може да бъде заредена като изображение.'))};
  im.src=url;
 });
}
async function generate(def){
 const pages=[];let canvas,ctx,y;
 const normativePdf=String((def.content||[])[0]?.text||'').includes('Нормативни и документални референции');
 const runningHeader=normativePdf?'РИОСВ – Пловдив · Нормативни референции':'РИОСВ – Пловдив · ГИС анализ';
 const runningFooter=normativePdf?'РИОСВ – Пловдив · Нормативни референции':'РИОСВ – Пловдив · Пространствен анализ · Източниците и ограниченията са посочени в документа';
 function start(){canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#183b2d';ctx.font='bold 24px Arial';ctx.fillText(runningHeader,M,48);ctx.strokeStyle='#d9b361';ctx.beginPath();ctx.moveTo(M,65);ctx.lineTo(W-M,65);ctx.stroke();y=95}
 function finish(){ctx.font='18px Arial';ctx.fillStyle='#667';ctx.fillText(runningFooter,M,H-45);pages.push(canvas.toDataURL('image/jpeg',0.90))}
 start();
 for(const item of def.content||[]){
  // Respect explicit per-parcel page boundaries in the shared PDF generator.
  if(item.pageBreak==='before'&&y>95){finish();start()}
  if(item.table){
   const rows=item.table.body||[],cols=rows[0]?.length||1,available=W-2*M,cellW=available/cols;
   const drawRow=(cells,header)=>{ctx.font=(header?'bold 17px':'17px')+' Arial';const lines=cells.map(v=>wrap(ctx,String(v??''),cellW-14));const rh=Math.max(37,...lines.map(x=>x.length*24+14));if(y+rh>H-100){finish();start();if(!header&&rows.length){drawRow(rows[0],true)}}ctx.fillStyle=header?'#e3efe8':'#ffffff';ctx.fillRect(M,y,available,rh);ctx.strokeStyle='#b6c9bf';ctx.strokeRect(M,y,available,rh);ctx.fillStyle='#153e2e';for(let c=0;c<cols;c++){if(c)ctx.beginPath(),ctx.moveTo(M+c*cellW,y),ctx.lineTo(M+c*cellW,y+rh),ctx.stroke();(lines[c]||[]).forEach((line,k)=>ctx.fillText(line,M+c*cellW+7,y+23+k*24))}y+=rh};
   rows.forEach((cells,i)=>drawRow(cells,i===0));y+=12;continue;
  }
  if(item.parcelGrid){
   // Compact GIS-only multi-parcel panels. Two columns; page breaks only when a whole row does not fit.
   const cards=item.parcelGrid, gap=18, cardW=(W-2*M-gap)/2,cardH=298;
   for(let i=0;i<cards.length;i+=2){
    if(y+cardH>H-105){finish();start()}
    const top=y;
    for(let j=0;j<2&&i+j<cards.length;j++){
     const card=cards[i+j],x=M+j*(cardW+gap);
     ctx.fillStyle='#f2f8f3';ctx.fillRect(x,top,cardW,cardH-7);
     ctx.strokeStyle='#bfd3c5';ctx.strokeRect(x,top,cardW,cardH-7);
     ctx.font='bold 19px Arial';ctx.fillStyle='#173d30';ctx.fillText('ПИ '+String(card.id||''),x+12,top+28,cardW-24);
     await drawSVG(ctx,card.svg,x+11,top+39,cardW-22,185);
     ctx.font='16px Arial';ctx.fillStyle='#173d30';let rowY=top+247;
     for(const line of wrap(ctx,String(card.caption||''),cardW-25).slice(0,2)){
      ctx.fillText(line,x+12,rowY);rowY+=21;
     }
    }
    y=top+cardH+9;
   }
   continue;
  }
  if(item.columns){
   const cards=item.columns.filter(c=>c&&Array.isArray(c.stack));
   const cardHeight=360;
   if(y+cardHeight>H-110){finish();start()}
   const top=y, gap=20, cardWidth=(W-2*M-gap)/2;
   for(let i=0;i<cards.length&&i<2;i++){
    const card=cards[i],x=M+i*(cardWidth+gap);
    ctx.fillStyle='#f1f7f3';ctx.fillRect(x,top,cardWidth,cardHeight-8);
    ctx.strokeStyle='#bfd5c8';ctx.strokeRect(x,top,cardWidth,cardHeight-8);
    let cy=top+32;
    for(const part of card.stack){
     if(part.svg){const imageWidth=cardWidth-24;const h=await drawSVG(ctx,part.svg,x+12,cy,imageWidth);cy+=h+10}
     else if(part.text){ctx.font=part.bold?'bold 19px Arial':'16px Arial';ctx.fillStyle='#173d30';for(const line of wrap(ctx,part.text,cardWidth-24)){ctx.fillText(line,x+12,cy);cy+=23}}
    }
   }
   y=top+cardHeight+12;continue;
  }
  if(item.svg){const maxHeight=Number(item.maxHeight)||680;if(y+maxHeight>H-105){finish();start()}const drawn=await drawSVG(ctx,item.svg,M,y,W-2*M,maxHeight);y+=drawn+20;continue}
  const title=item.style==='heading',sub=item.style==='sub';
  ctx.font=(title?'bold 35px':sub?'bold 26px':item.bold?'bold 22px':'22px')+' Arial';
  ctx.fillStyle='#173d30';
  const lines=wrap(ctx,item.text||'',W-2*M-36);
  for(const line of lines){if(y+LINE>H-95){finish();start()}ctx.fillText(line,M,y+LINE,W-2*M-36);y+=title?42:sub?36:LINE}
  y+=title?26:sub?17:12;
 }
 finish();return pdf(pages);
}
window.KT80V22PDF=Object.freeze({generate});
})();