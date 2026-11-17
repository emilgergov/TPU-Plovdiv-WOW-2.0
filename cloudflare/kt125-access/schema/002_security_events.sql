-- KT125: private security attempts, including unauthenticated/denied requests.
-- Separate from the case-action audit table because an unknown identity cannot
-- satisfy the verified actor foreign key in kt125_audit.
-- Never persist JWTs, passwords, request bodies or citizen dossier text.
CREATE TABLE IF NOT EXISTS kt125_security_events (
 event_id TEXT PRIMARY KEY NOT NULL,
 occurred_at_ms INTEGER NOT NULL,
 request_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('case.read','case.delegate','grant.revoke')),
 outcome TEXT NOT NULL CHECK (outcome IN ('allowed','denied')),
 reason TEXT NOT NULL,
 case_ref_digest TEXT,
 actor_user_id TEXT,
 CHECK(length(reason) <= 80),
 CHECK(case_ref_digest IS NULL OR length(case_ref_digest) = 64)
);
CREATE INDEX IF NOT EXISTS idx_kt125_security_events_time
 ON kt125_security_events(occurred_at_ms);
CREATE INDEX IF NOT EXISTS idx_kt125_security_events_actor_time
 ON kt125_security_events(actor_user_id,occurred_at_ms);
