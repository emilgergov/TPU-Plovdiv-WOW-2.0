"""KT30 — approved Classic administrative proposal, A/no Natura overlap.
Build only from the frozen KT29 classic DOCX, which retains the original agency
template. Apply the eight explicitly approved red-marked corrections and remove
all yellow highlighting from the final document. Do NOT alter the expert DOCX.
"""
from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile
import re
from lxml import etree
from docx import Document

BASE=Path("out/01A_Obrazec_A_BG0000578_Plovdiv_KT29.docx")
TEMPLATE=Path("v26-test/templates/V26_3_Obrazec_A.docx")
OUTPUT=Path("out/01A_Obrazec_A_KLASICHESKI_OD0BREN_KT30.docx")
SUBJECT="„Складове за промишлени стоки и офиси“"
PARCELS="56784.13.102, 56784.13.105 и 56784.13.106"
AREA="гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив"

assert BASE.is_file() and TEMPLATE.is_file(), "Build KT29 before KT30."
d=Document(BASE)
canonical=Document(TEMPLATE)
assert len(d.paragraphs)==len(canonical.paragraphs)==41
before=[p.text for p in d.paragraphs]
allowed={18,19,20,21,22,23,24,31}

def replace_text(i, text):
    p=d.paragraphs[i]
    leading=re.match(r"^\s*",p.text).group(0)
    anchor=next((r for r in p.runs if r.text.strip()),None)
    assert anchor is not None, f"Missing body run at paragraph {i}"
    for r in p.runs:
        if r.text:
            r.text=""
    anchor.text=leading + text

def restore_canonical(i):
    target=d.paragraphs[i]._element
    repl=deepcopy(canonical.paragraphs[i]._element)
    target.getparent().replace(target,repl)

# Red-marked passages: one-by-one resolutions approved by the expert.
replace_text(18,
    f"С реализацията на инвестиционното предложение се предвижда изграждане на "
    f"складов обект за промишлени стоки и офиси в ПИ 56784.13.102, {AREA}. "
    "ПИ 56784.13.105 и ПИ 56784.13.106 са посочени като съпътстващи.")
replace_text(19,
    "Електроснабдяването ще се осъществи чрез присъединяване към електрическата "
    "мрежа на съответния мрежови оператор в района на реализация на инвестиционното предложение.")
replace_text(20,
    "Водоснабдяването ще се осъществи чрез присъединяване към новопроектиран уличен водопровод.")
replace_text(21,
    "Отпадъчните води, генерирани при експлоатацията на обекта, ще се заустват "
    "във водоплътна изгребна яма, предвидена за изграждане в границите на поземления имот.")
replace_text(22,
    f"Съгласно предоставения ГИС анализ поземлените имоти {PARCELS} "
    "не пресичат защитени зони от мрежата „Натура 2000“.")
replace_text(23,
    "Най-близко разположена защитена зона е BG0000578 „Река Марица“ за опазване "
    "на природните местообитания и на дивата флора и фауна, обявена със "
    "Заповед № РД-728/19.08.2024 г. на министъра на околната среда и водите "
    "(ДВ, бр. 74/30.08.2024 г.).")

# Original A canonical procedural sentence about chapter six of ZOOS,
# unaltered, as explicitly approved. The opinion is a draft pending sign-off.
restore_canonical(24)

# Restore the original competent-authority voice, legal conclusion, and
# bolded emphasis of the source's signed administrative formula; only
# replace the sample case's parcel/title/location values.
restore_canonical(31)
p=d.paragraphs[31]
assert len(p.runs)>=14, f"Unexpected original A conclusion structure: {len(p.runs)}"
p.runs[4].text=" "+SUBJECT
for i in (5,6,7):
    p.runs[i].text=""
p.runs[9].text=f" в поземлени имоти с идентификатори {PARCELS} по КККР на {AREA} "
assert p.runs[1].bold and p.runs[12].bold, "Approved bold emphasis in official conclusion lost."

# Yellow is a working-template mark, never present in the approved final DOCX.
for pp in d.paragraphs:
    for rr in pp.runs:
        if rr.font.highlight_color is not None:
            rr.font.highlight_color=None
for section in d.sections:
    for part in [section.header,section.footer,section.first_page_header,section.first_page_footer,
                 section.even_page_header,section.even_page_footer]:
        for pp in part.paragraphs:
            for rr in pp.runs:
                if rr.font.highlight_color is not None:
                    rr.font.highlight_color=None

after=[p.text for p in d.paragraphs]
for i in range(41):
    if i not in allowed:
        assert before[i]==after[i],f"Unapproved paragraph text changed at {i}"
assert all(k not in "\n".join(after) for k in
           ("Асеновград","00702.516.432","Добростан","Родопи-Средни",
            "ПРОЕКТЕН ИЗВОД","ПРОЦЕДУРНИЯТ ИЗВОД","подлежат на уточняване от пълната преписка",
            "няма данни за кодовете"))
assert "BG0000578" in after[23] and "РД-728/19.08.2024" in after[23]
assert "ще се заустват" in after[21]
assert "преценката на компетентния орган" in after[31]
assert "не е необходимо провеждане на процедура" in after[31]
assert "Глава втора от Наредбата за ОС" in after[31]
assert "30 kW" not in after[19]
assert "Ви уведомявам" in after[16] and "Ви уведомявам" in after[31]

OUTPUT.parent.mkdir(exist_ok=True)
d.save(OUTPUT)
again=Document(OUTPUT)
assert len(again.paragraphs)==41
assert [p.text for p in again.paragraphs]==after

ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(BASE) as a, ZipFile(OUTPUT) as b:
    media_a={n:a.read(n) for n in a.namelist() if n.startswith("word/media/")}
    media_b={n:b.read(n) for n in b.namelist() if n.startswith("word/media/")}
    assert media_a==media_b,"Institutional logo/media changed"
    for name in a.namelist():
        if name.startswith(("word/header","word/footer")) and name.endswith(".xml"):
            aa=etree.fromstring(a.read(name)); bb=etree.fromstring(b.read(name))
            assert aa.xpath(".//w:t/text()",namespaces=ns)==bb.xpath(".//w:t/text()",namespaces=ns),f"Header/footer text changed: {name}"
    unwanted=[]
    for name in b.namelist():
        if name.startswith("word/") and name.endswith(".xml"):
            root=etree.fromstring(b.read(name))
            count=len(root.xpath(".//w:highlight",namespaces=ns))
            if count:
                unwanted.append((name,count))
    assert not unwanted, f"Yellow/other highlight remains: {unwanted}"
print("KT30 CLASSIC APPROVED OUTPUT: ", OUTPUT,OUTPUT.stat().st_size,"bytes")
print("Checked: 41 paragraphs; only approved 8 revised; original media and header/footer; no highlighting.")
print("Official conclusion with original bold emphasis preserved; expert DOCX untouched.")
