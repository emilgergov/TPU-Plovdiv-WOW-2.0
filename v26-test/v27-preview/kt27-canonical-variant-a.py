"""KT28: fill ORIGINAL approved Word A, preserving its ZIP OOXML design.
This is a review draft for a non-confidential test case, not an agency opinion.
"""
from pathlib import Path
import re
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_COLOR_INDEX

SRC=Path("v26-test/templates/V26_3_Obrazec_A.docx")
OUT=Path("out/01A_Obrazec_A_POPALNEN_TEST_Plovdiv_KT28.docx")
OUT.parent.mkdir(exist_ok=True)
d=Document(SRC)
assert len(d.paragraphs)==41,"Source canonical A template changed: inspect before editing"
orig=["".join(run.text for run in p.runs) for p in d.paragraphs]
assert "еднофамилна" in orig[18].lower()
assert "Асеновград" in orig[10] and "Асеновград" in orig[31]
assert "Родопи-Средни" in orig[23]

SUBJECT="„Складове за промишлени стоки и офиси“"
PARCELS="56784.13.102, 56784.13.105 и 56784.13.106"
AREA="гр. Пловдив, местност „Рогошко шосе – север“, община Пловдив, област Пловдив"
REF="Вх. № ОВОС-9999 / ДАТА-99.99.9999 г."

def change(i,value, bold=None, italic=None):
    """Change text within the existing paragraph only; retain PPR, layout and objects.
    Where original has many fragmented runs, collapse their text into one chosen
    run without reconstructing the paragraph or touching any section/header/footer.
    """
    p=d.paragraphs[i]
    candidates=[r for r in p.runs if r.text.strip()]
    assert candidates, f"No text run in canonical paragraph {i}"
    # Keep original leading indent/whitespace if present.
    prefix=re.match(r"^\s*",p.text).group(0)
    anchor=candidates[0]
    # Clear only textual runs, not drawing objects.
    for r in p.runs:
        if r.text:
            r.text=""
    anchor.text=prefix + value
    if bold is not None:
        anchor.bold=bold
    if italic is not None:
        anchor.italic=italic
    anchor.font.name="Verdana"
    anchor.font.size=Pt(10)
    return p

# Case-dependent header, recipient, subject, and salutation.
change(6,"[ИМЕ НА ВЪЗЛОЖИТЕЛЯ — НЕ Е УСТАНОВЕНО]",bold=True)
change(7,"[АДРЕС ЗА КОРЕСПОНДЕНЦИЯ — ЗА ПОПЪЛВАНЕ]",bold=True)
change(10,f"Относно: Уведомление за инвестиционно предложение (ИП): {SUBJECT} в ПИ с идентификатори {PARCELS} по КККР на {AREA}.",italic=True)
# Restore the approved visual split: bold italic 'Относно:', regular italic case description.
subject_p=d.paragraphs[10]
subject_p.runs[1].text="     Относно: "
subject_p.runs[3].text=f"Уведомление за инвестиционно предложение (ИП): {SUBJECT} в ПИ с идентификатори {PARCELS} по КККР на {AREA}."
subject_p.runs[3].bold=False
subject_p.runs[3].italic=True
change(13,"УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА,",bold=True)
change(16,f"Във връзка с внесеното в РИОСВ – Пловдив уведомление с {REF} за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от Наредбата за ОС Ви уведомявам следното:")
# The approved template's fixed normative section at paragraph 17 remains unchanged.
change(18,f"С реализацията на инвестиционното предложение се предвижда изграждане на складов обект за промишлени стоки и офиси в ПИ 56784.13.102, {AREA}. ПИ 56784.13.105 и ПИ 56784.13.106 са посочени като съпътстващи. Параметрите на сградите, видовете и количествата съхранявани стоки, както и транспортното обслужване подлежат на уточняване от пълната преписка.")
change(19,"Електроснабдяването се предвижда с мощност до около 30 kW. Начинът на присъединяване към съществуващата мрежа не е установен от наличния непълен откъс от уведомлението.")
change(20,"Водоснабдяването се предвижда от новопроектиран уличен водопровод. Точните условия за присъединяване, трасетата и необходимите съоръжения подлежат на сверяване с оригиналното уведомление и проектните материали.")
change(21,"За отвеждане на отпадъчните води се предвижда изграждане на водоплътна яма в границите на имота. Капацитетът, техническите параметри и обслужването на съоръжението подлежат на уточняване от документацията.")
change(22,f"Съгласно предоставения ГИС анализ поземлените имоти {PARCELS} не пресичат защитени зони от мрежата „Натура 2000“. Самостоятелната проверка относно защитени територии по Закона за защитените територии остава за извършване.")
change(23,"Най-близко разположени защитени зони: НЯМА ДАННИ в представения ГИС анализ за кодовете, имената и разстоянията. Не се възпроизвеждат зони от примерната преписка.")
# Preserve the A-template's five mandated impact criteria at indices 26-30 unchanged.
change(24,"За приложимостта на процедурите по глава шеста от ЗООС е необходима проверка на пълния характер, мащаб и капацитет на заявената складова дейност, включително видовете и количествата стоки. [ПРОЦЕДУРНИЯТ ИЗВОД Е ЗА ЕКСПЕРТНО ПОТВЪРЖДЕНИЕ]")
change(25,"С оглед заявеното местоположение извън границите на защитени зони и наличните данни за характера на ИП следва да се преценят вероятните преки, косвени и кумулативни въздействия, включително върху защитени зони извън имотния обхват, по отношение на:")
change(31,f"В тази връзка и на основание чл. 2, ал. 2 от Наредбата за ОС преценката на компетентния орган за инвестиционно предложение {SUBJECT} в поземлени имоти {PARCELS}, {AREA}, е: [ЗА ЕКСПЕРТНО ПОТВЪРЖДЕНИЕ СЛЕД ПРОВЕРКА НА ПЪЛНАТА ПРЕПИСКА].")
# Paragraphs 17, 26-30, 32-33, 38-40 are preserved in full from the approved source.
assert all(d.paragraphs[i].text==orig[i] for i in (17,26,27,28,29,30,32,33,38,39,40))
assert all(x not in "\n".join(p.text for p in d.paragraphs) for x in ("Асеновград","ПАНЧЕВА","гараж в УПИ","00702.516.432","Родопи-Средни","Добростан"))
# No invented document number, recipient or conclusory approval.
assert "НЕ Е УСТАНОВЕНО" in d.paragraphs[6].text
assert "ЕКСПЕРТНО ПОТВЪРЖДЕНИЕ" in d.paragraphs[31].text
d.save(OUT)
# Post-save double-check all original image and header/footer package parts survive.
z=Document(OUT)
assert len(z.paragraphs)==len(d.paragraphs)
from zipfile import ZipFile
with ZipFile(SRC) as a, ZipFile(OUT) as b:
    orig_media={n for n in a.namelist() if n.startswith("word/media/")}
    new_media={n for n in b.namelist() if n.startswith("word/media/")}
    assert orig_media == new_media,(orig_media,new_media)
    # python-docx reserializes namespace declaration order; compare text nodes, not raw bytes.
    from lxml import etree
    for n in (x for x in a.namelist() if x.startswith("word/header") or x.startswith("word/footer")):
        ao=etree.fromstring(a.read(n));bo=etree.fromstring(b.read(n))
        ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        assert ao.xpath(".//w:t/text()",namespaces=ns)==bo.xpath(".//w:t/text()",namespaces=ns),f"Header/footer text changed: {n}"
print("KT28 CANONICAL A SUCCESS",OUT,OUT.stat().st_size,"bytes",len(z.paragraphs),"paragraphs",len(orig_media),"preserved media")
print("UNCHANGED paragraphs: 17, 26-30, 32-33, 38-40")
print("CHANGED paragraphs: 6,7,10,13,16,18-25,31")
