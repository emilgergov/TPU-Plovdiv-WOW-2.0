"""Safe dossier intake regression tests: synthetic only."""
import io
import pathlib
import sys
import unittest
from zipfile import ZipFile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from v26_dossier_intake import inspect_zip


def zip_bytes(entries):
    buf = io.BytesIO()
    with ZipFile(buf, "w") as z:
        for name, data in entries.items():
            z.writestr(name, data)
    return buf.getvalue()


class IntakeTests(unittest.TestCase):
    def test_nested_inventory_and_candidates(self):
        archive=zip_bytes({"Преписка/уведомление.txt":
            "Местоположение на ИП: 40717.28.4 и 40717.28.5".encode("utf-8"),
            "Преписка/приложения/скица.pdf":b"%PDF-1.4"})
        result=inspect_zip(archive)
        self.assertEqual(len(result["files"]),2)
        self.assertIn("40717.28.4",result["candidate_parcels"])
        self.assertIn("40717.28.5",result["candidate_parcels"])
        self.assertEqual(result["leading_parcels"],[])
        self.assertEqual(result["legal_conclusion"],"NOT_GENERATED")

    def test_unsafe_parent_path_is_skipped(self):
        result=inspect_zip(zip_bytes({"../secret.txt":"40717.28.4","ok.txt":"40717.28.5"}))
        self.assertEqual(len(result["files"]),1)
        self.assertIn("UNSAFE_PATH",[i["type"] for i in result["issues"]])

    def test_fake_ids_not_matched(self):
        result=inspect_zip(zip_bytes({"notes.txt":"x40717.28.4.5 40717.28.4"}))
        self.assertEqual(list(result["candidate_parcels"]),["40717.28.4"])

    def test_invalid_zip_rejected(self):
        with self.assertRaises(ValueError):
            inspect_zip(b"not a zip")


if __name__=="__main__":
    unittest.main()
