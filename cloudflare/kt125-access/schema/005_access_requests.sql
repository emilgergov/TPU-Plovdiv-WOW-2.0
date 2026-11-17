-- Additive schema; runtime setup is also idempotent. Requires schema 004.
CREATE TABLE IF NOT EXISTS kt125_access_requests (
 request_id TEXT PRIMARY KEY NOT NULL,organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL,provider_subject TEXT NOT NULL,email TEXT NOT NULL,
 display_name TEXT NOT NULL,note TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL,
 decided_by TEXT,invitation_id TEXT UNIQUE,
 UNIQUE(identity_provider,email),UNIQUE(identity_provider,provider_subject),
 FOREIGN KEY(decided_by,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY(invitation_id) REFERENCES kt125_staff_invitations(invitation_id));

CREATE INDEX IF NOT EXISTS idx_kt125_requests_org ON kt125_access_requests(organization_id,created_at_ms);

CREATE TABLE IF NOT EXISTS kt125_invitation_mail (
 invitation_id TEXT PRIMARY KEY NOT NULL,organization_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('queued','sending','accepted','failed')),
 first_attempt_ms INTEGER,attempt_at_ms INTEGER,provider_id TEXT,
 from_email TEXT,activation_origin TEXT,
 FOREIGN KEY(invitation_id) REFERENCES kt125_staff_invitations(invitation_id));
