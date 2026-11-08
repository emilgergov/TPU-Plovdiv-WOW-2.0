#!/usr/bin/env python3
"""KT77-11.3 -- evidence-gated SECONDARY Classic A/B DOCX editor.

Uses KT35-A / KT39-B as the actual output package, NOT a newly styled document.
Does not accept broad AI paragraph rewrites. Each exact replacement needs:
  - a confirmed parcel/subject/etc value that occurs verbatim in the primary Word,
  - the same value verbatim in a supplied primary dossier text source,
  - the unique old substring within ONE Word text run (preserves formatting),
  - the approved draft-slot index for its scenario.
No legal conclusions, orders or GIS facts can be rewritten at this stage.
By default it reports differences (dry-run) without editing anything.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import pathlib
import sys
import zipfile
from xml.dom import minidom

ROOT = pathlib.Path(__file__).resolve().parents[3]
DIR = ROOT / "v26-test" / "v27-preview" / "etalon"
INVENTORY = pathlib.Path(__file__).with_name("KT77_11_1_PARAGRAPH_SOURCE_INVENTORY.json")
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
DOCX = "word/document.xml"
SCENARIOS = {"A": ("KT35-A.docx", 41), "B": ("KT39-B.docx", 43)}
FACT_KINDS = frozenset({"parcel_id", "settlement", "municipality", "region", "subject", "recipient", "address", "reference", "locality"})
ALLOWED_POSITIONS = {"A": {7,8,11,17,19,20,21,22,23,24}, "B": {7,8,11,17,19,20,21,22,23,24}}
DANGEROUS = ("не е необходимо провеждане", "не подлежи на", "допустимо спрямо", "няма вероятност от отрицателно")

class GateError(ValueError):
    pass

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def direct_paragraphs(dom):
    body = dom.getElementsByTagNameNS(W, "body")
    if len(body) != 1:
        raise GateError("missing unique Word body")
    return [n for n in body[0].childNodes if n.nodeType == n.ELEMENT_NODE and n.namespaceURI == W and n.localName == "p"]

def text_nodes(p):
    return [n for n in p.getElementsByTagNameNS(W, "t")]

def ptext(p):
    return "".join("".join(c.data for c in t.childNodes if c.nodeType == c.TEXT_NODE) for t in text_nodes(p))

def load_docx(path, expected):
    with zipfile.ZipFile(path) as z:
        contents = {name: z.read(name) for name in z.namelist()}
    try:
        doc = minidom.parseString(contents[DOCX])
    except (KeyError, Exception) as exc:
        raise GateError(f"Invalid DOCX: {path}: {exc}") from exc
    ps = direct_paragraphs(doc)
    if len(ps) != expected:
        raise GateError(f"Unexpected paragraph count: {path} contains {len(ps)}, expected {expected}")
    return contents, doc, ps

def read_inventory(mode):
    data = json.loads(INVENTORY.read_text(encoding="utf8"))
    key = "classic_" + mode
    ps = data[key]["paragraphs"]
    if len(ps) != SCENARIOS[mode][1]:
        raise GateError("Contract mismatch for " + mode)
    return {p["paragraph"]: p for p in ps}

def differences(ref, primary):
    return [{"paragraph": i+1, "reference": ptext(a), "primary": ptext(b)}
            for i,(a,b) in enumerate(zip(ref, primary)) if ptext(a) != ptext(b)]

def parse_plan(args):
    if not args.plan:
        return []
    data = json.loads(pathlib.Path(args.plan).read_text(encoding="utf8"))
    if data.get("schema") != "kt77-11-3-evidence-patches-v1" or data.get("scenario") != args.scenario:
        raise GateError("Evidence plan schema or scenario mismatch")
    patches = data.get("patches")
    if not isinstance(patches, list):
        raise GateError("Invalid patch list")
    return patches

def check_patch(p, ref, primary, contract, old_seen, evidence_root):
    required = {"paragraph","kind","template_literal","value","source_file","source_quote"}
    if not isinstance(p,dict) or not required.issubset(p):
        raise GateError("Incomplete fact patch")
    index = p["paragraph"]
    if type(index) is not int or index not in ALLOWED_POSITIONS[contract["mode"]]:
        raise GateError(f"Unapproved paragraph index: {index}")
    if not contract["positions"][index]["candidate_variable"]:
        raise GateError(f"Not a candidate variable slot: {index}")
    kind = p["kind"]
    if kind not in FACT_KINDS:
        raise GateError(f"Prohibited fact kind: {kind}")
    old, value = p["template_literal"], p["value"]
    if not isinstance(old,str) or not isinstance(value,str) or not old.strip() or not value.strip():
        raise GateError("Missing literal/value")
    if old == value or len(value) > 600 or any(s in value.casefold() for s in DANGEROUS):
        raise GateError("Suspicious or case-specific legal conclusion as replacement")
    if (index, old) in old_seen:
        raise GateError("Duplicate patch target")
    old_seen.add((index,old))
    if ptext(primary[index-1]).count(value) != 1:
        raise GateError(f"Value must occur exactly once in primary Word paragraph {index}")
    source_file = p["source_file"]
    if not isinstance(source_file,str) or not source_file or pathlib.PurePath(source_file).is_absolute() or ".." in pathlib.PurePath(source_file).parts:
        raise GateError("Unsafe evidence path")
    full = (evidence_root / source_file).resolve()
    if not full.is_relative_to(evidence_root.resolve()) or not full.is_file():
        raise GateError("Evidence source not found")
    if full.stat().st_size > 2_000_000:
        raise GateError("Evidence source too large")
    source = full.read_text(encoding="utf8")
    q=p["source_quote"]
    if not isinstance(q,str) or not q.strip() or q not in source or value not in q:
        raise GateError("Value not literally supported by quoted primary document")
    hits = [(t, t.firstChild.data if t.firstChild else "") for t in text_nodes(ref[index-1])]
    matches = [(t, txt) for (t,txt) in hits if old in txt]
    if len(matches) != 1 or sum(txt.count(old) for _,txt in matches) != 1:
        raise GateError(f"Reference literal must occur in a unique single formatted run (p{index})")
    target, prev = matches[0]
    if len([x for x in target.childNodes if x.nodeType == x.TEXT_NODE]) != 1:
        raise GateError("Ambiguous text node; do not flatten run formatting")
    return target,prev.replace(old,value)

def run(args):
    mode=args.scenario
    template_file,n=SCENARIOS[mode]
    reference_path=DIR/template_file
    initial, refdoc, ref = load_docx(reference_path,n)
    _, srcdoc, primary = load_docx(pathlib.Path(args.primary),n)
    origxml=initial[DOCX]
    registry=read_inventory(mode)
    diffs=differences(ref,primary)
    report={
        "schema":"kt77-11-3-deterministic-secondary-report-v1",
        "scenario":mode,
        "original_specimen":template_file,
        "original_sha256":digest(reference_path.read_bytes()),
        "primary_sha256":digest(pathlib.Path(args.primary).read_bytes()),
        "paragraphs":n,
        "primary_vs_specimen_different_paragraphs":[d["paragraph"] for d in diffs],
        "changes":[],
        "warnings":[],
        "passed":False,
        "output_written":False,
    }
    if args.mode == "audit":
        report["warnings"].append("Read-only: primary Word differences reported; no approval of content or legal conclusion")
        return report
    if not args.plan or not args.evidence_root or not args.output:
        raise GateError("Secondary output requires explicit evidence plan, evidence root and output path")
    patches=parse_plan(args)
    if not patches:
        raise GateError("No verified replacement requests: second-stage DOCX not produced")
    evidence_root=pathlib.Path(args.evidence_root)
    if not evidence_root.is_dir():
        raise GateError("Evidence directory missing")
    old_seen=set()
    prepared=[]
    for p in patches:
        target,new_text=check_patch(p,ref,primary,{"mode":mode,"positions":registry},old_seen,evidence_root)
        prepared.append((target,new_text,p))
    # Apply all only after validation of ALL evidence and formatting constraints.
    for node,new_text,p in prepared:
        node.firstChild.data=new_text
        report["changes"].append({"paragraph":p["paragraph"],"kind":p["kind"],"source_file":p["source_file"],"source_quote":p["source_quote"]})
    # Validate: all untouched paragraphs maintain EXACT XML-level identity.
    for i,(old,new) in enumerate(zip(direct_paragraphs(minidom.parseString(origxml)),ref),1):
        if i not in {p["paragraph"] for _,_,p in prepared} and old.toxml()!=new.toxml():
            raise GateError(f"Fixed paragraph {i} changed")
    # Verify run formatting by removing TEXT from changed copy and compare serialized original tags.
    before=minidom.parseString(origxml)
    oldps=direct_paragraphs(before)
    for index in {p["paragraph"] for _,_,p in prepared}:
        a,b=oldps[index-1],ref[index-1]
        at,bt=text_nodes(a),text_nodes(b)
        if len(at)!=len(bt):
            raise GateError(f"Text run count changed p{index}")
        for x,y in zip(at,bt):
            if x.parentNode.toxml().split("<w:t")[0]!=y.parentNode.toxml().split("<w:t")[0]:
                raise GateError(f"Run properties changed p{index}")
    result_xml=refdoc.toxml(encoding="utf-8")
    minidom.parseString(result_xml)
    result=dict(initial)
    result[DOCX]=result_xml
    out=pathlib.Path(args.output)
    out.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(out,"w",compression=zipfile.ZIP_DEFLATED) as z:
        for name,content in result.items():
            z.writestr(name,content)
    # Independently reopen secondary document; check exact 41/43 structure and no resource edits.
    actual,_,changed=load_docx(out,n)
    if any(actual[name]!=content for name,content in initial.items() if name!=DOCX):
        out.unlink(missing_ok=True)
        raise GateError("Original resources changed")
    changed_ids={p["paragraph"] for _,_,p in prepared}
    for i,(base,new) in enumerate(zip(before and oldps,changed),1):
        if i not in changed_ids and base.toxml()!=new.toxml():
            out.unlink(missing_ok=True)
            raise GateError(f"Untouched paragraph XML changed: {i}")
    report.update({"passed":True,"output_written":True,"output_sha256":digest(out.read_bytes()),"modified_paragraphs":sorted(changed_ids),
                   "policy":"Exact single-run substitutions only, supported by primary Word and dossier quote; no legal/GIS conclusions"})
    return report

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--scenario",required=True,choices=SCENARIOS.keys())
    ap.add_argument("--mode",choices=("audit","build"),default="audit")
    ap.add_argument("--primary",required=True)
    ap.add_argument("--plan")
    ap.add_argument("--evidence-root")
    ap.add_argument("--output")
    ap.add_argument("--report")
    args=ap.parse_args(argv)
    try:
        r=run(args)
        if args.report:
            pathlib.Path(args.report).write_text(json.dumps(r,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps(r,ensure_ascii=False,indent=2))
    except (GateError, OSError, KeyError, ValueError) as exc:
        print(f"KT77-11.3 BLOCKED: {exc}",file=sys.stderr)
        return 2
    return 0

if __name__=="__main__":
    sys.exit(main())
