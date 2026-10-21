"""V26 report acceptance tests; only synthetic coordinates and identifiers."""
import pathlib
import sys
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from v26_evidence_report import render_report
from v26_batch_analysis import analyze


def square(x1,y1,x2,y2):
    return {"type":"Polygon","coordinates":[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]}


class EvidenceReportTests(unittest.TestCase):
    def setUp(self):
        self.batch=analyze(
            [{"parcel_id":"TEST.40717.28.4","role":"LEADING","geometry":square(24,42,24.01,42.01)}],
            [{"zone_code":"BGTEST","source":"synthetic only","source_date":"TEST",
              "geometry":square(24.005,42,24.02,42.02)}])

    def test_report_has_map_table_provenance_and_warning(self):
        page=render_report(self.batch)
        for value in ["id=\"map\"","TEST.40717.28.4","BGTEST",
                      "synthetic only","EPSG:6933","РАБОТЕН СПРАВОЧЕН ДОКУМЕНТ",
                      "Запази като PDF"]:
            self.assertIn(value,page)

    def test_user_text_is_escaped(self):
        self.batch["results"][0]["parcel_id"]="<script>alert(1)</script>"
        page=render_report(self.batch,title="<bad>")
        self.assertNotIn("<script>alert(1)</script>",page)
        self.assertIn("&lt;bad&gt;",page)

    def test_wrong_schema_rejected(self):
        with self.assertRaises(ValueError):
            render_report({"schema":"wrong","results":[]})


if __name__=="__main__":
    unittest.main()
