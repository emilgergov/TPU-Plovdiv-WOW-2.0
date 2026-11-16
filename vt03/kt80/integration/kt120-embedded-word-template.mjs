/* KT120: automatic institutional DOCX template, no user file selector. */
const crest="iVBORw0KGgoAAAANSUhEUgAAAFoAAAB3AQAAAACr4WpHAAABt0lEQVR42u3UP27UQBTH8Y+9K2ULCEmXipgbwAWIuUmOQEvnAnEWjuF0qUhOgFZU28VBCDmRN49iZ5wJIVIOwHRfzbzf+70/dhXmc1Yrzn94Fkwl/C7h6smYw+dJX3QF9D0iHcfRP445R5fhFm2ToEGfb6IZ72MOhkH3LkkPq707TpL06JbL7GCFXxledtztYGUaLaMVEdE5GlSz65FI0rz9mJNuaS86u5uREXoRMSTIAl9mePVDdd2xy3PlZOBwZ/Ta2myHYcXPVI+98SjlidGiR1sFoq4CO4FKoEoCA9p9y1x13S9UAdtl4a3+e3JV8hYBH1ITA76nZ99gk8bYg/bJPeh20MCZGtEcwHs1qs2qiPm0Vwq0XalWwnaFLsFU9vr8QVl3lzN0fJWaOO2GmjdEtczPJuo6w4gqb+IAp9ZqrOFgzrO/tDKo8Zojy3TzZo3amO00mBJUvep+2tyINO3jiDFvyHgS0/K+IT4X3+m2My9FFD24sTHfRLRYdDuYYJHKnspeb0pYl9DDXd5EInsbqKJPz1ZVGRMFLIkmwwJD/0D6n7+N5tTYziUMFnOMF4/3Nk8b/AFlA+EgbhjggwAAAABJRU5ErkJggg==";const eco="iVBORw0KGgoAAAANSUhEUgAAADAAAAAnCAIAAADGs1zzAAAB6UlEQVR42u2YPUscURiFn3EWDBiwE0ERVyyERSGFdVhsLEOQ/QH+goDmHwg2Era3srML2FiGBAIZdQmIIiiOWVgJUZLoEp1d3clJcXGy+TDMFjNzYXOYYnjvHe7Dec+dL0cSNqkHy/QfyGagK64uuLAFqEJliqkBBlZYadD4OaCMVFYZgcgpt6CFQIGpZwa0r/0hDRkmxJzmLnWZAdCxjmuqmXNP3qhGI6ZZzfry0wNqqbWkpbzy4xpf05opHuhgWtMR06Qm0wM613lBhSg3q1ptqSXJl19UMWJK1aFNbY5oxCzcq95lLYcKJZ3qtKRS2kBGW9oa05hZu1/9u9o19brq85rPAEjSkY5mNIMoqWR2llGgoKyyk8nTvkGjSnWY4T76fhvKJb12jdo66zfcODhR0cV1cUPCkLB9soOTeMvukhH3SNyhCSYGGbzmut2hfyiNDHl4deoWAXWkxFv2EfaIZ04KQG/hGRzaA/QGdqxq2RPYhg/gxr4k8VA3IeikZd23y/ZgEb7Fm5xPwaGn8NKq77JHHc5P3KFb8KEZI9eCh90Y6kif4T18uiclIbyGSmoONeExePb8bPgOVdtujO/gBZzdM/oAilDo6lD/qeDXx9wtfM0Q6BCet70I9MAXOMkQ6BVs/K3+AwvC9qI/jg7lAAAAAElFTkSuQmCC";
const unpack=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const t=s=>'<w:r><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="20"/></w:rPr><w:t>'+esc(s)+'</w:t></w:r>';
const p=(s,a='left',before=0)=>'<w:p><w:pPr><w:spacing w:before="'+before+'" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="'+a+'"/></w:pPr>'+t(s)+'</w:p>';
const ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const xml=s=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s;
const relationships='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
const charset='application/vnd.openxmlformats-officedocument.wordprocessingml.';
const body=()=>p('Ниво на конфиденциалност 0','right')+p('[TLP-WHITE]','right')+p('')+
 p('Електронен подпис: __________________________','left')+p('ДО')+
 p('Възложител: ХХХХХХХХХХХХХ')+p('Адрес: ХХХХХХХХХХХХХ')+
 p('')+p('{{SUBJECT}}')+p('')+p('{{DOCUMENT_TITLE}}','center')+
 p('{{BODY_ANCHOR}}')+p('С уважение,','left',360)+
 p('Електронен подпис: __________________________','left');
const doc=xml('<w:document '+ns+'><w:body>'+body()+
 '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/>'+
 '<w:footerReference w:type="default" r:id="rIdFooter"/>'+
 '<w:pgSz w:w="11906" w:h="16838"/>'+
 '<w:pgMar w:top="1850" w:right="1134" w:bottom="1350" w:left="1134" w:header="360" w:footer="400"/></w:sectPr></w:body></w:document>');
const pic=(id,name,cx,cy)=>
 '<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="1" name="'+name+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="'+name+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
const header=xml('<w:hdr '+ns+'><w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="9638"/></w:tblPr>'+
 '<w:tblGrid><w:gridCol w:w="850"/><w:gridCol w:w="8788"/></w:tblGrid><w:tr>'+
 '<w:tc><w:tcPr><w:tcW w:w="850" w:type="dxa"/></w:tcPr>'+'<w:p>'+pic('rIdCrest','Герб',480000,610000)+'</w:p>'+'</w:tc>'+
 '<w:tc><w:tcPr><w:tcW w:w="8788" w:type="dxa"/></w:tcPr>'+
 p('Р Е П У Б Л И К А  Б Ъ Л Г А Р И Я')+
 p('Министерство на околната среда и водите')+
 p('Регионална инспекция по околната среда и водите – Пловдив')+
 '</w:tc></w:tr></w:tbl></w:hdr>');
const footer=xml('<w:ftr '+ns+'><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6"/></w:pBdr></w:pPr></w:p>'+
 p('4000, гр. Пловдив, бул. „Марица“ № 122, тел./факс 032 628994','center')+
 p('Зелен телефон 032 643245; e-mail: riosv@plovdiv.riew.gov.bg; https://plovdiv.riew.gov.bg','center')+'</w:ftr>');
const parts={
 '[Content_Types].xml':xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="'+charset+'document.main+xml"/><Override PartName="/word/header1.xml" ContentType="'+charset+'header+xml"/><Override PartName="/word/footer1.xml" ContentType="'+charset+'footer+xml"/><Override PartName="/word/styles.xml" ContentType="'+charset+'styles+xml"/></Types>'),
 '_rels/.rels':xml(relationships+'<Relationship Id="rIdOffice" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
 'word/document.xml':doc,
 'word/_rels/document.xml.rels':xml(relationships+'<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
 'word/header1.xml':header,'word/footer1.xml':footer,
 'word/_rels/header1.xml.rels':xml(relationships+'<Relationship Id="rIdCrest" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/crest.png"/></Relationships>'),
 'word/_rels/footer1.xml.rels':xml(relationships+'<Relationship Id="rIdEco" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/eco.png"/></Relationships>'),
 'word/styles.xml':xml('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>')
};
export function makeAutomaticTemplate(){
 if(!window.fflate?.zipSync)throw Error('Библиотеката DOCX не е заредена.');
 const b={};for(const [k,v]of Object.entries(parts))b[k]=new TextEncoder().encode(v);
 b['word/media/crest.png']=unpack(crest);b['word/media/eco.png']=unpack(eco);
 return window.fflate.zipSync(b,{level:6});
}
