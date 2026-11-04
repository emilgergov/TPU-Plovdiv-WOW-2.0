"""V27 Expert Word R02: user-approved editorial revisions + grounded legal motivation.

Source is the successful V27 R01 review. This script changes ONLY the
Expert DOCX, never canonical Classic A/B, the public page or live AI service.
The fictional/plausible case details are used for a review project and do
not constitute an issued act. Operative conclusion matches approved KT35-A.
"""
from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.shared import Pt,Cm
from docx.text.paragraph import Paragraph

SRC=Path("out/02_Proekt_na_stanovishte_EKSPERTEN_V27_R01.docx")
OUT=Path("out/02_Proekt_na_stanovishte_EKSPERTEN_V27_R02.docx")
BASE=Path("out/01A_Obrazec_A_KLASICHESKI_KT35.docx")
assert SRC.is_file() and BASE.is_file()
doc=Document(SRC)
base=Document(BASE)
old=[p.text for p in doc.paragraphs]
legal_decision=base.paragraphs[31].text
assert old.count(legal_decision)==1
assert sum(t.strip()=="УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА," for t in old)==1
assert len([t for t in old if t=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ"])==1

def find_exact(s):
    matches=[p for p in doc.paragraphs if p.text==s]
    assert len(matches)==1,(s,len(matches))
    return matches[0]

def starts(s):
    matches=[p for p in doc.paragraphs if p.text.startswith(s)]
    assert len(matches)==1,(s,len(matches))
    return matches[0]

def retype(p,pieces,*,align=None,size=10,before=None,after=None,indent=None,keep=False):
    p.clear()
    if align is not None:p.alignment=align
    f=p.paragraph_format
    f.line_spacing=1.0
    if before is not None:f.space_before=Pt(before)
    if after is not None:f.space_after=Pt(after)
    if indent is not None:f.first_line_indent=Cm(indent)
    f.keep_with_next=keep
    for text,bold,italic in pieces:
        r=p.add_run(text)
        r.bold=bold;r.italic=italic
        r.font.name="Verdana";r.font.size=Pt(size)
    return p

def add_after(anchor,pieces):
    el=OxmlElement("w:p")
    if anchor._p.pPr is not None:
        el.append(deepcopy(anchor._p.pPr))
    anchor._p.addnext(el)
    p=Paragraph(el,doc._body)
    return retype(p,pieces,align=WD_ALIGN_PARAGRAPH.JUSTIFY,size=10,after=5,indent=1.0)

# 1. Completely remove the salutation, with no blank replacement.
greeting=next(p for p in doc.paragraphs if p.text.strip()=="УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА,")
greeting._p.getparent().remove(greeting._p)

# 2. Properly hierarchical administrative title, two centered lines.
main=find_exact("ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ")
retype(main,[("ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ",True,False)],
       align=WD_ALIGN_PARAGRAPH.CENTER,size=12,before=8,after=1,indent=0,keep=True)
subtitle=add_after(main,[("по чл. 2, ал. 2 от Наредбата за ОС",False,False)])
subtitle.alignment=WD_ALIGN_PARAGRAPH.CENTER
subtitle.paragraph_format.first_line_indent=Cm(0)
subtitle.paragraph_format.space_after=Pt(10)
subtitle.paragraph_format.keep_with_next=False

# 3. Four centered consecutively numbered section headings.
sections=[
("Предмет на инвестиционното предложение и фактическа характеристика",
 "1. ПРЕДМЕТ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ И ФАКТИЧЕСКА ХАРАКТЕРИСТИКА"),
("Пространствено положение и относим нормативен режим",
 "2. ПРОСТРАНСТВЕНО ПОЛОЖЕНИЕ И ОТНОСИМ НОРМАТИВЕН РЕЖИМ"),
("Преценка на вероятните въздействия",
 "3. ПРЕЦЕНКА НА ВЕРОЯТНИТЕ ВЪЗДЕЙСТВИЯ"),
("Преценка на компетентния орган",
 "4. ПРЕЦЕНКА НА КОМПЕТЕНТНИЯ ОРГАН")
]
for previous,numbered in sections:
    retype(find_exact(previous),[(numbered,True,False)],
           align=WD_ALIGN_PARAGRAPH.CENTER,size=10,before=10,after=6,
           indent=0,keep=True)

# 4. Competent authority completed-work voice (user-approved precise copy).
reason=starts("Отсъствието на териториално пресичане не се възприема")
retype(reason,[(
"При извършената преценка са отчетени установеното пространствено положение "
"на имотите извън границите на защитените зони от екологичната мрежа "
"„Натура 2000“, характерът и предназначението на заявеното инвестиционно "
"предложение, предвидените технически решения за електроснабдяване, "
"водоснабдяване и отвеждане на отпадъчните води, както и възможните преки, "
"косвени и кумулативни въздействия върху предмета и целите на опазване на "
"защитените зони. Съвкупният анализ на тези обстоятелства обосновава "
"преценката на компетентния орган относно вероятността от отрицателно "
"въздействие при реализацията на инвестиционното предложение.",False,False)],
       align=WD_ALIGN_PARAGRAPH.JUSTIFY,after=5,indent=1.0)

# 5. Focused legal evidence chain:
# - Art.2(1)(2) has a *combined* spatial/land-use legal test: absent spatial
#   inclusion is demonstrated by KT35-A GIS. Don't invent land-use status.
# - Art.2(2) and annex 1 govern how the competent authority determines
#   procedure; do not state that a checklist was signed when no such artifact
#   was supplied.
# - Art.31(1) ZBR covers potential impacts alone and in combination.
# - Art.12(3) explicitly limits the zone regime screening to sites WITHIN the
#   zone, so it is deliberately NOT cited for this outside-zone A example.
scope=add_after(reason,[
("Разгледана е хипотезата на ",False,False),
("чл. 2, ал. 1, т. 2 от Наредбата за ОС",True,False),
(", която обвързва приложимостта на процедурата с териториално попадане "
"изцяло или отчасти в защитена зона и с промяна на предназначението и/или "
"начина на трайно ползване на имота. За разглежданите три имота установеното "
"от ГИС анализа отсъствие на пресичане означава, че териториалната "
"предпоставка на тази хипотеза не е налице.",False,False)
])
procedure=add_after(scope,[
("При определянето на приложимия ред са отчетени характерът и "
"местоположението на инвестиционното предложение в съответствие с ",False,False),
("чл. 2, ал. 2 от Наредбата за ОС",True,False),
(" и критериите по ",False,False),
("приложение № 1",True,False),
(" към същата наредба. Разпоредбата предвижда компетентният орган да "
"уведоми възложителя дали е необходимо провеждане на процедура по реда "
"на наредбата, като извърши преценката по относимите факти.",False,False)
])

# The legal basis for the ZOOS qualification should be explicit, but neither
# the factual operative finding nor the approved conclusion may change.
zoos=starts("Съобразно заявения предмет и предвидените в него дейности")
retype(zoos,[
("При правната квалификация на инвестиционното предложение е съобразен ",False,False),
("чл. 2, ал. 1, т. 1 от Наредбата за ОС",True,False),
(" във връзка с обхвата на глава шеста от Закона за опазване на околната "
"среда (ЗООС). С оглед заявения предмет и предвидените дейности "
"инвестиционното предложение не може да бъде отнесено към позициите "
"на приложения № 1 и № 2 към ЗООС и не подлежи на регламентираните "
"по реда на глава шеста от него процедури по ОВОС или екологична оценка.",False,False)
],align=WD_ALIGN_PARAGRAPH.JUSTIFY,after=5,indent=1.0)

impacts_head=find_exact(sections[2][1])
add_after(impacts_head,[
("Съгласно ",False,False),
("чл. 31, ал. 1 от Закона за биологичното разнообразие",True,False),
(" при определянето на необходимостта от оценка за съвместимост се "
"отчитат възможните значителни отрицателни въздействия върху "
"защитените зони както поотделно, така и във взаимодействие с "
"други планове, програми, проекти и инвестиционни предложения. "
"По този критерий са разгледани прякото засягане на местообитания, "
"безпокойството, целостта на зоните, екологичната кохерентност "
"и кумулативните въздействия.",False,False)
])

after=[p.text for p in doc.paragraphs]
assert not any(t.strip()=="УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА," for t in after)
assert after.count("ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ")==1
assert after.count("по чл. 2, ал. 2 от Наредбата за ОС")==1
assert all(after.count(new)==1 for _,new in sections)
assert all(after.count(old)==0 for old,_ in sections)
assert any("При извършената преценка са отчетени" in s for s in after)
assert all(key in "\n".join(after) for key in
           ("чл. 2, ал. 1, т. 1","чл. 2, ал. 1, т. 2",
            "чл. 2, ал. 2","приложение № 1","чл. 31, ал. 1"))
assert not any("чл. 12, ал. 2" in s for s in after), \
       "Don't claim A has a zone-inside admissibility screen"
assert "не попадат" in "\n".join(after)
assert "попада частично" not in "\n".join(after)
assert after.count(legal_decision)==1,"Canonical legal conclusion modified"
idx=after.index(legal_decision)
assert after[idx+1:]==old[old.index(legal_decision)+1:], \
       "Original caveats, signature or closing fields changed"

# Normalize full main text, preserve official header/footer:
for el in doc._element.body.xpath(".//w:p"):
    p=Paragraph(el,doc._body)
    if not p.text.strip(): continue
    txt=p.text
    conf=("Ниво на конфиденциалност" in txt or "TLP-WHITE" in txt)
    central=(txt=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ" or
             txt=="по чл. 2, ал. 2 от Наредбата за ОС" or
             txt in [item[1] for item in sections])
    p.alignment=WD_ALIGN_PARAGRAPH.RIGHT if conf else \
        WD_ALIGN_PARAGRAPH.CENTER if central else WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing=1.0
    if central:p.paragraph_format.first_line_indent=Cm(0)
    if conf:
        p.paragraph_format.first_line_indent=Pt(0)
        p.paragraph_format.left_indent=Pt(0)
        p.paragraph_format.right_indent=Pt(0)
    for run in p.runs:
        if run.text and not conf:
            run.font.name="Verdana"
            run.font.size=Pt(12 if txt=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ" else 10)

OUT.parent.mkdir(exist_ok=True)
doc.save(OUT)
check=Document(OUT)
texts=[p.text for p in check.paragraphs]
assert texts==after
assert texts.count(legal_decision)==1
assert not any(t.strip()=="УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА," for t in texts)
assert len([x for x in texts if x.startswith(("1. ПРЕДМЕТ","2. ПРОСТРАНСТВЕНО",
  "3. ПРЕЦЕНКА","4. ПРЕЦЕНКА"))])==4
for element in check._element.body.xpath(".//w:p"):
    p=Paragraph(element,check._body)
    if not p.text.strip():continue
    assert p.paragraph_format.line_spacing==1.0
    c=("Ниво на конфиденциалност" in p.text or "TLP-WHITE" in p.text)
    centered=p.text in ["ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ",
                        "по чл. 2, ал. 2 от Наредбата за ОС",
                        *[item[1] for item in sections]]
    expect=WD_ALIGN_PARAGRAPH.RIGHT if c else WD_ALIGN_PARAGRAPH.CENTER \
           if centered else WD_ALIGN_PARAGRAPH.JUSTIFY
    assert p.alignment==expect,(p.text,p.alignment)
    if centered:
        assert p.paragraph_format.first_line_indent.cm==0
    for r in p.runs:
        if r.text and not c:
            assert r.font.name=="Verdana"
            assert r.font.size==Pt(12 if p.text=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ" else 10)

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SRC) as a,ZipFile(OUT) as b:
    assert {n:a.read(n) for n in a.namelist() if n.startswith("word/media/")} \
        == {n:b.read(n) for n in b.namelist() if n.startswith("word/media/")}, \
        "Institutional media changed"
    for name in a.namelist():
        if name.startswith(("word/header","word/footer")) and name.endswith(".xml"):
            x=etree.fromstring(a.read(name));y=etree.fromstring(b.read(name))
            for xp in (".//w:t/text()",".//w:instrText/text()",
                       ".//w:fldChar/@w:fldCharType"):
                assert x.xpath(xp,namespaces=ns)==y.xpath(xp,namespaces=ns), \
                    ("Header/footer/page fields altered",name,xp)
    assert any(b"NUMPAGES" in b.read(n) for n in b.namelist()
               if n.startswith("word/footer") and n.endswith(".xml"))
print("V27 EXPERT R02 PASS",OUT,OUT.stat().st_size)
print("Four user-approved revisions + legally supported argumentation: Art.2(1)(1-2), Art.2(2), Annex1, ZBR Art.31(1)")
print("Header/logo/footer/signatures and original approved Classic A operative conclusion preserved.")
print("Only review DOCX; no public build or production AI service altered.")
