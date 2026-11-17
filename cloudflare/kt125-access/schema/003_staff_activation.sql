-- KT125: apply this migration to an existing private D1 database before enabling
-- the two-step staff enrollment endpoints. Do not rerun after successful ALTER.
-- No user or dossier content is exposed; existing profiles remain unchanged.
ALTER TABLE kt125_users
 ADD COLUMN activation_pending INTEGER NOT NULL DEFAULT 0
 CHECK(activation_pending IN (0,1));
CREATE INDEX IF NOT EXISTS idx_kt125_pending_identity
 ON kt125_users(identity_provider,provider_subject,activation_pending);
