"""KT32: user-approved correction of ONLY Classic A introductory paragraph.
Retains KT31 admin placeholders, spacing, logo, legal conclusion and all
other paragraphs verbatim. Expert KT27 is not changed.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.shared import Pt

SRC=Path("out/01A_Obrazec_A_KLASICHESKI_KT31.docx")
OUT=Path("out/01A_Obrazec_A_KLASICHESKI_KT32.docx")
assert SRC.is_file(),"Build KT31 first"
d=Document(SRC)
before=[p.text for p in d.paragraphs]
assert len(before)==41
i=16
p=d.paragraphs[i]
NUM="Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г."
OPEN=(f"Във връзка с внесеното уведомление в РИОСВ-Пловдив с {NUM} "
      "за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 "
      "от Наредба за условията и реда за извършване на оценка за съвместимостта "
      "на планове, програми, проекти и инвестиционни предложения с предмета "
      "и целите на опазване на защитените зони ")
CITE="(Наредбата за ОС, ДВ бр.73/2007 г., изм. и доп.)"
CLOSE=" Ви уведомявам следното:"
text=OPEN+CITE+CLOSE
assert before[i].startswith("Във връзка") and NUM in before[i]
anchor=next((r for r in p.runs if r.text.strip()),None)
assert anchor is not None
for r in p.runs:
    if r.text:
        r.text=""
anchor.text=OPEN
anchor.bold=False
anchor.italic=False
anchor.font.name="Verdana"
anchor.font.size=Pt(10)
r=p.add_run(CITE)
r.bold=False
r.italic=True
r.font.name="Verdana"
r.font.size=Pt(10)
r=p.add_run(CLOSE)
r.bold=False
r.italic=False
r.font.name="Verdana"
r.font.size=Pt(10)
assert p.text==text
assert sum(1 for r in p.runs if r.text==CITE and r.italic)==1
# Leave layout, all other text, all page fields, signatory area intact.
after=[par.text for par in d.paragraphs]
for k in range(41):
    if k!=16:
        assert before[k]==after[k],f"Unapproved change in paragraph {k}"
assert "ХХХХ" in after[6] and "ХХХХ" in after[7]
assert "BG0000578 „Река Марица“" in after[23]
assert "ще се заустват" in after[21]
assert "преценката на компетентния орган" in after[31]
assert d.paragraphs[31].runs[1].bold and d.paragraphs[31].runs[12].bold
OUT.parent.mkdir(exist_ok=True)
d.save(OUT)
z=Document(OUT)
assert len(z.paragraphs)==41
assert [pp.text for pp in z.paragraphs]==after
assert z.paragraphs[16].paragraph_format.line_spacing==1.15
assert sum(1 for rr in z.paragraphs[16].runs if rr.text==CITE and rr.italic)==1

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as a, ZipFile(OUT) as b:
    aa={n:a.read(n) for n in a.namelist() if n.startswith("word/media/")}
    bb={n:b.read(n) for n in b.namelist() if n.startswith("word/media/")}
    assert aa==bb,"Logo/media changed"
    for n in a.namelist():
        if n.startswith(("word/header","word/footer")) and n.endswith(".xml"):
            aroot=etree.fromstring(a.read(n));broot=etree.fromstring(b.read(n))
            assert aroot.xpath(".//w:t/text()",namespaces=ns)==broot.xpath(".//w:t/text()",namespaces=ns),f"Header/footer changed: {n}"
    for n in b.namelist():
        if n.startswith("word/") and n.endswith(".xml"):
            root=etree.fromstring(b.read(n))
            assert not root.xpath(".//w:highlight",namespaces=ns),f"Highlight remains: {n}"

print("KT32 CLASSIC INTRO PARAGRAPH PASS",OUT,OUT.stat().st_size)
print("ONLY PARAGRAPH 16 CHANGED. Exact user-approved full regulation title; italic shorthand.")
print("KT31 administrative placeholders and layout, eight approved classic edits, media, legal conclusion preserved.")
