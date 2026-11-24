-- KT134 isolated approval test schema. ONLY for dedicated test D1.
-- Production KT125 ACL is authoritative; this test table is not a replacement.
CREATE TABLE IF NOT EXISTS kt134_test_approval_acl (
 case_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 can_confirm INTEGER NOT NULL DEFAULT 0 CHECK(can_confirm IN (0,1)),
 PRIMARY KEY(case_id,user_id),
 FOREIGN KEY(case_id) REFERENCES kt126_registry(case_id)
);
-- In one SQLite UPDATE: status + revision + exact document hash + active ACL.
-- ?1 now_ms, ?2 case_id, ?3 version, ?4 case_revision,
-- ?5 binding_sha256, ?6 actor_id
UPDATE kt134_auto_drafts
SET status='approved',approved_at_ms=?1
WHERE case_id=?2 AND proposal_version=?3 AND case_revision=?4
AND binding_sha256=?5 AND status='awaiting_expert'
AND EXISTS (
 SELECT 1 FROM kt126_registry r
 WHERE r.case_id=kt134_auto_drafts.case_id AND r.revision=?4
)
AND EXISTS (
 SELECT 1 FROM kt134_test_approval_acl a
 WHERE a.case_id=?2 AND a.user_id=?6
 AND a.active=1 AND a.can_confirm=1
);
