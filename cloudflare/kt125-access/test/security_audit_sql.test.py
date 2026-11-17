#!/usr/bin/env python3
"""KT125 audit schema smoke test against actual in-memory SQLite."""
import pathlib
import sqlite3

root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript((root/"schema/001_private_access.sql").read_text())
db.executescript((root/"schema/002_security_events.sql").read_text())
sql=("INSERT INTO kt125_security_events "
     "(event_id,occurred_at_ms,request_id,action,outcome,reason,case_ref_digest,actor_user_id) "
     "VALUES(?,?,?,?,?,?,?,?)")
t=1794891600000
digest="a"*64
db.execute(sql,("ev-1",t,"req-1","case.read","denied","ACCESS_DENIED",digest,None))
db.execute(sql,("ev-2",t,"req-2","case.read","allowed","GRANTED",digest,"expert-1"))
assert db.execute("SELECT COUNT(*) FROM kt125_security_events").fetchone()[0]==2
assert db.execute("SELECT actor_user_id FROM kt125_security_events WHERE event_id='ev-1'").fetchone()[0] is None
for fields in [
 ("ev-3",t,"req-3","case.delete","denied","ACCESS_DENIED",digest,None),
 ("ev-3",t,"req-3","case.read","sometimes","ACCESS_DENIED",digest,None),
 ("ev-3",t,"req-3","case.read","denied","ACCESS_DENIED","not-hash",None),
]:
 try:
  with db: db.execute(sql,fields)
 except sqlite3.IntegrityError:
  pass
 else: raise AssertionError("Unsafe event should be refused")
assert db.execute("SELECT COUNT(*) FROM kt125_security_events").fetchone()[0]==2
print("PASS KT125 security event schema: anonymous denies, no unverified FK, constrained actions and digests.")
