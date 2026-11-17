-- KT125 private D1 storage, isolated from GitHub Pages and existing R6.
-- Apply only after selecting a trusted service identity provider.
-- This schema is NOT deployed and includes no live citizen or dossier data.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kt125_users (
 user_id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL,
 provider_subject TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('egmaster','administrator','expert','reviewer','delegated_expert')),
 active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
 created_at_ms INTEGER NOT NULL,
 updated_at_ms INTEGER NOT NULL,
 UNIQUE(identity_provider,provider_subject),
 UNIQUE(user_id,organization_id)
);

CREATE TABLE IF NOT EXISTS kt125_cases (
 case_id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL,
 owner_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sealed','archived')),
 created_at_ms INTEGER NOT NULL,
 updated_at_ms INTEGER NOT NULL,
 FOREIGN KEY (owner_id,organization_id) REFERENCES kt125_users(user_id,organization_id)
);

CREATE TABLE IF NOT EXISTS kt125_grants (
 grant_id TEXT PRIMARY KEY NOT NULL,
 case_id TEXT NOT NULL,
 organization_id TEXT NOT NULL,
 grantor_id TEXT NOT NULL,
 grantee_id TEXT NOT NULL,
 actions_json TEXT NOT NULL,
 not_before_ms INTEGER NOT NULL,
 expires_at_ms INTEGER NOT NULL,
 revoked_at_ms INTEGER,
 created_at_ms INTEGER NOT NULL,
 CHECK(expires_at_ms > not_before_ms),
 CHECK(grantor_id <> grantee_id),
 FOREIGN KEY (case_id) REFERENCES kt125_cases(case_id),
 FOREIGN KEY (grantor_id,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY (grantee_id,organization_id) REFERENCES kt125_users(user_id,organization_id)
);

CREATE INDEX IF NOT EXISTS idx_kt125_grants_case_user
 ON kt125_grants(case_id,grantee_id,expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_kt125_cases_owner
 ON kt125_cases(organization_id,owner_id);

-- Append-only log: no update/delete privileges are granted to application roles.
-- Enforce separate append-only write privileges via backend service.
CREATE TABLE IF NOT EXISTS kt125_audit (
 event_id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL,
 case_id TEXT,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL,
 outcome TEXT NOT NULL CHECK(outcome IN ('allowed','denied','created','revoked')),
 timestamp_ms INTEGER NOT NULL,
 request_id TEXT NOT NULL,
 details_json TEXT NOT NULL,
 FOREIGN KEY (actor_id,organization_id) REFERENCES kt125_users(user_id,organization_id)
);
CREATE INDEX IF NOT EXISTS idx_kt125_audit_case ON kt125_audit(case_id,timestamp_ms);

-- A stable numbered register belongs to KT126. No local pseudo-number is
-- substituted for a real деловоден входящ номер in this KT125 schema.
