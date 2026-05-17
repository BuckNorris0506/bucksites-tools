# Owner decisions (optional local files)

**PROVEN:** This directory exists for **founder-local** structured JSON or notes aligned with **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **PROVEN:** `npm run buckparts:founder-decision-registry` is a human-friendly alias for the same entrypoint as `node --import tsx scripts/report-founder-decision-registry.ts`. **PROVEN:** For piping stdout into `JSON.parse`, use the `node --import tsx …` form only (`docs/BuckParts-JSON-STDOUT-CONTRACT.md`). **PROVEN:** The report reads only `*.json` files here (ignores this README and `.gitkeep`) — no writes.

**PROVEN:** Optional field `codex_output_review_context_v1` on a registry row records which **Codex Output Review** founder option (`approve_readonly_findings`, `reject_findings`, `request_followup_readonly`, `defer_review`) you chose, for digest/dashboard read-model visibility — **not** Runner automation or mutation authority. **PROVEN:** `approve_readonly_findings` and `read_only_agent` never authorize mutation; `evidence_required_before_mutation: false` on a read-only row does not widen scope (see `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` semantic rules).

**INFERRED:** Weekly digest and owner dashboard scan the same path for summaries; they do not treat registry rows as automation inputs.

**UNKNOWN:** Whether your team tracks one file vs many — validator accepts a single document with a `rows` array.
