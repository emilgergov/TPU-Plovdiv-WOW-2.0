-- KT134 isolated draft persistence schema, never executed on production KT125.
-- This table stores metadata only. DOCX bytes live in private, access-controlled R2.
-- The existing KT126 registry and historic operation/audit tables are not altered.
CREATE TABLE IF NOT EXISTS kt134_auto_drafts (
 case_id TEXT NOT NULL,
 case_revision INTEGER NOT NULL CHECK(case_revision >= 0),
 proposal_version TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 document_key TEXT NOT NULL,
 word_sha256 TEXT NOT NULL CHECK(length(word_sha256)=64),
 content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64),
 binding_sha256 TEXT NOT NULL CHECK(length(binding_sha256)=64),
 proposal_json TEXT NOT NULL,
 preview_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'awaiting_expert'
   CHECK(status IN ('awaiting_expert','superseded','approved')),
 created_at_ms INTEGER NOT NULL CHECK(created_at_ms > 0),
 approved_at_ms INTEGER,
 PRIMARY KEY(case_id,proposal_version),
 FOREIGN KEY(case_id) REFERENCES kt126_registry(case_id)
);
CREATE INDEX IF NOT EXISTS kt134_auto_drafts_case_rev_idx
 ON kt134_auto_drafts(case_id,case_revision,created_at_ms DESC);
CREATE UNIQUE INDEX IF NOT EXISTS kt134_auto_one_active_draft
 ON kt134_auto_drafts(case_id) WHERE status='awaiting_expert';
