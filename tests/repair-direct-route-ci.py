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
p.write_text(s.replace(old,new),encoding="utf-8")
print("CI candidate: preserved direct WOW route instead of resetting to intro")
