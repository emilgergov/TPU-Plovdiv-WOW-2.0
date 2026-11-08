#!/usr/bin/env python3
"""KT77-11.3: two-scenario deterministic, isolated regression tests."""
import json
import pathlib
import re
import sys
import tempfile
import zipfile
from xml.dom import minidom
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import kt77_11_3_secondary_editor as editor

def find_replacement(ps):
    for i in (11,19,20,21,22,7,8,17):
        for t in editor.text_nodes(ps[i-1]):
            txt=t.firstChild.data if t.firstChild else ""
            for m in re.finditer(r"\b\d{5}\.\d+\.\d+\b",txt):
                old=m.group(0)
                if editor.ptext(ps[i-1]).count(old)==1 and txt.count(old)==1:
                    return i,t,old,"99999.999.999"
    raise AssertionError("No unique cadastral identifier in approved variable positions")

def make_primary(original,target,value,path):
    with zipfile.ZipFile(original) as z:
        parts={n:z.read(n) for n in z.namelist()}
    doc=minidom.parseString(parts["word/document.xml"])
    ps=editor.direct_paragraphs(doc)
    at=editor.text_nodes(ps[target[0]-1])
    match=next(x for x in at if x.firstChild and target[2] in x.firstChild.data)
    match.firstChild.data=match.firstChild.data.replace(target[2],value)
    parts["word/document.xml"]=doc.toxml(encoding="utf-8")
    with zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED) as z:
        for n,contents in parts.items():
            z.writestr(n,contents)

def exercise(mode,root):
    source=editor.DIR/editor.SCENARIOS[mode][0]
    _,doc,ps=editor.load_docx(source,editor.SCENARIOS[mode][1])
    idx,t,old,new=find_replacement(ps)
    assert old!=new
    primary=root/(mode+"-primary.docx")
    make_primary(source,(idx,t,old),new,primary)
    quote=f"От уведомлението: имот с идентификатор {new}, съответен на изричната проверка."
    (root/"source.txt").write_text(quote,encoding="utf-8")
    plan={"schema":"kt77-11-3-evidence-patches-v1","scenario":mode,"patches":[{
        "paragraph":idx,"kind":"parcel_id","template_literal":old,
        "value":new,"source_file":"source.txt","source_quote":quote
    }]}
    (root/"plan.json").write_text(json.dumps(plan),encoding="utf-8")
    argv=["--scenario",mode,"--primary",str(primary)]
    def args(extra):
        parser=type("ARGS",(),{})
        a=parser()
        a.scenario=mode;a.primary=str(primary);a.mode=extra
        a.plan=str(root/"plan.json");a.evidence_root=str(root);a.output=str(root/(mode+"-secondary.docx"))
        return a
    diagnostic=editor.run(args("audit"))
    assert diagnostic["output_written"] is False and idx in diagnostic["primary_vs_specimen_different_paragraphs"]
    built=editor.run(args("build"))
    assert built["passed"] and built["modified_paragraphs"]==[idx] and built["output_written"]
    original,_,before=editor.load_docx(source,editor.SCENARIOS[mode][1])
    actual,_,after=editor.load_docx(pathlib.Path(args("build").output),editor.SCENARIOS[mode][1])
    assert len(after)==len(before) and new in editor.ptext(after[idx-1])
    assert all(editor.ptext(a)==editor.ptext(b) for i,(a,b) in enumerate(zip(before,after),1) if i!=idx)
    assert all(actual[k]==original[k] for k in original if k!="word/document.xml")
    # Primary Word must contain new fact; unsupported legal conclusion never allowed.
    bad=type("ARGS",(),vars(args("build")))()
    plan["patches"][0]["kind"]="legal_conclusion"
    (root/"plan.json").write_text(json.dumps(plan),encoding="utf-8")
    try:
        editor.run(args("build"))
        raise AssertionError("Rejected legal rewrite was accepted")
    except editor.GateError:
        pass
    # Missing dossier quote must reject the entire output.
    plan["patches"][0]["kind"]="parcel_id"
    plan["patches"][0]["source_quote"]="Несъществуващ цитат!"
    (root/"plan.json").write_text(json.dumps(plan),encoding="utf-8")
    try:
        editor.run(args("build"))
        raise AssertionError("Missing dossier evidence was accepted")
    except editor.GateError:
        pass
    print(f"PASS: Classic {mode} {len(after)}/{len(before)} paragraphs, approved exact edit at §{idx}; resources byte-identical; unsupported legal and undocumented changes BLOCKED")

if __name__=="__main__":
    for m in ("A","B"):
        with tempfile.TemporaryDirectory(prefix=f"kt77-{m}-") as tmp:
            exercise(m,pathlib.Path(tmp))
