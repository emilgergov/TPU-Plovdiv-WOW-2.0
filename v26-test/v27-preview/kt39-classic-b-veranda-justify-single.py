"""KT39-B: match KT35-A's uniform body typography, justification and line spacing.

Changes are formatting-only: Verdana 10 pt, Justify, 1.0 for all substantive
Word body text paragraphs, with an intentional exception for the two
confidentiality labels (right-aligned as approved in KT37). Institutional
header/footer and logo placement are intentionally preserved. A & Expert
Word and the published browser generator remain unchanged.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

SOURCE=Path("out/01B_Obrazec_B_KLASICHESKI_KT38_SIMULACIA.docx")
DEST=Path("out/01B_Obrazec_B_KLASICHESKI_KT39_SIMULACIA.docx")
assert SOURCE.is_file(),"Generate KT38 before KT39"
d=Document(SOURCE)
original=[p.text for p in d.paragraphs]
assert len(original)==43
assert original[21].startswith("Отпадъчните води")
assert original[22]=="Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота."
assert "попада частично" in original[23]
assert original[24].startswith("Защитена зона BG0000578")
assert original[33].find("не е необходимо провеждане на процедура")!=-1

count=0
count_runs=0
conf_count=0
for element in d._element.body.xpath(".//w:p"):
    p=Paragraph(element,d._body)
    if not p.text.strip():
        continue
    is_conf=("Ниво на конфиденциалност" in p.text or "TLP-WHITE" in p.text)
    if is_conf:
        # Explicit user approval at KT37, do not override.
        p.alignment=WD_ALIGN_PARAGRAPH.RIGHT
        conf_count+=1
    else:
        p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing=1.0
    count+=1
    for r in p.runs:
        if not r.text:
            continue
        # Preserve run order, italic/bold, links, highlighted semantics.
        r.font.name="Verdana"
        r.font.size=Pt(10)
        rpr=r._r.get_or_add_rPr()
        fonts=rpr.rFonts
        if fonts is not None:
            fonts.set(qn("w:ascii"),"Verdana")
            fonts.set(qn("w:hAnsi"),"Verdana")
            fonts.set(qn("w:eastAsia"),"Verdana")
            fonts.set(qn("w:cs"),"Verdana")
        count_runs+=1

assert count>=26,("Too few nonempty paragraphs",count)
assert count_runs>=26,("Too few populated runs",count_runs)
assert conf_count==2,("Confidentiality labels missing or duplicated",conf_count)
assert [p.text for p in d.paragraphs]==original,"Wording changed"
for element in d._element.body.xpath(".//w:p"):
    p=Paragraph(element,d._body)
    if not p.text.strip():
        continue
    is_conf=("Ниво на конфиденциалност" in p.text or "TLP-WHITE" in p.text)
    assert p.alignment==(WD_ALIGN_PARAGRAPH.RIGHT if is_conf else WD_ALIGN_PARAGRAPH.JUSTIFY),p.text
    assert p.paragraph_format.line_spacing==1.0,p.text
    for r in p.runs:
        if r.text:
            assert r.font.name=="Verdana",(p.text,r.text,r.font.name)
            assert r.font.size==Pt(10),(p.text,r.text,r.font.size)

assert original[33]==d.paragraphs[33].text
assert original[28:33]==[p.text for p in d.paragraphs][28:33]
assert "попада частично" in "".join(r.text for r in d.paragraphs[23].runs if r.bold)
assert "BG0000578 „Река Марица“"=="".join(r.text for r in d.paragraphs[24].runs if r.bold)
DEST.parent.mkdir(exist_ok=True)
d.save(DEST)
confirm=Document(DEST)
assert [p.text for p in confirm.paragraphs]==original
for element in confirm._element.body.xpath(".//w:p"):
    p=Paragraph(element,confirm._body)
    if p.text.strip():
        is_conf=("Ниво на конфиденциалност" in p.text or "TLP-WHITE" in p.text)
        assert p.alignment==(WD_ALIGN_PARAGRAPH.RIGHT if is_conf else WD_ALIGN_PARAGRAPH.JUSTIFY)
        assert p.paragraph_format.line_spacing==1.0
        for r in p.runs:
            if r.text:
                assert r.font.name=="Verdana" and r.font.size==Pt(10)
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SOURCE) as src, ZipFile(DEST) as dst:
    media_a={n:src.read(n) for n in src.namelist() if n.startswith("word/media/")}
    media_b={n:dst.read(n) for n in dst.namelist() if n.startswith("word/media/")}
    assert media_a==media_b,"Institutional logo/media changed"
    for n in src.namelist():
        if n.startswith(("word/header","word/footer")) and n.endswith(".xml"):
            a=etree.fromstring(src.read(n))
            b=etree.fromstring(dst.read(n))
            for xpath in (".//w:t/text()",".//w:instrText/text()",".//w:fldChar/@w:fldCharType"):
                assert a.xpath(xpath,namespaces=ns)==b.xpath(xpath,namespaces=ns),(n,xpath)
    for n in dst.namelist():
        if n.startswith("word/") and n.endswith(".xml"):
            x=etree.fromstring(dst.read(n))
            assert not x.xpath(".//w:highlight",namespaces=ns),("Unexpected highlight",n)
print("KT39-B PASS — Verdana 10 pt, Justify, line spacing 1.0")
print("Body paragraphs:",count,"text runs:",count_runs,
      "right-aligned approved confidentiality labels:",conf_count)
print("No text edits: all 43 paragraphs identical to KT38; same administrative conclusion")
print("Institutional logo, header, footer, page-number fields untouched")
print("OUT",DEST,DEST.stat().st_size)
