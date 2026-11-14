-- KT84-02. Run only against a newly created PRIVATE D1 database.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 user_id TEXT PRIMARY KEY,
 org_id TEXT NOT NULL,
 display_name TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('expert','reviewer','administrator')),
 status TEXT NOT NULL CHECK (status IN ('active','suspended')),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_org_idx ON users(org_id,status);
CREATE TABLE IF NOT EXISTS cases (
 case_id TEXT PRIMARY KEY,
 org_id TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES users(user_id),
 status TEXT NOT NULL CHECK (status IN ('active','archived')),
 version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
 subject TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cases_owner_idx ON cases(org_id,owner_id,status);
CREATE TABLE IF NOT EXISTS case_grants (
 grant_id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES cases(case_id),
 org_id TEXT NOT NULL,
 grantee_id TEXT NOT NULL REFERENCES users(user_id),
 granted_by TEXT NOT NULL REFERENCES users(user_id),
 actions_json TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('active','revoked')),
 created_at INTEGER NOT NULL,
 revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS case_grants_lookup_idx
 ON case_grants(case_id,org_id,grantee_id,status,expires_at);
CREATE TABLE IF NOT EXISTS case_documents (
 document_id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES cases(case_id),
 object_key TEXT NOT NULL UNIQUE,
 filename TEXT NOT NULL,
 media_type TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK (bytes >= 0),
 created_by TEXT NOT NULL REFERENCES users(user_id),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS case_documents_case_idx ON case_documents(case_id);
CREATE TABLE IF NOT EXISTS case_revisions (
 case_id TEXT NOT NULL REFERENCES cases(case_id),
 version INTEGER NOT NULL,
 editor_id TEXT NOT NULL REFERENCES users(user_id),
 changed_at INTEGER NOT NULL,
 PRIMARY KEY(case_id,version)
);
CREATE TABLE IF NOT EXISTS audit_events (
 event_id TEXT PRIMARY KEY,
 time INTEGER NOT NULL,
 request_id TEXT NOT NULL,
 actor_id TEXT,
 org_id TEXT,
 case_id TEXT,
 action TEXT NOT NULL,
 result TEXT NOT NULL,
 version INTEGER,
 details TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_events_org_idx ON audit_events(org_id,time);
