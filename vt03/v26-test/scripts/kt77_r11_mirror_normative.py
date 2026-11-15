#!/usr/bin/env python3
"""KT77 R11: archive official, publicly accessible normative source bytes into OUR repo.
No downloaded source is asserted legally current; status and SHA-256 are mandatory.
No PDF, Word, AI, PI MASTER or GIS generator code is modified.
All fetching happens in an explicitly triggered archive-build job, NEVER per dossier.
"""
from __future__ import annotations
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError

ROOT=Path(__file__).resolve().parents[1]
ARCH=ROOT/"normative"/"offline"
ASSETS=ARCH/"assets"
MANIFEST=ARCH/"archive-manifest.json"
LIMIT=12*1024*1024
DEADLINE=12
MAX_ENTRIES=100
DATE="2026-11-08"
# Every source is strictly constrained to government/European Union domains.
def permitted(url):
    p=urlparse(url)
    h=(p.hostname or "").lower()
    return p.scheme=="https" and p.port in (None,443) and (
       h=="government.bg" or h.endswith(".government.bg") or
       h=="gov.bg" or h.endswith(".gov.bg") or
       h=="egov.bg" or h.endswith(".egov.bg") or
       h=="europa.eu" or h.endswith(".europa.eu")
    )
class Redirects(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not permitted(newurl):
            raise ValueError("Unsafe or non-official redirect blocked")
        return super().redirect_request(req,fp,code,msg,headers,newurl)
OPENER=build_opener(Redirects())
class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text=[]
        self.ignore=0
    def handle_starttag(self,tag,attrs):
        if tag in ("script","style","svg","noscript"):self.ignore+=1
        if tag in ("p","br","li","h1","h2","h3","h4","article","section"):self.text.append("\n")
    def handle_endtag(self,tag):
        if tag in ("script","style","svg","noscript"):self.ignore=max(0,self.ignore-1)
        if tag in ("p","li","h1","h2","h3","h4"):self.text.append("\n")
    def handle_data(self,data):
        if not self.ignore:self.text.append(data)
def as_text(data):
    for enc in ("utf-8-sig","windows-1251"):
        try:return data.decode(enc)
        except UnicodeError:pass
    return data.decode("utf-8",errors="replace")
def get(url):
    if not permitted(url):raise ValueError("Domain outside trusted official source allowlist")
    req=Request(url,headers={"User-Agent":"TPU-Plovdiv-Normative-Archival-Snapshot/1.0 (source integrity; no scraping of private data)","Accept":"application/pdf,text/html,text/plain,application/xhtml+xml,*/*;q=0.5"})
    with OPENER.open(req,timeout=DEADLINE) as response:
        final=response.geturl()
        if not permitted(final):raise ValueError("Redirect ended outside trusted official source allowlist")
        declared=response.headers.get("Content-Type","").split(";")[0].lower()
        data=response.read(LIMIT+1)
    if len(data)>LIMIT:raise ValueError("Document exceeds 12MiB per-source safety limit")
    if data.startswith(b"%PDF-"):return data,"pdf",final,declared
    # Preserve original PDF byte integrity, never save HTML error pages with .pdf suffix.
    if data[:80].lstrip().lower().startswith((b"<!doctype html",b"<html",b"<?xml")) or "html" in declared:
        parser=TextExtractor()
        parser.feed(as_text(data))
        text="\n".join(re.sub(r"[ \t]+"," ",x).strip() for x in "".join(parser.text).splitlines() if x.strip())
        if len(text)<80:raise ValueError("Dynamic or empty page; no usable normative text snapshot")
        return text.encode("utf-8"),"txt",final,declared
    if "text/" in declared or (data and b"\0" not in data[:4096]):
        text=as_text(data).strip()
        if len(text)<80:raise ValueError("Empty text")
        return text.encode("utf-8"),"txt",final,declared
    raise ValueError("Unsupported content (not PDF, HTML text, or plain text)")
def extract_pdf(data,path):
    exe=shutil.which("pdftotext")
    if not exe:return None
    target=path.with_suffix(".txt")
    run=subprocess.run([exe,"-layout","-enc","UTF-8",str(path),str(target)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=25)
    if run.returncode!=0 or not target.exists() or target.stat().st_size<40:
        target.unlink(missing_ok=True);return None
    return target
def main():
    ASSETS.mkdir(parents=True,exist_ok=True)
    raw=json.loads((ROOT/"normative"/"sources.json").read_text(encoding="utf-8"))
    primary=json.loads((ROOT/"data"/"normative-archive-register.json").read_text(encoding="utf-8"))
    seed=[]
    for e in raw["items"]:
        seed.append({"key":f"C{int(e['id']):03d}","title":e["title"],"url":e["url"],"source_type":"catalog"})
    for e in primary:
        seed.append({"key":f"R-{e['id']}","title":e["title"],"url":e["source"],"source_type":"primary_register"})
    if len(seed)>MAX_ENTRIES:raise ValueError("Unexpectedly large source register")
    unique={}
    entries=[]
    for i,e in enumerate(seed):
        url=e["url"]
        key=e["key"]
        record={"id":key,"title":e["title"],"official_url":url,"registry":e["source_type"],"archived":False,"sha256":None,"local_path":None,"kind":None,"error":None,"revision_verified":False}
        if url in unique:
            other=unique[url]
            record.update({k:other[k] for k in ("archived","sha256","local_path","kind","error","extracted_text_path") if k in other})
        else:
            if not permitted(url):
                record["error"]="Blocked: non-official hostname or insecure URL"
            else:
                try:
                    body,kind,final,declared=get(url)
                    digest=hashlib.sha256(body).hexdigest()
                    name=digest[:24]+"."+kind
                    file=ASSETS/name
                    if not file.exists():file.write_bytes(body)
                    if hashlib.sha256(file.read_bytes()).hexdigest()!=digest:raise ValueError("Archive checksum mismatch")
                    record.update({"archived":True,"sha256":digest,"local_path":"normative/offline/assets/"+name,"kind":kind,"bytes":len(body),"resolved_official_url":final,"declared_content_type":declared})
                    if kind=="pdf":
                        textfile=extract_pdf(body,file)
                        if textfile:record["extracted_text_path"]="normative/offline/assets/"+textfile.name
                except (HTTPError,URLError,TimeoutError,ValueError,OSError,subprocess.TimeoutExpired) as ex:
                    record["error"]=(type(ex).__name__+": "+str(ex))[:240]
            unique[url]=dict(record)
        entries.append(record)
        print(f"{i+1}/{len(seed)} {key} {'SAVED '+str(record.get('kind','')) if record['archived'] else 'PENDING '+str(record['error'])}",flush=True)
    archived=sum(e["archived"] for e in entries)
    manifest={
       "schema":"kt77-r11-local-normative-archive-v1",
       "archive_snapshot_utc":DATE,
       "scope":"Public official normative sources; copied into GitHub repo for at-dossier-time external-site independence",
       "contents_legally_verified":False,
       "complete":archived==len(entries),
       "total_registry_entries":len(entries),
       "archived_entries":archived,
       "missing_entries":len(entries)-archived,
       "sources":entries,
       "rules":{
           "all_dossier_reads_local_only":True,
           "never_infer_outside_zone_from_missing_document":True,
           "never_modify_approved_zz_conclusions":True,
           "zt_as_factual_findings":True,
           "a_b_scenario_based_on_zz_only":True,
           "unavailable_or_stale_entries_require_expert_review":True,
           "external_downloads_only_in_offline_archival_pipeline":True,
           "generator_integration_approved":False
       }
    }
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"OFFLINE_ARCHIVE archived {archived} / {len(entries)}; incomplete {len(entries)-archived}",flush=True)
    if archived==0:raise RuntimeError("No normative sources archived; fail closed")
if __name__=="__main__":main()
