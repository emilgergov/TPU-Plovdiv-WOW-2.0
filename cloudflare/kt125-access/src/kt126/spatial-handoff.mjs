// Asserted overlays over the immutable R6 source; no GIS calculations or legal decisions.
const once=(source,anchor,replacement)=>{if(source.split(anchor).length!==2)throw Error('KT130 spatial source contract mismatch');return source.replace(anchor,replacement)};
export function overlaySpatialHandoff(rel,source){
 if(rel.endsWith('/kt83-p2-automatic-pdf1.js')){
  source=once(source,'let serial=0,issued=null;','let serial=0,issued=null,issuedSource=null;');
  source=once(source,'if(issued===check.key)return;','if(issued===check.key&&issuedSource===x.live)return;');
  source=once(source,'issued=check.key;','issued=check.key;issuedSource=x.live;');
  source=once(source,'if(ticket!==serial||issued!==check.key)return;','if(ticket!==serial||issued!==check.key||issuedSource!==x.live)return;');
  source=once(source,'issued=root.KT83P2SpatialGate.check(x).key;','issued=root.KT83P2SpatialGate.check(x).key;issuedSource=x.live;');
  source=once(source,'const reset=()=>{serial++;issued=null};','const reset=()=>{serial++;issued=null;issuedSource=null};');
 }
 if(rel.endsWith('/kt95-stage-evidence-handoff.mjs')){
  source=once(source,"if((spatial==='INSIDE'||spatial==='OUTSIDE')&&pdf){","if(['INSIDE','INTERSECTS','MIXED','OUTSIDE'].includes(spatial)&&e.valid===true&&e.intersections===true){");
  source=once(source,"spatial==='INSIDE'?'true':'false'","spatial==='OUTSIDE'?'false':'true'");
 }
 if(rel.endsWith('/kt96-eg-ai-stage4-author.mjs')){
  source=once(source,"const geographicResult=spatialClass==='OUTSIDE'&&pdfReady?","const spatialReady=spatial.valid===true&&spatial.intersections===true;\n  const geographicResult=spatialClass==='OUTSIDE'&&spatialReady?");
  source=once(source,"spatialClass==='INSIDE'&&pdfReady?","['INSIDE','INTERSECTS','MIXED'].includes(spatialClass)&&spatialReady?");
 }
 return source;
}
