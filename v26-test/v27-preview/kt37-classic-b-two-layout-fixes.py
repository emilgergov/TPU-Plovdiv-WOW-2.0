from pathlib import Path
from zipfile import ZipFile
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

source=Path("out/01B_Obrazec_B_KLASICHESKI_KT36_SIMULACIA.docx")
output=Path("out/01B_Obrazec_B_KLASICHESKI_KT37_SIMULACIA.docx")
doc=Document(source)
old=[p.text for p in doc.paragraphs]
assert len(old)==43
waste=doc.paragraphs[21]
spatial=doc.paragraphs[22]
land=doc.paragraphs[23]
assert waste.text.startswith("Отпадъчните води")
assert land.text.startswith("Инвестиционното предложение не е свързано с промяна предназначението")
land._p.getparent().remove(land._p)
waste._p.addnext(land._p)
new=[p.text for p in doc.paragraphs]
assert new[:22]==old[:22]
assert new[22]==old[23] and new[23]==old[22]
assert new[24:]==old[24:]
assert new[33]==old[33] and new[28:33]==old[28:33]
conf=[p for p in doc.paragraphs if "Ниво на конфиденциалност" in p.text]
tlp=[p for p in doc.paragraphs if "TLP-WHITE" in p.text]
assert len(conf)==len(tlp)==1
for p in conf+tlp:
    f=p.paragraph_format
    p.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    f.left_indent=Pt(0)
    f.right_indent=Pt(0)
    f.first_line_indent=Pt(0)
    f.space_before=Pt(0)
    f.space_after=Pt(0)
    f.line_spacing=1.0
    f.tab_stops.clear_all()
conf[0].paragraph_format.keep_with_next=True
output.parent.mkdir(exist_ok=True)
doc.save(output)
check=Document(output)
assert [p.text for p in check.paragraphs]==new
assert check.paragraphs[22].text==old[23]
assert check.paragraphs[23].text==old[22]
assert all(p.alignment==WD_ALIGN_PARAGRAPH.RIGHT for p in check.paragraphs if "Ниво на конфиденциалност" in p.text or "TLP-WHITE" in p.text)
with ZipFile(source) as a,ZipFile(output) as b:
    assert {n:a.read(n) for n in a.namelist() if n.startswith("word/media/")}=={n:b.read(n) for n in b.namelist() if n.startswith("word/media/")}
print("KT37-B PASS: confidentiality fields right aligned and land-use paragraph moved directly after wastewater")
print("All other paragraphs, legal conclusion, five impact criteria and logo retained; out:",output)
