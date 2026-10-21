"""Produce self-contained synthetic GIS PDF + HTML via GitHub Actions.

Never claim that synthetic geometry is the archival or official zone.
"""
from __future__ import annotations
import json
from pathlib import Path
from v26_batch_analysis import analyze
from v26_evidence_report import save_report
from v26_evidence_pdf import save_pdf


def square(x1, y1, x2, y2):
    return {"type": "Polygon", "coordinates": [
        [[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]
    ]}


def main():
    folder = Path("v26-test-output")
    folder.mkdir(exist_ok=True)
    parcels = [{"parcel_id":"40717.28.4", "role":"LEADING",
                "geometry":square(24.05,42.05,24.07,42.07)}]
    zones = [{"zone_code":"BGTEST-SYNTHETIC", "source":"SYNTHETIC TEST ONLY",
              "geometry":square(24.06,42.06,24.09,42.09)}]
    batch = analyze(parcels,zones)
    assert batch["pair_count"] == 1, batch["issues"]
    assert batch["results"][0]["area_m2"] > 0
    assert batch["results"][0]["parcel_percent"] > 0
    save_report(batch,folder/"GIS_TEST_ONLY.html")
    save_pdf(batch,folder/"GIS_TEST_ONLY.pdf")
    (folder/"GIS_TEST_ONLY.json").write_text(
        json.dumps(batch,ensure_ascii=False,indent=2),encoding="utf-8")
    (folder/"README.txt").write_text(
        "SYNTHETIC TEST ONLY. Not an actual parcel or Natura 2000 boundary.\n"
        "Not valid for administrative or legal use.\n",encoding="utf-8")
    print("V26 SYNTHETIC HTML + VECTOR PDF GENERATED")


if __name__ == "__main__":
    main()
