"""Regression tests for V26 protected-zone overlay.

Run: python -m unittest discover -s expert-module/tests -p 'test_zone_overlay.py'
Dependencies: shapely, pyproj.
"""
import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).resolve().parents[1] / "v26_zone_overlay.py"
spec = importlib.util.spec_from_file_location("v26_zone_overlay", MODULE)
overlay_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(overlay_module)


def square(x1, y1, x2, y2):
    return {"type": "Polygon", "coordinates": [[
        [x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]
    ]]}


class OverlayTests(unittest.TestCase):
    def test_partial_overlap(self):
        result = overlay_module.overlay(square(24,42,24.01,42.01),
            square(24.005,42.005,24.02,42.02),
            parcel_id="TEST.1", zone_code="BGTEST", zone_source="test fixture")
        self.assertEqual([f["properties"]["layer"] for f in result["features"]],
                         ["protected_zone","parcel","intersection"])
        area = result["features"][2]["properties"]["area_m2_epsg6933"]
        self.assertGreater(area, 0)
        self.assertLess(area, result["features"][1]["geometry"]["coordinates"][0].__len__() * 1e9)
        self.assertFalse(result["metadata"]["official_boundary_confirmed"])

    def test_disjoint(self):
        result = overlay_module.overlay(square(24,42,24.01,42.01),
            square(25,43,25.01,43.01), parcel_id="TEST.1",
            zone_code="BGTEST", zone_source="test fixture")
        self.assertEqual(result["features"][2]["properties"]["area_m2_epsg6933"], 0)

    def test_missing_source_rejected(self):
        with self.assertRaises(ValueError):
            overlay_module.overlay(square(24,42,24.01,42.01),
                square(24,42,24.01,42.01), parcel_id="TEST.1",
                zone_code="BGTEST", zone_source="")

    def test_multipolygon(self):
        multi = {"type":"MultiPolygon","coordinates":[
            square(24,42,24.01,42.01)["coordinates"],
            square(25,43,25.01,43.01)["coordinates"]]}
        result = overlay_module.overlay(multi, square(24.005,42.005,24.02,42.02),
            parcel_id="TEST.1", zone_code="BGTEST", zone_source="test fixture")
        self.assertGreater(result["features"][2]["properties"]["area_m2_epsg6933"], 0)


    def test_full_containment_is_100_percent(self):
        parcel = square(24, 42, 24.01, 42.01)
        result = overlay_module.overlay(parcel, square(23.9, 41.9, 24.1, 42.1),
            parcel_id="TEST.FULL", zone_code="BGTEST", zone_source="synthetic test")
        self.assertAlmostEqual(result["features"][2]["properties"]["parcel_percent"], 100, places=5)

    def test_partial_percentage_uses_computed_area(self):
        parcel = square(24, 42, 24.02, 42.02)
        result = overlay_module.overlay(parcel, square(24.01, 42, 24.03, 42.02),
            parcel_id="TEST.HALF", zone_code="BGTEST", zone_source="synthetic test")
        pct = result["features"][2]["properties"]["parcel_percent"]
        self.assertAlmostEqual(pct, 50, delta=0.1)
        self.assertEqual(result["metadata"]["legal_conclusion"], "NOT_GENERATED")

    def test_touching_boundary_has_zero_area(self):
        result = overlay_module.overlay(square(24,42,24.01,42.01),
            square(24.01,42,24.02,42.01), parcel_id="TEST.TOUCH",
            zone_code="BGTEST", zone_source="synthetic test")
        self.assertEqual(result["features"][2]["properties"]["area_m2_epsg6933"], 0)

    def test_invalid_bowtie_rejected(self):
        bowtie = {"type":"Polygon","coordinates":[[
            [24,42],[24.02,42.02],[24,42.02],[24.02,42],[24,42]]]}
        with self.assertRaises(ValueError):
            overlay_module.overlay(bowtie, square(24,42,24.03,42.03),
                parcel_id="TEST.INVALID", zone_code="BGTEST", zone_source="synthetic test")

    def test_nonpolygon_rejected(self):
        point = {"type":"Point","coordinates":[24,42]}
        with self.assertRaises(ValueError):
            overlay_module.overlay(point, square(24,42,24.01,42.01),
                parcel_id="TEST.POINT", zone_code="BGTEST", zone_source="synthetic test")

    def test_multiple_parcels_multiple_zones_independently(self):
        parcels = {"TEST.A":square(24,42,24.01,42.01),
                   "TEST.B":square(24.02,42,24.03,42.01)}
        zones = {"BGTEST1":square(24.005,41.99,24.025,42.02),
                 "BGTEST2":square(24.025,41.99,24.04,42.02)}
        outcomes = {}
        for pid, parcel in parcels.items():
            for zid, zone in zones.items():
                result = overlay_module.overlay(parcel, zone, parcel_id=pid,
                    zone_code=zid, zone_source="synthetic test")
                outcomes[pid,zid] = result["features"][2]["properties"]["parcel_percent"]
                self.assertEqual(result["features"][1]["properties"]["parcel_id"], pid)
                self.assertEqual(result["features"][0]["properties"]["zone_code"], zid)
        self.assertGreater(outcomes["TEST.A","BGTEST1"], 0)
        self.assertEqual(outcomes["TEST.A","BGTEST2"], 0)
        self.assertGreater(outcomes["TEST.B","BGTEST1"], 0)
        self.assertGreater(outcomes["TEST.B","BGTEST2"], 0)

    def test_source_traceability_retained(self):
        result = overlay_module.overlay(square(24,42,24.01,42.01),
            square(24,42,24.02,42.02), parcel_id="TEST.SOURCE",
            zone_code="BGTEST", zone_source="archival fixture", zone_source_date="2008-10")
        self.assertEqual(result["metadata"]["zone_source_date"], "2008-10")
        self.assertFalse(result["metadata"]["official_boundary_confirmed"])
        self.assertEqual(result["features"][0]["properties"]["verification"],
                         "SOURCE_REQUIRES_EXPERT_CONFIRMATION")


if __name__ == "__main__":
    unittest.main()
