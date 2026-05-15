# Owner decisions (optional local files)

**PROVEN:** This directory exists for **founder-local** structured JSON or notes aligned with **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **PROVEN:** `npm run buckparts:founder-decision-registry` is a human-friendly alias for the same entrypoint as `node --import tsx scripts/report-founder-decision-registry.ts`. **PROVEN:** For piping stdout into `JSON.parse`, use the `node --import tsx …` form only (`docs/BuckParts-JSON-STDOUT-CONTRACT.md`). **PROVEN:** The report reads only `*.json` files here (ignores this README and `.gitkeep`) — no writes.

**INFERRED:** Weekly digest and owner dashboard may scan the same path for a short count summary; they do not treat registry rows as automation inputs.

**UNKNOWN:** Whether your team tracks one file vs many — validator accepts a single document with a `rows` array.
