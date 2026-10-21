"""Private GitHub Actions real-data runner.

Expected input ZIP:
  parcels.geojson: FeatureCollection, each feature properties.KADNUM
  zones.geojson: FeatureCollection, each feature properties.zone_code,
                 properties.source and optional properties.source_date
This does NOT automatically certify official source currency.
"""
import json
import zipfile
from pathlib import Path
from v26_batch_analysis import analyze
from v26_evidence_pdf import save_pdf
from v26_evidence_report import save_report


def load_zip(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if sorted(names) != ["parcels.geojson", "zones.geojson"]:
            raise ValueError("Input ZIP must contain exactly parcels.geojson and zones.geojson")
        if any(archive.getinfo(n).file_size > 40_000_000 for n in names):
            raise ValueError("Input GeoJSON file too large")
        return [json.loads(archive.read(n)) for n in names]


def validate(fc, name):
    if not isinstance(fc,dict) or fc.get("type") != "FeatureCollection":
        raise ValueError(name+" must be GeoJSON FeatureCollection")
    if not isinstance(fc.get("features"),list) or not fc["features"]:
        raise ValueError(name+" must contain features")
    if len(fc["features"])>1000:
        raise ValueError(name+" contains too many features")


def run(bundle, output_dir):
    parcel_fc, zone_fc = load_zip(bundle)
    validate(parcel_fc,"parcels.geojson")
    validate(zone_fc,"zones.geojson")
    parcels = []
    for feature in parcel_fc["features"]:
        props=feature.get("properties") or {}
        pid=str(props.get("KADNUM") or "").strip()
        if not pid: raise ValueError("Parcel without KADNUM")
        role=props.get("role","UNCONFIRMED")
        parcels.append({"parcel_id":pid,"role":role,"geometry":feature.get("geometry")})
    zones = []
    for feature in zone_fc["features"]:
        props=feature.get("properties") or {}
        code=str(props.get("zone_code") or "").strip()
        source=str(props.get("source") or "").strip()
        if not code or not source: raise ValueError("Zone without code or provenance")
        zones.append({"zone_code":code,"source":source,
                      "source_date":props.get("source_date"),
                      "geometry":feature.get("geometry")})
    batch=analyze(parcels,zones)
    if batch["issues"] or batch["pair_count"]!=len(parcels)*len(zones):
        raise ValueError("Incomplete GIS analysis: "+repr(batch["issues"]))
    out=Path(output_dir);out.mkdir(parents=True,exist_ok=True)
    save_pdf(batch,out/"V26_REAL_GIS_DRAFT.pdf")
    save_report(batch,out/"V26_REAL_GIS_DRAFT.html")
    summary={"status":"DRAFT_REQUIRES_EXPERT_ACCEPTANCE",
             "parcel_count":len(parcels),"zone_count":len(zones),
             "pair_count":batch["pair_count"],"official_boundary_confirmed":False,
             "pairs":[{"parcel_id":x["parcel_id"],"zone_code":x["zone_code"],
                       "area_m2":x["area_m2"],"parcel_percent":x["parcel_percent"],
                       "zone_source":x["zone_source"]} for x in batch["results"]]}
    (out/"V26_REAL_GIS_DRAFT_SUMMARY.json").write_text(
        json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    return summary


if __name__=="__main__":
    import sys
    if len(sys.argv)!=3:raise SystemExit("Usage: python v26_real_build.py bundle.zip output-dir")
    print(json.dumps(run(sys.argv[1],sys.argv[2]),ensure_ascii=False,indent=2))
