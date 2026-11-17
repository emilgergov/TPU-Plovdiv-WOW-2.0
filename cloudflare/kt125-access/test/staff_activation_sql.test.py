#!/usr/bin/env python3
"""KT125: SQLite verification of two-step registration, matching identity and audit rollback."""
import pathlib,re,sqlite3
root=pathlib.Path(__file__).resolve().parents[1]
enroll=(root/"src/staff-enrollment.mjs").read_text()
activate=(root/"src/staff-activation.mjs").read_text()
def extract(source,name):
 match=re.search(r"const "+name+r"=db\.prepare\(\x60(.*?)\x60\)\.bind",source,re.S)
 assert match, "missing SQL: "+name
 return match.group(1)
enroll_insert=extract(enroll,"insert")
enroll_audit=extract(enroll,"audit")
activation_update=extract(activate,"update")
activation_audit=extract(activate,"audit")
conn=sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys=ON")
for file in ["001_private_access.sql","003_staff_activation.sql"]:
 conn.executescript((root/"schema"/file).read_text())
now=1794891600000
conn.execute("""INSERT INTO kt125_users
 (user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms)
 VALUES(?,?,?,?,?,?,?,?)""",
 ("manager","riosv","https://testing.cloudflareaccess.com","manager-sub","egmaster",1,now,now))
conn.commit()
with conn:
 first=conn.execute(enroll_insert,("staff","https://testing.cloudflareaccess.com","staff-sub",
 "expert",now,now,"manager","riosv","https://testing.cloudflareaccess.com","staff-sub",
 "https://testing.cloudflareaccess.com","staff-sub")).rowcount
 second=conn.execute(enroll_audit,("event-enroll","manager",now,"request-enroll",
 '{"new_user_id":"staff","role":"expert"}',"staff","expert","riosv")).rowcount
assert first==second==1
assert conn.execute("SELECT active,activation_pending FROM kt125_users WHERE user_id='staff'").fetchone()==(0,1)
with conn:
 updated=conn.execute(activation_update,(now+10,"staff","riosv",
 "https://testing.cloudflareaccess.com","staff-sub")).rowcount
 recorded=conn.execute(activation_audit,("event-activate",now+10,"request-activate",
 '{"verified_identity":true}',"staff","riosv")).rowcount
assert updated==recorded==1
assert conn.execute("SELECT active,activation_pending FROM kt125_users WHERE user_id='staff'").fetchone()==(1,0)
with conn:
 assert conn.execute(activation_update,(now+20,"staff","riosv",
  "https://testing.cloudflareaccess.com","staff-sub")).rowcount==0
 assert conn.execute(activation_audit,("event-repeat",now+20,"request-repeat",
  '{}',"staff","riosv")).rowcount==0
conn.execute("UPDATE kt125_users SET active=0 WHERE user_id='staff'")
conn.commit()
with conn:
 assert conn.execute(activation_update,(now+30,"staff","riosv",
  "https://testing.cloudflareaccess.com","staff-sub")).rowcount==0
assert conn.execute("SELECT active,activation_pending FROM kt125_users WHERE user_id='staff'").fetchone()==(0,0)
# A different verified subject may not activate a pending colleague's profile.
conn.execute("""INSERT INTO kt125_users
 (user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms,activation_pending)
 VALUES(?,?,?,?,?,?,?,?,?)""",
 ("staff2","riosv","https://testing.cloudflareaccess.com","staff2-sub","reviewer",0,now,now,1))
conn.commit()
with conn:
 wrong=conn.execute(activation_update,(now+40,"staff2","riosv",
 "https://testing.cloudflareaccess.com","different-sub")).rowcount
 assert wrong==0
assert conn.execute("SELECT active,activation_pending FROM kt125_users WHERE user_id='staff2'").fetchone()==(0,1)

# A database failure in the audit insert MUST roll back the activation update.
try:
 with conn:
  changed=conn.execute(activation_update,(now+50,"staff2","riosv",
    "https://testing.cloudflareaccess.com","staff2-sub")).rowcount
  assert changed==1
  conn.execute(activation_audit,("event-activate",now+50,"request-conflict",
    '{}',"staff2","riosv"))
except sqlite3.IntegrityError:
 pass
else:
 raise AssertionError("An audit event collision must reject activation")
assert conn.execute("SELECT active,activation_pending FROM kt125_users WHERE user_id='staff2'").fetchone()==(0,1)

# A legitimate retry with a unique audit event must now succeed.
with conn:
 assert conn.execute(activation_update,(now+60,"staff2","riosv",
  "https://testing.cloudflareaccess.com","staff2-sub")).rowcount==1
 assert conn.execute(activation_audit,("event-new",now+60,"request-new",
  '{}',"staff2","riosv")).rowcount==1
assert conn.execute("SELECT active,activation_pending FROM kt125_users WHERE user_id='staff2'").fetchone()==(1,0)
print("PASS KT125 SQLite two-step activation: exact subject, no reactivation, audit rollback and retry.")
