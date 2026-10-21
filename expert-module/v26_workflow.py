"""V26 end-to-end local workflow: ZIP inventory -> expert-confirmed IDs -> GIS report.

No automatic designation of leading parcels, no remote uploads, no legal
conclusions. GeoJSON must be supplied from a separately documented source.
"""
from __future__ import annotations
from v26_dossier_intake import inspect_zip
from v26_batch_analysis import analyze
from v26_evidence_report import render_report


def prepare_dossier(zip_bytes: bytes) -> dict:
    return inspect_zip(zip_bytes)


def build_gis_evidence(inventory: dict, *,
                       confirmed_leading: list[str],
                       parcel_geometries: dict,
                       zones: list[dict]) -> dict:
    if inventory.get("schema") != "V26_DOSSIER_INVENTORY_1":
        raise ValueError("Invalid dossier inventory")
    candidates = set(inventory["candidate_parcels"])
    leading = set(confirmed_leading)
    if not leading:
        raise ValueError("Leading parcels require explicit expert confirmation")
    if len(leading) != len(confirmed_leading):
        raise ValueError("Duplicate leading parcel confirmation")
    if not leading.issubset(candidates):
        raise ValueError("Confirmed leading parcels must occur in dossier candidates")
    if inventory["issues"]:
        raise ValueError("Dossier safety issues require expert resolution")
    if not zones:
        raise ValueError("No protected-zone geometries supplied; coverage unverified")
    parcels = []
    missing = []
    for pid in sorted(candidates):
        if pid not in parcel_geometries:
            missing.append(pid)
            continue
        parcels.append({"parcel_id":pid,
                        "role":"LEADING" if pid in leading else "SUPPORTING",
                        "geometry":parcel_geometries[pid]})
    if missing:
        raise ValueError("Missing parcel geometries: " + ", ".join(missing))
    batch = analyze(parcels, zones)
    if batch["issues"] or batch["pair_count"] != len(parcels) * len(zones):
        raise ValueError("GIS analysis incomplete; review technical issues before report")
    return {"inventory": inventory, "analysis": batch,
            "html_report": render_report(batch),
            "status": "DRAFT_EXPERT_REVIEW_REQUIRED",
            "official_boundary_confirmed": False,
            "legal_conclusion": "NOT_GENERATED"}
