"""KT34: one expert-requested inline emphasis change to Classic KT33.
Bold only the operative ZOOS non-applicability conclusion in paragraph 24.
Retain exact text with normal spaces, all other paragraphs, formatting, logo,
headers, footers, signed-document fields and dynamic page numbering.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.shared import Pt

SRC=Path("out/01A_Obrazec_A_KLASICHESKI_KT33.docx")
OUT=Path("out/01A_Obrazec_A_KLASICHESKI_KT34.docx")
assert SRC.is_file(), "KT33 Classic output missing"
d=Document(SRC)
before=[p.text for p in d.paragraphs]
assert len(before)==41
i=24
p=d.paragraphs[i]
PREFIX=("Така заявеното ИП и предвидените в него дейности не могат да бъдат "
        "отнесени към някоя от позициите на Приложения № 1 и № 2 на Закона за "
        "опазване на околната среда (ЗООС) и ")
EMPHASIS=("не подлежат на регламентираните по реда на глава шеста от него "
          "процедури по оценка на въздействието върху околната среда (ОВОС) "
          "или екологична оценка (ЕО).")
assert before[i].strip()==PREFIX+EMPHASIS,repr(before[i])
# Rebuild only textual runs of one paragraph and keep the original pPr.
for r in p.runs:
    if r.text:
        r.text=""
for text,bold in ((PREFIX,False),(EMPHASIS,True)):
    run=p.add_run(text)
    run.bold=bold
    run.italic=False
    run.font.name="Verdana"
    run.font.size=Pt(10)
assert p.text==before[i]
assert "".join(r.text for r in p.runs if r.bold)==EMPHASIS
after=[par.text for par in d.paragraphs]
assert before==after,"KT34 must change formatting only, never wording"
assert all(r.text.count(" ")>0 for r in p.runs if r.text)
assert "Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г." in after[16]
assert "няма вероятност" in after[25]
assert "не попадат" in after[22]
assert "не е необходимо провеждане на процедура" in after[31]
assert p.paragraph_format.line_spacing==1.15

OUT.parent.mkdir(parents=True,exist_ok=True)
d.save(OUT)
z=Document(OUT)
assert [pp.text for pp in z.paragraphs]==before
assert "".join(r.text for r in z.paragraphs[i].runs if r.bold)==EMPHASIS
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as a,ZipFile(OUT) as b:
    media_a={n:a.read(n) for n in a.namelist() if n.startswith("word/media/")}
    media_b={n:b.read(n) for n in b.namelist() if n.startswith("word/media/")}
    assert media_a==media_b,"Logo/media changed"
    for n in a.namelist():
        if n.startswith(("word/header","word/footer")) and n.endswith(".xml"):
            assert a.read(n)==b.read(n),f"Header or footer changed: {n}"
    for n in b.namelist():
        if n.startswith("word/") and n.endswith(".xml"):
            root=etree.fromstring(b.read(n))
            assert not root.xpath(".//w:highlight",namespaces=ns),f"Highlight remains: {n}"
    assert b"NUMPAGES" in b.read("word/footer1.xml") or any(
        b"NUMPAGES" in b.read(n) for n in b.namelist()
        if n.startswith("word/footer") and n.endswith(".xml")),"Dynamic page fields missing"
print("KT34 PASS",OUT,OUT.stat().st_size,"bytes")
print("Paragraph 24 unchanged text, newly bold exactly:",EMPHASIS)
print("No other content, page numbering, logo, header or footer changed.")
