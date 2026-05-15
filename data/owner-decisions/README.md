# Owner decisions (optional local files)

**PROVEN:** This directory exists for **founder-local** structured JSON or notes aligned with **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **PROVEN:** `npm run buckparts:founder-decision-registry` reads only `*.json` files here (ignores this README and `.gitkeep`) and prints read-model JSON to stdout — no writes.

**INFERRED:** Weekly digest and owner dashboard may scan the same path for a short count summary; they do not treat registry rows as automation inputs.

**UNKNOWN:** Whether your team tracks one file vs many — validator accepts a single document with a `rows` array.
