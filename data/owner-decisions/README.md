# Owner decisions (optional local files)

**PROVEN:** This directory exists for **founder-local** structured JSON or notes aligned with **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **PROVEN:** `npm run buckparts:founder-decision-registry` is a human-friendly alias for the same entrypoint as `node --import tsx scripts/report-founder-decision-registry.ts`. **PROVEN:** For piping stdout into `JSON.parse`, use the `node --import tsx …` form only (`docs/BuckParts-JSON-STDOUT-CONTRACT.md`). **PROVEN:** The report reads only `*.json` files here (ignores this README and `.gitkeep`) — no writes.

**PROVEN:** Optional field `codex_output_review_context_v1` on a registry row records which **Codex Output Review** founder option (`approve_readonly_findings`, `reject_findings`, `request_followup_readonly`, `defer_review`) you chose, for digest/dashboard read-model visibility — **not** Runner automation or mutation authority. **PROVEN:** `approve_readonly_findings` and `read_only_agent` never authorize mutation; `evidence_required_before_mutation: false` on a read-only row does not widen scope (see `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` semantic rules).

**INFERRED:** Weekly digest and owner dashboard scan the same path for summaries; they do not treat registry rows as automation inputs.

**UNKNOWN:** Whether your team tracks one file vs many — validator accepts a single document with a `rows` array.

---

## Activating a row for guarded CSV apply (founder-only)

Normative spec: `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` § **Activating mutation approval for guarded apply executors**.

**Draft / inactive row (dry-run OK, `--write-csv` blocked):**

- `decision_status`: `deferred` (or `rejected`, `needs_more_evidence`)
- `allowed_next_scope`: `none` (or `read_only_agent`, `human_external`)

**Active mutation approval (required for `--write-csv` when executor gates pass):**

- `decision_status`: **`approved`**
- `allowed_next_scope`: **`owner_mutation_approved`**
- `owner_note`: non-empty founder-signed text
- `evidence_required_before_mutation`: **`true`**
- `decided_at`: approval timestamp (ISO 8601)
- Optional `{slug}_apply_context_v1`: set `owner_approved_by`, `approved_at` when present

**Verify read model (no mutation):**

```bash
npm run buckparts:founder-decision-registry
```

**Verify guarded apply sees active approval (example slug `4396508`):**

```bash
npm run buckparts:supabase-csv-parity-guarded-apply -- --slug 4396508
# founder_decision_missing: false only after activation
```

No repo automation writes or activates registry rows for you.
