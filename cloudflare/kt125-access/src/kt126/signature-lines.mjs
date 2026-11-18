// Common unsigned Office signature lines; never creates a cryptographic signature.
export const signatureImage='iVBORw0KGgoAAAANSUhEUgAAAggAAABACAIAAADwChgcAAAA9ElEQVR4nO3ZoQHAMBDEsKb77/xFBWZhCZAmOGZwa2YeAPi9pwcAcBdhACCEAYAQBgBCGAAIYQAghAGAEAYAQhgACGEAIIQBgBAGAEIYAAhhACCEAYAQBgBCGAAIYQAghAGAEAYAQhgACGEAIIQBgBAGAEIYAAhhACCEAYAQBgBCGAAIYQAghAGAEAYAQhgACGEAIIQBgBAGAEIYAAhhACCEAYAQBgBCGAAIYQAghAGAEAYAQhgACGEAIIQBgBAGAEIYAAhhACCEAYAQBgBCGAAIYQAghAGAEAYAQhgACGEAIIQBgBAGAAAAADatmTm9AYCL+BgACGEAIIQBgBAGAEIYAAhhACCEAYAQBgBCGAAIYQAghAGAEAYA4gO/sgZ18KsQ+AAAAABJRU5ErkJggg==';
export function signatureParagraph(slot){
 const id='{'+crypto.randomUUID().toUpperCase()+'}';
 return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Електронен подпис: </w:t></w:r><w:r><w:pict xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/><v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/><v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/><v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype><v:shape id="EGSignature'+slot+'" type="#_x0000_t75" style="width:130pt;height:16pt" o:spid="_x0000_s'+(1100+slot)+'"><v:imagedata r:id="rIdEGSignature" o:title="Електронен подпис"/><o:signatureline v:ext="edit" id="'+id+'" provid="{00000000-0000-0000-0000-000000000000}" issignatureline="t" showsigndate="t" allowcomments="t"/></v:shape></w:pict></w:r></w:p>';
}
export function overlaySignatureTemplate(source){
 const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Signature template anchor mismatch');source=source.replace(a,b)};
 replace("const body=()=>", "const signatureParagraph="+signatureParagraph.toString()+";\nconst body=()=>");
 const line="p('Електронен подпис: __________________________','left')";
 if(source.split(line).length!==3)throw Error('Expected two signature placeholders');
 source=source.replace(line,'signatureParagraph(1)').replace(line,'signatureParagraph(2)');
 replace('Target="styles.xml"/>','Target="styles.xml"/><Relationship Id="rIdEGSignature" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature-line.png"/>');
 replace("b['word/media/crest.png']=unpack(crest);","b['word/media/signature-line.png']=unpack("+JSON.stringify(signatureImage)+");b['word/media/crest.png']=unpack(crest);");
 return source;
}
