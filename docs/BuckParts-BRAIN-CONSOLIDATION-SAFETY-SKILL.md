# BuckParts Brain Consolidation Safety Skill

**Status:** PROVEN repo-local skill (no `.cursor/` directory in this repository at time of authorship; use this file as the canonical consolidation guardrail).

**Applies when:** BuckParts work tries to make Command Center the brain of the operation by integrating reports, tasks, scripts, audits, workflows, dashboards, or owner/operator systems into Command Center JSON.

**Goal:** Reduce real operator fragmentation by moving decision-useful, read-only operating truth into Command Center. Do **not** chase CONNECTED count mechanically.

---

## Mandatory preflight

Before editing consolidation code, prove:

1. `git rev-parse --short HEAD`
2. `git status --short` (identify unrelated dirty files; do not bundle them)
3. Live Command Center brain state:

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '{
  read_only,
  data_mutation,
  next_best_action,
  brain_gate: .command_center_v2.brain_integrity_gate_v1 | {brain_status, lane_work_allowed, verdict_counts, partial_entry_ids: [.partial_entries[].system_id]},
  brain_plan: .command_center_v2.brain_consolidation_plan_v1 | {next_consolidation_slice, high_priority_ids: [.high_priority_consolidation_targets[].system_id]},
  manifest_counts: .command_center_v2.command_center_brain_coverage_manifest_v1.verdict_counts
}'
```

4. `command_center_v2.brain_integrity_gate_v1` — lane work policy
5. `command_center_v2.brain_consolidation_plan_v1` — next slice rationale (repo truth, not chat memory)
6. Manifest verdict counts — baseline before/after

**Stop preflight** if any of the above cannot be produced; mark UNKNOWN and do not claim integration progress.

---

## Eligibility (integrate only when ALL hold)

- Read-only or summarizable read-only (compact projection of an existing contract)
- Decision-useful operating truth (changes what owner/agent does next)
- Stable enough contract (`contract`, `runtime_status`, bounded fields)
- Compact CC summary possible (no raw oversized payloads in CC JSON)
- Reduces operator fragmentation (one brain lane; standalone CLI may remain)
- Does not create a second source of truth (CC summary must derive from or align with standalone builder)
- Testable: targeted tests + `npm run lint` + `npm run build`

---

## Exclude / defer when ANY hold

- Mutates Supabase, `retailer_links`, evidence files, affiliate data, production rows, or owner decisions
- Worksheet / generator / runbook with low decision value
- Noisy raw output better left standalone (use summary lane only)
- DUPLICATE dashboard surface without a dedupe plan (prefer CC neuron / existing lane)
- External credential / live API / nested `npm run` fan-out that makes CC build slower or flakier
- Would weaken `brain_integrity_gate_v1`, `brain_consolidation_plan_v1`, exact-token gates, or wrong-purchase gates
- HQ handoff / deprecated docs edited without explicit owner approval

---

## Batch rule (anti one-row drift)

**Do not** keep integrating one tiny manifest row at a time once the summary-lane pattern is proven.

| Mode | When | Scope |
|------|------|--------|
| **A — Single slice** | First proof of a new pattern, or high-risk surface | 1 system |
| **B — Bulk read-only wave** | Pattern proven (`*_summary_v1` projection + manifest CONNECTED + tests) | **3–10 related systems** same pattern |

**Mode B requirements**

- Same risk class (read-only summaries only)
- Same implementation pattern (`scripts/lib/*-summary-v1.ts`, dynamic import if needed to break cycles, inject upstream builders to avoid duplicate expensive work)
- One consolidation PR / one owner approval gate
- Do **not** mix: mutating executors, evidence writers, affiliate URL writers, Supabase apply scripts, public page behavior, schema/migrations, or runbooks/worksheets unless explicitly decision-critical

**Good waves:** read-only audit summaries; operator/runner summaries; founder decision registry summaries; business/search/launch **visibility** summaries (compact).

**Bad waves:** mutating executors; evidence/affiliate/retailer_links writers; DB apply; UI behavior; unrelated script inventory defaults (`MANIFEST_DEFAULT_BYPASS_REASON` rows).

---

## Required planning output (before implementation)

Produce this plan in chat or PR description and **wait for owner approval** before Mode B implementation:

1. **CURRENT PROVEN CC STATE** — HEAD, dirty tree, gate, plan, manifest counts, CONNECTED lanes list
2. **PROPOSED CONSOLIDATION WAVE** — 3–10 systems, proposed `command_center_v2.*_summary_v1` paths
3. **EXCLUDED SYSTEMS** — and why
4. **EXPECTED FILES TO TOUCH** — types, manifest, CC build, summary libs, tests (no unrelated files)
5. **VALIDATION PLAN** — exact test commands + jq proofs
6. **STOP CONDITIONS** — when to abort the wave

---

## Implementation rules

- Add **compact summary lanes** on `command_center_v2` only (`*_summary_v1`)
- Keep standalone `npm run buckparts:*` behavior unless owner explicitly replaces it
- Reuse existing builders; inject providers to avoid double Command Center / double daily operator builds
- Every new lane includes: `contract`, `read_only: true`, `data_mutation: false`, `runtime_status`, `source_command`, `proven_facts`, `unknown_facts`
- Cap list payloads (e.g. top N items, top N blocked inputs)
- Update `command_center_brain_coverage_manifest_v1` **only** when the CC lane actually exists (`CONNECTED` + `cc_json_path`)
- Update `brain_integrity_gate_v1` **only** if classification logic truly changes
- Update `brain_consolidation_plan_v1` expectations so `next_consolidation_slice` advances intelligently (not CONNECTED-count chasing)
- Tests required per lane: exists on `command_center_v2`, `read_only` / `data_mutation`, manifest row, gate non-gap, plan movement

**Reference pattern (PROVEN on HEAD):**

- `command_center_v2.daily_operator_summary_v1` ← `buckparts:daily`
- `command_center_v2.demand_work_queue_summary_v1` ← `buckparts:demand-work-queue`

---

## Anti-drift stop conditions

Stop immediately and reassess if:

- Work becomes CONNECTED-count chasing
- Mutating and read-only systems are mixed in one wave
- A second source of truth is introduced (CC and standalone diverge without documented standalone authority)
- HQ handoff or production docs edited without approval
- UNKNOWN treated as OK for lane work
- `retailer_links`, evidence, affiliate, Supabase writes, or production data are touched
- Validation is vague (“seems fine”) without jq + tests + build
- Unrelated dirty files are included in the consolidation commit

---

## Post-implementation proof

```bash
git status --short
node --import tsx scripts/report-buckparts-command-center.ts | jq '{
  manifest_counts: .command_center_v2.command_center_brain_coverage_manifest_v1.verdict_counts,
  brain_status: .command_center_v2.brain_integrity_gate_v1.brain_status,
  lane_work_allowed: .command_center_v2.brain_integrity_gate_v1.lane_work_allowed,
  next_consolidation_slice: .command_center_v2.brain_consolidation_plan_v1.next_consolidation_slice
}'
node --import tsx --test scripts/report-buckparts-command-center.test.ts
node --import tsx --test scripts/lib/buckparts-brain-coverage-manifest-v1.test.ts
node --import tsx --test scripts/lib/buckparts-brain-integrity-gate-v1.test.ts
node --import tsx --test scripts/lib/buckparts-brain-consolidation-plan-v1.test.ts
npm run lint
npm run build
```

If committed: prove staged scope matches the approved wave only; after push, re-run jq proof on the same HEAD.

---

## Related repo truth (pointers)

| Artifact | Path |
|----------|------|
| Manifest builder | `scripts/lib/buckparts-brain-coverage-manifest-v1.ts` |
| Integrity gate | `scripts/lib/buckparts-brain-integrity-gate-v1.ts` |
| Consolidation plan | `scripts/lib/buckparts-brain-consolidation-plan-v1.ts` |
| CC build | `scripts/report-buckparts-command-center.ts` |
| CC types | `scripts/lib/buckparts-command-center-v2-types.ts` |
| JSON stdout contract | `docs/BuckParts-JSON-STDOUT-CONTRACT.md` |
| Script classification | `docs/buckparts-script-classification-manifest.md` |
