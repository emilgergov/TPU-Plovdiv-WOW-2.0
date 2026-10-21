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


if __name__ == "__main__":
    unittest.main()
