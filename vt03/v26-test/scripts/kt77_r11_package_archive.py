#!/usr/bin/env python3
"""Package exact SHA-verified normative documents into a portable ZIP.
Does not access external URLs. Keeps missing-source inventory and version evidence.
"""
import hashlib,json
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED,ZIP_STORED,ZipInfo
ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/"normative"/"offline"
MANIFEST=FOLDER/"archive-manifest.json"
ZIP=FOLDER/"TPU_Plovdiv_Normative_Archive_KT77_R11.zip"
def record_path(name):return ROOT/name
manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
assert manifest["schema"]=="kt77-r11-local-normative-archive-v1"
assert not manifest["contents_legally_verified"]
files={MANIFEST:"archive-manifest.json"}
for row in manifest["sources"]:
    if row["archived"]:
        p=record_path(row["local_path"])
        assert p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==row["sha256"]
        files[p]=row["local_path"]
        if row.get("extracted_text_path"):
            t=record_path(row["extracted_text_path"])
            if t.exists():files[t]=row["extracted_text_path"]
# Offline backup must include the verified excerpt records and source catalog.
for src,name in [
    (ROOT/"data"/"normative-archive-register.json","data/normative-archive-register.json"),
    (ROOT/"data"/"verified-legal-excerpts-20261028.json","data/verified-legal-excerpts-20261028.json"),
    (ROOT/"normative"/"sources.json","normative/sources.json"),
    (ROOT/"v27-preview"/"kt77-r11-zzt-normative-supplement.json","v27-preview/kt77-r11-zzt-normative-supplement.json"),
    (ROOT/"v27-preview"/"KT77_R11_ZZT_LEGAL_SOURCE_QA_2026-11-08.md","KT77_R11_ZZT_LEGAL_SOURCE_QA_2026-11-08.md")
]:
    assert src.exists(),src
    files[src]=name
readme=("TPU Пловдив · Самостоятелен нормативен архив · КТ77 R11\n"
"Всички файлове в ZIP са съхранени при нас, не изискват външни сайтове.\n"
"Регистърните записи са: "+str(manifest["total_registry_entries"])+
"; с локално копие: "+str(manifest["archived_entries"])+
"; без локално копие: "+str(manifest["missing_entries"])+".\n"
"За липсващите записи отворете archive-manifest.json и потърсете archived=false.\n"
"Проверен SHA-256 на всяко съхранено PDF/TXT копие е в archive-manifest.json.\n"
"Публикуваното копие не означава независимо юридическо удостоверяване на актуална редакция.\n"
"ЗТ са констатации; ЗЗ определят сценария А/Б и заключенията.\n"
"Генераторите остават заключени до отделно съгласувано внедряване.\n")
def add(z,name,content,stored=False):
    info=ZipInfo(name,date_time=(2026,11,8,0,0,0))
    info.compress_type=ZIP_STORED if stored else ZIP_DEFLATED
    info.external_attr=0o644<<16
    z.writestr(info,content)
with ZipFile(ZIP,"w") as z:
    add(z,"README.txt",readme.encode("utf-8"))
    for f,name in sorted(files.items(),key=lambda x:x[1]):
        add(z,name,f.read_bytes(),f.suffix==".pdf")
sha=hashlib.sha256(ZIP.read_bytes()).hexdigest()
(FOLDER/(ZIP.name+".sha256")).write_text(sha+"  "+ZIP.name+"\n",encoding="utf-8")
with ZipFile(ZIP) as z:
    assert z.testzip() is None
    assert "archive-manifest.json" in z.namelist()
    assert "data/normative-archive-register.json" in z.namelist()
print("PORTABLE ARCHIVE",ZIP.name,ZIP.stat().st_size,"bytes",len(files)+1,"members SHA256",sha)
