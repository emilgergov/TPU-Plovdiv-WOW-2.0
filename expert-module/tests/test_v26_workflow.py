"""Synthetic V26 dossier-to-report acceptance tests."""
import io
import pathlib
import sys
import unittest
from zipfile import ZipFile
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from v26_workflow import prepare_dossier, build_gis_evidence


def square(x1,y1,x2,y2):
    return {"type":"Polygon","coordinates":[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]}


def dossier():
    buffer=io.BytesIO()
    with ZipFile(buffer,"w") as z:
        z.writestr("уведомление.txt","Местоположение на ИП: 40717.28.4; друг имот 40717.28.5")
    return prepare_dossier(buffer.getvalue())


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.inventory=dossier()
        self.parcels={"40717.28.4":square(24,42,24.01,42.01),
                      "40717.28.5":square(24.02,42,24.03,42.01)}
        self.zones=[{"zone_code":"BGTEST","source":"synthetic fixture",
                     "geometry":square(24.005,41.99,24.025,42.02)}]

    def test_complete_synthetic_dossier_to_html(self):
        result=build_gis_evidence(self.inventory,confirmed_leading=["40717.28.4"],
                                  parcel_geometries=self.parcels,zones=self.zones)
        self.assertEqual(result["analysis"]["pair_count"],2)
        self.assertEqual(result["analysis"]["results"][0]["parcel_role"],"LEADING")
        self.assertEqual(result["analysis"]["results"][1]["parcel_role"],"SUPPORTING")
        self.assertIn("40717.28.4",result["html_report"])
        self.assertIn("40717.28.5",result["html_report"])
        self.assertEqual(result["legal_conclusion"],"NOT_GENERATED")

    def test_no_expert_confirmation_blocks(self):
        with self.assertRaises(ValueError):
            build_gis_evidence(self.inventory,confirmed_leading=[],
                               parcel_geometries=self.parcels,zones=self.zones)

    def test_missing_geometry_blocks_incomplete_report(self):
        with self.assertRaises(ValueError):
            build_gis_evidence(self.inventory,confirmed_leading=["40717.28.4"],
                               parcel_geometries={"40717.28.4":self.parcels["40717.28.4"]},
                               zones=self.zones)

    def test_no_zones_blocks_false_outside_conclusion(self):
        with self.assertRaises(ValueError):
            build_gis_evidence(self.inventory,confirmed_leading=["40717.28.4"],
                               parcel_geometries=self.parcels,zones=[])

    def test_unknown_leading_parcel_blocks(self):
        with self.assertRaises(ValueError):
            build_gis_evidence(self.inventory,confirmed_leading=["99999.1.1"],
                               parcel_geometries=self.parcels,zones=self.zones)


if __name__=="__main__":
    unittest.main()
