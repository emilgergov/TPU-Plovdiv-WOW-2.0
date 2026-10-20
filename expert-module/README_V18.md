# V18 — evidence-bound Word prefill

Local module `fact_binding.py` supports explicit paragraph-index to fact-field bindings, using only V14-style facts confirmed by an expert and traceable to a filename and source location. It refuses unconfirmed values and paragraphs with recognized legal terms. Prefilled paragraphs remain `reviewed=false`, so the V17 gate still blocks generation until expert review. Tests: Plan A and Plan B PASS; unconfirmed subject blocked. No automatic choice of Plan A/B, no legal conclusion, no issued DOCX. The original templates are unchanged; WOW 3.3 is unchanged.
