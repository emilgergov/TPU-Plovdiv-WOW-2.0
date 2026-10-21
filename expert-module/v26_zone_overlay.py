"""V26: independent protected-zone geometry overlay service.

Never reconstruct a zone polygon from historical intersection rows.
Input geometries must be GeoJSON in WGS84 (EPSG:4326).
Area uses EPSG:6933, matching the V26 PDF calculation convention.
This module does not attest source currency or legal status.
"""
from __future__ import annotations

from typing import Any


def _polygonal(geom):
    from shapely.geometry import GeometryCollection, MultiPolygon, Polygon
    if geom.is_empty:
        return GeometryCollection()
    if isinstance(geom, (Polygon, MultiPolygon)):
        return geom
    polys = [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]
    return MultiPolygon(polys) if polys else GeometryCollection()


def overlay(parcel_geojson: dict[str, Any],
            zone_geojson: dict[str, Any],
            *,
            parcel_id: str,
            zone_code: str,
            zone_source: str,
            zone_source_date: str | None = None) -> dict[str, Any]:
    """Return distinct parcel, zone and intersection GeoJSON features.

    Both inputs must be polygon/multipolygon GeoJSON geometries (not features).
    An explicit zone source is required. Geometry is validated, not silently repaired.
    """
    from shapely.geometry import mapping, shape
    from shapely.ops import transform
    from pyproj import Transformer

    if not zone_source.strip():
        raise ValueError("Missing protected-zone geometry source")
    parcel = shape(parcel_geojson)
    zone = shape(zone_geojson)
    if parcel.geom_type not in ("Polygon", "MultiPolygon"):
        raise ValueError("Parcel must be Polygon or MultiPolygon")
    if zone.geom_type not in ("Polygon", "MultiPolygon"):
        raise ValueError("Zone must be Polygon or MultiPolygon")
    if not parcel.is_valid or not zone.is_valid:
        raise ValueError("Invalid input geometry: expert correction required")
    if parcel.is_empty or zone.is_empty:
        raise ValueError("Empty parcel or zone geometry")

    intersection = _polygonal(parcel.intersection(zone))
    to_area = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True).transform
    area_m2 = transform(to_area, intersection).area if not intersection.is_empty else 0.0
    parcel_area_m2 = transform(to_area, parcel).area
    ratio = 100 * area_m2 / parcel_area_m2 if parcel_area_m2 > 0 else None

    def feature(geometry, layer, properties):
        return {"type": "Feature", "geometry": mapping(geometry),
                "properties": {"layer": layer, **properties}}

    return {
        "type": "FeatureCollection",
        "features": [
            feature(zone, "protected_zone", {"zone_code": zone_code,
                "source": zone_source, "source_date": zone_source_date,
                "verification": "SOURCE_REQUIRES_EXPERT_CONFIRMATION"}),
            feature(parcel, "parcel", {"parcel_id": parcel_id}),
            feature(intersection, "intersection", {"parcel_id": parcel_id,
                "zone_code": zone_code, "area_m2_epsg6933": round(area_m2, 3),
                "parcel_percent": round(ratio, 6) if ratio is not None else None}),
        ],
        "metadata": {
            "input_crs": "EPSG:4326", "area_crs": "EPSG:6933",
            "zone_source": zone_source, "zone_source_date": zone_source_date,
            "official_boundary_confirmed": False,
            "legal_conclusion": "NOT_GENERATED",
            "warning": "Zone boundary and source require independent expert verification.",
        },
    }
