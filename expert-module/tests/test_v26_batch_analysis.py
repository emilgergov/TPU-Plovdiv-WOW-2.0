"""Synthetic acceptance tests for V26 batch analysis."""
import pathlib
import sys
import unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from v26_batch_analysis import analyze


def square(x1,y1,x2,y2):
    return {"type":"Polygon","coordinates":[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]}


class BatchTests(unittest.TestCase):
    def setUp(self):
        self.parcels = [
            {"parcel_id":"TEST.A","role":"LEADING","geometry":square(24,42,24.01,42.01)},
            {"parcel_id":"TEST.B","role":"SUPPORTING","geometry":square(24.02,42,24.03,42.01)}]
        self.zones = [
            {"zone_code":"BGTEST1","source":"synthetic fixture","geometry":square(24.005,41.99,24.025,42.02)},
            {"zone_code":"BGTEST2","source":"synthetic fixture","geometry":square(24.025,41.99,24.04,42.02)}]

    def test_two_parcels_two_zones(self):
        data=analyze(self.parcels,self.zones)
        self.assertEqual(data["pair_count"],4)
        self.assertEqual(data["issues"],[])
        self.assertEqual(data["results"][0]["parcel_role"],"LEADING")
        self.assertEqual(data["results"][2]["parcel_role"],"SUPPORTING")
        self.assertEqual(data["results"][1]["area_m2"],0)
        self.assertGreater(data["results"][3]["area_m2"],0)
        self.assertEqual(data["legal_conclusion"],"NOT_GENERATED")

    def test_duplicate_parcel_is_not_counted_twice(self):
        data=analyze(self.parcels+[self.parcels[0]],self.zones)
        self.assertEqual(data["pair_count"],4)
        self.assertIn("DUPLICATE_PARCEL_ID",[i["type"] for i in data["issues"]])

    def test_bad_geometry_does_not_abort_other_parcels(self):
        bad={"parcel_id":"TEST.BAD","geometry":{"type":"Point","coordinates":[24,42]}}
        data=analyze(self.parcels+[bad],self.zones)
        self.assertEqual(data["pair_count"],4)
        self.assertEqual(len([i for i in data["issues"] if i["type"]=="GEOMETRY_OR_SOURCE_ERROR"]),2)

    def test_missing_source_does_not_fake_official_verification(self):
        zones=[dict(self.zones[0],source="")]
        data=analyze(self.parcels,zones)
        self.assertEqual(data["pair_count"],0)
        self.assertFalse(data["official_boundary_confirmed"])
        self.assertEqual(len(data["issues"]),2)

    def test_no_zone_does_not_imply_legal_decision(self):
        data=analyze(self.parcels,[])
        self.assertEqual(data["pair_count"],0)
        self.assertEqual(data["legal_conclusion"],"NOT_GENERATED")


if __name__=="__main__":
    unittest.main()
