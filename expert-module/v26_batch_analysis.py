"""V26 batch orchestration for expert review; no automatic legal decisions.

Input: iterable of {parcel_id, geometry, role?}, iterable of
{zone_code, geometry, source, source_date?}; GeoJSON geometry EPSG:4326.
Results retain each parcel-zone pair; overlapping zones are NOT summed
to calculate a parcel-wide coverage percentage.
"""
from __future__ import annotations

from typing import Any
from v26_zone_overlay import overlay


def analyze(parcels: list[dict[str, Any]], zones: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    issues = []
    seen_parcels = set()
    seen_zones = set()
    for i, parcel in enumerate(parcels):
        pid = str(parcel.get("parcel_id") or "").strip()
        if not pid:
            issues.append({"type": "MISSING_PARCEL_ID", "index": i})
            continue
        if pid in seen_parcels:
            issues.append({"type": "DUPLICATE_PARCEL_ID", "parcel_id": pid, "index": i})
            continue
        seen_parcels.add(pid)
        role = parcel.get("role", "UNCONFIRMED")
        if role not in ("LEADING", "SUPPORTING", "UNCONFIRMED"):
            issues.append({"type": "INVALID_PARCEL_ROLE", "parcel_id": pid})
            role = "UNCONFIRMED"
        for j, zone in enumerate(zones):
            zid = str(zone.get("zone_code") or "").strip()
            if not zid:
                issues.append({"type": "MISSING_ZONE_CODE", "parcel_id": pid, "index": j})
                continue
            try:
                geo = overlay(parcel["geometry"], zone["geometry"],
                              parcel_id=pid, zone_code=zid,
                              zone_source=str(zone.get("source") or ""),
                              zone_source_date=zone.get("source_date"))
                intersection = geo["features"][2]["properties"]
                results.append({"parcel_id": pid, "parcel_role": role,
                                "zone_code": zid,
                                "area_m2": intersection["area_m2_epsg6933"],
                                "parcel_percent": intersection["parcel_percent"],
                                "zone_source": geo["metadata"]["zone_source"],
                                "zone_source_date": geo["metadata"]["zone_source_date"],
                                "geometry": geo})
            except (KeyError, TypeError, ValueError) as exc:
                issues.append({"type": "GEOMETRY_OR_SOURCE_ERROR",
                               "parcel_id": pid, "zone_code": zid,
                               "detail": str(exc)})
    return {
        "schema": "V26_BATCH_1",
        "results": results,
        "issues": issues,
        "parcel_count": len(seen_parcels),
        "pair_count": len(results),
        "legal_conclusion": "NOT_GENERATED",
        "official_boundary_confirmed": False,
        "coverage_aggregation": "NOT_CALCULATED_OVERLAPPING_ZONES",
        "warning": "For expert review only; verify official boundaries and source dates.",
    }
