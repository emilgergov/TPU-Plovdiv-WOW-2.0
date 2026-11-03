"""KT31: two user-requested Classic A corrections only.
1. Placeholder 'Х' for unknown administrative attributes.
2. Consistent administrative paragraph layout, without changing approved wording.
Source is the successfully tested KT30 Classic DOCX; KT30 and Expert KT27 stay intact.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt

SRC=Path("out/01A_Obrazec_A_KLASICHESKI_OD0BREN_KT30.docx")
OUT=Path("out/01A_Obrazec_A_KLASICHESKI_KT31.docx")
assert SRC.is_file(), "KT30 Classic A is required before KT31"
d=Document(SRC)
before=[p.text for p in d.paragraphs]
assert len(before)==41

PLACEHOLDER="ХХХХХХХХХХХХХ"
NUMBER="Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г."
OLD="Вх. № ОВОС-9999 / ДАТА-99.99.9999 г."

def replace_paragraph(i,text):
    p=d.paragraphs[i]
    anchor=next((r for r in p.runs if r.text.strip()),None)
    assert anchor is not None, f"Paragraph {i} lacks editable text"
    for run in p.runs:
        if run.text:
            run.text=""
    anchor.text=text

# Administrative fields: real data from the dossier whenever known;
# visibly neutral X placeholders when unknown, rather than internal instructions.
replace_paragraph(6, f"Възложителя: {PLACEHOLDER}")
replace_paragraph(7, f"Адрес: {PLACEHOLDER}")
assert OLD in d.paragraphs[16].text, "Incoming number/date format changed unexpectedly"
for run in d.paragraphs[16].runs:
    if OLD in run.text:
        run.text=run.text.replace(OLD,NUMBER)
        break
else:
    # KT29 format is normally contained in one run. Fail rather than
    # rebuild an administrative normative paragraph unnecessarily.
    raise AssertionError("Expected existing incoming-number run was not found")

def strip_manual_indent(p):
    """Remove literal spaces/tabs BEFORE first nonspace text only.
    Indentation is represented by Word paragraph properties, never spaces.
    This does not change substantive wording, bold or italic runs.
    """
    for run in p.runs:
        if not run.text:
            continue
        clean=run.text.lstrip(" \t\u00a0")
        if clean!=run.text:
            run.text=clean
        if clean:
            break

# Keep all original header, footer, logo, numbered/list markers, and signatory
# fields. Reformat only the administrative and body textual paragraphs.
for i in (6,7,10,13,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33):
    for run in d.paragraphs[i].runs:
        if run.text:
            run.font.name="Verdana"
            run.font.size=Pt(10)

# Recipient: clear left alignment, with spacing to visually separate address
# from the subject; no accidental first-line indent inherited from the example.
for i in (5,6,7):
    p=d.paragraphs[i]
    f=p.paragraph_format
    p.alignment=WD_ALIGN_PARAGRAPH.LEFT
    f.left_indent=Cm(0)
    f.right_indent=Cm(0)
    f.first_line_indent=Cm(0)
    f.space_before=Pt(0)
    f.space_after=Pt(1 if i in (5,6) else 7)
    f.line_spacing=1.1

# Subject and salutation remain independent blocks, not part of body prose.
p=d.paragraphs[10]
strip_manual_indent(p)
f=p.paragraph_format
p.alignment=WD_ALIGN_PARAGRAPH.LEFT
f.left_indent=Cm(0)
f.right_indent=Cm(0)
f.first_line_indent=Cm(0)
f.space_before=Pt(3)
f.space_after=Pt(8)
f.line_spacing=1.12
f.keep_together=True

p=d.paragraphs[13]
f=p.paragraph_format
p.alignment=WD_ALIGN_PARAGRAPH.LEFT
f.left_indent=Cm(0)
f.first_line_indent=Cm(0)
f.space_before=Pt(2)
f.space_after=Pt(8)

# Body: consistent justified administrative paragraphs, real first-line
# indentation, no double indent from template's literal spaces, and modest
# controlled space after each paragraph. Preserve 5 canonical impact bullets.
body_regular=(16,17,18,19,20,21,22,23,24,25,31,32,33)
bullets=(26,27,28,29,30)
for i in body_regular:
    p=d.paragraphs[i]
    strip_manual_indent(p)
    f=p.paragraph_format
    p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    f.left_indent=Cm(0)
    f.right_indent=Cm(0)
    f.first_line_indent=Cm(1.0)
    f.space_before=Pt(0)
    f.space_after=Pt(5)
    f.line_spacing=1.15
    f.widow_control=True
# The introductory sentence stays with the first enumerated criterion.
d.paragraphs[25].paragraph_format.keep_with_next=True
for i in bullets:
    p=d.paragraphs[i]
    # Do not touch original list/hanging-indent geometry or list numbers.
    f=p.paragraph_format
    p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    f.space_before=Pt(0)
    f.space_after=Pt(3)
    f.line_spacing=1.12
    f.widow_control=True

after=[p.text for p in d.paragraphs]
for i in range(len(before)):
    if i not in (6,7,16):
        assert before[i].strip()==after[i].strip(), f"Unapproved substantive text change in paragraph {i}"
assert after[6]==f"Възложителя: {PLACEHOLDER}"
assert after[7]==f"Адрес: {PLACEHOLDER}"
assert after[16].count(NUMBER)==1
assert OLD not in "\n".join(after)
assert "BG0000578 „Река Марица“" in after[23]
assert "ще се заустват" in after[21]
assert "преценката на компетентния орган" in after[31]
assert "не е необходимо провеждане на процедура" in after[31]
assert "ХХХХ" not in after[31] # never obscure the approved case facts
assert d.paragraphs[31].runs[1].bold and d.paragraphs[31].runs[12].bold
assert len(bullets)==5
for i in body_regular:
    f=d.paragraphs[i].paragraph_format
    assert f.first_line_indent==Cm(1.0),i
    assert f.space_after==Pt(5),i
    assert f.line_spacing==1.15,i
    assert d.paragraphs[i].alignment==WD_ALIGN_PARAGRAPH.JUSTIFY,i

OUT.parent.mkdir(parents=True,exist_ok=True)
d.save(OUT)
z=Document(OUT)
assert [p.text for p in z.paragraphs]==after
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as a, ZipFile(OUT) as b:
    assert {n:a.read(n) for n in a.namelist() if n.startswith("word/media/")}=={n:b.read(n) for n in b.namelist() if n.startswith("word/media/")},"Logo or media altered"
    for n in a.namelist():
        if n.startswith(("word/header","word/footer")) and n.endswith(".xml"):
            ao=etree.fromstring(a.read(n));bo=etree.fromstring(b.read(n))
            assert ao.xpath(".//w:t/text()",namespaces=ns)==bo.xpath(".//w:t/text()",namespaces=ns),f"Altered header/footer: {n}"
    for n in b.namelist():
        if n.startswith("word/") and n.endswith(".xml"):
            xml=etree.fromstring(b.read(n))
            assert not xml.xpath(".//w:highlight",namespaces=ns),f"Highlight remains in {n}"
print("KT31 CLASSIC ADMINISTRATIVE LAYOUT PASS")
print("OUT",OUT,"SIZE",OUT.stat().st_size)
print("Administrative placeholders: OK; exact 8 classic edits from KT30 retained.")
print("Verdana 10 body; justified text; 1 cm first-line indent; 1.15 spacing; 5 pt paragraph spacing.")
print("Five original impact paragraphs, original legal conclusion, media, headers and footers: intact.")
