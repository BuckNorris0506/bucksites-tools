# Owner decisions (optional local files)

**PROVEN:** This directory exists for **founder-local** structured JSON or notes aligned with **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **PROVEN:** No script in this repository reads or writes here in CI today.

**INFERRED:** If you add `*.json` files, keep them out of production mutation paths (no Supabase secrets, no automated affiliate changes). Prefer the document envelope (`contract`, `read_only`, `data_mutation`, `rows`) from the registry doc.

**UNKNOWN:** Whether your team tracks one file vs many — validator accepts a single document with a `rows` array.
