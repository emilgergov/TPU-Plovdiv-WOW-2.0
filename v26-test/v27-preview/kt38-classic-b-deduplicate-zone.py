"""KT38-B: remove repetition from the second (legal-status) zone paragraph only.

The first spatial paragraph remains an exact copy of KT37-B and remains based
on a synthetic PDF1 scenario solely for review. Do not publish as GIS evidence.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

SRC=Path("out/01B_Obrazec_B_KLASICHESKI_KT37_SIMULACIA.docx")
OUT=Path("out/01B_Obrazec_B_KLASICHESKI_KT38_SIMULACIA.docx")
assert SRC.is_file(), "Build KT37-B first"
d=Document(SRC)
before=[p.text for p in d.paragraphs]
assert len(before)==43
assert "Отпадъчните води" in before[21]
assert before[22]=="Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота."
assert "попада частично" in before[23]
assert before[24].startswith("Поземленият имот с идентификатор 56784.13.102")
assert "BG0000578 „Река Марица“" in before[24]

p=d.paragraphs[24]
for run in p.runs:
    if run.text: run.text=""
segments=[
    ("Защитена зона ",False),
    ("BG0000578 „Река Марица“",True),
    (" за опазване на природните местообитания и на дивата флора и фауна е обявена със Заповед № РД-728/19.08.2024 г. на министъра на околната среда и водите (ДВ, бр. 74/30.08.2024 г.).",False)
]
for content,bold in segments:
    r=p.add_run(content)
    r.bold=bold
    r.italic=False
    r.font.name="Verdana"
    r.font.size=Pt(10)

after=[x.text for x in d.paragraphs]
assert after[:24]==before[:24],"Spatial GIS paragraph, land-use or earlier text was modified"
assert after[25:]==before[25:],"Other approved paragraphs were modified"
assert after[24]=="".join(x for x,_ in segments)
assert after[24].count("56784.")==0,"Duplicate parcels remain"
assert "попада частично" in after[23],"PDF1-based spatial finding was removed"
assert "".join(r.text for r in p.runs if r.bold)=="BG0000578 „Река Марица“"
assert p.alignment==WD_ALIGN_PARAGRAPH.JUSTIFY
assert p.paragraph_format.line_spacing==1.0
assert after[33]==before[33],"Competent authority conclusion changed"
assert after[28:33]==before[28:33],"Five impact criteria changed"
assert after[26]==before[26],"ZOOS section changed"
for x in d.paragraphs:
    if "Ниво на конфиденциалност" in x.text or "TLP-WHITE" in x.text:
        assert x.alignment==WD_ALIGN_PARAGRAPH.RIGHT
OUT.parent.mkdir(exist_ok=True)
d.save(OUT)
fresh=Document(OUT)
assert [q.text for q in fresh.paragraphs]==after
assert fresh.paragraphs[24].alignment==WD_ALIGN_PARAGRAPH.JUSTIFY
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as a,ZipFile(OUT) as b:
    aa={name:a.read(name) for name in a.namelist() if name.startswith("word/media/")}
    bb={name:b.read(name) for name in b.namelist() if name.startswith("word/media/")}
    assert aa==bb,"Institutional logo/media changed"
    for name in a.namelist():
        if name.startswith(("word/header","word/footer")) and name.endswith(".xml"):
            orig=etree.fromstring(a.read(name))
            new=etree.fromstring(b.read(name))
            assert orig.xpath(".//w:t/text()",namespaces=ns)==new.xpath(".//w:t/text()",namespaces=ns),"Header/footer changed"
            assert orig.xpath(".//w:instrText/text()",namespaces=ns)==new.xpath(".//w:instrText/text()",namespaces=ns),"Page number fields changed"
print("KT38-B PASS: zone legal-status paragraph shortened without repeating parcel or GIS result.")
print("Paragraph 23 PDF1 spatial finding unchanged; paragraph 24 normative reference only.")
print("All other 42 paragraphs, including legal conclusion, and media unchanged.")
print("OUT:",OUT,"BYTES:",OUT.stat().st_size)
