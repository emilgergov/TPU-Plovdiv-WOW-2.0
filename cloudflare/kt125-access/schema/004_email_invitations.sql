-- Additive, idempotent schema. The authorized invitation command initializes
-- these tables once; existing users, identities, roles and cases stay intact.
CREATE TABLE IF NOT EXISTS kt125_staff_profiles (
 user_id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL,
 email TEXT NOT NULL,
 display_name TEXT NOT NULL,
 UNIQUE(identity_provider,email),
 FOREIGN KEY(user_id,organization_id) REFERENCES kt125_users(user_id,organization_id)
);
CREATE TABLE IF NOT EXISTS kt125_staff_invitations (
 invitation_id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL,
 email TEXT NOT NULL,
 display_name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('expert','reviewer','delegated_expert')),
 status TEXT NOT NULL CHECK(status IN ('pending','accepted','revoked')),
 invited_by TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,
 expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms>created_at_ms),
 accepted_user_id TEXT,
 updated_at_ms INTEGER NOT NULL,
 FOREIGN KEY(invited_by,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY(accepted_user_id,organization_id) REFERENCES kt125_users(user_id,organization_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kt125_one_pending_email
 ON kt125_staff_invitations(identity_provider,email) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_kt125_invitation_org
 ON kt125_staff_invitations(organization_id,created_at_ms);
