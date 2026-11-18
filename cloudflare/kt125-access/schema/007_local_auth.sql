-- LOCAL97 own identities, password hashes, sessions and SMTP outbox.
-- Requires schemas 001 through 005; does not require provisional schema 006.
CREATE TABLE IF NOT EXISTS kt125_local_accounts (
 account_id TEXT PRIMARY KEY NOT NULL,organization_id TEXT NOT NULL,
 request_id TEXT NOT NULL UNIQUE,username TEXT NOT NULL UNIQUE,email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,display_name TEXT NOT NULL,note TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','approved','rejected')),
 approved_role TEXT CHECK(approved_role IN ('egmaster','administrator','expert','reviewer','delegated_expert')),
 user_id TEXT UNIQUE,existing_user_id TEXT,credential_version INTEGER NOT NULL DEFAULT 0,
 activation_nonce TEXT,activation_expires_ms INTEGER,activated_at_ms INTEGER,
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL,
 FOREIGN KEY(request_id) REFERENCES kt125_access_requests(request_id),
 FOREIGN KEY(user_id,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY(existing_user_id,organization_id) REFERENCES kt125_users(user_id,organization_id));

CREATE TABLE IF NOT EXISTS kt125_local_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,credential_version INTEGER NOT NULL,
 user_updated_at_ms INTEGER NOT NULL,created_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,
 FOREIGN KEY(account_id) REFERENCES kt125_local_accounts(account_id));

CREATE INDEX IF NOT EXISTS idx_kt125_local_session_account ON kt125_local_sessions(account_id);

CREATE TABLE IF NOT EXISTS kt125_local_outbox (
 mail_id TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,organization_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('queued','sending','accepted','failed','uncertain')),
 created_at_ms INTEGER NOT NULL,attempt_at_ms INTEGER,
 FOREIGN KEY(account_id) REFERENCES kt125_local_accounts(account_id));

CREATE TRIGGER IF NOT EXISTS kt125_revoke_local_sessions AFTER UPDATE OF active,role,updated_at_ms ON kt125_users
 WHEN OLD.active<>NEW.active OR OLD.role<>NEW.role OR OLD.updated_at_ms<>NEW.updated_at_ms
 BEGIN
 DELETE FROM kt125_local_sessions WHERE account_id IN (SELECT account_id FROM kt125_local_accounts WHERE user_id=NEW.user_id);
 UPDATE kt125_local_accounts SET credential_version=credential_version+1,approved_role=NEW.role WHERE user_id=NEW.user_id;
 END;

CREATE TABLE IF NOT EXISTS kt125_local_limits(bucket TEXT PRIMARY KEY NOT NULL,started_ms INTEGER NOT NULL,hits INTEGER NOT NULL);
