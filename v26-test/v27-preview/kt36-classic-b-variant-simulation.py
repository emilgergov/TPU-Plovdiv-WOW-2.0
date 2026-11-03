"""KT36 / Variant B: isolated review DOCX based on the accepted KT35 Variant A.

Only the B-specific spatial and zone paragraphs, the mandatory land-use
paragraph and admissibility paragraph, plus the contextual reference in the
impact introduction, differ. Everything else — including the operative legal
conclusion — is byte-for-byte equivalent in text to KT35.

IMPORTANT: This is a SYNTHETIC crossing simulation for layout/content
acceptance. The real Plovdiv parcels in KT35-A were recorded as OUTSIDE Natura
2000. Do not use this simulation as a GIS/legal finding or publish as a live
case. A live B document must derive its spatial facts exclusively from PDF1
and its zone/permission references from the normative archive.
"""
from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.shared import Pt
from docx.text.paragraph import Paragraph

SRC=Path("out/01A_Obrazec_A_KLASICHESKI_KT35.docx")
OUT=Path("out/01B_Obrazec_B_KLASICHESKI_KT36_SIMULACIA.docx")
assert SRC.is_file(),"Build approved KT35-A before KT36-B"
d=Document(SRC)
before=[p.text for p in d.paragraphs]
assert len(before)==41
ID="56784.13.102"
OTHER="56784.13.105 и 56784.13.106"
ZONE="BG0000578 „Река Марица“"
LOC='гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив'

def replace(p, segments):
    """Preserve paragraph properties, replace *only* authored text runs."""
    for r in p.runs:
        if r.text:
            r.text=""
    for content,isbold in segments:
        r=p.add_run(content)
        r.bold=isbold
        r.italic=False
        r.font.name="Verdana"
        r.font.size=Pt(10)
    assert p.alignment==WD_ALIGN_PARAGRAPH.JUSTIFY
    assert p.paragraph_format.line_spacing==1.0
    return p

def insert_after(anchor,segments):
    """Add a standalone justified single-spaced paragraph using KT35 geometry."""
    element=OxmlElement("w:p")
    if anchor._p.pPr is not None:
        element.append(deepcopy(anchor._p.pPr))
    anchor._p.addnext(element)
    p=Paragraph(element,d._body)
    replace(p,segments)
    return p

spatial=d.paragraphs[22]
zone=d.paragraphs[23]
impact=d.paragraphs[25]
# Source A definitely says not within zone. Never leave contradictory A fact.
assert "не попадат" in spatial.text
assert "Най-близко разположена" in zone.text
assert "най-близко разположената" in impact.text

# Synthetic GIS test record: the leading parcel is partially overlapping the
# named zone, and both accompanying parcels are outside. This is NOT real PDF1.
replace(spatial,[
    (f"Поземленият имот с идентификатор {ID}, разглеждан във връзка с "
     "инвестиционното предложение, ",False),
    ("попада частично",True),
    (" в границите на защитена зона ",False),
    (ZONE,True),
    (" от екологичната мрежа „Натура 2000“ по смисъла на Закона за "
     "биологичното разнообразие. Поземлените имоти с идентификатори "
     f"{OTHER} не попадат в границите на защитени зони от същата мрежа.",False),
])

# User-approved obligatory B paragraph positioned immediately AFTER spatial.
land=insert_after(spatial,[(
    "Инвестиционното предложение не е свързано с промяна предназначението "
    "и/или начина на трайно ползване на имота.",True
)])

# Keep the approved classic formulation of the zone legal-status paragraph,
# replacing only the A nearest-zone wording with the B affected-zone wording.
replace(zone,[
    (f"Поземленият имот с идентификатор {ID} по КККР на {LOC}, "
     "предмет на инвестиционното предложение, ",False),
    ("попада",True),
    (" в границите на защитена зона ",False),
    (ZONE,True),
    (", за опазване на природните местообитания и на дивата флора и фауна, "
     "обявена със Заповед № РД-728/19.08.2024 г. на министъра на околната "
     "среда и водите (ДВ, бр. 74/30.08.2024 г.).",False)
])

# Approved Template B-specific admissibility; test scenario assumes this
# outcome for formatting only, NOT a completed real regime determination.
admissibility=insert_after(zone,[
    ("При направената проверка за допустимост по смисъла на чл. 12, "
     "ал. 2 от Наредбата за ОС се констатира, че инвестиционното предложение ",False),
    ("е допустимо",True),
    (" спрямо режимите на защитена зона ",False),
    (ZONE,True),
    (".",False),
])

# Same A conclusion and impact logic; contextual reference must be to an
# affected zone, not "nearest", when there is a GIS intersection.
replace(impact,[
    ("С оглед гореизложеното, отчитайки местоположението и характера на "
     "инвестиционното предложение, при реализацията му ",False),
    ("няма вероятност",True),
    (" от отрицателно въздействие върху защитени зони от мрежата "
     "„Натура 2000“, включително върху засегнатата защитена зона ",False),
    (ZONE,True),
    (", по отношение на:",False)
])

after=[p.text for p in d.paragraphs]
assert len(after)==43
assert after[:22]==before[:22],"Before spatial paragraph changed"
assert after[22]==spatial.text
assert after[23]==land.text
assert after[24]==zone.text
assert after[25]==admissibility.text
assert after[26]==before[24],"Approved ZOOS conclusion changed"
assert after[27]==impact.text
assert after[28:]==before[26:],"Impact criteria / conclusion / signoff changed"
assert after[23]=="Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота."
assert "е допустимо" in after[25]
assert "не е необходимо провеждане на процедура" in after[33]
assert after[33]==before[31],"The competence conclusion MUST be identical to KT35-A"
assert before[24]==after[26],"The ZOOS paragraph MUST be identical to KT35-A"
assert after[28:33]==before[26:31],"The 5 impact criteria MUST be identical to KT35-A"
assert "защитени територии по смисъла на Закона за защитените територии" not in "\n".join(after)
assert "най-близко разположена" not in after[24].lower()
assert "най-близко разположената" not in after[27].lower()
for p in d.paragraphs:
    if p.text.strip():
        assert p.alignment==WD_ALIGN_PARAGRAPH.JUSTIFY,(p.text,p.alignment)
        assert p.paragraph_format.line_spacing==1.0,(p.text,p.paragraph_format.line_spacing)
assert "".join(r.text for r in land.runs if r.bold)==land.text
assert "попада частично" in "".join(r.text for r in spatial.runs if r.bold)
assert "е допустимо" in "".join(r.text for r in admissibility.runs if r.bold)

OUT.parent.mkdir(exist_ok=True)
d.save(OUT)
rebuilt=Document(OUT)
assert [p.text for p in rebuilt.paragraphs]==after
for p in rebuilt.paragraphs:
    if p.text.strip():
        assert p.alignment==WD_ALIGN_PARAGRAPH.JUSTIFY
        assert p.paragraph_format.line_spacing==1.0

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as old,ZipFile(OUT) as new:
    a={k:old.read(k) for k in old.namelist() if k.startswith("word/media/")}
    b={k:new.read(k) for k in new.namelist() if k.startswith("word/media/")}
    assert a==b,"Institutional logo/media changed"
    for path in old.namelist():
        if path.startswith(("word/header","word/footer")) and path.endswith(".xml"):
            r1=etree.fromstring(old.read(path))
            r2=etree.fromstring(new.read(path))
            assert r1.xpath(".//w:t/text()",namespaces=ns)==r2.xpath(".//w:t/text()",namespaces=ns),f"Header/footer changed: {path}"
            assert r1.xpath(".//w:instrText/text()",namespaces=ns)==r2.xpath(".//w:instrText/text()",namespaces=ns),f"Page numbering changed: {path}"
    for path in new.namelist():
        if path.startswith("word/") and path.endswith(".xml"):
            x=etree.fromstring(new.read(path))
            assert not x.xpath(".//w:highlight",namespaces=ns),"Yellow highlighting left: "+path

print("KT36 VARIANT B PASS",OUT,OUT.stat().st_size)
print("43 paragraphs: 41 baseline A + 2 extra B; exactly 3 original paragraphs adapted.")
print("ZOOS, five impact criteria, legal conclusion, letters, logo and signatures unchanged.")
print("Verdanа 10, Justify, single-spaced 1.0 inherited; simulation is NOT factual GIS.")
