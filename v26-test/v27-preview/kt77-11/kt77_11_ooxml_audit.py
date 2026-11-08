#!/usr/bin/env python3
"""KT77-11.2 -- independent, read-only OOXML audit of BOTH locked specimens.
Pure stdlib: no DOCX modification, no legal inference. JSON report as CI artifact.
"""
import hashlib
import json
import pathlib
import sys
import zipfile
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "kt77-11-ab-ooxml-report.json")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MODELS = {
    "A": ("KT35-A.docx", 41),
    "B": ("KT39-B.docx", 43),
}
BASE = ROOT / "v26-test" / "v27-preview" / "etalon"

def get(parent, tag):
    return parent.find(W + tag) if parent is not None else None

def attr(parent, field="val"):
    return parent.attrib.get(W + field) if parent is not None else None

def run_text(node):
    return "".join(n.text or "" for n in node.iter(W + "t"))

def run_record(r):
    rp = get(r, "rPr")
    bf, it, fonts = get(rp, "b"), get(rp, "i"), get(rp, "rFonts")
    def enabled(e):
        return None if e is None else attr(e) not in ("0", "false", "off")
    return {
        "text": run_text(r),
        "bold": enabled(bf),
        "italic": enabled(it),
        "font": attr(fonts, "ascii"),
        "size_half_points": attr(get(rp, "sz")),
        "highlight": attr(get(rp, "highlight")),
        "underline": attr(get(rp, "u")),
        "raw_run_xml": ET.tostring(r, encoding="unicode"),
    }

def paragraph_record(p, number):
    pr = get(p, "pPr")
    spacing = get(pr, "spacing")
    runs = [run_record(r) for r in p.findall(W + "r")]
    return {
        "number": number,
        "text": run_text(p),
        "empty": not run_text(p),
        "style": attr(get(pr, "pStyle")),
        "alignment": attr(get(pr, "jc")),
        "spacing": {k: attr(spacing, k) for k in ("before", "after", "line", "lineRule")},
        "runs": [r for r in runs if r["text"]],
        "all_run_count": len(runs),
        "raw_paragraph_xml": ET.tostring(p, encoding="unicode"),
    }

def inspect(mode, file, expected):
    path = BASE / file
    if not path.is_file():
        raise RuntimeError(f"missing locked {mode} specimen: {path}")
    with zipfile.ZipFile(path) as archive:
        allnames = archive.namelist()
        xml = ET.fromstring(archive.read("word/document.xml"))
        body = xml.find(".//" + W + "body")
        if body is None:
            raise RuntimeError(f"missing body in {file}")
        ps = [e for e in body if e.tag == W + "p"]
        if len(ps) != expected:
            raise RuntimeError(f"{mode}: expected {expected} direct paragraphs, found {len(ps)}")
        rows = [paragraph_record(p, idx) for idx, p in enumerate(ps, 1)]
        assets = [
            {"path": n, "sha256": hashlib.sha256(archive.read(n)).hexdigest()}
            for n in sorted(allnames) if n.startswith(("word/media/","word/header","word/footer"))
            or n in ("word/styles.xml", "word/numbering.xml", "[Content_Types].xml")
        ]
        return {
            "filename": file,
            "file_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "direct_paragraph_count": len(rows),
            "empty_paragraph_count": sum(r["empty"] for r in rows),
            "visible_run_count": sum(len(r["runs"]) for r in rows),
            "paragraphs": rows,
            "assets": assets,
        }

def main():
    report = {
        "schema": "kt77-11-original-a-b-ooxml-v1",
        "baseline_commit": "f407b176b477afb699643b73ce82ddf2e83badb0",
        "read_only": True,
        "scenarios": {},
        "acceptance": {"A": False, "B": False},
    }
    for mode, (filename, count) in MODELS.items():
        report["scenarios"][mode] = inspect(mode, filename, count)
        report["acceptance"][mode] = True
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS: original A 41/41; original B 43/43; OOXML paragraphs/styles/runs/header/footer assets audited.")
    print("REPORT:", OUT)
    print("BYTES:", OUT.stat().st_size)

if __name__ == "__main__":
    main()
