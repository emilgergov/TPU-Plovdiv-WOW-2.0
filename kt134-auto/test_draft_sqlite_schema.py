import sqlite3
import unittest
from pathlib import Path

SCHEMA = Path(__file__).with_name("KT134_TEST_DRAFT_SCHEMA.sql").read_text(encoding="utf-8")
CASE = "11111111-1111-4111-8111-111111111111"

class DraftSchemaTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("CREATE TABLE kt126_registry (case_id TEXT PRIMARY KEY, revision INTEGER NOT NULL)")
        self.db.execute("INSERT INTO kt126_registry VALUES (?,4)", (CASE,))
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def insert(self, version, case=CASE):
        params=(case,4,version,"expert123","kt134-auto/file.docx",
            "a"*64,"b"*64,"c"*64,'{"caseId":"test"}',
            '["Относно: Тест"]',1234567890)
        return self.db.execute("""
            INSERT INTO kt134_auto_drafts (
            case_id,case_revision,proposal_version,actor_id,document_key,
            word_sha256,content_sha256,binding_sha256,proposal_json,
            preview_json,created_at_ms)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, params)

    def test_one_active_unapproved_draft_per_case(self):
        self.insert("v1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert("v2")
        self.db.execute("UPDATE kt134_auto_drafts SET status='superseded' WHERE proposal_version='v1'")
        self.insert("v2")
        self.assertEqual(self.db.execute(
            "SELECT count(*) FROM kt134_auto_drafts WHERE status='awaiting_expert'").fetchone()[0],1)

    def test_duplicate_version_is_rejected(self):
        self.insert("v1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert("v1")

    def test_foreign_case_is_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert("v1",case="22222222-2222-4222-8222-222222222222")

    def test_proposal_has_no_implicit_approval(self):
        self.insert("v1")
        self.assertEqual(self.db.execute("SELECT status FROM kt134_auto_drafts").fetchone()[0],
                         "awaiting_expert")
        self.assertIsNone(self.db.execute("SELECT approved_at_ms FROM kt134_auto_drafts").fetchone()[0])

    def test_revision_guard_rejects_stale_insertion(self):
        self.db.execute("UPDATE kt126_registry SET revision=5 WHERE case_id=?",(CASE,))
        self.db.execute("""INSERT INTO kt134_auto_drafts (
           case_id,case_revision,proposal_version,actor_id,document_key,
           word_sha256,content_sha256,binding_sha256,proposal_json,preview_json,created_at_ms)
           SELECT case_id,revision,?,?,?,?,?,?,?,?,?
           FROM kt126_registry WHERE case_id=? AND revision=?""",
           ("v1","expert123","kt134-auto/file.docx","a"*64,"b"*64,
            "c"*64,'{}','[]',1234567890,CASE,4))
        self.assertEqual(self.db.execute("SELECT count(*) FROM kt134_auto_drafts").fetchone()[0],0)

if __name__=="__main__":
    unittest.main(verbosity=2)
