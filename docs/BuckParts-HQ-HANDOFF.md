# BuckParts HQ — Agent Handoff

## Current stopping point — SEO Phase 1 + RF28R7351SR Page Factory v1 (PROVEN through `a070797`)

**Read this section first** for current HQ / Cursor / HyperAgent pickup.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`a070797f907f78b0d2a6157fa65a3339d8c4e54d`** |
| Latest commit | **`a070797`** — `Remove RF28R7351SR quarantine after HAF-QIN parity proof` |
| Working tree | **Clean** at handoff refresh |

**Recent relevant commits:**

| SHA | Subject | Status |
|-----|---------|--------|
| `a070797` | Remove RF28R7351SR quarantine after HAF-QIN parity proof | **PROVEN pushed** |
| `f07c8c6` | Fix RF28R7351SR compat test after commit | **PROVEN pushed** |
| `21b23ed` | Reconcile RF28R7351SR HAF-QIN compatibility mapping | **PROVEN pushed** |
| `2fed919` | Add RF28R7351SR page factory draft evidence | **PROVEN pushed** |
| `d4bbf0b` | Add SEO Phase 1 canonical and JSON-LD foundation | **PROVEN pushed** |

### 2. SEO Phase 1 foundation (PROVEN)

**PROVEN:** SEO Phase 1 canonical + safe JSON-LD foundation is implemented, validated, pushed, and smoke-tested.

**Primary commit:** `d4bbf0b`.

**Files added / changed:** `src/lib/seo/canonical.ts`, `src/lib/seo/structured-data.ts`, `src/components/seo/JsonLdScript.tsx`, SEO tests, and metadata wiring in:
- `src/app/layout.tsx`
- `src/app/fridge/[slug]/page.tsx`
- `src/app/filter/[slug]/page.tsx`
- `src/app/brand/[slug]/page.tsx`

**Guardrails proven:** no buyer-path mutation, no `/go` mutation, no `data/retailer_links.csv` mutation, no Supabase mutation, no visible copy rewrite, no sitemap mutation, no ProductGroup schema, no `offers` / `price` / `availability` / `aggregateRating` / `review` / `seller` schema keys.

### 3. RF28R7351SR Page Factory v1 (PROVEN)

**PROVEN:** First page-factory target `samsung-rf28r7351sr` was moved from research packet to repo evidence, compatibility reconciliation, Supabase parity, quarantine removal, local production proof, and live proof.

**Repo truth now:**
- `data/compatibility_mappings.csv` maps `samsung-rf28r7351sr` only to `da97-17376b`.
- `data/manual-evidence/refrigerator/samsung-rf28r7351sr.json` exists and validates as public-ready.
- `data/fridge/batch-production/drafts/samsung-rf28r7351sr-page-1-draft-v1.md` exists as owner-reviewable draft/evidence context.
- `samsung-rf28r7351sr` is absent from `src/lib/fridge/fridge-model-review-overrides.ts`.

**Supabase truth proven during operator session:**
- Supabase maps `samsung-rf28r7351sr` only to `da97-17376b`.
- Stale Supabase mappings to `da29-00020b` and `da29-00012b` were removed.
- RF28R7351SR quarantine was removed only after CSV + Supabase parity proof.

**Live proof:** live curl proof passed for `https://buckparts.com/fridge/samsung-rf28r7351sr`.
- Contains `RF28R7351SR`, `da97-17376b`, `DA97-17376B`, `HAF-QIN`, and canonical.
- Does not contain `DA29-00012B`, old owner-review/quarantine copy, or old wrong-family quarantine copy.
- `DA29-00020B` was absent on live proof; local proof showed it only in caution/warning context, not as a mapped/recommended filter.
- `go_href_count=1`; proof did not click `/go`.

### 4. Seed/import lessons (PROVEN)

**PROVEN:** `npm run seed:import` upserts `compatibility_mappings` but does **not** prune stale DB rows removed from CSV. Removed compatibility rows can remain in Supabase unless explicitly cleaned up or a prune path is used.

**PROVEN:** `npm run seed:import` can fail when Supabase `retailer_links` has DB↔CSV parity drift. In this lane, failures were caused by:
- duplicate DB rows sharing `(filter_id, affiliate_url)` for GE MWF,
- Amazon DB rows using untagged ASIN URLs while CSV used tagged `?tag=buckparts20-20` URLs,
- unique constraint `retailer_links_filter_retailer_key_unique` blocking insert when DB had `retailer_key=amazon` with an untagged URL.

**PROVEN fix pattern used:** read-only DB triage first, then owner-approved targeted Supabase cleanup/update, then rerun `npm run seed:import`, then prove Supabase parity before removing public quarantine.

**Required future rule:** before relying on `npm run seed:import` for page-factory mapping work, run a DB↔CSV parity preflight for:
1. target model compatibility rows,
2. removed/stale DB compatibility rows,
3. retailer-link duplicate `(filter_id, affiliate_url)` rows,
4. retailer-key URL parity conflicts, especially Amazon tagged vs untagged URLs.

**Do not repeat:** do not remove a public quarantine based on CSV-only proof. Required gate is **CSV exact mapping + successful seed/import or targeted Supabase parity + local/live page proof**.

### 5. Next operating lane (INFERRED)

**Recommended next:** build the repeatable Page Factory checklist/tooling so the next model page does not rediscover these failures manually.

**Do not start the next model page as raw mutation until HQ has a documented preflight/checklist that distinguishes:**
- repo evidence ready,
- CSV reconciled,
- Supabase parity proven,
- quarantine removed,
- local proof passed,
- live proof passed,
- HQ handoff updated.

---



**How to use:** Paste this whole file into a new ChatGPT / Cursor chat when picking up BuckParts work.

**Canonical truth map:** `docs/BuckParts-TRUTH-MAP.md` is the primary source-of-truth navigation index for policy/runtime/measurement/operator files.

**HQ handoff vs operating truth:** HQ handoff is **not** the source of operating truth. This file is migration/context for future chats only. **`npm run buckparts:command-center`** JSON (`scripts/report-buckparts-command-center.ts`) is. The owner dashboard (`src/app/ownerdashboard/[secret]/page.tsx`) is the **visual/readable surface** for Command Center truth — not a parallel truth builder. Update this handoff after milestones (not every small decision); **`b85e90b`** (external measurement freshness lane) qualifies.

**Evidence timestamp:** Re-run `npm run buckparts:command-center`, `npm run buckparts:command-surface`, and `node --import tsx scripts/report-fridge-safe-link-batch-factory-v1.ts` before trusting live numbers. **Latest repo checkpoint (HEAD / origin main):** **`a070797`** — SEO Phase 1 + RF28R7351SR Page Factory v1 completion (see **Current stopping point — FOH + safe-link batch factory** below). **Prior checkpoint `afaf86d`** (grant application pack) is **superseded** for next-move authority — retained as historical context only. **Prior milestones** (fridge spine **`7b09529`**, Semi-Cruise **`edfeeba`**, UI motion **`bbadce5`**, FOH slice **`8eaa8ac`**, etc.) remain documented below — treat §4–§16 metric snapshots as **UNKNOWN** until re-run.

**Rule:** If a fact is not in this file, a cited repo path, or the output of a named command, treat it as **UNKNOWN**—do not invent.

---

## Current stopping point — FOH + safe-link batch factory (PROVEN through `f9af2fe`)

**Read this section first** for HQ / Cursor / HyperAgent pickup (unless Jared explicitly redirects back to grant-only work in **Grant application stopping point** below).

### 1. Current repo state (PROVEN — re-verify before citing)

```bash
git status --short
git log --oneline -8
git rev-parse HEAD
git rev-parse origin/main
git merge-base --is-ancestor f9af2fe origin/main && echo "f9af2fe on origin/main"
```

| Item | Value |
|------|--------|
| Branch | **`main`** |
| HEAD | **`f9af2fea4d20f9d7b8c85dbeaebd57882ef77789`** (`f9af2fe`) |
| `origin/main` | **`f9af2fe`** — **same as HEAD** at handoff refresh |
| Working tree | **Clean** at handoff refresh (`git status --short` empty) |

**Recent commits on `main` / `origin/main` (PROVEN):**

| SHA | Subject | On `origin/main`? |
|-----|---------|-------------------|
| **`f9af2fe`** | Add fridge safe link batch factory | **PROVEN** — not local-only |
| **`a0884a2`** | Add GSWF GE official safe link proof packet | **PROVEN** |
| **`8eaa8ac`** | Refresh BuckParts front of house first slice | **PROVEN** |

Do **not** claim any commit is pushed unless `git rev-parse HEAD` equals `git rev-parse origin/main` (or `git branch -r --contains <sha>` includes `origin/main`).

### 2. Front-of-house / site look

| Claim | Status |
|-------|--------|
| FOH refresh is accepted direction; pre-FOH warm-beige homepage look is **stale** | **PROVEN** in-repo — `8eaa8ac` Option C tokens + homepage hero (`Wrong Buck.` / `Right Parts.`) in `src/app/page.tsx` |
| FOH did **not** touch buyer-path gates, `/go`, Supabase, `data/retailer_links.csv`, or `data/evidence/**` | **PROVEN** — slice limited to `globals.css`, `tailwind.config.ts`, `SearchForm.tsx`, `SiteShell.tsx` (logo class only), `page.tsx`, `StatusLegend.tsx`, `marketing/*` cards |
| Logo SVG geometry unchanged | **PROVEN** — `SiteShell.tsx` path `d` values unchanged; `text-bp-logo` decouples logo from trust token |
| Filter/product pages still need future polish; gate logic stays separate | **INFERRED** — token refresh cascades; `TrustAwareBuySection` / `launch-buy-links` unchanged |
| Live homepage shows FOH markers after push | **UNKNOWN in repo** — no FOH-specific string in committed `data/reports/*` live-smoke artifacts at handoff refresh; operator-reported PASS after push. Re-prove: `npm run buckparts:live-site-smoke:check` and manual GET `/` for `Wrong Buck.` / `Look it up` |

**Visual QA (local, not committed):** screenshots under `/tmp/buckparts-foh-qa-v1/` — illustrative `VerifiedLinkCard` / `NoVerifiedLinkCard` on homepage only; **not** buyer-path gates.

### 3. Safe-link coverage truth (PROVEN — batch factory artifact)

**Source:** `node --import tsx scripts/report-fridge-safe-link-batch-factory-v1.ts` → `data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json` (generated `2026-06-04T01:49:24.921Z`).

| Metric | Value |
|--------|--------|
| `live_refrigerator_filter_pages_scanned` | **57** |
| `live_with_go_cta_count` | **31** |
| `live_without_go_cta_count` | **26** |
| `total_missing_before` (rescue cohort) | **26** |
| `expected_coverage_delta` (if eligible applied later) | **+1** only (`31` → `32`) |
| `owner_browser_needed_count` | **21** |

**Do not claim** live coverage improved from GSWF proof. **`a0884a2`** adds draft proof only — **no** Verified Link authorized or applied.

| Slug / lane | State (PROVEN in batch factory) |
|-------------|----------------------------------|
| **GSWF** | **`APPLY_ELIGIBLE_WITH_EXISTING_PROOF`** — draft `data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json`; **not live** |
| **4396508** | **`CONFLICT_REQUIRES_RECONCILIATION`** — lane **stopped/quarantined**; repo vs HyperAgent conflict unresolved |
| **4396842** | **`NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED`** |
| **XWF / XWFE** | **`NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL`** — no Verified Link until compatibility/supersession labeling |

**Expected future delta:** **+1** live `/go` only if **gswf** later passes guarded CSV + Supabase parity + **explicit owner authorization** — not from proof packet alone.

### 4. Efficiency Contract (required operating rule)

Before giving Jared any next step, first ask:

1. Does this move increase **live safe buyer paths** or build **reusable machinery** that increases many soon?
2. Is this **batch** or **one-product copy/paste**?
3. Does this **reduce** Jared’s future workload or **create more** owner relay?
4. Is **HyperAgent** used for parallel discovery where strongest?
5. Is **Cursor/repo** used for truth gates, classification, batch planning, and safe apply where strongest?
6. What is **expected coverage delta**?
7. What is the **smallest correct durable batch system**?

If a move helps **one product only** and does **not** create reusable batch machinery, **stop** and propose batch/factory instead — unless Jared explicitly approves a one-off proof.

## Ops-agent workflow v1 (doctrine — packet contracts in repo)

**Full contracts:** `docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md` · **guards/tests:** `scripts/lib/buckparts-ops-agent-workflow-v1.ts`

**HyperAgent ingest:** Cursor validation requires full Mission Control packet bodies at `data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-ingest-bundle-v1.json`. Stub/materialized/repo-join bundles fail with `FULL_HYPERAGENT_PACKET_BODIES_REQUIRED` (see `scripts/DEV_ONLY-materialize-fridge-hyperagent-ingest-bundle-v1.ts` — **INVALID_FOR_TRUTH_VALIDATION**).

Required pipeline (no stage skipping):

```
Command Center → Mission Control Orchestrator → Task Queue → HyperAgent specialists
  → Structured ingest packet → Cursor/repo (gates, tests, batch factory)
  → Validation result → Command Center status update → Permanent repo tool (if repeat)
```

| Stage | Role |
|-------|------|
| **Command Center** | Repo-owned **truth board and task source** (`npm run buckparts:command-center`) |
| **Mission Control** | **Request classifier and dispatcher** — routes specialists; does **not** close truth |
| **Task Queue** | **Structured work packets** (`buckparts_command_center_task_packet_v1`) |
| **HyperAgent** | **Parallel discovery / source-finding only** — not apply, not Verified Link |
| **Structured ingest** | **`buckparts_hyperagent_ingest_packet_v1`** — discovery input until repo validates |
| **Cursor / repo** | **Validation, gates, tests, batch factory, safe-apply planning** |
| **Validation result** | **`buckparts_cursor_validation_packet_v1`** — **only** path to task closure |
| **CC status update** | **`buckparts_command_center_status_update_packet_v1`** — **repo-validated only** (requires `validation_id`) |
| **Permanent tool** | Any **repeated owner-relay** step must become a script/lane/test — not chat-only |

**Rules (PROVEN policy; orchestration implementation UNKNOWN):**

- HyperAgent uses **discovery/workflow statuses** (`DISCOVERY_OPEN`, `DISCOVERY_COMPLETE`, `DISCOVERY_BLOCKED`) — **not** truth-closure statuses (`APPLY_ELIGIBLE_*`, `PROVEN`, `VALIDATION_PASS`, etc.).
- **Command Center completion requires repo validation** — HyperAgent prose alone cannot close a lane or task.
- **Safe-link coverage missions are batch-first by default** — use `scripts/report-fridge-safe-link-batch-factory-v1.ts` / rescue cohort machinery; single-slug work requires `one_product_exception` ∈ **TEST** | **PROOF** | **DEBUG** | **BLOCKER_RECONCILIATION**.
- Aligns with **Efficiency Contract** §4 — batch/reusable machinery over one-product loops.

### 5. HyperAgent operating model

| Role | Owner |
|------|--------|
| Parallel discovery swarm | **HyperAgent** — external discovery, candidate sources, image/source discovery, marketing drafts, Mission Control orchestration |
| Repo truth + gates | **Cursor/repo** — classification, batch factory, tests, validation, guarded apply **planning** |
| HyperAgent findings | **Discovery input only** until repo gates validate |

**Mission Control direction (INFERRED — HQ policy, not yet implemented in repo):**

- One orchestrator agent classifies requests first, runs only needed specialists, outputs **one consolidated document**.
- Specialist roster: Discovery, Truth & Risk, Repo-Ingest Planner, Marketing, Design/FOH, Strategy/HQ.
- Trigger: **on demand** in chat.
- Output: **consolidated doc**.
- Slack/schedule: **later**, not now.

### 6. Skills / tools context

HyperAgent skills noted (operator-added): **Vignelli Canon Design System**, **Data-Viz / NYT truth-safe**, **Airtable Ops Board**.

| Effect on BuckParts workflows | Status |
|--------------------------------|--------|
| Validated in-repo BuckParts workflow | **UNKNOWN** until used in a gated repo report |

### 7. Current hard guardrails (unchanged)

Unless **explicit owner approval** exists for that specific action:

- No production mutation
- No Supabase mutation
- No `data/retailer_links.csv` mutation
- No `data/evidence/**` mutation
- No deploy
- No `/go` click
- No BuckParts Verified Link authorization

### 8. Best next strategic direction

- **Stop** one-slug proof loops unless proving a **reusable new lane**.
- Next safe-link work: **batch proof capture / batch apply planning** for the **21** `APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF` rows — **not** another single-slug apply lane.
- Goal: move many missing links through **HyperAgent discovery → Cursor batch factory → guarded apply** (owner-authorized only).

**Re-prove batch factory:**

```bash
node --import tsx scripts/report-fridge-safe-link-batch-factory-v1.ts | jq '{
  cohort_summary,
  proposed_first_batch_rows,
  expected_coverage_delta
}'
```

---

## Grant application stopping point (historical — superseded by `f9af2fe` for next-move)

**Superseded for next-move authority.** BuckParts was at a **grant-application stopping point** at **`afaf86d`** — retain for grant submission context only unless Jared redirects back to grant work.

**Operating truth source (PROVEN):** `npm run buckparts:command-center` → `scripts/report-buckparts-command-center.ts` JSON. HQ handoff is migration/context only.

### Repo checkpoint (PROVEN — re-verify before grant submission)

| Item | Value |
|------|--------|
| Branch | **`main`** |
| HEAD / origin main | **`afaf86d`** — *Add vacuum bags OEM research evidence packet v1* |
| Working tree | **Clean** at handoff refresh (no uncommitted product/operator mutations) |

**PROVEN — verify checkpoint (copy/paste from repo root):**

```bash
git branch --show-current
git rev-parse --short HEAD
git rev-parse --short origin/main
git status --short
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.vacuum_bags_oem_research_evidence_packet_v1.inspect_summary'
```

### Grant kit / public trust readiness (PROVEN from repo reports only)

| Item | Status |
|------|--------|
| Grant readiness contract | **`buckparts_grant_readiness_v1`** — `read_only: true` |
| Public trust routes | **`/truth-policy`** · **`/wrong-part-prevention`** — `truth_policy_route_present: true`, `wrong_part_prevention_route_present: true` |
| Grant Application Kit docs | **All present:** `docs/grants/BuckParts-Grant-Application-Kit-v1.md`, `BuckParts-Grant-Answer-Bank-v1.md`, `BuckParts-Grant-Use-Of-Funds-v1.md`, `BuckParts-Grant-Truth-Claims-Register-v1.md` |
| Kit readiness report | **`buckparts_grant_application_kit_readiness_v1`** — **`kit_ready_for_jared_review: true`** (re-run before submit) |
| Ecommerce / affiliate overclaim risk (grant scan) | **`LOW`** / **`LOW`** — **not** permission to add storefront or savings copy |
| Official BuckParts contact email | **`admin@buckparts.com`** — **PROVEN** in `src/app/about/page.tsx` and `src/app/privacy/page.tsx` (grant kit founder contact block still marks some bio/contact fields **UNKNOWN** — Jared to supply) |

**PROVEN — inspect grant kit readiness (copy/paste):**

```bash
node --import tsx scripts/report-buckparts-grant-application-kit-readiness-v1.ts | jq '{
  kit_ready_for_jared_review,
  grant_doc_present,
  ecommerce_positioning_risk,
  affiliate_overclaim_risk
}'
```

### Wedge / truth spine state (PROVEN — Command Center + wedge matrix; re-run before citing counts)

| Wedge | Truth spine | Public launch | Notes |
|-------|-------------|---------------|--------|
| **Refrigerator water** | **`fridge_truth_spine_v1`** — **FORMAL_SPINE** | **`refrigerator_routes_live`** / indexable | Committed CSV spine on Command Center; do **not** claim all filters verified |
| **Air purifier** | **`air_purifier_truth_spine_v1`** — **`formal_spine_status: PROVEN`** | **`LIVE`** | **PROVEN:** `safe_cta_count=10` on committed CSV (re-run spine report) |
| **Whole-house water** | **No formal spine** — **PARTIAL_OPERATIONAL_PROOF** | **`NOINDEX_UNPROVEN`** | **`whw_public_opening_authorized: false`** — public opening **unauthorized** |
| **Vacuum bags** | **No truth spine** — research lanes only | **`NOINDEX_UNPROVEN`** | See vacuum row below — **no inventory, no safe CTA, no launch** |

**WHW safe-CTA wins (PROVEN direction — not public opening):**

- **`3m-ap810`:** safe **`direct_buyable`** retailer row applied in committed CSV (**`381b5e6`** — see historical WHW block below).
- **`3m-ap811`:** **`BROWSER_TRUTH_READY`** lane; WHW batch director reports **`ap811_browser_truth_capture_complete: true`** — still **`whw_public_opening_authorized: false`**.

### Vacuum bags — research only (PROVEN at `afaf86d`)

| Lane | Value |
|------|--------|
| Feasibility | **`vacuum_bags_wedge_feasibility_v1`** — **`NEEDS_RESEARCH_FIRST`** |
| Seed packet | **`vacuum_bags_research_seed_packet_v1`** — **`RESEARCH_SEED_PACKET_READY`** |
| OEM evidence packet | **`vacuum_bags_oem_research_evidence_packet_v1`** — **`NEEDS_MORE_OEM_EVIDENCE`** |
| Bounded families checked | **4** (Miele GN, Miele FJM, Hoover Type Y, Kenmore Q) |
| **`families_ready_for_truth_spine_seed_count`** | **`0`** |
| Vacuum launch state | **`NOINDEX_UNPROVEN`** |
| All mutation/opening gates | **`public_launch_authorized: false`**, **`csv_apply_authorized: false`**, **`supabase_update_authorized: false`**, **`sitemap_change_authorized: false`**, **`buy_gate_change_authorized: false`**, **`all_vacuum_bags_verified_claim: false`** |

**Do not:** create vacuum product CSVs, claim model-to-bag fit, invent safe CTAs, seed **`vacuum_bags_truth_spine_v1`**, or open/index vacuum until dual OEM evidence exists in repo.

### Sitemap / GSC / campaign readiness (PROVEN audit — mostly NOT_READY / UNKNOWN)

| Item | Status |
|------|--------|
| Sitemap audit contract | **`buckparts_sitemap_indexability_audit_v1`** |
| **`gsc_indexed_count`** | **`UNKNOWN`** (no fresh indexed count in repo artifacts) |
| **`first_campaign_indexability_status`** | **`NOT_READY`** |
| **`seventy_five_indexed_page_threshold_status`** | **`UNKNOWN`** |
| Sitemap mutation authorized | **`false`** — audit is read-only |

Re-run: `node --import tsx scripts/report-buckparts-sitemap-indexability-audit-v1.ts | jq '{gsc_indexed_count, first_campaign_indexability_status, seventy_five_indexed_page_threshold_status}'`

### Do not do next (grant stopping point)

- Do **not** continue **product expansion** (new wedges, vacuum inventory, WHW public opening, batch grinding, CSV apply, Supabase updates, buy-gate changes, sitemap edits).
- Do **not** claim grant submitted, funded, revenue, customers, traction, social impact, indexed-page counts (unless re-proven from named reports), or “all verified.”
- Do **not** treat **`kit_ready_for_jared_review: true`** as grant approval or funding.
- Furnace filters / HVAC wedges remain **out of scope** (separate safety model — not in repo).

### What this stopping point does NOT prove

| Area | Status |
|------|--------|
| Grant application submitted or awarded | **UNKNOWN** |
| Revenue, conversion, savings, or customer counts | **UNKNOWN** |
| GSC indexed page count / 75-page campaign threshold | **UNKNOWN** or **NOT_READY** per sitemap audit |
| All fridge or AP filters verified | **NOT claimed** |
| Vacuum bag compatibility for any model | **NOT claimed** — OEM evidence **UNKNOWN** in repo |
| WHW public launch timeline | **UNKNOWN** — opening **unauthorized** |

---

## Current stopping point — grant trust pack + WHW safe-CTA expansion (historical — superseded by `afaf86d`)

**Superseded:** Use **Grant application stopping point (through `afaf86d`)** above first. This block retains **`aec8b8c`** grant-trust-pack + WHW safe-CTA context — still valid read-only inventory, not latest HEAD or next-move authority.

### Repo checkpoint (PROVEN)

| Item | Value |
|------|--------|
| Branch | **`main`** |
| HEAD / origin main | **`aec8b8c`** — *Add BuckParts grant readiness public trust pack* — **superseded by `afaf86d`** |
| Prior WHW commits (on main) | **`381b5e6`** — AP810 safe retailer link apply · **`0c1a0d4`** — AP811 buyer-path proof artifact |

### What BuckParts is (PROVEN doctrine — do not regress in grant or public copy)

1. **BuckParts is not ecommerce.** It is a **truth-first homeowner-help / wrong-part-prevention system** — a trusted replacement-part decision engine, not a parts catalog or affiliate storefront.
2. **Affiliate links are secondary to truth** — overhead support only; revenue does not override fit evidence or buyer-path gates.
3. **Grant positioning** should emphasize: homeowner trust, wrong-part prevention, verification systems, tool/credit funding, accessibility, and expansion of **verified** coverage — **not** marketplace or savings hype.
4. **Do not claim** BuckParts is the source of all truth.
5. **Do not claim** all filters/parts are verified.
6. **Do not claim** guaranteed savings.

### Grant / Public Trust Pack v1 (PROVEN at `aec8b8c`)

| Item | Path / value |
|------|----------------|
| Public trust routes | `src/app/truth-policy/page.tsx` · `src/app/wrong-part-prevention/page.tsx` |
| Grant readiness report | `scripts/report-buckparts-grant-readiness-v1.ts` |
| Contract | `buckparts_grant_readiness_v1` |
| `read_only` | `true` |
| `data_mutation` | `false` |
| `truth_policy_route_present` | `true` |
| `wrong_part_prevention_route_present` | `true` |
| `ecommerce_positioning_risk` | **LOW** |
| `affiliate_overclaim_risk` | **LOW** |

**Next grant step (INFERRED from repo state):** **strategy / application kit** — not more public-page overbuilding unless a **specific grant** requires a named page. Do not treat LOW risk scores as permission to add ecommerce or affiliate-first copy.

**PROVEN — inspect grant readiness (copy/paste from repo root):**

```bash
node --import tsx scripts/report-buckparts-grant-readiness-v1.ts | jq '{
  contract,
  read_only,
  data_mutation,
  truth_policy_route_present,
  wrong_part_prevention_route_present,
  ecommerce_positioning_risk,
  affiliate_overclaim_risk
}'
```

### Whole-house water (WHW) — not publicly open (PROVEN)

| Item | Status |
|------|--------|
| WHW public launch | **NOT open** — remains **NOINDEX_UNPROVEN** / not publicly opened |
| `whw_public_opening_authorized` (expansion queue) | **`false`** |

**AP810 safe retailer link (`381b5e6`, PROVEN in CSV):**

- `data/whole-house-water/retailer_links.csv` contains **one** safe **`direct_buyable`** **`aquapure-dealer`** row for **`3m-ap810`** (non-primary; existing **3M oem-catalog search** primary retained).

**AP811 buyer-path proof (`0c1a0d4`, PROVEN artifact — no CSV apply):**

| Field | Value |
|-------|--------|
| Artifact | `data/whole-house-water/batch-production/agent-results-buyer-path-v1/whw-buyer-path-3m-ap811-batch-v1.results.json` |
| PASS / FAIL / UNKNOWN / BLOCKED | **0 / 2 / 4 / 0** |
| `best_truthful_buyer_path` | **`null`** |
| `recommended_csv_mutation` | **`null`** |
| `safe_apply_authorized` | **`false`** |
| WHW public opening | **unauthorized** |

**WHW safe CTA expansion queue (PROVEN — re-run report before trusting):**

| Lane | Count |
|------|-------|
| `APPLY_READY_FOUNDER_APPROVAL_REQUIRED` | **0** |
| `BROWSER_TRUTH_READY` | **1** |
| `BUYER_PATH_DISCOVERY_READY` | **0** |
| `MODEL_FIRST_READY` | **20** |
| `MAPPING_REVIEW_REQUIRED` | **39** |
| `SKIP_FOR_NOW` | **2** |

- **`3m-ap811` lane:** **`BROWSER_TRUTH_READY`**
- **Recommended next batch head:** **`3m-ap811`** · **`browser_truth_capture`** (not model-first retry)
- **`whw_public_opening_authorized`:** **`false`**

**Next WHW execution step (PROVEN direction):** **`3m-ap811` `browser_truth_capture`** — **not** model-first retry for AP811.

**PROVEN — inspect WHW expansion queue (copy/paste from repo root):**

```bash
node --import tsx scripts/report-whole-house-water-safe-cta-expansion-queue-v1.ts | jq '{
  lane_summary_counts,
  whw_public_opening_authorized,
  recommended_next_batch: [.recommended_next_batch[] | select(.filter_slug == "3m-ap811") | {filter_slug, lane, packet_kind, rationale}]
}'
```

### Stash hygiene (PROVEN at handoff refresh)

- Duplicate mixed WIP stash was **dropped** after AP811 proof.
- **Do not drop** remaining stashes without inspection:
  - `stash@{0}`: **temp**
  - `stash@{1}`: **strict-phase1-local**
  - `stash@{2}`: **feat/owner-ops-v1**

### Credit-saving validation rule (PROVEN)

Use **focused tests** unless production/public route changes require **`npm run build`**. For this checkpoint (docs + handoff freshness): handoff freshness test + grant readiness stdout jq; full build **not required** for docs-only handoff updates.

```bash
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
node --import tsx scripts/report-buckparts-grant-readiness-v1.ts | jq '.contract'
```

### Do not do next (grant + WHW — at this stopping point)

- Do **not** claim BuckParts is ecommerce, all-verified, or guaranteed-savings.
- Do **not** open WHW publicly or mutate WHW launch state without founder approval.
- Do **not** apply WHW CSV rows from AP811 buyer-path proof — **`safe_apply_authorized: false`**.
- Do **not** retry AP811 **model-first** as the next WHW step — next lane is **`browser_truth_capture`**.
- Do **not** overbuild public trust pages for grant work unless a **specific grant** requires a named page.
- Do **not** edit product CSVs, Supabase, buy gates, WHW artifacts, or unrelated UI unless explicitly founder-approved.

### What this checkpoint does NOT prove

| Area | Status |
|------|--------|
| Grant application submitted or funded | **UNKNOWN** |
| WHW public opening timeline | **UNKNOWN** |
| Revenue, conversion, or savings claims | **UNKNOWN** |
| All WHW filters verified | **NOT claimed** — majority remain mapping review / model-first / skip lanes |

---

## Latest validated checkpoint — existing UI motion + recent-search memory (PROVEN through `bbadce5`)

**Purpose:** Record a **validated UX/memory checkpoint** on the **existing** BuckParts customer UI. This is **not** a redesign milestone, **not** a clean stopping point, and **not** permission to pause revenue/trust/coverage work.

### Repo checkpoint (PROVEN)

| Item | Value |
|------|--------|
| HEAD | **`bbadce5`** — *Add subtle motion and recent searches to existing BuckParts UI* |
| Local / remote sync | **PROVEN** synced at `bbadce5` when this handoff was updated |
| Proof folder (committed) | `docs/mockups/existing-site-animation-memory-proof-v1/` (README + `capture.mjs` + screenshots) |

### What changed (PROVEN in-repo at `bbadce5`)

| Area | PROVEN state |
|------|----------------|
| Visual direction | **Existing BuckParts UI preserved** — no Hallmark concepts, no recommended hybrid layout, no mockup-driven homepage/search/catalog redesign |
| Rejected exploration artifacts | Hallmark / hybrid / redesign mockup directions **removed from the working tree** before this checkpoint (not carried into `bbadce5`) |
| Scroll reveal | `RevealOnScroll` — subtle fade + small translate; `prefers-reduced-motion` respected; conservative use on homepage sections/cards, search result groups/cards, catalog cards |
| Hover / focus polish | `bp-card-interactive` / `bp-btn-press` on existing cards and search submit — navy/trust palette unchanged |
| Recent searches | Browser-only `localStorage` key **`buckparts.recentSearches.v1`** — max **6**, case-insensitive dedupe, trim, min **2** / max **80** chars, control chars stripped; label **Recent searches**; Clear action; chips route via normal **`/search?q=`** |
| SearchForm behavior | Min length, `actionPath`, and `router.push` routing **unchanged**; valid submit saves query **before** navigation |

**Implementation paths (PROVEN):** `src/components/RevealOnScroll.tsx`, `src/components/RecentSearches.tsx`, `src/lib/client/recent-searches.ts`, `src/components/SearchForm.tsx`, `src/app/page.tsx`, `src/app/search/page.tsx`, `src/app/catalog/page.tsx`, `src/app/globals.css` (interaction classes only).

### Protected paths (PROVEN untouched at `bbadce5`)

- `data/filters.csv`, `data/filter_aliases.csv`, `data/compatibility_mappings.csv`, `data/fridge_models.csv`, `data/retailer_links.csv`
- `data/evidence/*`, `data/discovery/*`
- Buy gates / search semantics (intentionally unchanged): `TrustAwareBuySection`, `TieredBuyLinks`, `/go` redirect logic, `searchCatalog` semantics, result ordering, href generation, retailer-link logic

### Validation before commit (PROVEN)

```bash
node --import tsx --test src/lib/copy/customer-ux-doctrine.test.ts
node --import tsx --test src/app/filter/filter-pdp-homeowner.test.ts
node --import tsx --test src/app/fridge/fridge-trust-funnel-wiring.test.ts
npm run lint
npm run build
```

(`npm run build` **passed** at this checkpoint.)

### Live verification (PROVEN / UNKNOWN)

| Claim | Status |
|-------|--------|
| `buckparts.com` loads | **PROVEN** (browser) |
| Recent searches work after deployment settled | **PROVEN** (browser) |
| Live HTML exposes deploy commit via `buckparts-deploy-commit` meta | **UNKNOWN** — earlier `curl` could not prove which commit was live |

### Product lesson (PROVEN direction for near-term customer UX)

Full redesign exploration (Hallmark concepts, recommended hybrid mockups) was **rejected** as not better than the existing site. **INFERRED near-term customer UX rule:** keep the existing BuckParts UI and add **targeted** interaction/memory improvements that increase usefulness **without** weakening trust or buy-gate safety.

### What this checkpoint does NOT prove

| Area | Status |
|------|--------|
| Revenue, conversion, or repeat-visit lift from motion/memory | **UNKNOWN** — no attributed business metrics in-repo |
| Command Center / Semi-Cruise / batch lane authority changes | **NOT changed** by `bbadce5` |
| Monetized coverage growth | **NOT advanced** by this commit alone |

### Next priority after this checkpoint (INFERRED — business does not stop here)

Compound toward revenue while preserving fit/buy safety:

1. Preserve fit/buy safety (gates, evidence, wrong-purchase prevention).
2. Improve customer trust and conversion on existing surfaces.
3. Increase useful return behavior and repeat lookup value (recent searches is one slice only).
4. Continue monetized coverage growth **only** from verified evidence.
5. Avoid broad redesign churn unless it **directly** improves trust or conversion.

**Copy/paste (repo root) — re-validate UI checkpoint tests:**

```bash
node --import tsx --test src/lib/copy/customer-ux-doctrine.test.ts
node --import tsx --test src/app/filter/filter-pdp-homeowner.test.ts
node --import tsx --test src/app/fridge/fridge-trust-funnel-wiring.test.ts
npm run lint && npm run build
```

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

## Fridge truth spine v1 — Command Center (PROVEN through `7b09529`)

**Purpose:** Record the **verified refrigerator truth stack** now exposed read-only on Command Center. This is **truth inventory**, not permission to mutate CSV/Supabase or rebuild fridge products from scratch.

### Repo checkpoint (PROVEN)

| Item | Value |
|------|--------|
| HEAD | **`7b09529`** — *Surface fridge truth spine in Command Center* |
| Command Center field | `command_center_v2.fridge_truth_spine_v1` |
| Builder | `scripts/lib/fridge-truth-spine-v1.ts` (composes model-first audit, reconciliation, Supabase-vs-CSV diff, public-truth audit) |
| Contract | `fridge_truth_spine_v1`; `read_only: true`; `data_mutation: false` |

### What is PROVEN (read-only fridge truth spine)

| Layer | PROVEN state |
|-------|----------------|
| **CSV buyer-path truth** | Committed `data/retailer_links.csv`: **0/57** linked fridge filters with safe direct-buyable primaries; all **57** primaries **`SEARCH_PLACEHOLDER_PRIMARY`**; `safe_buyer_path_verdict: PROVEN_TRUE` |
| **Evidence truth** | **19** fridge win artifacts; **18** linked slugs with evidence-win artifacts |
| **Supabase vs CSV** | Supabase **CHECKED**; **16/18** evidence-win slugs **`SUPABASE_HAS_WIN_CSV_MISSING`** |
| **Evidence-only mismatch** | **`4396508`**, **`gswf`** — evidence-win artifacts **not** in Supabase |
| **Public truth (prior audit)** | **18/18** live/public filter pages checked in `fridge_command_center_and_public_truth_audit_v1`; `public_truth_status: PUBLIC_TRUTHFUL`; `should_redo_fridge_products_now: NO` |
| **Spine live HTTP in CC build** | **`UNKNOWN_NOT_CHECKED`** inside spine build (Command Center skips live HTTP probes) — run `report-fridge-command-center-and-public-truth-audit-v1` for full live proof |
| **Mutation authority** | Spine **does not** authorize CSV export, CSV apply, Supabase mutation, dispatch-run mutation, batch-review mutation, or public customer UI mutation |

### Recommended fridge next action (lane-only — not top-level NBA)

**Founder-approved CSV export/backfill plan for 16 Supabase-proven fridge buyer paths; do not rebuild fridge products from scratch; do not apply without owner approval.**

### Truth doctrine (PROVEN in spine)

- Affiliate links remain **second to truth**.
- Safe CTAs are allowed **only** when buyer-path gates pass.
- Mapping confidence remains a **separate fit-truth issue** and must not be overclaimed.

### Command Center `next_best_action` vs fridge spine (PROVEN)

- Top-level **`next_best_action`** remains **AP model-first steering** when `ap_model_first_evidence_queue_v1` is **READY** (e.g. shark-carbon-foam at handoff refresh) — fridge spine **does not override** that steering.
- Fridge truth is **exposed read-only** on Command Center for owner/report visibility; it is **not** wired as automatic CSV apply/export authorization.

### Operating decision (PROVEN direction)

- **Do not redo fridge products from scratch** right now (`should_redo_fridge_products_now: NO`).
- Next **product-expansion** work should use **model-first discovery**, but **only after** this HQ handoff reflects the stopping point.

### PROVEN — inspect spine lane (copy/paste from repo root)

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_truth_spine_v1 | {
  contract,
  read_only,
  data_mutation,
  csv_truth,
  evidence_truth,
  supabase_csv_diff,
  public_truth,
  recommended_next_action,
  truth_first_notes
}'
```

### PROVEN — focused validation (save credits; avoid full Command Center suite unless CC changes)

```bash
node --import tsx --test scripts/lib/fridge-truth-spine-v1.test.ts
node --import tsx --test scripts/lib/refrigerator-model-first-truth-audit-v1.test.ts
node --import tsx --test scripts/lib/fridge-truth-reconciliation-v1.test.ts
node --import tsx --test scripts/lib/fridge-supabase-vs-csv-retailer-links-diff-v1.test.ts
node --import tsx --test scripts/lib/fridge-command-center-and-public-truth-audit-v1.test.ts
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

**Full live public HTTP proof (when needed):**

```bash
npx tsx scripts/report-fridge-command-center-and-public-truth-audit-v1.ts
```

**PROVEN — validation before this handoff update:** `buckparts-hq-handoff-freshness`; focused fridge spine tests above; `npm run lint` (docs-only change).

---

## Current stopping point / chat migration state (historical — superseded by `aec8b8c`)

**Superseded:** Use **Current stopping point — grant trust pack + WHW safe-CTA expansion (through `aec8b8c`)** at the top of this file first. This block retains **fridge spine / batch / Command Center** context from **`7b09529`** — still valid read-only inventory, not the latest HEAD or next-move authority.

**Command Center is the operating brain** — fridge truth is on the spine; the founder should **not** rebuild fridge products from scratch or apply CSV backfill without owner approval.

### Repo HEAD (historical snapshot at `7b09529` — verify live with `git rev-parse HEAD`)

| Item | Value |
|------|--------|
| Branch | **`main`** |
| Latest known committed HEAD at this block’s last refresh | **`7b09529`** — *Surface fridge truth spine in Command Center* — **superseded by `aec8b8c`** |
| Fridge truth spine | **PROVEN on Command Center:** `command_center_v2.fridge_truth_spine_v1` (`read_only`, `data_mutation: false`) — see **Fridge truth spine v1** section |
| Command Center partial vs aware | **INFERRED:** spine composes full fridge truth stack; wiring scan in public-truth audit may still read **`COMMAND_CENTER_PARTIAL`** until explicit spine field markers are added to wiring scan — **do not treat as license to redo fridge products** |
| Prior milestone chain | `98412a1` batch checklist · `bbadce5` UX motion/memory · `a343464` Waterdrop · `edfeeba` Semi-Cruise read-only · `b85e90b` external measurement · `84fb4b3` neurons · `93dcd3d` Layer 7 batch owner decisions |
| AP batch-v2 production apply | **PROVEN (prior work, on disk):** 4 auto-safe direct-buy slugs applied to `data/air-purifier/retailer_links.csv`; apply-run at `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-batch-v2.json` (`apply_status: APPLIED`); Supabase parity applied in operator session — **no parity apply-run artifact committed in repo** (stage stays **UNKNOWN** in checklist until ingested) |
| Customer UI | **Existing BuckParts look preserved** at `bbadce5`; motion + `buckparts.recentSearches.v1` only |
| Semi-Cruise read-only loop | Still **PROVEN** at `edfeeba`; fridge spine work does **not** grant mutation authority |

**Commit lineage (Layer 7 + HQ + Command Center):**

- **`399251a`** — Layer 7 owner approval gate implemented in-repo.
- **`181bc54`** — HQ chat behavior rule: next move must include copy/paste prompt or command in the same message.
- **`f71f61f`** — approval checklist summary distinguishes blocked vs awaiting agent facts.
- **`78ff67d`** — partial approval compile: expects founder decisions only for `draft_ready_for_owner_review` rows when facts exist; durable registry export for ready rows only.
- **`93dcd3d`** — `command_center_v2.batch_production_owner_decisions_lane_v1` reads committed batch registry exports; owner dashboard displays Layer 7 batch state **through Command Center only** (no dashboard-only registry scan for this lane).
- **`84fb4b3`** — `owner_command_center_neurons` is built inside `scripts/report-buckparts-command-center.ts` (via `src/lib/owner-dashboard/owner-command-center-neurons-v1.ts`); raw Command Center stdout is the neuron source; owner dashboard **displays** that field and does not create primary neuron truth when the field is present.
- **`b85e90b`** — `command_center_v2.external_measurement_freshness_v1` is built in `scripts/report-buckparts-command-center.ts` (via `src/lib/owner-dashboard/external-measurement-freshness-v1.ts`); read-only artifact staleness for GSC + GA4 — **not** live API fetch, **not** revenue proof.
- **`a343464`** — Waterdrop DA29-00020B owner-browser proof in `data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json`; Rakuten `tagVerified` on `rakuten-waterdrop-filter` (browser proof baseline; production insert recorded separately in evidence).
- **`bbadce5`** — Existing-site scroll reveal + hover/focus polish + recent-search `localStorage` (`buckparts.recentSearches.v1`); proof at `docs/mockups/existing-site-animation-memory-proof-v1/`; catalog CSVs, evidence, discovery, buy gates, and search semantics untouched.

### Customer language doctrine + Waterdrop research (PROVEN in-repo)

| Item | Path / status |
|------|----------------|
| Customer language + definitions (durable) | `docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md` |
| **No OEM cold** rule | Public copy must not use **OEM** unless defined immediately as **original equipment manufacturer**; prefer **Samsung-made**, **official Samsung filter**, **compatible replacement filter**, **non-Samsung replacement filter** |
| Command Center lane | `command_center_v2.customer_language_and_waterdrop_research_lane_v1` (`read_only`, `mutation_authority: false`) |
| Waterdrop trust module draft | `docs/drafts/waterdrop-da29-00020b-oem-vs-compatible-trust-module-v1.md` — **design/research only**, **not** published live copy |
| Waterdrop live CTA (`da29-00020b`) | **`LIVE`** — production `retailer_links` row **`d4cbad0c-4bab-4854-89bf-59e6d6492c6b`**; `/filter/da29-00020b` and `/go/d4cbad0c-4bab-4854-89bf-59e6d6492c6b` runtime proof in evidence |
| Waterdrop evidence | `data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json` — `mutation_ready: false` (no automation authority); `production_insert_outcome` + `runtime_proof` **PROVEN** read-only |
| Insert plan | `docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql` — **EXECUTED** manually 2026-05-20; **do not re-run INSERT** unless prechecks show waterdrop row absent |
| Broad Waterdrop rollout | **NOT authorized** — first verified non-Amazon DTC affiliate CTA is **this slice only** (`da29-00020b` / WDP-F27) |
| Purchase-option ranking (`da29-00020b`) | **Waterdrop-first** when exact proof slice + `direct_buyable` + `COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE`; **Amazon fallback** elsewhere — `src/lib/retailers/launch-buy-links.ts` + `waterdrop-exact-proof-slice-v1.ts` (ranking after gates only; no broad rollout) |

**PROVEN — inspect lane:**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.customer_language_and_waterdrop_research_lane_v1 | {contract, customer_language_doctrine_path, no_oem_cold_rule, purchase_option_monetization_priority, waterdrop_research_draft_path, waterdrop_evidence_path, waterdrop_live_cta_status, waterdrop_production_row_id, waterdrop_research_draft_published, mutation_authority, first_verified_waterdrop_non_amazon_dtc_slice_note}'
```

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

### Batch production operating checklist v1 — Command Center director backbone (PROVEN in-repo; pre-commit at `98412a1`)

**Strategic truth (do not regress):**

- Command Center is **closer** to being the **director of operations**, but is **NOT fully automatic** yet.
- The **checklist is the batch-production operating backbone** — future batch actions must **route through Command Center checklist/state first**, not ad-hoc script chains.
- Command Center must **own run-state truth** before adding more product rows at scale.
- **Coverage added ≠ primary CTA changed** on production when multiple safe buy paths already exist (Amazon + new OEM direct-buy).

**PROVEN — artifacts and wiring:**

| Item | Path / contract |
|------|------------------|
| Checklist builder | `scripts/lib/buckparts-batch-production-operating-checklist-v1.ts` — contract `batch_production_operating_checklist_v1`; `read_only: true`, `data_mutation: false`, `may_mutate: false` |
| Checklist tests | `scripts/lib/buckparts-batch-production-operating-checklist-v1.test.ts` — **6/6 pass** at handoff refresh |
| Proven historical run registry | `data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json` — `run_id: ap-batch-v2-2026-05-24`; **23** evidence rows; **4** auto-apply slugs; operator lessons captured |
| Command Center v2 field | `command_center_v2.batch_production_operating_checklist_v1` in `scripts/lib/buckparts-command-center-v2-types.ts`; built in `scripts/report-buckparts-command-center.ts` |
| Owner dashboard surface | `src/app/ownerdashboard/[secret]/page.tsx` — **Batch production operating checklist** section (reads Command Center only) |

**PROVEN — eleven stage gates (read-only inspection):** `lane_selected`, `packets_generated`, `evidence_collected`, `aggregator_reviewed`, `apply_plan_ready`, `csv_apply_complete`, `repo_validation_complete`, `supabase_parity_dry_run_ready`, `supabase_parity_applied`, `production_runtime_smoke_complete`, `closeout_complete`.

**PROVEN — safety classifications:** `SAFE_PRIMARY_MATCH`, `SAFE_MULTIPLE_BUY_PATHS`, `SAFE_BUT_PRIMARY_POLICY_UNKNOWN`, `CSV_DB_PARITY_DRIFT`, `UNSAFE_OR_STALE`, `OWNER_REVIEW_REQUIRED`, `CATALOG_TASK_REQUIRED`.

**PROVEN — setback detectors:** `planned_rows_spent_post_apply`, `tests_expect_pre_apply_after_apply`, `production_safe_cta_differs_from_applied_row`, `supabase_parity_rejects_valid_report_name`, `local_csv_supabase_disagree`.

**PROVEN — AP batch-v2 run on disk (registry + artifacts):**

| Slug | Role |
|------|------|
| `winix-hepa-115115` | auto-apply direct-buy |
| `gg-flt5000` | auto-apply direct-buy |
| `coway-max2-hepa` | auto-apply direct-buy |
| `rabbit-biogs-minusa2` | auto-apply direct-buy |

**PROVEN — inspect checklist lane (copy/paste):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.batch_production_operating_checklist_v1 | {contract, runtime_status, may_mutate, proven_historical_run_ids, recommended_next_action, run: .runs[0] | {run_id, next_blocked_stage, stages: [.stages[] | {stage_id, status}], fired_setbacks: [.setbacks[] | select(.fired) | .detector_id], operator_lessons: .operator_lessons[:3]}}'
```

**PARTIAL / UNKNOWN (honest limits):**

| Area | Status |
|------|--------|
| End-to-end orchestration | **PARTIAL** — Command Center **shows** stage state and setbacks; it does **not** yet execute one orchestrated flow or auto-run the next script |
| Supabase parity **applied** in checklist | **UNKNOWN** in-repo — no committed parity apply-run artifact; checklist stage `supabase_parity_applied` reports **unknown** until durable ingestion exists |
| Production runtime smoke / live /go CTA order | **PARTIAL** — inferred from apply-run `post_apply_validation.gate_by_slug` only; **not** live production fetch; batch-specific smoke artifact ingestion **MISSING** |
| Single orchestration entrypoint | **MISSING/PARTIAL** — no one read-only command yet returns next exact command + blocked stage + owner decision + mutation allowed/denied |
| Run-size policy | **MISSING/PARTIAL** — no detector yet preventing tiny repeated batches when larger safe batches are possible |
| Generalized run ledger across wedges | **MISSING/PARTIAL** — AP batch-v2 proven run only; not yet generalized |

**PROVEN — build blockers fixed (compile-only; no gate/CSV/Supabase changes):**

- Checklist imports `AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1` from `scripts/lib/air-purifier-apply-executor-v1.ts` (exported there).
- `scripts/lib/air-purifier-agent-packets-v1.ts` uses `Array.from(new Set(...))` instead of Set spread under current TS target.
- Additional TS-target fixes required for `npm run build` in: `air-purifier-agent-results-aggregator-v1.ts`, `air-purifier-apply-executor-v1.ts`, `air-purifier-apply-planner-batch-v2-v1.ts`, `air-purifier-batch-production-lane-v1.ts`, `buckparts-batch-production-operating-checklist-v1.ts`, `buckparts-command-center-v2.ts`, `report-buckparts-command-center.ts`.

**PROVEN — validation before committing checklist work:**

```bash
node --import tsx --test scripts/lib/buckparts-batch-production-operating-checklist-v1.test.ts
node --import tsx --test scripts/report-buckparts-command-center.test.ts
npm run lint
npm run build
```

(Command Center tests: **104/104 pass** in session at handoff refresh; full suite is slow.)

---

## Current next build priority

**At stopping point `aec8b8c` (re-run named reports before trusting):**

1. **Grant:** strategy / application kit — **not** more public trust page overbuilding unless a specific grant requires it.
2. **WHW:** **`3m-ap811` `browser_truth_capture`** — **not** model-first retry; **no** CSV apply from AP811 buyer-path proof; **no** public WHW opening (`whw_public_opening_authorized: false`).
3. **Doctrine:** truth-first homeowner-help / wrong-part-prevention — affiliates secondary; no all-verified or guaranteed-savings claims.
4. **Fridge (unchanged spine truth):** do **not** redo fridge products from scratch; CSV backfill **plan only** until founder approval.
5. **Save credits:** focused tests unless production/public route changes require **`npm run build`**.

---

## Do not do next

- Do **not** claim BuckParts is ecommerce, the source of all truth, all-verified coverage, or guaranteed savings (see grant trust pack section).
- Do **not** open WHW publicly or treat AP811 buyer-path proof as CSV-apply authorization.
- Do **not** run AP811 model-first retry as the next WHW step — next is **`browser_truth_capture`**.
- Do **not** overbuild public pages for grant positioning unless a specific grant requires a named page.
- Do **not** redo fridge products from scratch — spine + public-truth audit say **`NO`**.
- Do **not** apply fridge CSV export/backfill without **founder-approved plan** and explicit owner approval.
- Do **not** treat `fridge_truth_spine_v1` as CSV apply/export authorization — lane is **read-only**.
- Do **not** override AP model-first steering on Command Center `next_best_action` unless existing logic already chooses fridge (it does not today when AP queue is READY).
- Do **not** start another one-off AP/fridge/whole-house batch **outside** Command Center checklist/state.
- Do **not** add new wedges before Command Center can prove **run stage**, **parity state**, **runtime smoke**, **owner-review queue**, and **next lane**.
- Do **not** treat lint/test pass as complete if **`npm run build` fails** (required for code changes; docs-only handoff may skip build).
- Do **not** call checklist or fridge spine work **done** until **docs**, **focused tests**, and **handoff freshness** pass.
- Do **not** let Cursor/Codex create more **isolated tools** without registering them in Command Center checklist/state or truth spine.
- Do **not** weaken buy gates, `/go` gates, exact-token gates, fit gates, or wrong-purchase protections.

---

### What remains NOT_PROVEN / UNKNOWN

| Area | Status |
|------|--------|
| Command Center as **complete** operating truth | **NOT_PROVEN** — `fridge_truth_spine_v1` is **PROVEN read-only** on CC JSON; checklist backbone, orchestration, parity-apply ingestion, and live runtime smoke remain **PARTIAL/UNKNOWN** |
| Fridge truth spine live HTTP in CC build | **UNKNOWN_NOT_CHECKED** in spine — prior public-truth audit **PROVEN** 18/18 when run with live probes; re-run `report-fridge-command-center-and-public-truth-audit-v1` to refresh |
| Fridge CSV apply / export from spine lane | **NOT_PROVEN** — recommended action is **plan-only**; `do not apply without owner approval` |
| Command Center batch checklist orchestration | **PARTIAL** — stage/setback display **PROVEN**; single next-command entrypoint **MISSING** |
| Supabase parity applied (checklist stage) | **UNKNOWN** in-repo — operator-applied in prior session; no committed parity apply-run artifact |
| Production /go primary CTA order (batch smoke) | **PARTIAL/UNKNOWN** — apply-run gate proof only; live CTA-order artifact **MISSING** |
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

### Refrigerator water guarded batch lifecycle — closeout learning, rule proposals, and promotion planning

**Current state:** refrigerator_water guarded batch closeout has advanced from one completed guarded CSV apply into read-only learning, inactive rule proposals, and local active-rule promotion planning. This is **self-learning approval-planning state only**, not enforcement.

**PROVEN progression:**

- Guarded CSV apply completed.
- Post-apply parity proven (`APPLIED_PARITY_PROVEN`, `lifecycle_state=parity_verified`).
- Repeat-write lockout proven after parity.
- Closeout learning packet pushed.
- Command Center closeout-learning lane pushed at `.command_center_v2.fridge_guarded_batch_closeout_learning_v1`.
- Closeout-to-learning candidate plan pushed; candidate list lives at `.command_center_v2.fridge_guarded_batch_closeout_learning_v1.candidate_learning_items`.
- Lifecycle rule proposal lane is pushed/proven at `.command_center_v2.fridge_guarded_batch_lifecycle_rule_proposal_v1`.
- Lifecycle rule promotion plan lane is implemented locally at `.command_center_v2.fridge_guarded_batch_lifecycle_rule_promotion_plan_v1`.

**Inactive proposed lifecycle rules (`proposed_rule_count: 3`):**

- `go_first_hop_redirect_smoke_only`
- `applied_parity_proven_is_closeout_state`
- `block_repeat_guarded_csv_write_after_parity`

**Limits / non-authority:** These are proposal-only rules (`active=false`, `write_authorized=false`, `owner_approval_required=true`). No active rule registry exists yet. No future planner/executor enforcement is proven yet. No `learning_outcomes` writes have happened. This state authorizes **no** Supabase, evidence, `retailer_links`, public UI, Netlify, deploy, owner-approval-row, or active-rule mutation.

**Local promotion-plan note:** `.command_center_v2.fridge_guarded_batch_lifecycle_rule_promotion_plan_v1` converts the three inactive proposed rules into owner-approval-ready promotion candidates (`proposed_active_state=true`) while keeping `promotion_authorized=false`, `active=false`, and `write_authorized=false`. Required blockers remain explicit: `missing_owner_rule_promotion_approval`, `active_rule_registry_not_created`, and `enforcement_not_wired`.

### Reporting / Command Center completeness (NOT_PROVEN unless stated)

Read-only inventory at this stop:

- **PROVEN:** Command Center JSON owns the bright/dim/dark **neuron map** at `owner_command_center_neurons` (`84fb4b3`) — eight keys; `data_mutation: false`; inspect via jq block above.
- **PROVEN:** Command Center JSON owns **GSC/GA4 artifact freshness** at `command_center_v2.external_measurement_freshness_v1` (`b85e90b`) — `read_only: true`, `data_mutation: false`; `OK` / `STALE` / `UNKNOWN` per feed; does **not** call live APIs or prove revenue.
- **PROVEN:** Owner dashboard displays Command Center neuron truth (`report.owner_command_center_neurons`); it does not build primary neuron truth when that field is present.
- **INFERRED:** Owner load still attaches separate lanes (`owner_integrity_sentinel`, `owner_search_demand_and_gaps`, `owner_gsc_external_demand`, quarantine, launch policy) and may call `buildBuckpartsCommandSurfaceReport` again for sentinel — not the same as dashboard-owned neuron fabrication.
- **Owner dashboard is not yet a single report surface** — many `scripts/report-*.ts` outputs remain CLI-only; neuron map + v2 lanes are not the full operating picture.
- **PROVEN:** Layer 7 batch owner decisions are surfaced on the owner dashboard **via** `command_center_v2.batch_production_owner_decisions_lane_v1` (Command Center is the truth source for that lane).
- **PROVEN:** Command Center JSON owns read-only **fridge truth spine** at `command_center_v2.fridge_truth_spine_v1` (`7b09529`) — CSV 0/57 safe, 16/18 Supabase-win CSV-missing, evidence-only slugs `4396508`/`gswf`, public redo=NO; **does not** authorize apply/export.
- **PROVEN:** Batch production operating checklist is surfaced on the owner dashboard **via** `command_center_v2.batch_production_operating_checklist_v1` (Command Center is the truth source; not a parallel dashboard scan).
- **GitHub Actions live status is not Command Center-owned** — workflows exist under `.github/workflows/`; dashboard control plane lists workflow **basenames from disk only**, not live PASS/FAIL from GitHub API.
- **Sentry health is not Command Center-owned** — Sentry is integrated for runtime capture (`src/lib/monitoring/error-monitoring.ts`); no summarized Command Center / dashboard panel in-repo.
- **Netlify deploy API is not routine Command Center validation** — `command_center_v2.deploy_publish_queue_v1` gates owner Netlify API/CLI (`netlify_api_call_authorized` defaults **false**); lane never executes Netlify. Default validation: public GET live smoke (`deploy_live_site_monitor_v1`); optional local `data/ops/netlify-deploy-metadata-v1.json` only for budgeted publish recommendations.
- **Amazon Associates commission feed is not connected** — `data/ops/revenue-ledger-v1.json` has zero entries; Command Center `commission_or_revenue` remains **NOT_CONNECTED** unless a future feed proves otherwise.
- **GSC/GA4 freshness lane exists on Command Center** (`b85e90b`) — inspect `external_measurement_freshness_v1`; artifacts may still read **STALE** until operator runs `npm run buckparts:gsc:fetch` / `npm run buckparts:ga4:fetch` (listed in lane `recommended_commands`).
- **Demand-to-coverage next lane (2026-05-22; repaired at `841980c`):** Command Center v2 includes read-only `command_center_v2.demand_to_coverage_next_lane_v1` (builder: `scripts/lib/demand-to-coverage-next-lane-v1.ts`; CLI: `npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts`). Current compact fields are machine-readable and coherent: `recommended_wedge=air_purifier`, `recommendation_status=START_NEW_DEMAND_SELECTED_BATCH`, `next_batch_candidate=air_purifier_demand_selected_batch_candidate`, blocker `open_batch_not_proven`. **Does not** start a batch, replace `next_best_action`, or mutate wedges.
- **AP demand-selected owner review (local):** Command Center v2 now includes read-only `command_center_v2.air_purifier_demand_selected_batch_owner_review_v1`, an owner-review packet for the AP demand-selected candidate. It carries AP demand proof and candidate-row planning, but `batch_start_authorized=false`, `csv_apply_authorized=false`, `supabase_mutation_authorized=false`, `evidence_write_authorized=false`, `netlify_api_authorized=false`, and `public_ui_mutation_authorized=false`; blockers include `open_batch_not_proven`, `owner_batch_start_approval_missing`, `batch_run_registry_not_created`, and `evidence_collection_not_started`.
- **RPWFE purchase-option rescue owner review (local):** Command Center v2 now includes read-only `command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1` for `/filter/rpwfe`, where the customer-visible state is `no_buy_options` because the committed GE catalog search row is blocked as a search placeholder. The lane records the GE spec PDP path as repo-doc proven but not applied, Waterdrop `WD-F19C` as an unproven compatible-replacement candidate, and keeps `official_label_authorized=false`, `compatible_label_authorized=false`, `csv_apply_authorized=false`, `supabase_mutation_authorized=false`, `evidence_write_authorized=false`, `public_ui_mutation_authorized=false`, and `netlify_api_authorized=false`. No buy CTA is authorized.
- **BuckParts Certainty Engine Checklist (local):** Command Center v2 now includes read-only `command_center_v2.buckparts_certainty_engine_checklist_v1` — a north-star judge lane (not mutation authority) asking whether homeowners would feel less certain buying a replacement filter without checking BuckParts first. **Stable top-level jq fields:** `branded_term` = BuckParts Verified Link, `branded_term_definition`, `ai_vs_buckparts_positioning` = “AI can suggest. BuckParts verifies.” (with explanation that BuckParts beats generic AI only when evidence and verified buying paths exist — not when it guesses). Checklist adds **Visual Match Proof / Picture Match Check** and **label/photo/screenshot upload** (model sticker, filter label, Amazon/retailer screenshots, appliance tag) as major future trust features (**NOT_PROVEN** until live). Checklist item #1 stays **NOT_PROVEN**/**BLOCKED** until 100% fridge verified-link coverage. All authorization flags false. Inspect: `node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.buckparts_certainty_engine_checklist_v1 | {branded_term, branded_term_definition, ai_vs_buckparts_positioning, checklist_item_count, first_checklist_item: .checklist_items[0]}'`.
- **Fridge money queues vs spine:** `top_money_queue` may still surface refrigerator monetization lanes; **`fridge_truth_spine_v1`** is the **truth inventory** lane (buyer-path + Supabase-vs-CSV + public-truth summary). **`next_best_action`** may remain **AP model-first steering** when evidence queue is READY — spine does **not** override.
- **Runner Step live JSON is not Command Center-owned by default** — `npm run buckparts:runner-step` is CLI/CI; optional digest env `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` only.
- **Daily Operator status is not Command Center-owned** — `npm run buckparts:daily` is a separate `buckparts_daily_operator_v1` report (builds on Command Center internally but not merged into CC JSON).
- **Founder Digest status is not Command Center-owned** — `npm run buckparts:founder-digest` is Markdown stdout; slices Command Center but is a separate surface.

### Operator rules (do not regress)

**HQ / agent chat behavior:** Do not give Jared the "best next move" without giving the exact copy/paste prompt or command in the same chat message. If HQ states a next move, the prompt/command must be included immediately.

- **Do not** restart the Amazon interstitial loop as the primary batch path.
- **Do not** make Jared manually author JSON facts — agent fills facts → founder reviews and approves via **Markdown**.
- **Do not** commit generated `data/batch-production/drafts/*` as production evidence or canonical truth unless intentionally converted to a small, reviewed outcome artifact.
- **Do not** treat owner approval as authorization to mutate Supabase, `retailer_links`, `data/evidence/`, affiliate URLs, deploy, or apply execution.

### Next best move after chat migration (INFERRED — at `aec8b8c`)

**Grant:** strategy / application kit using **`buckparts_grant_readiness_v1`** + public trust routes — **not** more public-page overbuilding unless a grant requires it. **WHW:** **`3m-ap811` `browser_truth_capture`** (`BROWSER_TRUTH_READY`) — **not** model-first retry; **no** CSV apply; WHW stays **not publicly open**. **Doctrine:** truth-first wrong-part-prevention; affiliates secondary. **Fridge:** spine read-only — **do not redo** products; backfill **plan only**. **Save credits:** focused tests unless production/public route changes require build.

**Copy/paste (repo root) — confirm fridge truth spine lane:**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_truth_spine_v1 | {contract, read_only, data_mutation, csv_truth, supabase_csv_diff, public_truth, recommended_next_action}'
```

**Copy/paste (repo root) — confirm top-level NBA (may be AP model-first, not fridge):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '{next_best_action, why_this_action}'
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
- **PROVEN (`netlify.toml`):** `scripts/netlify-ignore-build.sh` skips Netlify production builds when only non-runtime paths change (`docs/**`, HQ handoff, `docs/mockups/**`, `data/evidence/**`, `data/discovery/**`, operator scripts/reports). Runtime deploys remain for `src/**`, catalog CSVs (`data/filters.csv`, `data/retailer_links.csv`, etc.), and dependency/config changes. Product batch scale before widening automation: **1 → 5 → 20 → 100**.

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

Current repo checkpoint:
- Branch main; HEAD/origin main aec8b8c (Grant/Public Trust Pack v1).
- BuckParts is truth-first homeowner-help / wrong-part-prevention — NOT ecommerce; affiliates secondary to truth.
- Grant: buckparts_grant_readiness_v1; truth-policy + wrong-part-prevention routes present; ecommerce/affiliate overclaim risk LOW; next step is grant strategy/application kit — not more public pages unless a grant requires it.
- Do NOT claim all-verified, source-of-all-truth, or guaranteed savings.
- WHW: NOT publicly open; AP810 safe aquapure-dealer row applied at 381b5e6; AP811 buyer-path proof at 0c1a0d4 (PASS 0, no safe apply); next WHW step is 3m-ap811 browser_truth_capture (BROWSER_TRUTH_READY), NOT model-first retry.
- Fridge spine (7b09529): read-only; do NOT redo products; CSV backfill plan-only until founder approval.
- Save credits: focused tests unless production/public route changes require build.

First task:
Read docs/BuckParts-HQ-HANDOFF.md (especially **Current stopping point — grant trust pack + WHW safe-CTA expansion**, **Current next build priority**, **Do not do next**, and docs/BuckParts-TRUTH-MAP.md), then propose the single best next HQ move with exact copy/paste command. Do not implement until asked.
```

---

## 0B) Layer 6 control-plane & Codex/Runner truth (2026-05-16)

**Supersedes** any older HQ claims about Cursor/Codex automation, Runner “full loop,” or Layer 6 being complete. Canonical detail also lives in `docs/BuckParts-RUNNER-STATUS.md`, `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`, and `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.

### Active lane (HQ priority order)

0. **Grant / Public Trust Pack + WHW safe-CTA expansion (`aec8b8c`)** — **PROVEN:** `buckparts_grant_readiness_v1`; public routes `truth-policy` + `wrong-part-prevention`; WHW **not** publicly open; AP811 → **`BROWSER_TRUTH_READY`**; next **`3m-ap811` `browser_truth_capture`**. **Next grant:** application kit — not public-page overbuild. **NOT authorization** for WHW public opening or AP811 CSV apply.
1. **Fridge truth spine (`fridge_truth_spine_v1`)** — **PROVEN at `7b09529`:** read-only Command Center lane; CSV 0/57 safe; 16/18 Supabase-win CSV-missing; public redo=NO. **NOT authorization** for CSV apply/export. **Next:** founder-approved backfill **plan** only.
2. **Batch production operating checklist (`batch_production_operating_checklist_v1`)** — **PROVEN through `98412a1`:** stage gates, safety classifications, setback detectors, AP batch-v2 proven run registry. **PARTIAL:** shows state only — no single orchestration entrypoint yet. **Route batch work through checklist first.**
3. **AP model-first production steering** — **PROVEN:** may own Command Center `next_best_action` when evidence queue READY; distinct from fridge spine truth inventory.
4. **Command Center external measurement freshness (`external_measurement_freshness_v1`)** (through **`b85e90b`**) — **PROVEN:** lane on `buckparts:command-center` JSON; artifact staleness only. **NOT PROVEN:** live API fetch, revenue, complete operating truth.
5. **Command Center neuron map (`owner_command_center_neurons`)** (through **`84fb4b3`**) — **PROVEN:** eight neurons on CC JSON; dashboard displays CC-owned neurons.
6. **Batch Production Lane v1 — Layer 7 owner decisions** (through **`93dcd3d`**) — **PROVEN:** fridge non-Amazon five-row registry loop; distinct from AP batch-v2 factory apply (see checklist proven run).
7. **AP batch-v2 apply artifacts (on disk)** — **PROVEN:** 4-slug CSV apply + repo validation; Supabase parity applied in operator session — **UNKNOWN** in checklist until parity apply artifact committed.
8. **Customer UX memory/motion (`bbadce5`)** — **PROVEN**; **NOT** a stopping point.
9. **Layer 6 control-plane documentation + audit** — **NOT PROVEN:** Layer 6 complete.
10. **Batch lane follow-ons (deferred until backbone done)** — orchestration entrypoint, parity/smoke artifact ingestion, larger batch policy, cross-wedge run ledger.

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

**Product-addition workflow truth** lives in `docs/BuckParts-PRODUCT-ADDITION-MODEL-FIRST-CONTRACT.md`, **not** in this handoff. This file is chat migration/context only — not operating truth or decision truth (see header **HQ handoff vs operating truth**).

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
