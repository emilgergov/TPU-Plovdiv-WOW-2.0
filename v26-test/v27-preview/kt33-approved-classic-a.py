"""KT33 — Classic A after the user's paragraph-by-paragraph acceptance of KT32.

Applies only the approved textual and inline-emphasis corrections in paragraphs
10, 18, 22, 23, 25, 31, 32, and dynamic PAGE/NUMPAGES in the footer.
All other body text remains verbatim. The Expert draft is not modified.
This is a review draft of a competent-authority decision, not an issued act.
"""
from pathlib import Path
from zipfile import ZipFile
import re
from lxml import etree
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt
from docx.text.paragraph import Paragraph

SRC=Path("out/01A_Obrazec_A_KLASICHESKI_KT32.docx")
OUT=Path("out/01A_Obrazec_A_KLASICHESKI_KT33.docx")
assert SRC.is_file(), "Build KT32 first"
d=Document(SRC)
before=[p.text for p in d.paragraphs]
assert len(before)==41

SUBJECT="„Складове за промишлени стоки и офиси“"
PARCELS="56784.13.102, 56784.13.105 и 56784.13.106"
AREA="гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив"
ZONE="BG0000578 „Река Марица“"

def set_paragraph_runs(index, segments):
    """Retain OOXML paragraph geometry/style. Replace only its textual runs."""
    p=d.paragraphs[index]
    assert p.runs, f"Missing paragraph runs {index}"
    for run in p.runs:
        if run.text:
            run.text=""
    for txt,bold,italic in segments:
        r=p.add_run(txt)
        r.bold=bold
        r.italic=italic
        r.font.name="Verdana"
        r.font.size=Pt(10)
    return p

def plain(i, text):
    return set_paragraph_runs(i, [(text,False,False)])

def bold_phrase(i,text,phrase):
    assert text.count(phrase)==1,(i,phrase)
    left,right=text.split(phrase)
    return set_paragraph_runs(i,[(left,False,False),(phrase,True,False),(right,False,False)])

# Para 5 user wording: italic throughout; bold-italic only "Относно" and
# the exact confirmed investment subject; full phrase "поземлени имоти".
subject_tail=(f": Уведомление за инвестиционно предложение (ИП): {SUBJECT} "
    f"в поземлени имоти с идентификатори {PARCELS} по КККР на {AREA}.")
set_paragraph_runs(10, [
    ("Относно",True,True),
    (": Уведомление за инвестиционно предложение (ИП): ",False,True),
    (SUBJECT,True,True),
    (f" в поземлени имоти с идентификатори {PARCELS} по КККР на {AREA}.",False,True)
])
assert d.paragraphs[10].text=="Относно"+subject_tail

# Para 9: prescribed full cadastral land-parcel terminology.
plain(18,(
    "С реализацията на инвестиционното предложение се предвижда изграждане "
    "на складов обект за промишлени стоки и офиси в поземлен имот с "
    f"идентификатор 56784.13.102, {AREA}. "
    "Поземлените имоти с идентификатори 56784.13.105 и 56784.13.106 "
    "са посочени като съпътстващи."
))

# Para 13: competent authority GIS finding, not a purported applicant-
# furnished spatial report. Keep the legally distinct protected territories
# out of this Natura 2000 protected-zones statement.
set_paragraph_runs(22,[
    (f"Поземлените имоти с идентификатори {PARCELS}, разглеждани във връзка "
     "с инвестиционното предложение, ",False,False),
    ("не попадат",True,False),
    (" в границите на защитени зони от екологичната мрежа „Натура 2000“ "
     "по смисъла на Закона за биологичното разнообразие.",False,False)
])

# Para 14: preserve the approved wording; bold only nearest-zone code/name.
old23=before[23].strip()
assert old23.count(ZONE)==1
left,right=old23.split(ZONE)
set_paragraph_runs(23, [(left,False,False),(ZONE,True,False),(right,False,False)])
assert d.paragraphs[23].text==old23

# Para 16: restore original A's affirmative competent-authority wording,
# as explicitly accepted for this example and subject to expert confirmation.
set_paragraph_runs(25,[
    ("С оглед гореизложеното, отчитайки местоположението и характера "
     "на инвестиционното предложение, при реализацията му ",False,False),
    ("няма вероятност",True,False),
    (" от отрицателно въздействие върху защитени зони от мрежата „Натура 2000“, "
     "включително върху най-близко разположената защитена зона ",False,False),
    (ZONE,True,False),
    (", по отношение на:",False,False)
])

# Para 22: preserve official A's canonical decision, but bold only the
# actual investment subject and the operative phrase (not "преценката").
set_paragraph_runs(31,[
    ("В тази връзка и на основание чл. 2, ал. 2 от Наредбата за ОС "
     "Ви уведомявам, че преценката на компетентния орган за така "
     "заявеното инвестиционно предложение: ",False,False),
    (SUBJECT,True,False),
    (f" в поземлени имоти с идентификатори {PARCELS} по КККР на {AREA} е, че ",False,False),
    ("не е необходимо провеждане на процедура",True,False),
    (" по реда на Глава втора от Наредбата за ОС.",False,False)
])

# Para 23: bold exactly the end of the original administrative clause.
old32=before[32].strip()
assert old32.endswith("Общ устройствен план."),old32
bold_phrase(32,old32,"Общ устройствен план.")

# Replace the ORIGINAL static page count with real Word field codes:
# PAGE / NUMPAGES. Do not draw a literal "1/2" or copy the former "2/2".
def field(p,instruction,display):
    r=p.add_run()
    begin=OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"),"begin")
    r._r.append(begin)
    r=p.add_run()
    instr=OxmlElement("w:instrText")
    instr.set(qn("xml:space"),"preserve")
    instr.text=f" {instruction} "
    r._r.append(instr)
    r=p.add_run()
    sep=OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"),"separate")
    r._r.append(sep)
    r=p.add_run(display)
    r.font.name="Verdana"
    r.font.size=Pt(9)
    r=p.add_run()
    end=OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"),"end")
    r._r.append(end)

footer_updated=0
seen_parts=set()
for section in d.sections:
    for footer in (section.footer,section.first_page_footer,section.even_page_footer):
        if footer.is_linked_to_previous:
            continue
        partname=str(footer.part.partname)
        if partname in seen_parts:
            continue
        seen_parts.add(partname)
        for para_elm in footer._element.xpath(".//w:p"):
            para=Paragraph(para_elm,footer)
            if re.fullmatch(r"\s*\d+\s*/\s*\d+\s*",para.text):
                # clear() retains paragraph properties: location and alignment.
                para.clear()
                field(para,"PAGE","1")
                r=para.add_run("/")
                r.font.name="Verdana"
                r.font.size=Pt(9)
                field(para,"NUMPAGES","2")
                footer_updated+=1

# The supplied source uses a static 2/2 in the original footer.
assert footer_updated>=1, ("Static page count not found; inspect original footer XML",
    [(str(s.footer.part.partname),[p.text for p in s.footer.paragraphs]) for s in d.sections])
settings=d.settings.element
update=settings.find(qn("w:updateFields"))
if update is None:
    update=OxmlElement("w:updateFields")
    settings.append(update)
update.set(qn("w:val"),"true")

# Regression: KT32 was accepted paragraph-by-paragraph. Alter no other text.
after=[p.text for p in d.paragraphs]
allowed={10,18,22,23,25,31,32}
for i in range(len(before)):
    if i not in allowed:
        assert before[i]==after[i],f"Unapproved change in body paragraph {i}"
assert after[23]==before[23], "Nearest zone wording was approved; only bold changes"
assert after[32]==before[32], "Last administrative clause was approved; only bold changes"
assert "Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г." in after[16]
assert after[6].startswith("Възложителя: ХХХХ")
assert after[7].startswith("Адрес: ХХХХ")
assert "ще се заустват" in after[21]
assert all(c in after[22] for c in [ZONE.split()[0] if False else "Натура 2000","Закона за биологичното разнообразие"])
assert "не попадат" in after[22] and "предоставения ГИС анализ" not in after[22]
assert "няма вероятност" in after[25] and ZONE in after[25]
assert "преценката на компетентния орган" in after[31]
assert after[31].count(SUBJECT)==1
assert "не е необходимо провеждане на процедура" in after[31]

# Every inserted emphasis is exact and scoped.
p=d.paragraphs[10]
assert sum(bool(r.bold) and bool(r.italic) for r in p.runs if r.text)==2
assert all(r.italic for r in p.runs if r.text)
assert "не попадат" in "".join(r.text for r in d.paragraphs[22].runs if r.bold)
assert ZONE in "".join(r.text for r in d.paragraphs[23].runs if r.bold)
assert "няма вероятност" in "".join(r.text for r in d.paragraphs[25].runs if r.bold)
assert ZONE in "".join(r.text for r in d.paragraphs[25].runs if r.bold)
bold31="".join(r.text for r in d.paragraphs[31].runs if r.bold)
assert bold31==SUBJECT+"не е необходимо провеждане на процедура",repr(bold31)
assert not any("преценката" in r.text and r.bold for r in d.paragraphs[31].runs)
assert "".join(r.text for r in d.paragraphs[32].runs if r.bold)=="Общ устройствен план."
assert len([p for p in d.paragraphs[26:31] if p.text.strip()])==5
for i in (16,18,22,23,25,31,32):
    assert d.paragraphs[i].paragraph_format.line_spacing==1.15,(i,d.paragraphs[i].paragraph_format.line_spacing)

OUT.parent.mkdir(parents=True,exist_ok=True)
d.save(OUT)
z=Document(OUT)
assert [p.text for p in z.paragraphs]==after
assert z.paragraphs[10].text==d.paragraphs[10].text

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as old, ZipFile(OUT) as new:
    # Retain original state logo, other artwork and the header/footer contact text.
    before_media={n:old.read(n) for n in old.namelist() if n.startswith("word/media/")}
    after_media={n:new.read(n) for n in new.namelist() if n.startswith("word/media/")}
    assert before_media==after_media,"Institutional logo or image changed"
    for n in old.namelist():
        if n.startswith("word/header") and n.endswith(".xml"):
            a=etree.fromstring(old.read(n));b=etree.fromstring(new.read(n))
            assert a.xpath(".//w:t/text()",namespaces=ns)==b.xpath(".//w:t/text()",namespaces=ns),"Header text changed"
        if n.startswith("word/footer") and n.endswith(".xml"):
            a=etree.fromstring(old.read(n));b=etree.fromstring(new.read(n))
            original_text=" ".join(a.xpath(".//w:t/text()",namespaces=ns))
            revised_text=" ".join(b.xpath(".//w:t/text()",namespaces=ns))
            for literal in ("4000","Пловдив","Марица","riosv@plovdiv.riew.gov.bg"):
                if literal in original_text:
                    assert literal in revised_text,(n,literal)
            # Not every section footer has a page-number paragraph. Assert
            # fields only when its source footer displayed a static page count.
            old_static="".join(a.xpath(".//w:t/text()",namespaces=ns))
            if re.search(r"(?<!\d)2\s*/\s*2(?!\d)",old_static):
                assert len(b.xpath(".//w:instrText[contains(text(),'PAGE')]",namespaces=ns))>=1,n
                assert len(b.xpath(".//w:instrText[contains(text(),'NUMPAGES')]",namespaces=ns))>=1,n
    for n in new.namelist():
        if n.startswith("word/") and n.endswith(".xml"):
            xml=etree.fromstring(new.read(n))
            assert not xml.xpath(".//w:highlight",namespaces=ns),f"Highlight remains: {n}"
    settings_xml=etree.fromstring(new.read("word/settings.xml"))
    assert settings_xml.xpath(".//w:updateFields[@w:val='true']",namespaces=ns),"Field update is disabled"

print("KT33 PASS",OUT,OUT.stat().st_size,"bytes")
print("Approved paragraph edits: 10,18,22,23,25,31,32")
print("Unchanged other 34 paragraphs; original 5 impact criteria, logos, contact details retained")
print("Dynamic PAGE/NUMPAGES page number fields inserted:",footer_updated)
print("Expert DOCX unchanged. Public site unchanged.")
