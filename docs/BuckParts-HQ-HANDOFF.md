# BuckParts HQ — Agent Handoff

**How to use:** Paste this whole file into a new ChatGPT / Cursor chat when picking up BuckParts work.

**Canonical truth map:** `docs/BuckParts-TRUTH-MAP.md` is the primary source-of-truth navigation index for policy/runtime/measurement/operator files.

**HQ handoff vs operating truth:** HQ handoff is **not** the source of operating truth. This file is migration/context for future chats only. **`npm run buckparts:command-center`** JSON (`scripts/report-buckparts-command-center.ts`) is. The owner dashboard (`src/app/ownerdashboard/[secret]/page.tsx`) is the **visual/readable surface** for Command Center truth — not a parallel truth builder. Update this handoff after milestones (not every small decision); **`b85e90b`** (external measurement freshness lane) qualifies.

**Evidence timestamp:** Re-run `npm run buckparts:command-center` and `npm run buckparts:command-surface` before trusting live numbers. **Semi-Cruise read-only milestone:** documented at HEAD **`edfeeba`** (see **Semi-Cruise Readiness Milestone** below). **Command Center external measurement freshness:** lane introduced at **`b85e90b`**; at **`edfeeba`** operator loop proved **`overall_status: OK`**. **Command Center neuron map (`owner_command_center_neurons`):** through **`84fb4b3`**. **Batch Production Lane v1:** through **`93dcd3d`**. **Layer 6 / Codex / Runner control-plane:** refreshed **`2026-05-16`** (repo through **`40ad6eb`** and related Layer 6 commits — see §0B). **Older business metrics** in §4–§16 may still cite **`2026-05-03`** / **`9229144`** unless re-run — treat stale numbers as **UNKNOWN** until refreshed.

**Rule:** If a fact is not in this file, a cited repo path, or the output of a named command, treat it as **UNKNOWN**—do not invent.

---

## Semi-Cruise Readiness Milestone (PROVEN through `edfeeba`)

**Purpose:** Record the first **proven** read-only operator loop (Command Center → Runner Step → Founder Digest) without claiming mutation autonomy, revenue truth, or complete neuron coverage.

### What is PROVEN operational (read-only Semi-Cruise)

| Area | PROVEN state (operator run at `edfeeba`) |
|------|------------------------------------------|
| Command Center contract | `read_only: true`, `data_mutation: false` |
| Execution guidance | `next_move_mode: READ_ONLY`, `mutating_blocked: false` |
| Operator away status | `operator_can_be_away_status: READY_FOR_AUTONOMOUS_READ_ONLY` |
| System health | `system_health_summary.status: OK` |
| Brain gate | `brain_integrity_gate_v1.brain_status: PROCEED_WITH_KNOWN_LIMITS` |
| External measurement | `external_measurement_freshness_v1.runtime_status: OK`, `overall_status: OK` |
| GSC / GA4 artifacts | Durable **SUPABASE** sources; per-feed **measurement_usability_status: OK** and **artifact_recency_status: OK** |
| Page publishability | `page_publishability_truth_summary_v1.runtime_status: OK`, `unknown_join_count: 0` |
| Runner Step | **PASS** — `lint`, `build`, `buckparts:operator-proof` all **PASS** |
| Founder Digest | Generated successfully (`npm run buckparts:founder-digest`) |
| Bright / PROVEN neurons | `page_state_distribution`, `trust_funnel_measurement`, `gsc_search_discovery`, `search_demand_and_gaps`, `click_visibility`, `batch_production_owner_decisions` |
| DIM / UNKNOWN neurons | `affiliate_readiness`, `coverage_health` (incomplete — not blocking read-only loop) |
| Click visibility | `revenue_snapshot.click_visibility` **OK** (operational clicks only) |
| Amazon rescue lane | **ATTENTION** — `next_allowed_agent_token: GSWF2`; owner/browser/frozen/operator-decision cohorts remain active |

**Doctrine:** **Read-only Semi-Cruise is PROVEN operational** at this milestone — an operator (or agent under Runner allowlist) can refresh truth, validate the repo, and produce digest output **without** production mutation.

### What remains NOT_PROVEN (do not regress claims)

| Area | Status |
|------|--------|
| **Mutation Semi-Cruise** | **NOT_PROVEN** — remains **owner-gated**; no autonomous Supabase/`retailer_links`/evidence/affiliate/production-route mutation from this loop |
| **Revenue truth** | **NOT_CONNECTED** — `commission_or_revenue` / Associates commission feed not connected despite OK click visibility |
| **Affiliate readiness** | **Incomplete** — neuron **DIM** / **UNKNOWN**; tracker and program state not fully bright |
| **Coverage health** | **Incomplete** — neuron **DIM** / **UNKNOWN**; safe vs blocked CTA pressure not fully green |
| **Command Center as complete OS truth** | **NOT_PROVEN** — eight-neuron map + v2 lanes are substantial but not every feed is CC-owned (see inventory below) |

### PROVEN validation loop (copy/paste from repo root)

Re-run before trusting; numbers below are a **milestone snapshot**, not durable forever.

```bash
# 1) Command Center truth (primary operating JSON)
node --import tsx scripts/report-buckparts-command-center.ts | jq '{
  read_only: .read_only,
  data_mutation: .data_mutation,
  operator_can_be_away_status,
  system_health: .command_center_v2.system_health_summary.status,
  brain_status: .command_center_v2.brain_integrity_gate_v1.brain_status,
  next_move_mode: .execution_guidance.next_move_mode,
  mutating_blocked: .execution_guidance.mutating_blocked,
  external_measurement: .command_center_v2.external_measurement_freshness_v1 | {runtime_status, overall_status, gsc: .gsc | {artifact_source, measurement_usability_status, artifact_recency_status}, ga4: .ga4 | {artifact_source, measurement_usability_status, artifact_recency_status}},
  publishability: .command_center_v2.page_publishability_truth_summary_v1 | {runtime_status, unknown_join_count},
  commission_or_revenue: .command_center_v2.commission_or_revenue,
  neurons: [.owner_command_center_neurons.neurons[] | {neuron_key, connection_level, status}]
}'

# 2) Repo-owned Runner Step (allowlist: lint, build, operator-proof only)
npm run buckparts:runner-step

# 3) Founder Digest (Markdown stdout; slices Command Center)
npm run buckparts:founder-digest
```

**PROVEN — validation before this handoff update:** `buckparts-hq-handoff-freshness`; `npm run lint`; `npm run build`.

---

## Current stopping point / chat migration state (through `edfeeba`)

Use this block first in a new HQ or implementation chat. It records the **exact** repo stopping point before chat migration.

### Repo HEAD (PROVEN)

| Item | Value |
|------|--------|
| Latest pushed HEAD | **`edfeeba`** — *Semi-Cruise read-only milestone (HQ handoff + page_state neuron copy)* |
| Prior milestone chain | `b85e90b` external measurement freshness lane · `84fb4b3` Command Center neuron map · `b38629b` coverage health neuron · `93dcd3d` batch production owner decisions lane |
| Recent chain | See **Semi-Cruise Readiness Milestone** above for operator-proven loop at `edfeeba` |

**Commit lineage (Layer 7 + HQ + Command Center):**

- **`399251a`** — Layer 7 owner approval gate implemented in-repo.
- **`181bc54`** — HQ chat behavior rule: next move must include copy/paste prompt or command in the same message.
- **`f71f61f`** — approval checklist summary distinguishes blocked vs awaiting agent facts.
- **`78ff67d`** — partial approval compile: expects founder decisions only for `draft_ready_for_owner_review` rows when facts exist; durable registry export for ready rows only.
- **`93dcd3d`** — `command_center_v2.batch_production_owner_decisions_lane_v1` reads committed batch registry exports; owner dashboard displays Layer 7 batch state **through Command Center only** (no dashboard-only registry scan for this lane).
- **`84fb4b3`** — `owner_command_center_neurons` is built inside `scripts/report-buckparts-command-center.ts` (via `src/lib/owner-dashboard/owner-command-center-neurons-v1.ts`); raw Command Center stdout is the neuron source; owner dashboard **displays** that field and does not create primary neuron truth when the field is present.
- **`b85e90b`** — `command_center_v2.external_measurement_freshness_v1` is built in `scripts/report-buckparts-command-center.ts` (via `src/lib/owner-dashboard/external-measurement-freshness-v1.ts`); read-only artifact staleness for GSC + GA4 — **not** live API fetch, **not** revenue proof.

### Command Center external measurement freshness (PROVEN through `b85e90b`)

**Architecture (do not regress):**

- **Command Center JSON** owns `command_center_v2.external_measurement_freshness_v1` (`read_only: true`, `data_mutation: false`).
- **Does not fetch** GSC/GA4 or mutate Supabase — reuses existing artifact loaders only (`loadGa4TrustFunnelAggregateArtifact`, `buildOwnerGscExternalDemandNeuron`).
- **Staleness rule:** rolling **7-day** window vs artifact timestamps (`export_date` / `fetched_at`); `overall_status` and per-feed `freshness_status` are **`OK` | `STALE` | `UNKNOWN`** — not live API health.
- **Recommended refresh (copy/paste):** `npm run buckparts:gsc:fetch` and `npm run buckparts:ga4:fetch` — listed in lane `recommended_commands`; running them is operator action, not automatic from Command Center build.

**PROVEN — inspect lane (re-run before trusting; live status depends on artifact ages):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.external_measurement_freshness_v1 | {contract, read_only, data_mutation, runtime_status, overall_status, gsc: .gsc.freshness_status, ga4: .ga4.freshness_status, recommended_commands}'
```

**INFERRED example at handoff refresh (not durable — re-run jq):** `overall_status: STALE`, `gsc.freshness_status: STALE`, `ga4.freshness_status: STALE` when Supabase artifacts are older than 7d. That means **refresh artifacts**, not that Command Center is broken.

**PARTIAL:** Lane reports whether committed/durable artifacts are current — it does **not** prove search demand quality, revenue, or that GSC/GA4 APIs were called during `buckparts:command-center`.

**PROVEN — validation before commit (`b85e90b`):** `report-buckparts-command-center.test.ts` (lane contract, UNKNOWN missing artifacts, STALE GA4 mock); `load-command-center-report.test.ts`; `buckparts-hq-handoff-freshness`; `npm run lint`; `npm run build`.

### Command Center JSON shape contract

**Architecture (do not regress):**

- **Root (`buckparts_command_center_v1`)** — operator digest shell: queue summaries, `execution_guidance`, final `next_best_action` / `why_this_action`, and **`owner_command_center_neurons`**.
- **`command_center_v2`** — decision lanes, brain gates, semantic diagnostics (e.g. `page_publishability_truth_summary_v1`), and lane-level `next_owner_action` (distinct from root headline action).
- **`command_surface`** — separate report (`npm run buckparts:command-surface`); **not** embedded in Command Center JSON stdout.
- **`command_center_v2.operator_digest_v1`** — read-only mirror of final root operator guidance (`next_best_action`, `why_this_action`, `execution_guidance`) populated **after** any `brain_integrity_gate_v1` override so jq can query `command_center_v2.operator_digest_v1.next_best_action` safely. There is **no** top-level `command_center_v2.next_best_action`.
- **`owner_command_center_neurons`** intentionally remains **root-owned** (not under `command_center_v2`).

### Command Center neuron map — source of truth (PROVEN through `84fb4b3`)

**Architecture (do not regress):**

- **Command Center JSON** owns `owner_command_center_neurons` (`data_mutation: false`).
- **Owner dashboard** reads `report.owner_command_center_neurons` from Command Center load (`src/app/ownerdashboard/[secret]/page.tsx`); it is the visual/readable surface only.
- **Owner load fallback** (`src/lib/owner-dashboard/load-command-center-report.ts`): `report.owner_command_center_neurons ?? buildOwnerCommandCenterNeuronsForReport(...)` exists for tests/mocks missing the field — it does **not** override the primary rule when Command Center stdout includes neurons.
- **No forbidden circular import:** `scripts/report-buckparts-command-center.ts` does **not** import `load-command-center-report.ts`; `owner-command-center-neurons-v1.ts` does **not** import `report-buckparts-command-center.ts`.

**PROVEN — raw Command Center stdout (re-run before trusting live connection levels):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '{data_mutation: .owner_command_center_neurons.data_mutation, neuron_count: (.owner_command_center_neurons.neurons | length), neuron_keys: [.owner_command_center_neurons.neurons[].neuron_key]}'
```

Expected shape at this milestone: `data_mutation: false`, `neuron_count: 8`, keys exactly:

- `page_state_distribution`
- `trust_funnel_measurement`
- `gsc_search_discovery`
- `search_demand_and_gaps`
- `click_visibility`
- `affiliate_readiness`
- `coverage_health`
- `batch_production_owner_decisions`

**PROVEN — builder wiring:** `buildOwnerCommandCenterNeuronsForReport` in `src/lib/owner-dashboard/owner-command-center-neurons-v1.ts`; attached in `scripts/report-buckparts-command-center.ts` before return. Inputs are in-scope Command Center / command-surface data only (no duplicate registry scan in neuron builder for batch lane).

**PARTIAL / NOT complete operating truth:** The eight-neuron map improves bright/dim/dark coverage but Command Center is **not** yet complete operating truth. Feeds below remain **NOT_PROVEN**, **NOT_CONNECTED**, or **UNKNOWN** unless a named command proves otherwise.

**PROVEN — validation before commit (`84fb4b3`):** `report-buckparts-command-center.test.ts` (neuron keys on CC JSON); `load-command-center-report.test.ts`; `buckparts-hq-handoff-freshness`; `npm run lint`; `npm run build`.

### Batch Production Lane v1 — status (PROVEN in-repo)

**PROVEN:** Read-only Batch Production Lane v1 is **implemented** for **non-Amazon PDP** cohort review and **batch owner approval gate** (planning/read-model only). **Owner-facing surfaces are Markdown-first:** owner review report (`scripts/report-batch-owner-review.ts`) and owner approval checklist (`scripts/report-batch-owner-approval-checklist.ts`). Machine JSON (`batch_owner_screenshot_draft_packet_v1`, `batch_owner_approval_packet_v1`) is **debug/support only**.

**PROVEN — non-Amazon PDP cohort (`--source non-amazon-pdp-candidates`):** 5 candidate rows:

| row_id | token |
|--------|--------|
| `da97-08006b` | DA97-08006B |
| `da97-15217d` | DA97-15217D |
| `da29-00012b` | DA29-00012B |
| `adq75795101` | ADQ75795101 |
| `rpwfe` | RPWFE |

**PROVEN — source-based owner approval checklist (no Jared JSON):**

```bash
node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates
```

- Checklist is generated from repo `--source` without hand-authored `draft-review.json` or agent-filled facts JSON.
- Parser reads **sentinel active decision blocks only** (`BEGIN_ACTIVE_DECISION row_id=…` … `END_ACTIVE_DECISION`); fenced examples and prose option lists are ignored.
- Unfilled `founder_decision: _choose_one_` checklists **fail closed** at compile with **exit code 2**.
- **No** `founder_decision_registry_v1` export is emitted when any row is invalid or unfilled.
- `approve_for_next_planning_only` **fails closed** unless the row is `draft_ready_for_owner_review=yes` (requires agent facts / owner-review-ready draft).
- `defer`, `reject`, and `request_more_evidence` may compile for **planning-seed** rows when actively selected in the active block only.

**PROVEN — no mutation authority introduced:** batch approval artifacts keep `read_only: true`, `data_mutation: false`, `may_mutate: false`, `may_write_production_evidence: false`, `automation_input: false`. No Supabase writes, no `retailer_links` mutation, no `data/evidence/` writes, no affiliate URL edits, no apply/mutation executor.

**PROVEN — validation before commit (`93dcd3d`):** batch lane + Command Center tests pass (`batch-production-owner-decisions-lane-v1`, `report-buckparts-command-center`); `buckparts-hq-handoff-freshness`; `npm run lint` pass; `npm run build` pass.

**PROVEN — Command Center integration (Layer 7 owner decisions):**

- **Source:** committed `founder_decision_registry_v1` export at `data/owner-decisions/batch-non-amazon-pdp-owner-approval.json` (rows with `batch_production_owner_review_context_v1`).
- **Lane contract:** `command_center_v2.batch_production_owner_decisions_lane_v1` in `npm run buckparts:command-center` JSON (`scripts/lib/buckparts-command-center-v2.ts`, builder `src/lib/owner-dashboard/batch-production-owner-decisions-lane-v1.ts`).
- **Owner dashboard:** `src/app/ownerdashboard/[secret]/page.tsx` reads **`report.command_center_v2.batch_production_owner_decisions_lane_v1` only** — not a separate dashboard-only file scan for this lane.
- **Visible in Command Center (PROVEN fields when registry present):** `approved_for_planning_count: 3`; approved rows `da97-08006b`, `da97-15217d`, `rpwfe` (`allowed_next_scope: read_only_agent`, `approve_for_next_planning_only`); `excluded_not_owner_review_ready_row_ids: da29-00012b`, `adq75795101` (documented in this handoff + lane `proven_facts`); `source_row_count: 5`; `may_mutate: false`; `may_write_production_evidence: false`; `automation_input: false`; `layer_6_founder_only_production_mutation_approval: NOT_PROVEN`; `batch_size_20_status: BLOCKED`.
- **Inspect lane (copy/paste):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.batch_production_owner_decisions_lane_v1 | {runtime_status, approved_for_planning_count, approved_rows: [.approved_rows[].row_id], excluded: .excluded_not_owner_review_ready_row_ids, may_mutate, batch_size_20_status}'
```

**PROVEN — Layer 7 five-row non-Amazon E2E (facts → review → partial approval → durable registry export → Command Center):**

- **5 source rows** entered the lane via `--source non-amazon-pdp-candidates` (table above).
- **Browser/agent-filled facts** (lane-local working copy under `data/batch-production/drafts/`; not committed as canonical truth) produced **3 owner-review-ready** rows and **2 blocked / not owner-review-ready** rows:
  - **Ready:** `da97-08006b`, `da97-15217d`, `rpwfe`
  - **Blocked (excluded from approval checklist):** `da29-00012b`, `adq75795101`
- **Owner approval registry export (committed, durable):** `data/owner-decisions/batch-non-amazon-pdp-owner-approval.json` — **3 rows**, all `approve_for_next_planning_only` with `decision_status: approved` and **`allowed_next_scope: read_only_agent`** (planning/read-model only; **not** production mutation approval).
- **Partial approval compile:** when facts exist, compile expects founder decisions **only** for rows with `draft_ready_for_owner_review === true`; blocked rows may be absent from the Markdown checklist without missing-decision errors.
- **Re-compile path (copy/paste):**

```bash
node --import tsx scripts/report-batch-owner-approval.ts \
  --source non-amazon-pdp-candidates \
  --facts data/batch-production/drafts/agent-filled-facts.non-amazon-pdp-candidates.json \
  --decisions data/batch-production/drafts/batch-owner-approval-checklist.md \
  --registry-out data/owner-decisions/batch-non-amazon-pdp-owner-approval.json
```

*(Requires lane-local facts + filled checklist under `data/batch-production/drafts/` — not committed.)*

**PROVEN — readiness split (commit `2d5032c`):**

- `draft_ready_for_owner_review` = agent facts structurally usable for founder review.
- **Non-Amazon** owner-review-ready does **not** require ASIN or committed screenshot.
- `production_evidence_commit_blockers` (screenshot commit; ASIN on Amazon) gate **durable** `data/evidence/` writes only — not owner review.

**PROVEN — doctrine:** Owner approval gate is **planning/read-model only**. Production mutation remains **blocked**. Generated `data/batch-production/drafts/*` files are **lane-local** working artifacts — **not** canonical truth unless intentionally promoted to a small, reviewed outcome artifact (generated drafts were removed and not committed at `399251a`).

**INFERRED:** Amazon rescue default lane (`--source amazon-rescue-default`) remains a **fallback** only; do **not** restart an Amazon interstitial / screenshot loop as the main path.

### What remains NOT_PROVEN / UNKNOWN

| Area | Status |
|------|--------|
| Command Center as **complete** operating truth (bright/dim/dark neuron audit) | **NOT_PROVEN** — neurons (`84fb4b3`) + `external_measurement_freshness_v1` (`b85e90b`) are CC-owned; broader feeds below are not yet fully Command Center-owned |
| GSC/GA4 artifact freshness on Command Center | **PROVEN lane** at `b85e90b` — `command_center_v2.external_measurement_freshness_v1`; **current artifact ages may still be STALE or UNKNOWN** until `buckparts:gsc:fetch` / `buckparts:ga4:fetch` refresh durable artifacts |
| Live GSC/GA4 API integration in Command Center | **NOT_PROVEN** — freshness lane reads existing artifacts only; no fetch during `buckparts:command-center` |
| `owner_command_center_neurons` on dashboard-only path when CC field present | **NOT_PROVEN** as primary path — dashboard displays CC field; fallback builder is tests/mocks only |
| Founder Digest embedding Layer 7 batch lane | **NOT_PROVEN** — digest slices Command Center but does not yet surface `batch_production_owner_decisions_lane_v1` as a first-class section unless proven in digest builder |
| Production evidence commit for this cohort | **NOT_PROVEN** |
| Supabase / `retailer_links` mutation from batch lane | **NOT_PROVEN** — no apply/mutation script |
| Affiliate URL edits from batch lane | **NOT_PROVEN** |
| Apply / mutation executor for batch lane | **NOT_PROVEN** |
| Batch size **20** (or larger) cohort runs | **BLOCKED** — `batch_size_20_status: BLOCKED` on batch lane; v1 cap remains **5–10** rows |
| Layer 6 founder-only production mutation approval | **NOT_PROVEN** (`layer_6_founder_only_production_mutation_approval: NOT_PROVEN` on batch lane) |
| `data/batch-production/drafts/*` as durable source of truth | **NOT PROVEN** — lane-local working artifacts only unless intentionally promoted |
| Blocked rows `da29-00012b`, `adq75795101` passing owner-review gates | **NOT PROVEN** — remain excluded until facts satisfy review blockers |

### Reporting / Command Center completeness (NOT_PROVEN unless stated)

Read-only inventory at this stop:

- **PROVEN:** Command Center JSON owns the bright/dim/dark **neuron map** at `owner_command_center_neurons` (`84fb4b3`) — eight keys; `data_mutation: false`; inspect via jq block above.
- **PROVEN:** Command Center JSON owns **GSC/GA4 artifact freshness** at `command_center_v2.external_measurement_freshness_v1` (`b85e90b`) — `read_only: true`, `data_mutation: false`; `OK` / `STALE` / `UNKNOWN` per feed; does **not** call live APIs or prove revenue.
- **PROVEN:** Owner dashboard displays Command Center neuron truth (`report.owner_command_center_neurons`); it does not build primary neuron truth when that field is present.
- **INFERRED:** Owner load still attaches separate lanes (`owner_integrity_sentinel`, `owner_search_demand_and_gaps`, `owner_gsc_external_demand`, quarantine, launch policy) and may call `buildBuckpartsCommandSurfaceReport` again for sentinel — not the same as dashboard-owned neuron fabrication.
- **Owner dashboard is not yet a single report surface** — many `scripts/report-*.ts` outputs remain CLI-only; neuron map + v2 lanes are not the full operating picture.
- **PROVEN:** Layer 7 batch owner decisions are surfaced on the owner dashboard **via** `command_center_v2.batch_production_owner_decisions_lane_v1` (Command Center is the truth source for that lane).
- **GitHub Actions live status is not Command Center-owned** — workflows exist under `.github/workflows/`; dashboard control plane lists workflow **basenames from disk only**, not live PASS/FAIL from GitHub API.
- **Sentry health is not Command Center-owned** — Sentry is integrated for runtime capture (`src/lib/monitoring/error-monitoring.ts`); no summarized Command Center / dashboard panel in-repo.
- **Netlify deploy API proof is not Command Center-owned** — live-site lane uses smoke/monitor artifacts; v2 text treats deploy commit hints as **not** Netlify API proof unless proven elsewhere.
- **Amazon Associates commission feed is not connected** — `data/ops/revenue-ledger-v1.json` has zero entries; Command Center `commission_or_revenue` remains **NOT_CONNECTED** unless a future feed proves otherwise.
- **GSC/GA4 freshness lane exists on Command Center** (`b85e90b`) — inspect `external_measurement_freshness_v1`; artifacts may still read **STALE** until operator runs `npm run buckparts:gsc:fetch` / `npm run buckparts:ga4:fetch` (listed in lane `recommended_commands`).
- **Runner Step live JSON is not Command Center-owned by default** — `npm run buckparts:runner-step` is CLI/CI; optional digest env `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` only.
- **Daily Operator status is not Command Center-owned** — `npm run buckparts:daily` is a separate `buckparts_daily_operator_v1` report (builds on Command Center internally but not merged into CC JSON).
- **Founder Digest status is not Command Center-owned** — `npm run buckparts:founder-digest` is Markdown stdout; slices Command Center but is a separate surface.

### Operator rules (do not regress)

**HQ / agent chat behavior:** Do not give Jared the "best next move" without giving the exact copy/paste prompt or command in the same chat message. If HQ states a next move, the prompt/command must be included immediately.

- **Do not** restart the Amazon interstitial loop as the primary batch path.
- **Do not** make Jared manually author JSON facts — agent fills facts → founder reviews and approves via **Markdown**.
- **Do not** commit generated `data/batch-production/drafts/*` as production evidence or canonical truth unless intentionally converted to a small, reviewed outcome artifact.
- **Do not** treat owner approval as authorization to mutate Supabase, `retailer_links`, `data/evidence/`, affiliate URLs, deploy, or apply execution.

### Next best move after chat migration (INFERRED)

Neuron source-of-truth (`84fb4b3`) and **external measurement freshness lane** (`b85e90b`) are **done**. If jq shows **STALE**, run artifact refresh before treating GSC/GA4 as current. Next slices (pick one): **Founder Digest** batch lane + neuron-aware sections, **blocked-row re-capture** for `da29-00012b` / `adq75795101`, or the next **NOT_PROVEN** feed from the inventory above (GitHub Actions live status, Sentry summary, Runner Step default in CC JSON, Daily Operator merged into CC JSON). **Not** production mutation, evidence commit, Supabase, `retailer_links`, affiliate edits, batch size 20, or apply execution.

**Copy/paste (repo root) — confirm external measurement freshness lane:**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.external_measurement_freshness_v1 | {contract, read_only, data_mutation, runtime_status, overall_status, gsc: .gsc.freshness_status, ga4: .ga4.freshness_status}'
```

**Copy/paste (repo root) — confirm Command Center neuron map:**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '{data_mutation: .owner_command_center_neurons.data_mutation, neuron_count: (.owner_command_center_neurons.neurons | length), neuron_keys: [.owner_command_center_neurons.neurons[].neuron_key]}'
```

**Copy/paste (repo root) — confirm Layer 7 batch lane in Command Center:**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.batch_production_owner_decisions_lane_v1 | {runtime_status, approved_for_planning_count, approved_rows: [.approved_rows[] | {row_id, token, allowed_next_scope}], excluded_not_owner_review_ready_row_ids, may_mutate, batch_size_20_status}'
```

**Normative spec:** `docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md` · `data/owner-decisions/batch-non-amazon-pdp-owner-approval.json` · `src/lib/owner-dashboard/batch-production-owner-decisions-lane-v1.ts`

---

## 0) Current HQ continuation brief (2026-05-12)

This section is the current executive operating memory for a new BuckParts HQ chat. It supersedes older tactical metric snapshots below unless those snapshots are refreshed by named commands.

### CURRENT STRATEGIC MODE

BuckParts is in **foundation-first mode**. The near-term goal is not more public polish by default; it is to move backend/foundation maturity toward roughly **75%** so BuckParts becomes an autonomous replacement-intelligence operating system rather than a hobby dependent on the founder.

Customer-facing improvements still matter, but they should follow foundation work when the foundation proves what customers want, what BuckParts safely covers, what evidence is missing, and which next actions are agent-safe.

### FOUNDATION-FIRST DOCTRINE

The backend/foundation should become a durable operating system that can:

- detect customer demand;
- identify what BuckParts does not safely cover;
- rank what is worth verifying;
- separate agent-safe actions from owner-approval actions;
- preserve `UNKNOWN` instead of creating fake confidence;
- produce owner-readable next actions without founder micromanagement.

Do not over-prioritize customer-facing polish until this operating loop is stronger. The target is not "good enough"; the target is the smallest correct durable implementation that is excellent within its declared scope.

### CUSTOMER-FACING RULE

Public pages must not surface weak-confidence "maybe buy" products. Weak-confidence demand belongs in backend learning, queues, and verification tasks, not public buy guidance.

Public buy paths graduate only after evidence clears trust gates. Buying options should appear only when the destination has passed the relevant safe buyer-path policy. Demand is not fit proof, revenue proof, conversion proof, or buyer-path proof.

### BACKEND 75% TARGET

The next maturity target is a backend/foundation that can run most routine operating judgment without the founder manually deciding every queue item. Approximate target state:

- demand inputs are read and classified;
- coverage state is known or explicitly `UNKNOWN`;
- evidence gaps are named;
- verification tasks are ranked;
- owner-vs-agent authority is explicit;
- silent failures are monitored;
- Daily Operator / Command Center recommendations use only `BRIGHT` or explicitly scoped `PARTIAL` proof.

### DEMAND-TO-COVERAGE ENGINE V1

The next strategic backend milestone is **Demand-to-Coverage Engine v1**. It should connect these steps:

1. Demand detected.
2. Coverage state known.
3. Evidence gap identified.
4. Verification task recommended.
5. Agent-safe and owner-approval paths separated.

This should build on existing read-only reports and authority rules. Do not jump straight to new public pages or public buying options from demand alone.

### CURRENT PROVEN SYSTEMS

Proven from current prompt context and repo files:

- Sentry production capture is proven: the temporary proof route returned `client_source=global`, and Sentry showed `buckparts_sentry_proof_v1` in production.
- The temporary proof route has been removed after proof.
- Real Sentry setup remains:
  - `next.config.mjs` with `withSentryConfig`;
  - `experimental.instrumentationHook: true`;
  - `src/instrumentation.ts`;
  - `sentry.server.config.ts`;
  - `src/app/global-error.tsx`;
  - `src/lib/monitoring/error-monitoring.ts`;
  - `/go` click monitoring;
  - search telemetry monitoring.
- Daily Operator and Command Center are the owner/operator reporting surfaces; fresh command output is required before trusting live numbers.
- Revenue/conversions remain `UNKNOWN` unless a real revenue/conversion feed is connected and reconciled.

### CURRENT SETUP / OPERATOR TASKS

- `support@buckparts.com` Zoho setup is underway.
- Domain DNS for email is managed in **Porkbun**, not Netlify.
- Netlify deploys the website. Porkbun controls DNS unless nameservers are moved.
- Track email proof before treating support email as complete:
  - inbound Gmail -> support;
  - outbound support -> Gmail;
  - SPF;
  - DKIM;
  - DMARC.
- Deploy only for production proof, production fixes, or meaningful customer/business improvements.
- Protect Codex/Cursor/Netlify usage: prompts should be efficient, validation should be one step at a time, and deploys should not be wasted.

### WHAT NOT TO DO

- Do not drift into customer-facing polish too early.
- Do not expose weak-confidence products as public buy guidance.
- Do not infer revenue, conversion, valuation, buyer intent, or fit proof from clicks, impressions, search demand, or GA4 aggregate counts.
- Do not use `DARK` or `UNKNOWN` signals for positive recommendations.
- Do not create dashboards without decisions.
- Do not deploy unless the change is production proof, a production fix, or a meaningful customer/business improvement.
- Do not waste Codex/Cursor/Netlify credits on broad scans, full test loops, or speculative work when a targeted step is enough.

### HOW THE ASSISTANT SHOULD INTERACT WITH USER

The assistant/HQ role is CEO/co-strategist, not a passive task mirror. It should keep the business headed in the right direction, protect efficiency, reduce hesitation in business choices, and challenge drift.

The owner/founder role is to judge what customers see, read, and trust; approve important business choices; and ask better questions.

Operating style:

- use the BuckParts Truth Contract;
- give direct copy/paste prompts;
- move one step at a time when validation output is needed;
- state Proven / Inferred / UNKNOWN for non-trivial claims;
- prefer the smallest concrete next move;
- do not ask broad open-ended follow-ups when one best move exists;
- do not treat "good enough" as a target.

### NEXT BEST HQ PROMPT FOR NEW CHAT

Use the starter prompt below to open the next main HQ chat.

### NEW HQ CHAT STARTER PROMPT

```text
You are BuckParts HQ: CEO/co-strategist and operating partner.

Use the BuckParts Truth Contract:
- Repo truth over memory.
- Exact paths/commands only.
- Proven / Inferred / UNKNOWN on non-trivial claims.
- UNKNOWN if not proven.
- No invented repo facts.
- Smallest concrete next move.
- No "done" without validation.
- Do not deploy unless explicitly approved.
- Do not git push unless explicitly approved.
- Do not print secrets.
- Do not commit generated artifacts.

Current doctrine:
- BuckParts is foundation-first right now.
- The target is to move backend/foundation maturity toward roughly 75% before prioritizing major customer-facing polish.
- The backend should become an autonomous replacement-intelligence operating system, not a hobby dependent on the founder.
- Do not over-prioritize customer-facing polish until the foundation can detect demand, identify coverage gaps, rank verification work, and produce authority-scoped next actions.
- Customer-facing pages must not surface weak-confidence "maybe buy" products.
- Weak-confidence demand belongs in backend learning, queues, and verification tasks, not public buy guidance.
- Public buy paths graduate only after evidence clears trust gates.

Next strategic backend milestone:
- Demand-to-Coverage Engine v1:
  1. demand detected;
  2. coverage state known;
  3. evidence gap identified;
  4. verification task recommended;
  5. agent-safe vs owner-approval paths separated.

Current proven monitoring state:
- Sentry production capture has been proven.
- The temporary proof route returned client_source=global.
- Sentry showed buckparts_sentry_proof_v1 in production.
- The temporary proof route was removed.
- Real Sentry setup remains: next.config.mjs with withSentryConfig, instrumentationHook true, src/instrumentation.ts, sentry.server.config.ts, src/app/global-error.tsx, src/lib/monitoring/error-monitoring.ts, /go click monitoring, and search telemetry monitoring.

Current setup task:
- support@buckparts.com Zoho setup is underway.
- Email DNS is managed in Porkbun, not Netlify.
- Netlify deploys the website; Porkbun controls DNS unless nameservers are moved.
- Need proof for inbound Gmail -> support, outbound support -> Gmail, SPF, DKIM, and DMARC.

Operating rules:
- Deploy only for production proof, production fixes, or meaningful customer/business improvements.
- Protect Codex/Cursor/Netlify usage; prompts should be efficient.
- Give direct copy/paste prompts.
- Work one step at a time when validation output is needed.
- Do not drift into customer polish too early.
- The owner judges what customers see/read/trust and approves important business choices.
- HQ should keep the business pointed at the right next move and reduce hesitation without inventing facts.

First task:
Read docs/BuckParts-HQ-HANDOFF.md (especially **Current stopping point** and §0B) and docs/BuckParts-TRUTH-MAP.md, then propose the single best next HQ move. Do not implement until asked.
```

---

## 0B) Layer 6 control-plane & Codex/Runner truth (2026-05-16)

**Supersedes** any older HQ claims about Cursor/Codex automation, Runner “full loop,” or Layer 6 being complete. Canonical detail also lives in `docs/BuckParts-RUNNER-STATUS.md`, `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`, and `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.

### Active lane (HQ priority order)

1. **Command Center external measurement freshness (`external_measurement_freshness_v1`)** (**current stop** through **`b85e90b`**) — **PROVEN:** lane on `buckparts:command-center` JSON; `read_only: true`, `data_mutation: false`; GSC/GA4 **STALE/OK/UNKNOWN** from artifact timestamps only. **NOT PROVEN:** live API fetch during CC build, revenue, or complete operating truth.
2. **Command Center neuron map (`owner_command_center_neurons`)** (through **`84fb4b3`**) — **PROVEN:** eight neurons on raw `buckparts:command-center` JSON; `data_mutation: false`; dashboard displays CC-owned neurons.
3. **Batch Production Lane v1 — non-Amazon review + owner approval gate + Command Center lane** (through **`93dcd3d`**) — **PROVEN:** five-row loop → durable registry export → `command_center_v2.batch_production_owner_decisions_lane_v1` → owner dashboard via Command Center load; 3 approved planning rows; 2 excluded rows visible in lane; `may_mutate: false`; `batch_size_20_status: BLOCKED`. **NOT PROVEN:** Founder Digest batch section, production evidence commit, mutation/apply, Layer 6 production mutation approval. See **Current stopping point** above.
4. **Layer 6 control-plane documentation + audit** — prove what the repo can and cannot claim about founder judgment, Codex read-only execution, Runner validation, and registry visibility (**this handoff + freshness guard are part of that**). **NOT PROVEN:** Layer 6 complete.
5. **Batch lane follow-ons (deferred)** — digest embed, apply/mutation script, **20–50** row batches. V1 cap **10** rows.

**Meta-system rule:** Do **not** keep expanding packets, digests, registries, or wrappers unless they **reduce founder copy/paste** or produce **coverage/revenue work**. If a change only adds ceremony, stop.

### What Layer 6 now proves (PROVEN in-repo)

| Claim | Evidence |
|--------|----------|
| Failure-pattern guardrail snapshot | `layer_six_readiness_summary_v1` in `src/lib/owner-dashboard/layer-six-readiness-summary-v1.ts`; digest + owner dashboard surface `readiness_status` only. |
| Codex read-only subprocess + capture | `npm run buckparts:codex-readonly-smoke` → `scripts/run-buckparts-codex-readonly-smoke.ts`; `npm run buckparts:codex-next-execution-packet` → `scripts/run-buckparts-codex-next-execution-packet.ts`. |
| Codex packet proof read model | `codex_packet_proof_read_model_v1` / contract `buckparts_codex_next_execution_packet_v1` in `src/lib/owner-dashboard/codex-packet-proof-read-model-v1.ts`. |
| Codex output review surface | `codex_output_review_packet_v1` in `src/lib/owner-dashboard/codex-output-review-packet-v1.ts`; digest section when `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH` set. |
| Transport ≠ task success | `codex_task_outcome_status` (`TASK_SUCCESS_PROVEN` / `TASK_PARTIAL_OR_FAILED` / `TASK_OUTCOME_UNKNOWN`) — separate from PASS transport/capture JSON. |
| Founder decision recording (read visibility) | `founder_decision_registry_v1` + `founder_decision_registry_read_model_v1`; optional `codex_output_review_context_v1` on rows; digest correlation via `source_queue_row_id`. |
| Repo-owned validation bundle | `npm run buckparts:runner-step` → `scripts/buckparts-runner-step.ts` (allowlist: lint, build, operator-proof only). |
| CI Runner Step artifact path | `.github/workflows/buckparts-runner-step.yml`; digest workflow may embed `buckparts-runner-step.json` via `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH`. |
| JSON stdout discipline | `docs/BuckParts-JSON-STDOUT-CONTRACT.md` + `scripts/json-stdout-contract.test.ts`. |
| Failure pattern catalog | `failure_pattern_registry_read_model_v1` / `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md`. |

### What Layer 6 does NOT prove (NOT_PROVEN / UNKNOWN)

- **NOT PROVEN:** Layer 6 “complete,” closed-loop autonomy, or founder-only approval automated end-to-end (`layer_6_founder_only_approval` stays **`NOT_PROVEN`** in Runner Step JSON and Codex summary JSON).
- **NOT PROVEN:** Registry rows are consumed by Runner, queues, Execution Packets, or mutation gates (`automation_input: false` on review/readiness surfaces).
- **NOT PROVEN:** Codex is an autonomous code writer or may run **`npm run lint` / `npm run build` / `npm run buckparts:operator-proof`** inside read-only sandbox (packet + wrapper **forbid** those; failures there are sandbox/environment, not repo-invalidity).
- **NOT PROVEN:** `approve_readonly_findings` grants Supabase writes, `retailer_links` mutation, evidence JSON writes, affiliate URL changes, or git commits.
- **UNKNOWN:** Cursor/OpenAI API loop from repo; Codex CLI on every host (`codex login` required).

### Codex role today (PROVEN wording)

Codex is a **read-only worker / investigator**: bounded `codex exec --sandbox read-only`, repo-built prompts, JSONL + final-message capture, clean-git check. It is **not** a self-directed engineer that ships commits or passes full validation inside the sandbox.

**External validation (Runner / local CI / founder terminal):** Founder Execution Packets include **EXTERNAL REPO VALIDATION BUNDLE** / **DO NOT RUN INSIDE CODEX SANDBOX** — `npm run lint`, `npm run build`, `npm run buckparts:operator-proof` run via **`npm run buckparts:runner-step`** or CI, **not** inside Codex read-only sandbox.

### Runner truth (PROVEN)

- **Runner Step v1:** `node --import tsx scripts/buckparts-runner-step.ts` (alias `npm run buckparts:runner-step` for humans only per JSON stdout contract).
- **Allowlist:** `lint`, `build`, `buckparts:operator-proof` — `scripts/lib/buckparts-runner-safety-contract-v1.ts`.
- **Output:** `buckparts_runner_step_v1` with `layer_truth.layer_6_founder_only_approval: "NOT_PROVEN"`.
- **GitHub dispatch:** `npm run buckparts:runner-step:gh` → `scripts/run-buckparts-runner-step-gh.ts` (workflow `BuckParts Runner Step`).
- **Digest:** optional live Runner JSON via `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH`.

### Founder Decision Registry truth (PROVEN)

- **Spec:** `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`; validator `src/lib/owner-dashboard/founder-decision-registry-v1.ts`.
- **Read model:** `node --import tsx scripts/report-founder-decision-registry.ts` (alias `npm run buckparts:founder-decision-registry`).
- **Data path:** `data/owner-decisions/*.json` (see `data/owner-decisions/README.md`).
- **Codex review rows:** optional `codex_output_review_context_v1` with `founder_option_id` aligned to `codex_output_review_packet_v1` founder options.

### Current owner decision row (PROVEN on disk)

**File:** `data/owner-decisions/codex-output-review-queue-amazon-agent-request-followup-readonly-2026-05-16.json`

| Field | Value |
|--------|--------|
| `source_queue_row_id` | `queue-amazon-agent` |
| `source_decision_packet_id` | `codex_output_review_packet_v1:queue-amazon-agent` |
| `decision_status` | `needs_more_evidence` |
| `allowed_next_scope` | `read_only_agent` |
| `codex_output_review_context_v1.founder_option_id` | `request_followup_readonly` |
| `active_mutation_approvals` (report) | `0` |

**Meaning:** Jared recorded **request another bounded read-only Codex pass** — **not** `approve_readonly_findings`. Codex transport/capture may be PASS while `codex_task_outcome_status` was **`TASK_PARTIAL_OR_FAILED`** (e.g. sandbox `.next/*` / temp IPC). This row is **owner judgment only**; it does **not** authorize mutation or Runner automation.

### Codex Output Review / outcome classifier (PROVEN)

- Builder: `buildCodexOutputReviewPacketV1` / `classifyCodexFinalMessageOutcomeV1` in `codex-output-review-packet-v1.ts`.
- Digest env: `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH` → saved stdout from `npm run buckparts:codex-next-execution-packet`.
- Layer 6 field when digest correlates registry: `founder_decision_recording_for_codex_review_v1` may be **`PROVEN_PRESENT`** when a matching `codex_output_review_context_v1` row exists — still **NOT** Layer 6 complete.

### JSON stdout contract (PROVEN)

Machine-parseable JSON scripts: **`node --import tsx scripts/…`** — not `npm run … | jq`. See `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.

### Failure Pattern Registry (PROVEN)

Seeded read model `failure_pattern_registry_read_model_v1`; feeds Layer 6 readiness counts. Informational only — does not widen Runner allowlist.

### Batch Production Lane v1 (read-only — non-Amazon review usable)

**Normative spec:** `docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md`. **PROVEN (through `93dcd3d`):** production review report, evidence plan, agent capture packet, owner screenshot drafts (`draft_ready_for_owner_review` vs `production_evidence_commit_blockers`), **owner Markdown review report** (`scripts/report-batch-owner-review.ts`), **owner Markdown approval checklist + partial compile** (`scripts/report-batch-owner-approval-checklist.ts`, `scripts/report-batch-owner-approval.ts`), non-Amazon PDP source (`--source non-amazon-pdp-candidates`), **durable registry export** for 3 ready rows at `data/owner-decisions/batch-non-amazon-pdp-owner-approval.json`, **`command_center_v2.batch_production_owner_decisions_lane_v1`**, **owner dashboard display via Command Center**. **Primary owner surfaces:** Markdown review + Markdown approval checklist + Command Center v2 lane. **Machine JSON:** debug/support only. **Owner approval:** planning/read-model only (`allowed_next_scope: read_only_agent`) — production mutation blocked. **NOT PROVEN:** full Command Center operating-truth audit, Founder Digest batch lane section, apply/mutation script, production evidence commit, Supabase/`retailer_links`/affiliate mutation, batch size 20, Layer 6 founder-only production mutation approval.

**V1 intent:** read-only **batch candidate review** — **5–10** rows, agent-filled facts, founder Markdown review, explicit registry decisions before any apply/commit/deploy. **Non-goals:** auto-publish, auto-commit, Supabase/`retailer_links`/evidence/affiliate mutation, Jared-authored JSON. **Do not** restart Amazon interstitial loop as main path. **Layer 6:** remains **`NOT_PROVEN`**.

### Layer 6 / Codex — key commands (copy from repo root)

```bash
# Registry read model (pure JSON stdout)
node --import tsx scripts/report-founder-decision-registry.ts

# Runner validation bundle (pure JSON stdout)
node --import tsx scripts/buckparts-runner-step.ts

# Codex read-only smoke + next execution packet (host must have Codex CLI + login)
npm run buckparts:codex-readonly-smoke
npm run buckparts:codex-next-execution-packet

# Digest with optional Runner + Codex proof JSON paths
FOUNDER_DIGEST_SKIP_BUILD=1 \
FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH=./buckparts-runner-step.json \
FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH=/path/to/buckparts-codex-packet-proof.json \
node --import tsx scripts/buckparts-founder-digest.ts

# Handoff freshness guard (Layer 6 section presence)
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

### Representative Layer 6 commit chain (reference only)

`1a4849b` Codex read-only smoke · `7ede5ea` Codex next execution packet · `5821af1` Codex packet proof read model · `1363bd4` Codex output review packet · `b38b90a` task outcome classifier · `5b0f0fb` Codex sandbox vs external validation · `b84453f` registry Codex review consumption · `40ad6eb` first real Codex review decision row.

---

## 1) BuckParts Truth Contract

- **Trust before blind monetization:** Buy CTAs and `/go` targets must pass the same gates as production (`src/lib/retailers/launch-buy-links.ts`, `src/lib/retailers/retailer-link-state.ts`, `src/lib/retailers/go-redirect-gate.ts`). See header comments in `launch-buy-links.ts` for search-placeholder and OEM catalog rules.
- **Affiliate narrative must match code:** `scripts/audit-buckparts-system-contracts.ts` checks Amazon tag in `src/lib/retailers/go-redirect-gate.ts` vs `data/affiliate/affiliate-application-tracker.json` (`amazon-associates`). **Last audit:** `npm run buckparts:audit` → `PASS`, blocking false (run at handoff prep).
- **Learning / outcomes schema:** `supabase/migrations/20260428200500_learning_outcomes.sql` defines `public.learning_outcomes`; writer contract in `scripts/lib/learning-outcomes-writer.ts`.
- **Script risk classes:** `docs/buckparts-script-classification-manifest.md` lists mutating vs read-only npm scripts—follow it before any DB/data write.
- **Operating inventory:** `docs/buckparts-operating-map.md` (KEEP / FREEZE / CUT / UNKNOWN table).

## 1A) Jared interaction rules

- Truth above all else.
- Repo truth over memory.
- If not proven, say UNKNOWN.
- Do not tell Jared what he wants to hear.
- Give the best answer first with no drip-feeding.
- Always end build/debug responses with the next best concrete action or prompt.
- Tell Jared exactly where to paste prompts/commands.
- Use Cursor Agent 1 — Repo / Code unless another surface is required.
- Give one prompt/block at a time.
- Never ask “if you want.”
- If there is one best move, state it and give the prompt.
- If two options are equal, ask Jared to choose and explain why.
- No vague follow-ups.
- No “done” without validation.
- Do not invent repo facts.
- Use Proven / Inferred / Unknown for non-trivial claims.
- Optimize for efficiency, money, trust, and conversion.
- For BuckParts build/debug replies, keep responses short: short summary, short why, and the next prompt only unless Jared explicitly asks for more detail.

## 1B) Cursor inbox protocol

- **Canonical relay file:** `docs/BuckParts-CURSOR-INBOX.md` is the repo-local checkpoint between HQ-oriented chat and Cursor Agent 1. It is **handoff text only**, not automation, APIs, or background jobs.
- **Does not replace:** `npm run buckparts:command-center`, `npm run buckparts:command-surface`, tests (`npm test`), cited repo paths, or evidence JSON. Those remain source of truth for live state and code behavior.
- **Conflict resolution:** If the inbox disagrees with repo contents or the output of a named command, **repo/command output wins**; update or abandon the inbox entry.
- **Lifecycle:** If the inbox becomes ritual without reducing copy/paste friction, **delete or freeze** it per the kill switch in that file.

---

## 1C) Fridge flagship product doctrine

**Proven in repo (policy + implementation direction):** refrigerator water is the **flagship wedge**. **Do not deploy** until the fridge homeowner experience is **pristine**. Other verticals must **not** be promoted publicly at **equal priority** until they match the **fridge trust standard** (see also `docs/fridge-flagship-wedge-exposure.md` — exposure audit; broad hide/noindex is a **future**, explicitly approved change).

**Positioning:** BuckParts is **not** a parts catalog page or an affiliate site. It is a **trusted replacement-part decision engine** for homeowners.

**Job to be done:** Help me **finish this replacement** without **buying the wrong part** or **damaging my appliance**.

**Fridge flagship pages must answer (evidence-gated where model-specific):**

1. What did BuckParts find?
2. Where should I look for the filter? *(generic guidance + defer to owner’s manual unless **manual evidence** supports model-specific location)*
3. How does replacement usually work? *(generic unless evidence-backed)*
4. Why does replacement matter?
5. What number should I compare? *(OEM / part / model — via checklist and match copy, not operator jargon)*
6. What is safe to buy, if anything? *(store links **secondary**; only when buy-link gates pass — BuckParts must stay useful with **zero** buy links)*
7. What source supports model-specific instructions, when available? *(future: **manual evidence** as trust moat; no manufacturer photos or copied manual diagrams)*

**Trust rules:**

- **Manual evidence** (contract: `src/lib/manuals/refrigerator-manual-evidence.ts`) is the path to **model-specific** install/location claims. Until a record is **public-ready** per the validator, pages show **only** clearly **generic** help that **defers** to the owner’s manual.
- **Store links are secondary**; **evidence and homeowner guidance are primary**.
- **Amazon / affiliate links must never define the product** (identity and fit come from BuckParts truth and homeowner-visible copy, not the merchant PDP).

---

## 2) Current objective

**From command center digest (not a separate product OKR doc):** when **only Amazon Associates** is `APPROVED` (verified tag) and the **Amazon-first blocked queue** reports `needs_amazon_search_count > 0`, the digest’s `next_best_action` **prefers** OEM blocked-search → Amazon PDP rescue (`scripts/report-buckparts-command-center.ts`). Otherwise the digest may still prioritize **affiliate approvals** / other money lanes when that condition is not met.

**Explicit product OKR outside repo:** UNKNOWN.

---

## 3) Current operating model

- **Core app:** Next.js routes under `src/app/**` with trust/part/retail stack in `src/lib/**` (see operating map).
- **Data plane:** Supabase Postgres (migrations under `supabase/migrations/`; full snapshot in `supabase/schema.sql`—**whether every migration is applied in a given environment is UNKNOWN**).
- **Ops plane:** Read-only JSON reports via `tsx` scripts (`npm run buckparts:*`); optional local GSC exports under `data/gsc/`; evidence JSON under `data/evidence/`; affiliate state in `data/affiliate/affiliate-application-tracker.json` (human-edited truth).
- **Private owner dashboard (not public):** `src/app/ownerdashboard/[secret]/` renders read-only Command Center aggregates (including click visibility under `command_center_v2`); see §5A. There is **no** separate public “command center app” route beyond scripts + this private page.

---

## 4) Current active lane

**From `npm run buckparts:command-center` (`top_money_queue`, non-exhausted lanes):**

| Lane | Exhausted | Candidate count | Source report name |
|------|-----------|-----------------|---------------------|
| `oem_catalog_next_money` | false | 133 | `buckparts_oem_catalog_next_money_cohort_v1` |
| `flexoffers_readiness_refrigerator_water` | false | 10 | `buckparts_flexoffers_readiness_refrigerator_water_v1` |
| `frigidaire_next_monetizable` | true | 0 | `buckparts_frigidaire_next_monetizable_candidates_v1` |

**Recommended cohort action (OEM lane):** “Start with `retailer_links` rows on domain `www.repairclinic.com` …” (verbatim from command center JSON).

---

## 5) Current command center status

**Digest:** `report_name: buckparts_command_center_v1`, `read_only: true`, `data_mutation: false`.

| Field | Value (last run) |
|--------|------------------|
| `system_health_summary.status` | `WARNING` |
| `system_health_summary.reasons` | `retailer_link_state_metrics BLOCKED_* exceeds LIVE_*` |
| `system_health_summary.recommended_next_step` | Resolve warning-level command-surface issues before expanding. |
| `blocked_link_summary.total_blocked_links` | 201 |
| `blocked_link_summary.top_blocked_state` | `BLOCKED_SEARCH_OR_DISCOVERY` |
| `blocked_link_summary.top_blocked_retailer_key` | `oem-catalog` |
| `execution_guidance.next_move_mode` | `READ_ONLY` |
| `operator_can_be_away_status` | `READY_FOR_AUTONOMOUS_READ_ONLY` |
| `known_unknowns` | See §16 (duplicates command surface + affiliate tracker lines). |

**Digest sections present (non-exhaustive):** `affiliate_readiness_summary`, `top_money_queue`, `recent_learning_outcomes`, `blocked_link_summary`, **`search_and_click_intelligence_summary`**, **`money_funnel_summary`**, **`rescue_velocity_summary`**, **`rescue_delta_trend_summary`**, `amazon_first_blocked_queue_summary`, `execution_guidance`, plus narrative fields (`next_best_action`, `why_this_action`, …).

**Frigidaire dead OEM:** `all_resolved: true`, `unresolved_count: 0` (from same command-center run).

### 5A) Command Center / click visibility (read-only)

- **Where it lives:** Owner dashboard (private route above) and Command Center v2 JSON under `command_center_v2.revenue_snapshot.click_visibility` (`scripts/lib/buckparts-click-events-snapshot.ts` + types in `scripts/lib/buckparts-command-center-v2-types.ts`). All reads are **read-only**; no `retailer_links` mutations from this path.
- **Semantics:** The snapshot **separates raw `click_events` counts** from **`human_likely_*` counts** (conservative `user_agent` heuristic: browser-like strings, excluding known bots, internal `BuckPartsAudit`, and `curl` / `node`-style clients). Known bot / internal audit / scripted / unclassified traffic is bucketed in **`excluded_*`** / **`excluded_by_category_30d`**.
- **Root cause of prior `STALE` / silent logging (2026-05-04, proven):** **`public.click_events` schema drift** — `buildGoClickEventInsertRow` and `/go` always inserted **`target_url`**, but the live table **lacked that column**, so PostgREST rejected inserts while redirects still worked. **Not** a Command Center read bug.
- **Fix:** Supabase migration **`20260502120000_click_events_add_target_url_alignment.sql`** (repo + operator runbook `scripts/ops/click-events-target-url-alignment-runbook.sql`) **adds `target_url`** (and `retailer_link_id` if missing) for alignment with `supabase/schema.sql` and the app insert payload — **schema-only**, not a retailer-link mutation.
- **Verification:** After the migration, a **browser** smoke hit on production `/go` (`…/go/c5303885-6ea2-43da-87bb-846a311edba1`) produced a new row: **`created_at` `2026-05-04T03:41:44.254316+00:00`**, **`page_slug` `lt1000p`**, **`retailer_slug` `amazon`**, **`target_url` `https://www.amazon.com/dp/B07H9LHMR2?tag=buckparts20-20`**. Click logging **writes again**.
- **Last verified pulse (re-run `npm run buckparts:command-center` to refresh):** **`raw_last_7_days_clicks` 1**, **`human_likely_last_7_days_clicks` 1**, **`raw_last_30_days_clicks` 1844**, **`human_likely_last_30_days_clicks` 209**, **`newest_click_at` `2026-05-04T03:41:44.254316+00:00`**, **`click_freshness_status` `OK`**.
- **Historical rows:** Pre-migration **`click_events` rows may still have `target_url` null**; no backfill was performed.
- **Revenue:** **`commission_or_revenue` remains `NOT_CONNECTED`**. Raw clicks are **not** revenue; human-likely counts are **not** proof of shoppers or orders.
- **How to interpret for business:** Prefer **`human_likely_*` plus `click_freshness_*`**, not raw totals, when reasoning about outbound interest. When freshness is `STALE` or `NO_RECENT_EVENTS`, treat click volume as **historical / degraded signal** until new events exist.
- **Performance guardrail:** Do **not** introduce SQL view/RPC “optimization” for this unless the **bounded** 30d row scan becomes slow or flaky in production; the design intentionally avoids view/RPC tuning for this lane.
- **Netlify / Supabase:** Production dashboard click visibility needs **`SUPABASE_SERVICE_ROLE_KEY` server-side** (same contract as other read-only admin paths). **`/go` inserts** use **`NEXT_PUBLIC_SUPABASE_URL`** + **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** via `getSupabaseServerClient()`. **Never** expose the service role as `NEXT_PUBLIC_*`.

---

## 6) Current affiliate status

**Tracker file:** `data/affiliate/affiliate-application-tracker.json` (14 records at handoff read).

**From command center `affiliate_readiness_summary`:**

- `approved_count`: **1**
- `affiliate_approval_pending`: **true**
- `pending_count` / `pending_network_or_programs`: **4** buckets — `NOT_STARTED:1`, `DRAFTING:7`, `SUBMITTED:1`, `IN_REVIEW:2` (strings as emitted).
- `repairclinic_status`: **DRAFTING**

**Amazon Associates (from tracker JSON):** `status: APPROVED`, `tagVerified: true`, `tagValue: buckparts20-20`.

**Rejected in tracker (examples):** `awin`, `flexoffers` (each `REJECTED` with dated notes in JSON).

**Command-surface `affiliate_tracker.health` (last run):** `OK` (no `REAPPLY_REQUIRED`).

**Tag verification counts (command surface):** `verified_count: 1`, `unverified_count: 0`, `unknown_count: 13`.

---

## 7) Current monetization status

**From `npm run buckparts:command-surface` → `cta_coverage_metrics` (253 retailer link rows sampled across wedges in that run):**

- `direct_buyable_links`: **52**
- `safe_cta_links`: **52**
- `blocked_or_unsafe_links`: **201**
- `missing_browser_truth_links`: **61**

**`retailer_link_state_metrics.distribution` (same run):**

- `LIVE_DIRECT_BUYABLE`: 52  
- `BLOCKED_BROWSER_TRUTH_UNSAFE`: 61  
- `BLOCKED_SEARCH_OR_DISCOVERY`: 139  
- `BLOCKED_BROWSER_TRUTH_MISSING`: 1  

**Revenue / commission dollars:** not computed in evidenced read-only reports (`report-homekeep-business-scorecard.ts` states it is not a revenue report)—**UNKNOWN** here.

---

## 8) Current database / schema status

- **Repo:** Migrations and `supabase/schema.sql` define intended schema (including `click_events`, `learning_outcomes`, search intelligence, gap candidates, staged compat, retailer links, wedges).
- **Live Supabase instance:** commands succeeded with service role in handoff environment—**specific project / migration version / row counts outside last script output are UNKNOWN** without querying `schema_migrations` or similar.
- **Preflight:** `npm run buckparts:preflight:schema` exists for schema checks before risky work.

---

## 9) Recent completed work

**Trust / vertical UX (shared components, now on multiple wedges):**

- **`PartTruthPanel`** extracted (`cb3806b` and related refactors).
- **Vertical filter pages** use the truth panel and **`TrustAwareBuySection`** (`be11e07`).
- **Vertical filter pages** include **gate suppression summaries** (`d7b4ae6`).
- **Air purifier model pages** use the **trust-aware buy** block (`a0fa4c6`); model truth copy is explicit via provider (`bde23a3`).
- **Whole-house water model pages** use the same **trust-aware buy** pattern (`9229144`).

**Search / intelligence:**

- **Read-only search-miss audit** exists (`ea84b3f`); **refrigerator brand + model-prefix query normalization** landed (`a49e62e`) to reduce false misses.

**Still not rolled out (as of `9229144` on `origin/main`):**

- **Fridge** model-page trust parity (there is **no** `src/app/fridge/model/[slug]/` route in-repo; water-filter flows use other paths).
- **Vacuum / humidifier / appliance-air** model pages (`src/app/*/model/[slug]/page.tsx`) do **not** yet pass `primaryTrustBuy` or wrap `ModelTruthPanelCopyProvider` (only **air purifier** and **whole-house water** model routes do).
- **Full GA4/GSC parsed metrics** in HQ JSON (surface uses available exports + DB slices; not a complete analytics product in-repo).
- **Affiliate earnings / commission reporting** (tracker + CTA metrics; no evidenced revenue pipeline in read-only reports).

**Strategic questions (for Jared / HQ, not answered here):**

- **Customer trust** and **mobile polish** vs velocity.
- **Safe CTA coverage growth** vs blocked-link backlog shape.
- **Remaining model-page trust parity** ordering (fridge vs other verticals).
- **Affiliate / revenue signal integration** when more programs are `APPROVED`.

**Older reference commits (Amazon-first queue era):** `fda01cb` Amazon-first blocked conversion queue; multipack / buyable-subtype / rescue cohort work continues in `git log` before the trust-panel series above.

**Docs in repo:** `docs/buckparts-command-center-final-blueprint.md` (blueprint)—confirm tracking with `git status` if you edit locally.

---

## 10) Current blockers

- **Command surface / center health:** `WARNING` — blocked retailer-link states exceed live (`computeSystemHealth` in `scripts/report-buckparts-command-surface.ts`).
- **Affiliate breadth:** Only one `APPROVED` program in tracker-driven summary; many lanes drafting / review / not started; **RepairClinic** not approval-ready (`DRAFTING`)—NBA explicitly deprioritizes RepairClinic-dependent work until status advances (`report-buckparts-command-center.ts` guard).
- **Awin / FlexOffers:** `REJECTED` in tracker—treat as closed lanes unless tracker is updated.
- **Evidence:** `data/evidence/amazon-false-negative-rescue-staging.2026-04-29.json` is only rewritten when you run `npm run buckparts:stage:amazon-false-negative-rescue` (CLI entry); importing `scripts/stage-amazon-false-negative-rescue.ts` from tests no longer triggers a write. Substantive edits from that stage command are **INTENTIONAL** only.

---

## 11) Next best action

**From last `buckparts:command-center` output (live env; re-run to refresh):**

- **`next_best_action`:** “Prioritize Amazon-first OEM blocked-search rescue: run exact-token Amazon PDP searches and verify buyability for queued refrigerator tokens (ADQ75795101, DA97-08006B, DA97-15217D, DA97-17376A, DA97-19467C).”
- **`why_this_action`:** “Amazon Associates is APPROVED with verified tag, no other affiliate is APPROVED yet, and the Amazon-first queue reports rows needing SEARCH_AMAZON_EXACT_TOKEN.”

**Also read:** `amazon_first_blocked_queue_summary` in the same JSON (`needs_amazon_search_count`, `already_live_noop_count`, `top_5_tokens`). If `runtime_status` is `UNKNOWN`, the digest falls back to the older affiliate-queue / money-lane NBA logic.

---

## 12) Exact prompt / output style rules

When acting as a BuckParts repo agent:

1. **Prefer evidence:** Cite file paths or command outputs; use **UNKNOWN** when not proven.
2. **No silent DB writes:** Mutating scripts (`seed:*`, `buckparts:search-gap:status:*`, staged apply/promote, etc.) require explicit operator intent—see manifest §5.
3. **Read-only reports:** Default to JSON stdout scripts under `npm run buckparts:*` for status.
4. **User comms (if also given user rules):** Complete sentences; code citations use ```start:end:path fences on their own line; avoid inventing CLI the user must run—run it when the environment allows.
5. **Do not claim** command center UI, revenue totals, or production cron unless documented or measured.

---

## 13) What not to do

- Do **not** change trust gates or `/go` behavior without review (`launch-buy-links`, `go-redirect-gate`, `retailer-link-state`).
- Do **not** insert monetized links for networks that are not `APPROVED` in the tracker (FlexOffers readiness report is explicitly “no link insert” preparation—see `report-flexoffers-readiness-fridge.ts` slot template).
- Do **not** treat `known_unknowns[0]` about `learning_outcomes` as contradicting `learning_outcomes_metrics.runtime_status` without reading the code: **`report-buckparts-command-surface.ts` always prepends** the string `learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED (DB intentionally not queried).` into `known_unknowns` (around lines 1132–1133) even when metrics were queried and show **`OK`**—last run had `learning_outcomes_metrics.runtime_status: OK` and all outcome counts `0`.
- Do **not** assume Frigidaire monetizable queue has work—command center shows **exhausted** for that lane.

---

## 14) Current key commands

**Verification loop (recommended daily):**

```bash
npm run buckparts:audit
npm run buckparts:command-surface
npm run buckparts:command-center
```

**Snapshot (for trend deltas):**

```bash
npm run buckparts:command-surface:snapshot
```

### Command-surface snapshot discipline (`rescue_delta_trend_summary`)

- **Refresh on-disk snapshot:** `npm run buckparts:command-surface:snapshot` writes `data/reports/buckparts-command-surface.json` (same shape as live command-surface JSON).
- **Git visibility:** `data/reports/*` is **gitignored** (see repo `.gitignore`), so refreshing the snapshot may **not** appear in `git status` even though the file changed locally.
- **Prior snapshot shape:** `rescue_delta_trend_summary` compares the current run against that file; it needs a **current-shaped** prior snapshot (includes `cta_coverage_metrics`, `retailer_link_state_metrics`, and `search_and_click_intelligence_summary` with the numeric fields the delta builder reads). A stale or pre-schema snapshot yields `UNKNOWN_SNAPSHOT_UNAVAILABLE` until replaced.
- **Two-step loop:** After `…:snapshot`, run `npm run buckparts:command-surface` **again** so the next read picks up the refreshed file and can emit numeric `current`, `deltas`, and `net_rescue_direction` (the snapshot run itself still built against the *previous* file contents).
- **First deltas after refresh:** When metrics match the snapshot you just wrote, `net_rescue_direction` may legitimately be **`FLAT`**; meaningful **IMPROVING** / **DEGRADING** / mixed **`UNKNOWN`** shows up after later catalog or gap backlog changes.

**Other `buckparts:*` scripts:** full list in `package.json` (lines ~29–82)—includes guardrails, runbooks, OEM/Amazon/Frigidaire reports, scorecard, affiliate clicks, false-negative audit, schema preflight, etc.

**Tests / build:**

```bash
npm test
npm run build
```

---

## 15) Current warnings from command surface

**`system_health.status`:** `WARNING`

**`system_health.reasons` (last run):**

- `retailer_link_state_metrics BLOCKED_* exceeds LIVE_*`

**`recommended_next_step`:** Resolve warning-level command-surface issues before expanding.

**Related metrics (same run):** see §7 for blocked vs live counts.

---

## 16) Open questions / UNKNOWNs

- **Product roadmap / OKRs** outside command-center NBA: UNKNOWN.
- **Production DB migration lag** vs repo: UNKNOWN without environment query.
- **Whether `learning_outcomes` rows are written in production** at any volume: table returned **all zero** outcome counts in last surface run—usage frequency UNKNOWN.
- **Affiliate conversion revenue ingestion:** no evidenced automated pipeline in repo survey for this handoff—UNKNOWN.
- **Operator calendar / on-call:** UNKNOWN.
- **`READY_FOR_ASYNC_REVIEW` in command center type:** enum exists in `CommandCenterReport`; current TypeScript path only sets `NOT_READY` or `READY_FOR_AUTONOMOUS_READ_ONLY` in `report-buckparts-command-center.ts`—behavior for async review UNKNOWN.
- **Git working tree cleanliness:** run `git status --short` before work; treat evidence JSON timestamp-only diffs as noise unless you intentionally re-ran a mutating staging flow (§10).

---

## Appendix — Command center `known_unknowns` (2026-05-03 post-push run, verbatim)

Use for debugging overlap with command surface:

1. `learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED (DB intentionally not queried).`  
2. `state_system_metrics.retailer_link_state non-computable: …`  
3. `state_system_metrics.no_buy_reason non-computable: …`  
4. `state_system_metrics.wrong_purchase_risk non-computable: …`  
5. `state_system_metrics.replacement_safety non-computable: …`  
6. `Affiliate tracker: walmart: notes include UNKNOWN` (duplicated twice in output)

---

*End of handoff. Regenerate numbers by re-running §14 commands.*
