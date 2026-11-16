/* KT120: automatic institutional DOCX template, no user file selector. */
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
const header=xml('<w:hdr '+ns+'><w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="9638"/></w:tblPr>'+
 '<w:tblGrid><w:gridCol w:w="850"/><w:gridCol w:w="8788"/></w:tblGrid><w:tr>'+
 '<w:tc><w:tcPr><w:tcW w:w="850" w:type="dxa"/></w:tcPr>'+p('♜')+'</w:tc>'+
 '<w:tc><w:tcPr><w:tcW w:w="8788" w:type="dxa"/></w:tcPr>'+
 p('Р Е П У Б Л И К А  Б Ъ Л Г А Р И Я')+
 p('Министерство на околната среда и водите')+
 p('Регионална инспекция по околната среда и водите – Пловдив')+
 '</w:tc></w:tr></w:tbl></w:hdr>');
const footer=xml('<w:ftr '+ns+'><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6"/></w:pBdr></w:pPr></w:p>'+
 p('4000, гр. Пловдив, бул. „Марица“ № 122, тел./факс 032 628994','center')+
 p('Зелен телефон 032 643245; e-mail: riosv@plovdiv.riew.gov.bg; https://plovdiv.riew.gov.bg','center')+'</w:ftr>');
const parts={
 '[Content_Types].xml':xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="'+charset+'document.main+xml"/><Override PartName="/word/header1.xml" ContentType="'+charset+'header+xml"/><Override PartName="/word/footer1.xml" ContentType="'+charset+'footer+xml"/><Override PartName="/word/styles.xml" ContentType="'+charset+'styles+xml"/></Types>'),
 '_rels/.rels':xml(relationships+'<Relationship Id="rIdOffice" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
 'word/document.xml':doc,
 'word/_rels/document.xml.rels':xml(relationships+'<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
 'word/header1.xml':header,'word/footer1.xml':footer,
 'word/styles.xml':xml('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>')
};
export function makeAutomaticTemplate(){
 if(!window.fflate?.zipSync)throw Error('Библиотеката DOCX не е заредена.');
 const b={};for(const [k,v]of Object.entries(parts))b[k]=new TextEncoder().encode(v);
 return window.fflate.zipSync(b,{level:6});
}
