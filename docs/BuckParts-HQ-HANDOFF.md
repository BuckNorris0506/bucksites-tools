# BuckParts HQ — Agent Handoff

**How to use:** Paste this whole file into a new ChatGPT / Cursor chat when picking up BuckParts work.

**Evidence timestamp:** Re-run `npm run buckparts:command-center` and `npm run buckparts:command-surface` before trusting live numbers. Last handoff refresh for digest text: **`2026-05-03`**: `origin/main` includes through **`9229144`** (whole-house water model trust/buy parity). After that push, **`npm test`** and **`npm run build`** completed successfully; **`npm run buckparts:command-surface`** and **`npm run buckparts:command-center`** completed with exit code **0** (JSON still reports `system_health* : WARNING` because blocked/unsafe retailer links exceed live/safe links). Command Center **`execution_guidance.next_move_mode`** is **`READ_ONLY`**. Command Center JSON now includes **`search_and_click_intelligence_summary`**, **`money_funnel_summary`**, **`rescue_velocity_summary`**, and **`rescue_delta_trend_summary`** (see §14 for `rescue_delta_trend_summary` snapshot discipline—after a snapshot refresh + follow-up surface read, the block can return **`runtime_status: OK`** with numeric `current` / `deltas` / `net_rescue_direction`, often **`FLAT`** when nothing moved).

**Rule:** If a fact is not in this file, a cited repo path, or the output of a named command, treat it as **UNKNOWN**—do not invent.

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

## 2) Current objective

**From command center digest (not a separate product OKR doc):** when **only Amazon Associates** is `APPROVED` (verified tag) and the **Amazon-first blocked queue** reports `needs_amazon_search_count > 0`, the digest’s `next_best_action` **prefers** OEM blocked-search → Amazon PDP rescue (`scripts/report-buckparts-command-center.ts`). Otherwise the digest may still prioritize **affiliate approvals** / other money lanes when that condition is not met.

**Explicit product OKR outside repo:** UNKNOWN.

---

## 3) Current operating model

- **Core app:** Next.js routes under `src/app/**` with trust/part/retail stack in `src/lib/**` (see operating map).
- **Data plane:** Supabase Postgres (migrations under `supabase/migrations/`; full snapshot in `supabase/schema.sql`—**whether every migration is applied in a given environment is UNKNOWN**).
- **Ops plane:** Read-only JSON reports via `tsx` scripts (`npm run buckparts:*`); optional local GSC exports under `data/gsc/`; evidence JSON under `data/evidence/`; affiliate state in `data/affiliate/affiliate-application-tracker.json` (human-edited truth).
- **No dashboard UI in repo** for command center (operating map: UNKNOWN for dashboard app).

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
