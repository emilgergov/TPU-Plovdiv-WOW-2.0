#!/usr/bin/env python3
"""KT125-VT02: real SQLite test of user disable + audit transaction."""
import pathlib,re,sqlite3
root=pathlib.Path(__file__).resolve().parents[1]
source=(root/"src/user-lifecycle.mjs").read_text()
def sql(name):
 m=re.search(r"const "+name+r"=db\.prepare\(\x60(.*?)\x60\)\.bind",source,re.S)
 assert m, name
 return m.group(1)
update,audit=sql("update"),sql("audit")
db=sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript((root/"schema/001_private_access.sql").read_text())
now=1794891600000
for user,role,org in [("admin","administrator","riosv"),("unassigned","expert","riosv"),
("owner","expert","riosv"),("foreign","expert","another-org")]:
 db.execute("INSERT INTO kt125_users VALUES(?,?,?,?,?,?,?,?)",
  (user,org,"idp","sub-"+user,role,1,now,now))
db.execute("INSERT INTO kt125_cases VALUES(?,?,?,?,?,?)",
 ("case-a","riosv","owner","active",now,now))
db.commit()
def disable(target, event, actor="admin",org="riosv"):
 with db:
  change=db.execute(update,(now+1,target,org,actor,actor)).rowcount
  logged=db.execute(audit,(event,actor,now+1,"req-"+event,
   '{"target_user_id":"'+target+'"}',target,org)).rowcount
 return change,logged
assert disable("unassigned","evt-1")==(1,1)
assert db.execute("SELECT active FROM kt125_users WHERE user_id='unassigned'").fetchone()==(0,)
assert disable("unassigned","evt-2")==(0,0)
assert disable("owner","evt-3")==(0,0)
assert disable("foreign","evt-4")==(0,0)
assert disable("admin","evt-5")==(0,0)
assert db.execute("SELECT COUNT(*) FROM kt125_audit").fetchone()[0]==1
# An audit failure must rollback the disabling operation in the same transaction.
db.execute("INSERT INTO kt125_users VALUES(?,?,?,?,?,?,?,?)",
 ("unassigned2","riosv","idp","sub-unassigned2","expert",1,now,now))
db.commit()
try:
 with db:
  db.execute(update,(now+1,"unassigned2","riosv","admin","admin"))
  db.execute(audit,("evt-1","admin",now+1,"req-conflict",
   '{"target_user_id":"unassigned2"}',"unassigned2","riosv"))
except sqlite3.IntegrityError:
 pass
else:
 raise AssertionError("Audit conflict should abort mutation")
assert db.execute("SELECT active FROM kt125_users WHERE user_id='unassigned2'").fetchone()==(1,)
print("PASS KT125-VT02 real SQLite: inactive user, active case owner, foreign organization, self-disable and rollback on audit failure.")
