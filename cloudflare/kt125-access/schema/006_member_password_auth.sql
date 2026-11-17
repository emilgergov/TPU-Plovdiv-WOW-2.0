-- PASSWORD96 local identity/session metadata only. No password hashes or registration codes.
-- Requires schemas 001 through 005. Runtime setup is also idempotent.
CREATE TABLE IF NOT EXISTS kt125_member_accounts (
 identity_provider TEXT NOT NULL,provider_subject TEXT NOT NULL,email TEXT NOT NULL,
 username TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL UNIQUE,
 credential_version INTEGER NOT NULL DEFAULT 0,reset_until_ms INTEGER NOT NULL DEFAULT 0,
 linked_user_id TEXT UNIQUE REFERENCES kt125_users(user_id),
 PRIMARY KEY(identity_provider,provider_subject),UNIQUE(identity_provider,email),
 FOREIGN KEY(request_id) REFERENCES kt125_access_requests(request_id));

CREATE TABLE IF NOT EXISTS kt125_registration_challenges (
 token_hash TEXT PRIMARY KEY NOT NULL,email TEXT NOT NULL,username TEXT NOT NULL,
 display_name TEXT NOT NULL,note TEXT NOT NULL,organization_id TEXT NOT NULL,
 expires_at_ms INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,
 verified_provider TEXT,verified_subject TEXT,verified_at_ms INTEGER);

CREATE TABLE IF NOT EXISTS kt125_member_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,identity_provider TEXT NOT NULL,provider_subject TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,credential_version INTEGER NOT NULL,
 FOREIGN KEY(identity_provider,provider_subject) REFERENCES kt125_member_accounts(identity_provider,provider_subject));

CREATE INDEX IF NOT EXISTS idx_kt125_member_sessions_subject ON kt125_member_sessions(identity_provider,provider_subject);

CREATE TABLE IF NOT EXISTS kt125_auth_limits (
 bucket TEXT PRIMARY KEY NOT NULL,window_start_ms INTEGER NOT NULL,hits INTEGER NOT NULL);
