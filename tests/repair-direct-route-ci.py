"""Apply a narrowly scoped direct-route startup repair to the CI checkout.
This is a validation candidate, not a committed production HTML change.
"""
from pathlib import Path
p=Path("WOW_APP.html")
s=p.read_text(encoding="utf-8")
old="intro();root.classList.add('tpu-boot-ready');"
new="""if(location.hash.startsWith('#wow-route=')){
  root.classList.remove('tpu-intro-mode','wow-pre-intro-lock','tpu-bridge-mode');
  root.classList.add('tpu-entered');
  splash.hidden=true;
  window.tpuNavState='dashboard';
}else intro();
root.classList.add('tpu-boot-ready');"""
assert s.count(old)==1, f"Expected unique startup guard; found {s.count(old)}"
s=s.replace(old,new)
guards=[
  ("(function(){'use strict';var panel=document.getElementById('ntPanel'),groups=panel.querySelectorAll('.quiet-group');",
   "(function(){'use strict';var panel=document.getElementById('ntPanel');if(!panel)return;var groups=panel.querySelectorAll('.quiet-group');"),
  ("(function(){'use strict';var panel=document.getElementById('ntPanel'),ask=document.getElementById('wowAskNatu'),groups=panel.querySelectorAll('.quiet-group');",
   "(function(){'use strict';var panel=document.getElementById('ntPanel'),ask=document.getElementById('wowAskNatu');if(!panel||!ask)return;var groups=panel.querySelectorAll('.quiet-group');"),
]
for before,after in guards:
  assert s.count(before)==1, "Missing unique optional panel decorator"
  s=s.replace(before,after)
p.write_text(s,encoding="utf-8")
print("CI candidate: preserved direct WOW route instead of resetting to intro")
