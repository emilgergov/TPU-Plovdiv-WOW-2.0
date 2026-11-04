"""V27 Expert Word — first AI-authored administrative review from KT35-A case.

Uses the EXACT accepted KT35-A as institutional shell and evidentiary case
baseline. This review is NOT the live Cloudflare AI endpoint and must not be
published as a signed administrative decision. It avoids the synthetic GIS
intersection used only in the KT39-B typography test.
"""
from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from docx import Document
from docx.shared import Pt,Cm
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.text.paragraph import Paragraph

SOURCE=Path("out/01A_Obrazec_A_KLASICHESKI_KT35.docx")
OUTPUT=Path("out/02_Proekt_na_stanovishte_EKSPERTEN_V27_R01.docx")
assert SOURCE.is_file(),"Approved KT35-A must be built first"
d=Document(SOURCE)
base=[p.text for p in d.paragraphs]
assert len(base)==41
assert base[18].startswith("С реализацията на инвестиционното предложение")
assert "не попадат" in base[22]
assert "BG0000578 „Река Марица“" in base[23]
assert "не е необходимо провеждане на процедура" in base[31]
assert base[21].startswith("Отпадъчните води")
assert base[6].startswith("Възложителя: ХХХХ")
assert base[7].startswith("Адрес: ХХХХ")
assert "Складове за промишлени стоки и офиси" in base[10]
assert "56784.13.102" in base[10]

# No rewriting the authoritative approved operative conclusion: clone it.
decision_copy=deepcopy(d.paragraphs[31]._p)
template_body=deepcopy(d.paragraphs[18]._p.pPr)
anchor=d.paragraphs[32]._p
# Everything below the canonical decision — reservations/signature/footer —
# stays as approved. Delete ONLY 18–31 for the expert-authored argumentation.
for p in list(d.paragraphs[18:32]):
    p._p.getparent().remove(p._p)

def put(segments,heading=False):
    el=OxmlElement("w:p")
    if template_body is not None: el.append(deepcopy(template_body))
    anchor.addprevious(el)
    p=Paragraph(el,d._body)
    p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    f=p.paragraph_format
    f.line_spacing=1.0
    f.space_before=Pt(7 if heading else 0)
    f.space_after=Pt(4 if heading else 5)
    f.first_line_indent=Cm(0 if heading else 1.0)
    f.keep_with_next=bool(heading)
    for s,bold,italic in segments:
        r=p.add_run(s)
        r.bold=bold
        r.italic=italic
        r.font.name="Verdana"
        r.font.size=Pt(10)
    return p

def p(text,bold_fragments=()):
    if not bold_fragments:
        return put([(text,False,False)])
    positions=[]
    for phrase in bold_fragments:
        assert text.count(phrase)==1,(phrase,text)
        positions.append((text.index(phrase),phrase))
    positions.sort()
    blocks=[];pos=0
    for start,phrase in positions:
        assert start>=pos,"Overlapping emphasis"
        if start>pos:blocks.append((text[pos:start],False,False))
        blocks.append((phrase,True,False));pos=start+len(phrase)
    if pos<len(text):blocks.append((text[pos:],False,False))
    return put(blocks)

def h(text):return put([(text,True,False)],heading=True)

# Project label is NOT an assertion that a signed/issued act exists.
title_elm=OxmlElement("w:p")
d.paragraphs[13]._p.addprevious(title_elm)
title=Paragraph(title_elm,d._body)
title.alignment=WD_ALIGN_PARAGRAPH.CENTER
title.paragraph_format.line_spacing=1.0
title.paragraph_format.space_before=Pt(5)
title.paragraph_format.space_after=Pt(5)
t=title.add_run("ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ")
t.bold=True;t.font.name="Verdana";t.font.size=Pt(10)

h("Предмет на инвестиционното предложение и фактическа характеристика")
p("Инвестиционното предложение предвижда изграждане на складов обект за промишлени стоки и офиси в поземлен имот с идентификатор 56784.13.102 по КККР на гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив. Поземлените имоти с идентификатори 56784.13.105 и 56784.13.106 са посочени като съпътстващи. Преценката се отнася до така определения предмет и имотен обхват на предложението.")
p("Електроснабдяването ще се осъществи чрез присъединяване към електрическата мрежа на съответния мрежови оператор. Водоснабдяването е предвидено чрез новопроектиран уличен водопровод, а отпадъчните води от експлоатацията на обекта ще се отвеждат във водоплътна изгребна яма, предвидена за изграждане в границите на поземления имот. Тези обстоятелства са отчетени при преценката на характера на заявените дейности.")

h("Пространствено положение и относим нормативен режим")
p("При извършения пространствен анализ на имотите спрямо защитените зони от екологичната мрежа „Натура 2000“ е установено, че поземлените имоти с идентификатори 56784.13.102, 56784.13.105 и 56784.13.106 не попадат в границите на защитени зони по смисъла на Закона за биологичното разнообразие. Следователно реализацията на заявеното строителство в посочените имотни граници не предполага пряко отнемане на площ от защитена зона.",
  ("не попадат",))
p("Най-близко разположена защитена зона е BG0000578 „Река Марица“ за опазване на природните местообитания и на дивата флора и фауна, обявена със Заповед № РД-728/19.08.2024 г. на министъра на околната среда и водите (ДВ, бр. 74/30.08.2024 г.). Пространственото положение е отразено в самостоятелния ГИС анализ, който представлява част от съпътстващата документация.",
  ("BG0000578 „Река Марица“",))
p("Отсъствието на териториално пресичане не се възприема само по себе си като достатъчно основание за процедурния извод. При преценката се съобразяват и функционалното предназначение на обекта, предвидените инженерни връзки и възможните пътища за пряко, косвено и съвкупно въздействие върху предмета и целите на опазване на защитените зони.")
p("Съобразно заявения предмет и предвидените в него дейности инвестиционното предложение не може да бъде отнесено към позициите на приложения № 1 и № 2 към Закона за опазване на околната среда (ЗООС) и не подлежи на регламентираните по реда на глава шеста от него процедури по оценка на въздействието върху околната среда (ОВОС) или екологична оценка (ЕО).",
  ("не подлежи на регламентираните по реда на глава шеста от него процедури по оценка на въздействието върху околната среда (ОВОС) или екологична оценка (ЕО)",))

h("Преценка на вероятните въздействия")
p("При съвкупното разглеждане на местоположението и характера на заявените дейности няма вероятност от отрицателно въздействие върху защитените зони от екологичната мрежа „Натура 2000“, включително върху най-близко разположената защитена зона BG0000578 „Река Марица“, по следните съществени направления:",
  ("няма вероятност","BG0000578 „Река Марица“"))
p("Пряко и косвено засягане на местообитания. Имотният обхват е извън защитените зони; поради това предвиденото строителство в тези граници не води до пряко унищожаване, увреждане или фрагментиране на природни местообитания и местообитания на видове, представляващи предмет на опазване в защитена зона.",
  ("Пряко и косвено засягане на местообитания.",))
p("Безпокойство и трансформация на местообитания. Отчетени са възможните въздействия, характерни за строителството и последващата експлоатация на складов обект — движение на транспортни средства, шум и осветление. В рамките на заявения предмет и установеното местоположение тези фактори не обосновават вероятност за отрицателно засягане на опазваните местообитания и видове.",
  ("Безпокойство и трансформация на местообитания.",))
p("Цялост и цели на опазване. Липсата на пространствено застъпване и заявеният характер на дейностите не обосновават нарушаване целостта на защитени зони или възпрепятстване на целите, за които те са обявени.",
  ("Цялост и цели на опазване.",))
p("Екологична кохерентност. Не е установено пряко засягане на територии в границите на мрежата, което да обоснове прекъсване или фрагментиране на пространствената свързаност между съседни защитени зони вследствие на заявеното строителство.",
  ("Екологична кохерентност.",))
p("Кумулативни въздействия. По разглежданите параметри на инвестиционното предложение не се установяват конкретни предпоставки за отрицателно въздействие във взаимодействие с други инвестиционни предложения, планове, програми или проекти. Преценката е обвързана с представения предмет, имотен обхват и технически решения.",
  ("Кумулативни въздействия.",))

h("Преценка на компетентния орган")
p("Съпоставката на установеното пространствено положение, характеристиката на предвидените дейности и разгледаните направления на въздействие не дава основание за определяне на вероятно отрицателно въздействие върху предмета и целите на опазване на защитените зони. При заявените параметри приложимият административен извод е следният:")

# Retain the approved, precise administrative conclusion and all its emphases.
anchor.addprevious(decision_copy)

content=[x.text for x in d.paragraphs]
assert len(content)>41
assert content[:11]==base[:11],"Approved header/recipient/subject changed"
assert content[12:14] != [],"Missing source salutation"
assert "ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ" in content
assert content.count(base[31])==1,"Approved authority conclusion duplicated or changed"
idx=content.index(base[31])
assert content[idx+1:]==base[32:],"Approved caveats/signatures changed"
assert content.index(base[32])>content.index(base[31])
assert content.count(base[23])==0,"Expert draft should contain its own zone paragraph, not pasted classic text"
assert any("BG0000578 „Река Марица“" in t for t in content)
assert sum("56784.13.102" in t for t in content)>=3
assert all(f in "\n".join(content) for f in ("56784.13.105","56784.13.106","възложителя","ОВОС"))
assert all(term not in "\n".join(content) for term in ("Асеновград","Добростан","непотвърдена ГИС","изкуствен интелект","AI автор"))
assert len([p for p in d.paragraphs if p.text=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ"])==1
assert "не е необходимо провеждане на процедура" in content[idx]
assert "не попадат" in "\n".join(content) and "попада частично" not in "\n".join(content)

# Re-apply KT35's exact body presentation without overriding institutional
# header/footer, the specific conf labels or the centered title.
seen_conf=0
for element in d._element.body.xpath(".//w:p"):
    q=Paragraph(element,d._body)
    if not q.text.strip():continue
    if "Ниво на конфиденциалност" in q.text or "TLP-WHITE" in q.text:
        q.alignment=WD_ALIGN_PARAGRAPH.RIGHT
        q.paragraph_format.first_line_indent=Pt(0)
        q.paragraph_format.left_indent=Pt(0)
        q.paragraph_format.right_indent=Pt(0)
        q.paragraph_format.space_before=Pt(0)
        q.paragraph_format.space_after=Pt(0)
        seen_conf+=1
    elif q.text=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ":
        q.alignment=WD_ALIGN_PARAGRAPH.CENTER
    else:
        q.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    q.paragraph_format.line_spacing=1.0
    # Institutional logo and approved body paragraphs: retain original
    # typography; enforce Verdana 10 on substantive text, including the subject.
    for r in q.runs:
        if r.text and ("Ниво на конфиденциалност" not in q.text and "TLP-WHITE" not in q.text):
            r.font.name="Verdana"
            r.font.size=Pt(10)
assert seen_conf==2,("Expected two separate confidentiality fields",seen_conf)
assert "".join(r.text for r in d.paragraphs[idx].runs if r.bold).count("не е необходимо провеждане на процедура")==1
OUTPUT.parent.mkdir(exist_ok=True)
d.save(OUTPUT)

check=Document(OUTPUT)
assert [p.text for p in check.paragraphs]==content
for el in check._element.body.xpath(".//w:p"):
    q=Paragraph(el,check._body)
    if not q.text.strip():continue
    if "Ниво на конфиденциалност" in q.text or "TLP-WHITE" in q.text:
        expected=WD_ALIGN_PARAGRAPH.RIGHT
    elif q.text=="ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ":
        expected=WD_ALIGN_PARAGRAPH.CENTER
    else:expected=WD_ALIGN_PARAGRAPH.JUSTIFY
    assert q.alignment==expected,(q.text,q.alignment)
    assert q.paragraph_format.line_spacing==1.0,(q.text,q.paragraph_format.line_spacing)

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(SOURCE) as original,ZipFile(OUTPUT) as changed:
    media_a={p:original.read(p) for p in original.namelist() if p.startswith("word/media/")}
    media_b={p:changed.read(p) for p in changed.namelist() if p.startswith("word/media/")}
    assert media_a==media_b,"Logo changed"
    for name in original.namelist():
        if name.startswith(("word/header","word/footer")) and name.endswith(".xml"):
            a=etree.fromstring(original.read(name))
            b=etree.fromstring(changed.read(name))
            for xp in (".//w:t/text()",".//w:instrText/text()",".//w:fldChar/@w:fldCharType"):
                assert a.xpath(xp,namespaces=ns)==b.xpath(xp,namespaces=ns),(name,xp)
    assert any(b"NUMPAGES" in changed.read(n) for n in changed.namelist() if n.startswith("word/footer") and n.endswith(".xml"))
    for name in changed.namelist():
        if name.startswith("word/") and name.endswith(".xml"):
            el=etree.fromstring(changed.read(name))
            assert not el.xpath(".//w:highlight",namespaces=ns),"Template highlight returned"

print("V27 EXPERT R01 PASS:",OUTPUT,OUTPUT.stat().st_size)
print("Expert-authored paragraphs and legal reasoning, canonical competent-authority conclusion retained.")
print("Verdana 10, Justify, 1.0; confidentiality aligned right; draft label centered.")
print("Original 2 signature spaces, institutional header/footer/logo and dynamic PAGE/NUMPAGES preserved.")
print("WARNING: Draft for expert review, not an issued administrative act, not live AI worker output.")
