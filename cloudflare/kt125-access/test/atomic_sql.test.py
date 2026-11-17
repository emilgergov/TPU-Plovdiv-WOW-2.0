#!/usr/bin/env python3
"""KT125: run real SQLite authorization mutation SQL extracted from the JS module.
No private worker, Cloudflare, or production credentials are used.
"""
import pathlib
import re
import sqlite3
from contextlib import contextmanager

ROOT = pathlib.Path(__file__).resolve().parents[1]
schema = (ROOT / "schema/001_private_access.sql").read_text()
source = (ROOT / "src/grant-commands.mjs").read_text()
def sql_of(var: str, start=0):
    found = re.search(r"const " + re.escape(var) + r"=db\.prepare\(\x60(.*?)\x60\)\.bind", source[start:], re.S)
    assert found, f"Cannot find SQL for {var}"
    return found.group(1)
grant_start=source.index("export async function issueKT125Grant")
revoke_start=source.index("export async function revokeKT125Grant")
issue_insert=sql_of("insert",grant_start)
issue_audit=sql_of("audit",grant_start)
revoke_update=sql_of("update",revoke_start)
revoke_audit=sql_of("audit",revoke_start)
now=1794891600000
db=sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript(schema)
db.execute("INSERT INTO kt125_users VALUES(?,?,?,?,?,?,?,?)",
 ("alice","riosv-plovdiv","idp","sub-a","expert",1,now,now))
db.execute("INSERT INTO kt125_users VALUES(?,?,?,?,?,?,?,?)",
 ("bob","riosv-plovdiv","idp","sub-b","delegated_expert",1,now,now))
db.execute("INSERT INTO kt125_cases VALUES(?,?,?,?,?,?)",
 ("case-a","riosv-plovdiv","alice","active",now,now))
db.commit()

def issue(grant_id,actor="alice",case_id="case-a"):
    before=db.total_changes
    with db:
        first=db.execute(issue_insert,(
            grant_id,actor,'["case.read"]',now,now+1000,now,
            "bob",case_id,"riosv-plovdiv",actor))
        mutation_count=first.rowcount
        audited=db.execute(issue_audit,(
            "evt-"+grant_id,actor,now,"req-"+grant_id,
            '{"grant_id":"'+grant_id+'"}',grant_id,actor))
        audit_count=audited.rowcount
    return mutation_count,audit_count

assert issue("grant-1") == (1,1)
assert db.execute("SELECT count(*) FROM kt125_grants").fetchone()[0] == 1
assert db.execute("SELECT count(*) FROM kt125_audit").fetchone()[0] == 1
assert issue("grant-denied",actor="bob") == (0,0)
assert db.execute("SELECT count(*) FROM kt125_audit").fetchone()[0] == 1

def revoke(grant_id,actor="alice"):
    with db:
        updated=db.execute(revoke_update,(
            now+10,grant_id,"case-a",actor,"riosv-plovdiv",actor))
        changed=updated.rowcount
        audited=db.execute(revoke_audit,(
            "rev-"+grant_id+"-"+actor,actor,now+10,"reqrev-"+grant_id,
            '{"grant_id":"'+grant_id+'"}',grant_id,"case-a",actor,now+10))
        audit_count=audited.rowcount
    return changed,audit_count
assert revoke("grant-1") == (1,1)
assert revoke("grant-1") == (0,0)
assert db.execute("SELECT count(*) FROM kt125_audit").fetchone()[0] == 2
assert db.execute("SELECT revoked_at_ms FROM kt125_grants").fetchone()[0] == now+10

# Transactional integrity: an audit constraint failure must roll back grant issuance.
assert db.execute("SELECT count(*) FROM kt125_grants").fetchone()[0] == 1
try:
    with db:
        db.execute(issue_insert,(
            "grant-rollback","alice",'["case.read"]',now,now+1000,now,
            "bob","case-a","riosv-plovdiv","alice"))
        # Deliberately insert an audit with existing event_id; DB transaction must rollback.
        db.execute(issue_audit,(
            "evt-grant-1","alice",now,"req-conflict",'{"grant_id":"grant-rollback"}',
            "grant-rollback","alice"))
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Audit constraint must have failed")
assert db.execute("SELECT count(*) FROM kt125_grants WHERE grant_id='grant-rollback'").fetchone()[0] == 0
assert db.execute("SELECT count(*) FROM kt125_audit").fetchone()[0] == 2
print("PASS KT125 real SQLite: grant+audit, unauthorized no-op, revoke exactly once, audit failure rolls back grant.")
