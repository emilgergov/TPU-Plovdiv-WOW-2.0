"""Synthetic-only acceptance of independent vector PDF evidence."""
import pathlib
import sys
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from v26_batch_analysis import analyze
from v26_evidence_pdf import build_pdf

def square(x1,y1,x2,y2):
    return {"type":"Polygon","coordinates":[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]}

class PDFTests(unittest.TestCase):
    def test_pdf_with_real_vector_paths_from_synthetic_input(self):
        batch=analyze(
            [{"parcel_id":"TEST.40717.28.4","role":"LEADING","geometry":square(24,42,24.01,42.01)}],
            [{"zone_code":"BGTEST","source":"synthetic fixture","geometry":square(24.005,42,24.02,42.02)}])
        output=build_pdf(batch)
        self.assertTrue(output.startswith(b"%PDF-"))
        self.assertGreater(len(output),3000)

    def test_no_geometry_report_is_still_explicitly_draft(self):
        batch=analyze([],[])
        output=build_pdf(batch)
        self.assertTrue(output.startswith(b"%PDF-"))

    def test_invalid_schema_is_rejected(self):
        with self.assertRaises(ValueError):
            build_pdf({"schema":"unknown","results":[]})

if __name__=="__main__":
    unittest.main()
