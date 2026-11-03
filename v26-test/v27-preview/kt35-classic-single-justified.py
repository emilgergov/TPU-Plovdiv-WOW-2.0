"""KT35 — final approved Classic Word formatting: Justify + line spacing 1.0.

Apply to every substantive text paragraph of the letter (including those in
tables and text boxes). Text in institutional header/footer gets single line
spacing, but retains its original institutional alignment and page-number
position. Preserve all approved wording, run emphasis, logo, margins and
paragraph-before/after settings from KT34.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

SRC=Path("out/01A_Obrazec_A_KLASICHESKI_KT34.docx")
OUT=Path("out/01A_Obrazec_A_KLASICHESKI_KT35.docx")
assert SRC.is_file(),"First build KT34"
d=Document(SRC)
original_body=[p.text for p in d.paragraphs]
assert len(original_body)==41

# Including paragraphs held inside tables, text boxes, etc. (not just
# Document.paragraphs): every visible text paragraph in the letter body.
text_count=0
for el in d._element.body.xpath(".//w:p"):
    p=Paragraph(el,d._body)
    if not p.text.strip():
        continue
    p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing=1.0
    text_count+=1

# Header and footer must keep their approved official placement (logo,
# centered ministry title, contact address, PAGE/NUMPAGES), while line
# spacing is single there too.
ancillary_count=0
seen=set()
for s in d.sections:
    for part in (s.header,s.first_page_header,s.even_page_header,
                 s.footer,s.first_page_footer,s.even_page_footer):
        if part.is_linked_to_previous:
            continue
        path=str(part.part.partname)
        if path in seen: continue
        seen.add(path)
        for el in part._element.xpath(".//w:p"):
            p=Paragraph(el,part)
            if p.text.strip() or el.xpath(".//w:instrText"):
                p.paragraph_format.line_spacing=1.0
                ancillary_count+=1

assert text_count>=30,("Too few body text paragraphs",text_count)
assert [p.text for p in d.paragraphs]==original_body
for el in d._element.body.xpath(".//w:p"):
    p=Paragraph(el,d._body)
    if p.text.strip():
        assert p.alignment==WD_ALIGN_PARAGRAPH.JUSTIFY,p.text
        assert p.paragraph_format.line_spacing==1.0,(p.text,p.paragraph_format.line_spacing)

# Confirm the precise approvals from KT34 are still in force.
assert d.paragraphs[10].text.startswith("Относно")
assert all(r.italic for r in d.paragraphs[10].runs if r.text)
assert "не попадат" in "".join(r.text for r in d.paragraphs[22].runs if r.bold)
assert "няма вероятност" in "".join(r.text for r in d.paragraphs[25].runs if r.bold)
assert "не е необходимо провеждане на процедура" in "".join(r.text for r in d.paragraphs[31].runs if r.bold)
assert "Общ устройствен план."=="".join(r.text for r in d.paragraphs[32].runs if r.bold)
operative=("не подлежат на регламентираните по реда на глава шеста от него "
           "процедури по оценка на въздействието върху околната среда (ОВОС) "
           "или екологична оценка (ЕО).")
assert operative=="".join(r.text for r in d.paragraphs[24].runs if r.bold)

OUT.parent.mkdir(parents=True,exist_ok=True)
d.save(OUT)
check=Document(OUT)
assert [p.text for p in check.paragraphs]==original_body,"Wording changed"
for el in check._element.body.xpath(".//w:p"):
    p=Paragraph(el,check._body)
    if p.text.strip():
        assert p.alignment==WD_ALIGN_PARAGRAPH.JUSTIFY,p.text
        assert p.paragraph_format.line_spacing==1.0,(p.text,p.paragraph_format.line_spacing)

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as a,ZipFile(OUT) as b:
    media_a={n:a.read(n) for n in a.namelist() if n.startswith("word/media/")}
    media_b={n:b.read(n) for n in b.namelist() if n.startswith("word/media/")}
    assert media_a==media_b,"Institutional logo/media changed"
    for n in a.namelist():
        if n.startswith("word/") and n.endswith(".xml"):
            root_a=etree.fromstring(a.read(n))
            root_b=etree.fromstring(b.read(n))
            assert root_a.xpath(".//w:t/text()",namespaces=ns)==root_b.xpath(".//w:t/text()",namespaces=ns),(n,"Text changed")
            assert root_a.xpath(".//w:instrText/text()",namespaces=ns)==root_b.xpath(".//w:instrText/text()",namespaces=ns),(n,"Field changed")
            assert root_a.xpath(".//w:fldChar/@w:fldCharType",namespaces=ns)==root_b.xpath(".//w:fldChar/@w:fldCharType",namespaces=ns),(n,"Page field changed")
            assert not root_b.xpath(".//w:highlight",namespaces=ns),("Highlight",n)
    assert any(
        b"NUMPAGES" in b.read(n) for n in b.namelist()
        if n.startswith("word/footer") and n.endswith(".xml")),"Dynamic page numbering disappeared"

print("KT35 PASS",OUT,OUT.stat().st_size,"bytes")
print("All main-letter paragraphs:",text_count,"JUSTIFY and single line spacing 1.0")
print("Institutional header/footer paragraphs:",ancillary_count,"single 1.0, with established alignment kept")
print("All approved KT34 wording and emphasis, logo, fields and pagination preserved")
print("Expert Word and public site unchanged")
