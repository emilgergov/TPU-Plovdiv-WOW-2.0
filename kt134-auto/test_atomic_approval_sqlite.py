import sqlite3
import unittest
from pathlib import Path

BASE = Path(__file__).parent
DRAFT = (BASE / "KT134_TEST_DRAFT_SCHEMA.sql").read_text(encoding="utf-8")
EXTRA = (BASE / "KT134_TEST_ATOMIC_APPROVAL.sql").read_text(encoding="utf-8")
# Last statement is an UPDATE: all seven parameters must refer to same proposal.
DDL, UPDATE = EXTRA.split("-- In one SQLite UPDATE:",1)
UPDATE = UPDATE[UPDATE.index("UPDATE kt134_auto_drafts"):]
CASE="11111111-1111-4111-8111-111111111111"
BINDING="c"*64
WORD="a"*64

class AtomicApprovalTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(":memory:")
  self.db.execute("PRAGMA foreign_keys=ON")
  self.db.execute("CREATE TABLE kt126_registry(case_id TEXT PRIMARY KEY, revision INTEGER NOT NULL)")
  self.db.execute("INSERT INTO kt126_registry VALUES (?,4)",(CASE,))
  self.db.executescript(DRAFT)
  self.db.executescript(DDL)
  self.db.execute("INSERT INTO kt134_test_approval_acl VALUES(?,?,1,1)",(CASE,"expert123"))
  self.db.execute("""INSERT INTO kt134_auto_drafts
   (case_id,case_revision,proposal_version,actor_id,document_key,
    word_sha256,content_sha256,binding_sha256,proposal_json,preview_json,created_at_ms)
   VALUES(?,?,?,?,?,?,?,?,?,?,?)""",(CASE,4,"v1","expert123","test/private.docx",
    "a"*64,"b"*64,BINDING,"{}","[]",1234567890))
  self.db.commit()
 def tearDown(self):self.db.close()
 def approve(self,rev=4,binding=BINDING,word=WORD,user="expert123",version="v1"):
  cur=self.db.execute(UPDATE,(1234567891,CASE,version,rev,binding,word,user))
  self.db.commit()
  return cur.rowcount
 def status(self):
  return self.db.execute("SELECT status FROM kt134_auto_drafts").fetchone()[0]
 def test_only_exact_match_approves_once(self):
  self.assertEqual(self.approve(),1)
  self.assertEqual(self.status(),"approved")
  self.assertEqual(self.approve(),0)
 def test_wrong_document_fails(self):
  self.assertEqual(self.approve(binding="d"*64),0)
  self.assertEqual(self.status(),"awaiting_expert")
 def test_wrong_word_bytes_hash_fails(self):
  self.assertEqual(self.approve(word="f"*64),0)
  self.assertEqual(self.status(),"awaiting_expert")
 def test_wrong_version_fails(self):
  self.assertEqual(self.approve(version="v2"),0)
 def test_revoked_right_fails(self):
  self.db.execute("UPDATE kt134_test_approval_acl SET active=0")
  self.assertEqual(self.approve(),0)
 def test_missing_confirmation_right_fails(self):
  self.db.execute("UPDATE kt134_test_approval_acl SET can_confirm=0")
  self.assertEqual(self.approve(),0)
 def test_other_actor_fails(self):
  self.assertEqual(self.approve(user="attacker"),0)
 def test_case_revision_changed_fails(self):
  self.db.execute("UPDATE kt126_registry SET revision=5")
  self.assertEqual(self.approve(),0)
 def test_old_claimed_revision_fails(self):
  self.assertEqual(self.approve(rev=5),0)
 def test_superseded_draft_fails(self):
  self.db.execute("UPDATE kt134_auto_drafts SET status='superseded'")
  self.assertEqual(self.approve(),0)
 def test_stale_after_expert_revoke_before_commit_fails(self):
  self.db.execute("UPDATE kt134_test_approval_acl SET can_confirm=0")
  self.assertEqual(self.approve(),0)
  self.assertEqual(self.status(),"awaiting_expert")

if __name__=="__main__":
 unittest.main(verbosity=2)
