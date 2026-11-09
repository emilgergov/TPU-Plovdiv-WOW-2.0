#!/usr/bin/env python3
"""Read-only exact text+bold runs of paragraph 11 for both original DOCX specimens."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
ROOT=Path(__file__).resolve().parents[1]/"etalon"
W="{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
for label,filename,expected in [("A","KT35-A.docx",41),("B","KT39-B.docx",43)]:
 with ZipFile(ROOT/filename) as z:
  document=ET.fromstring(z.read("word/document.xml"))
  body=document.find(".//"+W+"body")
  ps=[p for p in body if p.tag==W+"p"]
  assert len(ps)==expected,(label,len(ps))
  for num in (7,8,11,17,18,19,20,21,22,23,24,25):
   p=ps[num-1]
   runs=[]
   for r in p.findall(W+"r"):
    t="".join(e.text or "" for e in r.iter(W+"t"))
    if not t:continue
    rp=r.find(W+"rPr")
    b=rp.find(W+"b") if rp is not None else None
    i=rp.find(W+"i") if rp is not None else None
    runs.append({"text":t,"bold":None if b is None else b.get(W+"val") not in ("0","false"),"italic":None if i is None else i.get(W+"val") not in ("0","false")})
   print("REVIEW "+json.dumps({"scenario":label,"paragraph":num,"text":"".join(x["text"] for x in runs),"runs":runs},ensure_ascii=False))
