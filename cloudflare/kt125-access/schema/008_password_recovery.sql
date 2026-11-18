CREATE TABLE IF NOT EXISTS kt125_local_resets(
 reset_id TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,credential_version INTEGER NOT NULL,
 nonce TEXT NOT NULL,expires_at_ms INTEGER NOT NULL,used_at_ms INTEGER,
 mail_state TEXT NOT NULL CHECK(mail_state IN ('queued','sending','accepted','failed','uncertain')),
 created_at_ms INTEGER NOT NULL,FOREIGN KEY(account_id) REFERENCES kt125_local_accounts(account_id));

CREATE INDEX IF NOT EXISTS idx_kt125_reset_account ON kt125_local_resets(account_id,created_at_ms);