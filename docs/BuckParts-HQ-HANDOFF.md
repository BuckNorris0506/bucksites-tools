# BuckParts HQ — Agent Handoff

> **Strategic Initiatives Registry:** long-term strategic capabilities (NOT roadmap items, NOT active projects, NOT tasks) are preserved in `docs/strategic-initiatives/BP-STRATEGIC-INITIATIVES-REGISTRY.md` (BP-SI-001 – BP-SI-008). All are PARKED; none authorize work without an explicit founder activation decision.

**Constitution:** `docs/BuckParts-CONSTITUTION.md` is the governing document for durable principles. If conflict exists between HQ guidance and the BuckParts Constitution, the Constitution governs.

> **Current operational stopping point (repo HEAD / `origin/main` / `323e692`):** **AP hub demand lookup links lane complete** — see **§ Current stopping point — AP hub demand lookup (`323e692`)** below. AP SEO parity (`a50ae13`), HQ handoff (`1c7f049`), trust-copy cleanup (`71c597e`), and AP UI repaint (`ced91f6`) remain **§ Prior completed lanes** below. WF3CB guarded CSV apply (`6bc843a`) is **§ Prior stopping point — WF3CB (`6bc843a`)**. Whole-site `bp-*` design is **not** complete.

## Execution Stack

**Cursor**
- Primary implementation agent

**Codex**
- Primary large-scale implementation and migration agent

**HyperAgent**
- Primary homeowner, trust, UX, customer-reality, and live-surface audit agent

**Rules**
- Build → localhost review → HyperAgent audit → refine → deploy
- Customer-reality audits are first-class evidence
- Passing tests/builds does not prove homeowner clarity
- Customer confusion is a valid defect even when code is correct

## HQ operating rule (execution mode)

Unless Jared is explicitly requesting strategy, analysis, brainstorming, alternative evaluation, or research findings:

**Whenever BuckParts work requires Jared to take an action**, the response must **end** with:

1. **Execution surface** — e.g. **Terminal**, **Cursor**, **HyperAgent**, **Browser**, **Supabase SQL**, **Boardy**
2. **Exact copy/paste prompt or command** — runnable without interpretation

Do not give Jared the "best next move" in prose only.

**Exceptions (no trailing prompt required):**

- Jared explicitly requests no prompt
- Explanation-only conversations (no action requested)
- **UNKNOWN** facts prevent a correct prompt (state what is unknown; do not invent a command)

Legacy alias: "best next action" = the same requirement as execution surface + exact command above.

### Jared Terminal Authority

- Jared can run any terminal command when given an exact copy/paste command.
- Do not treat terminal execution as unavailable.
- When terminal validation is the smallest safe next move, provide the exact command.
- Still label the surface as **Terminal**.
- Still avoid destructive commands unless explicitly authorized and scoped.
- Do not assume Jared can inspect repo internals manually; convert terminal work into copy/paste proof commands.

---

## Current stopping point — AP hub demand lookup (`323e692`)

**Read this section first** for LIVE air-purifier hub internal routing toward GSC-steered model lookups.

### Milestone summary (PROVEN)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Repo HEAD / `origin/main` | **`323e692`** — Add AP hub demand lookup links |
| Lane status | **Complete and pushed** — AP hub demand-capture slice 2 (internal linking) |
| Scope | **`src/app/air-purifier/page.tsx`**, **`src/components/air-purifier/ApHubDemandLookupsSection.tsx`**, **`src/lib/air-purifier/ap-hub-demand-lookups-v1.ts`** (+ test) — **no** buyer CTAs, compatibility claims, routes, metadata, data, or buy-gate changes |

### GSC steering input (PROVEN — founder artifact)

| Item | Value |
|------|-------|
| Fresh GSC fetch | **Succeeded** on **2026-07-06** |
| Date range | **2026-06-04..2026-07-03** |
| Top AP model page signal | **`/air-purifier/model/shark-hp150`** — **58** impressions, **2** clicks, avg position **11.17** |

**Not claimed:** rankings growth, traffic growth, revenue, or conversion improvement.

### What shipped (PROVEN — repo truth only)

| Item | Detail |
|------|--------|
| **AP hub section** | **“Air purifier model lookups”** — neutral copy (“pages BuckParts is seeing in Google Search”; not a popularity ranking) |
| **Shark HP150** | **First** promoted link — slug **`shark-hp150`** → `/air-purifier/model/shark-hp150`; repo-proven in **`data/air-purifier/models.csv`** + **`compatibility_mappings.csv`** → `shark-hepa-he15fkp` |
| **Shark HP300** | **Second** only with repo-proven model/filter mapping — slug **`shark-hp300`** → `shark-hepa-he3fkp` |
| **Levoit LAP-V102S-AUSR** | **Intentionally not promoted** — slug not in **`data/air-purifier/models.csv`** (audit JSON only) |
| **Winix SKU 1022-0233-00** | **Intentionally not promoted** — slug not in **`data/air-purifier/models.csv`** (audit JSON only) |
| **Runtime gate** | `resolveApHubDemandLookupsForHub()` links only models with mapped filters and not under owner review |

### Validation proof (PROVEN)

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `src/lib/copy/customer-language-doctrine.test.ts` | **PASS** |
| `src/lib/copy/customer-ux-doctrine.test.ts` | **PASS** |
| `src/app/vertical-launch-metadata.test.ts` | **PASS** |
| `src/app/sitemap.test.ts` | **PASS** |
| `src/lib/air-purifier/ap-hub-demand-lookups-v1.test.ts` | **PASS** |
| `git status --short` after `323e692` | **Clean** |

### Next recommended lanes (NOT started)

1. **Deeper HEAD-accurate SEO/indexing audit** — canonical/robots/page-state/sitemap alignment across wedges at current HEAD.
2. **Continue GSC/search-gap demand loop** — fridge + remaining AP misses; read-only steering before further promotion slices.
3. **Broader homepage / proof-stack copy cleanup** — `VerifiedLinkCard` / `StatusLegend` wording; deferred.

```bash
git rev-parse HEAD
git status --short
npm run build
node --import tsx --test src/lib/air-purifier/ap-hub-demand-lookups-v1.test.ts
```

---

## Prior completed lane — HQ handoff after AP SEO parity (`1c7f049`)

**Docs-only** — recorded **`a50ae13`** AP SEO parity stopping point, trust-copy (`71c597e`), and AP UI repaint (`ced91f6`) as prior lanes.

---

## Prior completed lane — AP SEO parity (`a50ae13`)

**Historical reference** for LIVE air-purifier filter/model PDP SEO (robots, canonical, JSON-LD) at **`a50ae13`** — superseded for pickup by **§ Current stopping point — AP hub demand lookup (`323e692`)** above.

### Milestone summary (PROVEN)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Repo HEAD / `origin/main` | **`a50ae13`** — Add air purifier SEO parity for PDPs |
| Lane status | **Complete and pushed** — AP filter/model PDP SEO parity (demand-capture slice 1) |
| Scope | **`src/app/air-purifier/filter/[slug]/page.tsx`**, **`src/app/air-purifier/model/[slug]/page.tsx`**, **`src/lib/seo/structured-data.ts`** (+ tests) — **no** sitemap/route/metadata-title/buy-gate changes |

### What shipped (PROVEN — repo truth only)

| Surface | SEO parity added |
|---------|------------------|
| **AP filter PDP** | Page-state **`robots`** via `getRobotsFromPageState` + `classifyPageState` (useful-filter id gate aligned with sitemap) |
| **AP filter PDP** | **Indexable-only** self-referencing **`canonicalAlternatesForIndexablePath`** (`/air-purifier/filter/{slug}`) |
| **AP filter PDP** | **Minimal Product JSON-LD** (`buildAirPurifierFilterProductJsonLd`) from proven fields only (`slug`, `oem_part_number`, `name`, `brand.name`) — **no** offers/image/invented facts; emitted only when indexable |
| **AP model PDP** | Page-state **`robots`** + **indexable-only canonical** (`/air-purifier/model/{slug}`); owner-review override (`blueair-411a-max`) → noindex |
| **AP model PDP** | **Product JSON-LD intentionally not added** — fridge model PDPs also omit Product schema; **UNKNOWN** follow-on unless repo gains safe model-level fields |

**Not claimed:** traffic, rankings, revenue, or conversion improvements.

### Validation proof (PROVEN)

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `src/lib/seo/canonical.test.ts` | **PASS** |
| `src/lib/seo/structured-data.test.ts` | **PASS** |
| `src/app/vertical-launch-metadata.test.ts` | **PASS** |
| `src/app/sitemap.test.ts` | **PASS** |
| `git status --short` after `a50ae13` | **Clean** |

### Next recommended lanes (NOT started — superseded by § Current stopping point — AP hub demand lookup)

Historical at `a50ae13` pickup; **do not** treat as current NBA:

1. ~~Operate GSC/search-gap demand loop~~ — **Partially exercised** for AP hub slice 2 (`323e692`); continue for fridge + remaining AP misses.
2. **Deeper HEAD-accurate SEO/indexing audit** — still **NOT started**.
3. ~~Choose page-promotion / internal-linking slice~~ — **AP hub slice 2 complete** (`323e692`); further promotion only after audit + fresh GSC steering.

```bash
git rev-parse HEAD
git status --short
npm run build
node --import tsx --test src/lib/seo/canonical.test.ts
node --import tsx --test src/lib/seo/structured-data.test.ts
```

---

## Prior completed lane — trust-copy leak cleanup (`71c597e`)

**Complete** between AP UI repaint and AP SEO parity — shopper-facing operator wording removed; gates unchanged.

| SHA | Slice |
|-----|-------|
| **`f901634`** | Remove Q-marker suffixes from fridge filter PDP trust headings |
| **`a4d3375`** | Replace `listing evidence` jargon on global `/search` |
| **`7b7f01d`** | Branded `BuckParts Verified Link` copy + `customer-ux-doctrine` false-positive fix |
| **`71c597e`** | Replace catalog/AP `truth-gated` / `Being verified` wording |

**Validation (PROVEN during lane):** `npm run build` **PASS**; `customer-language-doctrine.test.ts` **PASS**; `customer-ux-doctrine.test.ts` **PASS** after slice 3 test fix; `trust-ui.test.ts` / `public-category-hub.test.ts` updated for slice 4.

---

## Prior stopping point — AP UI split-brain repaint (`ced91f6`)

**Historical reference** for live air-purifier / vertical browse UI (`bp-*` token) state at `ced91f6` — superseded for pickup by **§ Current stopping point — AP hub demand lookup (`323e692`)** above.

### Milestone summary (PROVEN)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Repo HEAD / `origin/main` | **`ced91f6`** — Repaint Honeywell HRF rail with BuckParts tokens |
| Lane status | **Complete and pushed** — live AP UI split-brain repaint |
| Scope | **AP + shared vertical/browse/trust surfaces listed below** — **not** whole-site design complete |

**Commit chain (AP UI repaint lane):**

| SHA | Role |
|-----|------|
| **`ced91f6`** | Honeywell HRF family rail |
| **`7e7aa0a`** | AP model/filter detail breadcrumbs |
| **`0bd10fe`** | AP search results |
| **`9e03599`** | AP hub |
| **`fab9f79`** | `VerticalModelPageContent` |
| **`b472dd7`** | `VerticalBrandHubPage` |
| **`54dd30d`** | `CategoryBrowseSections` |
| **`bf40270`** | `ModelTruthPanel` |

**Surfaces touched (PROVEN):** `ModelTruthPanel`, `CategoryBrowseSections`, `VerticalBrandHubPage`, `VerticalModelPageContent`, `src/app/air-purifier/page.tsx`, `src/app/air-purifier/search/page.tsx`, AP model/filter wrapper breadcrumbs, `HoneywellHrfFamilyRail` — raw Tailwind `neutral-*` / `amber-*` replaced with existing `bp-*` tokens.

### Validation proof (PROVEN)

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** during each slice |
| `customer-language-doctrine.test.ts` | **PASS** during each slice |
| `customer-ux-doctrine.test.ts` | **PASS** after trust-copy slice 3 (was pre-existing fail before that lane) |
| Targeted raw-class scan | **No `neutral-*` or `amber-*` hits** in `src/app/air-purifier`, `src/components/air-purifier`, `src/components/vertical`, `src/components/catalog`, `src/components/trust` |
| `git status --short` after `ced91f6` | **Clean** |

### Next recommended lanes (NOT started — superseded by § Current stopping point — AP hub demand lookup)

Historical at `ced91f6` pickup; **do not** treat as current NBA:

1. ~~Shopper-facing trust-copy leak cleanup~~ — **Complete** (`71c597e`).
2. ~~AP SEO parity~~ — **Complete** (`a50ae13`).
3. ~~AP hub demand lookup~~ — **Complete** (`323e692`).
4. **Broader non-AP raw-class cleanup** — homepage `VerifiedLinkCard` / `StatusLegend` proof-stack wording; deferred.

```bash
git rev-parse HEAD
git status --short
npm run build
rg -n 'neutral-[0-9]|amber-[0-9]' src/app/air-purifier src/components/air-purifier src/components/vertical src/components/catalog src/components/trust || true
```

---

## Prior stopping point — WF3CB guarded verified link (`6bc843a`)

**Prior** — manufacturer-rescue CSV apply for `wf3cb`; data lane unchanged by AP UI repaint above.

### Milestone summary (PROVEN)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Repo HEAD / `origin/main` | **`6bc843a`** — Apply wf3cb guarded verified link |
| Working tree | **Clean** (Jared terminal-proven after cleanup; re-validate with `git status --short`) |
| Build | **PASS** (Jared terminal-proven before commit; re-validated this session) |
| Deploy preflight | **PASS** (`buckparts:deploy:preflight`; re-validated this session) |
| Supabase sync in this step | **NOT performed** — founder approval row explicitly scopes CSV-only; census shows `csv_safe_path_missing_from_supabase=true` for `wf3cb` |

**Commit chain (WF3CB lane):**

| SHA | Role |
|-----|------|
| **`6bc843a`** | Guarded CSV apply — Frigidaire.com official PDP primary for `wf3cb` |
| **`4cb4327`** | Dry-run execution plan recorded |
| **`ce4f1f6`** | Founder approval (`APPROVE WF3CB GUARDED APPLY`) |
| **`bb44944`** | Activated collector proof + committed evidence |
| **`57635c0`** | Document browser proof collector review bridge |
| **`bf6e6eb`** | Owner-review bridge tooling |

**Committed WF3CB artifacts (PROVEN):**

| Path | Role |
|------|------|
| `data/retailer_links.csv` | Primary row: Frigidaire official PDP, `direct_buyable`, `oem-parts-catalog` |
| `data/owner-decisions/fridge-safe-link-wf3cb-owner-approval-v1.json` | Founder approval (`owner_mutation_approved`; CSV-only scope) |
| `data/evidence/frigidaire-wf3cb-official-owner-browser-proof-evidence.2026-07-04.json` | Committed evidence; confusion-family **CLEARED** |
| `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wf3cb-v1.json` | Activated owner browser proof |
| `data/fridge/batch-production/apply-execution-plans/manufacturer-rescue-guarded-apply-execution-plan-wf3cb-v1-e433161a2551.json` | Dry-run execution plan |
| `data/fridge/batch-production/closeout/manufacturer-rescue-guarded-apply-bridge-closeout-wf3cb-v1.json` | Apply closeout (`bridge_status=APPLIED`) |

### End-to-end pipeline (PROVEN)

```
browser proof collector (batch, headed)
  → owner review bridge packet
  → activated proof + evidence (owner acceptance)
  → founder approval
  → dry-run execution plan
  → guarded CSV apply (--write-csv)
  → census proof
```

**Primary URL (PROVEN):** `https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB`

### Census proof (PROVEN — this session `buckparts:all-product-safe-buyer-path-census`)

| Metric | Value |
|--------|-------|
| `wf3cb` `page_classification` | **SAFE_BUYER_PATH_PROVEN** |
| `wf3cb` `public_trust_current` | **ALLOW** |
| `refrigerator_water` safe buyer paths | **20 / 57** |
| Site-wide `SAFE_BUYER_PATH_PROVEN` | **54** |
| Closeout delta (artifact) | 53 → 54 (`safe_buyer_path_proven_count_delta=1`) |

Classification transition (closeout artifact): `SAFE_BUYER_PATH_SUPPRESSED_TRUST` → `SAFE_BUYER_PATH_PROVEN`.

### Known issue (terminal-proven — Jared)

First guarded `--write-csv` attempt **blocked incorrectly** because the on-disk **readiness gate artifact was stale** relative to post-approval state. Mitigation: **rerun readiness gate**, then apply **without restoring** the refreshed readiness artifact to the committed tree. Mark as **architecture improvement candidate** — tighten readiness artifact freshness coupling in guarded-apply bridge preflight.

### Next strategic question (founder decision — not repo-authorized)

Choose one sequencing path:

1. **Mature collector → bridge → apply into batch mode** (repeatable multi-slug factory)
2. **Proceed to `wfcb`** (next Frigidaire Batch B slug)
3. **Continue Frigidaire Batch B** beyond `wfcb`
4. **Fix readiness/write coupling first** (stale-artifact false block)

Scoped **Supabase `retailer_links` sync** for `wf3cb` remains a **separate authorized step** (Batch A / `eptwfu01` parity pattern). CSV-only is **not** live on `/filter/wf3cb` until that sync runs.

```bash
git rev-parse HEAD
git status --short
npm run build
npm run buckparts:deploy:preflight
npm run buckparts:all-product-safe-buyer-path-census
npm run buckparts:manufacturer-safe-link-rescue-readiness-gate
```

---

## Architecture review — WF3CB lane (`6bc843a`)

**Verdict:** Architecture **holds**. Guarded apply succeeded end-to-end; fail-closed gates worked (including blocking the first stale-readiness attempt). **Improvement needed:** readiness artifact staleness vs guarded-apply bridge preflight coupling (see stopping point above).

### Command Center lobe / synapse reporting

| Lobe / synapse | CC reports? | Evidence |
|----------------|-------------|----------|
| Browser proof collector v1 | **UNKNOWN** | `scripts/run-browser-proof-collector-v1.ts`, `scripts/lib/browser-proof-collector-v1.ts` — no `command_center_v2` or execution-ledger hook |
| Owner review bridge v1 | **UNKNOWN** | `scripts/run-browser-proof-collector-owner-review-bridge-v1.ts`, `scripts/lib/browser-proof-collector-owner-review-bridge-v1.ts` — draft packets only; no CC lane |
| Owner decisions | **PROVEN** | `data/owner-decisions/fridge-safe-link-wf3cb-owner-approval-v1.json`; CC lanes `batch_production_owner_decisions_lane_v1`, `founder_decision_registry_summary_v1`, `owner_decision_queue_v1` in `scripts/report-buckparts-command-center.ts` |
| Readiness gate | **PROVEN** | `scripts/report-manufacturer-safe-link-rescue-readiness-gate-v1.ts` (ledger refresh); `scripts/lib/manufacturer-safe-link-rescue-readiness-gate-v1.ts` (`.command_center_v2.manufacturer_safe_link_rescue_runner_v1.readiness_gate_summary`); CC `manufacturer_safe_link_rescue_director_v1` / `manufacturer_safe_link_rescue_runner_v1` |
| Guarded apply bridge | **PARTIAL** | `scripts/lib/manufacturer-rescue-guarded-apply-bridge-v1.ts` refreshes `data/command-center/execution-ledger-v1.json` and writes closeout; **no dedicated `command_center_v2` lane** for bridge status |
| Universal guarded CSV executor | **PARTIAL** | `scripts/lib/universal-batch-lifecycle-guarded-csv-apply-executor-v1.ts` defines `.command_center_v2.universal_batch_lifecycle_guarded_csv_apply_executor_v1`; surfaced indirectly via `universal_batch_lifecycle_*` truth table in `scripts/report-buckparts-command-center.ts` — not a top-level CC digest neuron |
| Safe buyer path census | **PROVEN** | `scripts/lib/all-product-safe-buyer-path-census-v1.ts` → `.command_center_v2.all_product_safe_buyer_path_census_v1`; wired in `scripts/report-buckparts-command-center.ts` |
| Deploy preflight / convergence gate | **PARTIAL** | `npm run buckparts:deploy:preflight` = MCP audit + `scripts/check-repo-runtime-convergence-gate-v1.ts` (`repo_runtime_convergence_gate_v1`, wedge=`air_purifier`); ledger refresh on convergence check; deploy monitor lanes `deploy_live_site_monitor_v1` / `deploy_publish_queue_v1` in CC — **preflight bundle itself is not a CC lobe** |

**Exact improvements recommended:**

1. **Readiness freshness binding** — guarded apply bridge should reject or auto-refresh stale `manufacturer-safe-link-rescue-readiness-gate-v1.json` when founder approval timestamp is newer than readiness `generated_at`, or hash-bind readiness to approval row.
2. **Collector + bridge CC lanes** — add read-only `command_center_v2.browser_proof_collector_v1` and `browser_proof_collector_owner_review_bridge_v1` indexing draft artifact counts / pending acceptance (no false READY_FOR_APPLY).
3. **Guarded apply bridge CC lane** — index latest per-slug closeout (`manufacturer-rescue-guarded-apply-bridge-closeout-*.json`) into CC v2 for operator visibility without parsing closeout manually.

---

## Constitution review — WF3CB flow (`6bc843a`)

**Verdict:** **No amendment required.** WF3CB flow aligns with the Constitution as written.

| Constitutional principle | WF3CB adherence |
|--------------------------|-----------------|
| §4 Trust Hierarchy — fit truth before monetization | Official manufacturer PDP with exact **WF3CB** token; Lowe's/Home Depot failures preserved, not promoted |
| §5 Truth Contract — evidence before claims | Committed evidence + owner browser proof before CSV apply |
| §6 Uncertainty — FULL or UNKNOWN | Search-placeholder primary replaced only after PASS proof; confusion-family cleared explicitly |
| §7 Evidence Standards — discovery ≠ closure | Collector → bridge packet → owner activation → founder approval → apply (multi-gate) |
| §11–12 Automation — validated gates publish authority | Bridge does not activate proof; readiness + founder approval required; guarded executor dry-run before `--write-csv` |
| §13 Founder Authority | `data/owner-decisions/fridge-safe-link-wf3cb-owner-approval-v1.json` records scoped approval; does not claim Supabase sync |

**Optional documentation note (not an amendment):** Appendix B could eventually list `browser_proof_collector_v1` + `browser_proof_collector_owner_review_packet_v1` as subordinate workflow specs — **UNKNOWN whether that adds value**; current Constitution already covers the behavior without naming those contracts.

---

## Vision review — Boardy.ai status update (`6bc843a`)

**Use the block below verbatim or lightly edited for Boardy.ai.**

---

**BuckParts — WF3CB lane closed (repo `6bc843a`)**

**What we built:** End-to-end manufacturer-rescue pipeline for Frigidaire WF3CB (PureSource 3): headed browser proof → owner review → committed evidence → founder approval → guarded CSV apply. Primary buying path is now the official Frigidaire.com PDP with `direct_buyable` browser truth in `retailer_links.csv`.

**Why it matters:** WF3CB moves from suppressed search-placeholder to a **proven safe buyer path** — homeowners get an official manufacturer link backed by committed evidence, not a keyword search hop.

**Risk avoided:** Wrong-family promotion (EPTWFU01 / ULTRAWF), retailer PDPs that failed proof (Lowe's, Home Depot), and unguarded CSV mutation. Fail-closed gates blocked the first apply attempt when readiness artifact was stale — proving the safety layer works, but exposing a coupling bug to fix.

**Proof metrics (census):** `wf3cb` = SAFE_BUYER_PATH_PROVEN, public_trust ALLOW; refrigerator_water **20/57** safe paths; site-wide **54** SAFE_BUYER_PATH_PROVEN.

**Architecture health:** Core architecture holds. Gaps: browser proof collector + owner-review bridge not yet indexed in Command Center; readiness/apply coupling needs hardening.

**Next decision needed:** Batch-mode maturity vs proceed to WFCB vs continue Frigidaire Batch B vs fix readiness/write coupling first. Separate step still required: scoped Supabase `retailer_links` sync for `wf3cb` before live `/filter/wf3cb` reflects the new primary.

---

## Prior stopping point — Browser Proof Collector owner-review bridge (`bf6e6eb`)

**Prior** — owner-review bridge tooling landed; WF3CB lane **complete through guarded CSV apply** per **§ Prior stopping point — WF3CB (`6bc843a`)** above.

### Milestone summary (PROVEN — historical)

| Item | Value |
|------|-------|
| Repo HEAD (at bridge land) | **`bf6e6eb`** — Add browser proof collector owner review bridge |
| Package script | `npm run buckparts:browser-proof-collector-owner-review-bridge` |
| Contract | **`browser_proof_collector_owner_review_packet_v1`** |

**Files (`bf6e6eb`):**

| Path | Role |
|------|------|
| `package.json` | `buckparts:browser-proof-collector-owner-review-bridge` |
| `scripts/lib/browser-proof-collector-owner-review-bridge-v1.ts` | Bridge lib |
| `scripts/lib/browser-proof-collector-owner-review-bridge-v1.test.ts` | Unit tests |
| `scripts/run-browser-proof-collector-owner-review-bridge-v1.ts` | CLI (`--draft`, `--no-write`) |

### Bridge behavior (PROVEN)

- **Input:** collector draft JSON path (`--draft`)
- Writes **intermediate owner-review packet only** — does **not** activate proof or evidence
- **Output path pattern:** `data/fridge/batch-production/drafts/browser-proof-collector/{slug}/browser-proof-collector-owner-review-packet-{slug}-{sha12}-{stamp}.json`

---

## Prior tooling — Browser Proof Collector batch mode (`07044bc`)

**Prior** — batch candidate mode. Current proof pipeline completed through **§ WF3CB guarded apply (`6bc843a`)** above.

### Batch mode behavior (PROVEN)

- Repeated **`--url`**, **`--urls-file`**, **`--collect-all`**
- One batch draft; per-candidate screenshots
- Ranking: PASS official manufacturer → authorized distributor → retailer direct → other PASS → UNKNOWN → FAIL_AS_PROOF
- Default early-stop only on official manufacturer or authorized parts distributor PASS

### Live WF3CB batch proof (PROVEN)

| Field | Value |
|-------|-------|
| `overall` | **PASS** |
| `best` | **PASS / `official_manufacturer_pdp`** |
| `candidates` | **3** |
| Stash | `park browser proof collector batch wf3cb pass 20260704-095215` |

Per-candidate: Frigidaire.com PASS; Lowe’s blocked; Home Depot error page.

```bash
npm run buckparts:browser-proof-collector -- \
  --slug wf3cb \
  --token WF3CB \
  --url "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB" \
  --url "https://www.lowes.com/pd/Frigidaire-PureSource-174-3-Replacement-Water-Filter/1003164400" \
  --url "https://www.homedepot.com/p/Frigidaire-Refrigerator-Filter-for-Frigidaire-WF3CB-PureSource-3-HDWF3CB/313853978" \
  --forbidden EPTWFU01,ULTRAWF \
  --headed \
  --wait-ms 3000 \
  --timeout-ms 60000 \
  --collect-all
```

---

## Coverage milestone — eptwfu01 live closeout (`d5cbe78`)

**Coverage state** — Batch B partial. `eptwfu01` live Verified Link closed at `d5cbe78`. Proof capture for remaining slugs uses **§ Browser Proof Collector owner-review bridge (`bf6e6eb`)** above.

### Milestone summary (PROVEN — live browser validated by Jared)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Commit | **`d5cbe78`** — Apply eptwfu01 verified Frigidaire buyer path |
| Lane | Coverage Batch B — **`eptwfu01` only** (live closed) |
| Site `SAFE_BUYER_PATH_PROVEN` | **52 → 53** (+1) — repo census in apply closeout |
| Fridge `SAFE_BUYER_PATH_PROVEN` | **18 → 19** (+1) — this lane |

**Commit:**

| SHA | Role |
|-----|------|
| **`d5cbe78`** | CSV manufacturer-rescue apply + scoped Supabase `retailer_links` sync for `eptwfu01` (live PDP parity) |

### Live route (Jared screenshots)

| Route | Purpose |
|-------|---------|
| **`/filter/[slug]`** | Filter PDP (Verified Link lives here) |
| **`/fridge/[slug]`** | Refrigerator **model** route (not the filter PDP) |

**Live filter PDP validated:**

- https://buckparts.com/filter/eptwfu01 — BuckParts Verified Link button labeled **Frigidaire** → `https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084`
- Destination shows **EPTWFU01**, OEM Part #**EPTWFU01**, **PureSource Ultra II**, **In Stock**, **Add to Cart**

### Apply chain (PROVEN)

1. **CSV apply** — manufacturer-rescue guarded apply for `eptwfu01` only (`write_csv_applied=true`; classification `SAFE_BUYER_PATH_SUPPRESSED_TRUST` → `SAFE_BUYER_PATH_PROVEN`).
2. **Scoped Supabase sync** — `eptwfu01` only, **`public.retailer_links` only** (no brands/filters/models/aliases/compatibility_mappings; no full seed import).
3. Post-write parity: `all_in_parity=true`, `row_count_planned=0`.

**Artifacts:**

| Artifact | Path |
|----------|------|
| CSV apply closeout | `data/fridge/batch-production/closeout/manufacturer-rescue-guarded-apply-bridge-closeout-eptwfu01-v1.json` |
| Supabase parity closeout | `data/fridge/batch-production/closeout/fridge-safe-link-eptwfu01-retailer-links-supabase-parity-closeout-v1.json` |
| Post-write parity report | `data/fridge/batch-production/drafts/fridge-safe-link-eptwfu01-retailer-links-supabase-parity-v1.json` |
| Owner approval | `data/owner-decisions/fridge-safe-link-eptwfu01-owner-approval-v1.json` |
| Apply plan | `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-eptwfu01-v1.json` |
| Evidence | `data/evidence/frigidaire-eptwfu01-official-owner-browser-proof-evidence.2026-07-04.json` |

**Dry-run (read-only):** `npm run buckparts:fridge-safe-link-eptwfu01-retailer-links-supabase-parity`

### Remaining Batch B

| Slug | Status |
|------|--------|
| **`eptwfu01`** | **Live closed** (`d5cbe78`) |
| **`wf3cb`** | **Blocked** on committed owner-browser-proof-result — batch PASS + owner-review packet in stash only (`park browser proof collector batch wf3cb pass 20260704-095215`, `park browser proof collector owner review packet wf3cb 20260704-101250`; not apply-ready) |
| **`wfcb`** | **Blocked** — needs official/authorized proof (dealer PDP is not official-pass class) |

**Next work item:** collector-headed drafts for **`wf3cb`**, then **`wfcb`**, then separately author owner-browser-proof-result / evidence / approval / apply through existing gates (do not invent PartDetail IDs).

**Do not** treat CSV-only apply as live — `/filter/[slug]` reads Supabase `public.retailer_links`.

---

## Historical stopping point — Coverage Batch A closeout (`aa82ae7`)

**Historical** — Batch A live Verified Links for `edr3rxd1` + `ultrawf`. Current proof tooling uses **§ Browser Proof Collector owner-review bridge (`bf6e6eb`)**; coverage milestone **§ eptwfu01 live closeout (`d5cbe78`)**.

### Milestone summary (PROVEN — live browser validated by Jared)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Repo HEAD / `origin/main` | **`aa82ae7`** — Sync Coverage Batch A live retailer links and clean customer copy |
| Netlify production | **`aa82ae7`** published (superseded for coverage by `d5cbe78`) |
| Site `SAFE_BUYER_PATH_PROVEN` | **31 → 33** (+2) — Jared live at Batch A closeout |
| Fridge `SAFE_BUYER_PATH_PROVEN` | **16 → 18** (+2) |

**Commits (newest first):**

| SHA | Role |
|-----|------|
| **`aa82ae7`** | Scoped Supabase sync for Batch A retailer_links + customer-copy cleanup (live PDP parity) |
| **`1ea95ac`** | Fix `/go` hard-deny browser-truth note substring false positives |
| **`d468a1c`** | CSV manufacturer-rescue apply for `edr3rxd1` + `ultrawf` |

### Live routes (do not confuse)

| Route | Purpose |
|-------|---------|
| **`/filter/[slug]`** | Filter PDP (Verified Link lives here) |
| **`/fridge/[slug]`** | Refrigerator **model** route (not the filter PDP) |

**Live filter PDPs validated (Batch A):**

- https://buckparts.com/filter/edr3rxd1 — BuckParts Verified Link → Whirlpool official Filter 3 page (`EDR3RXD1` Pack Of 2 / `EDR3RXV2P` caveat accepted in founder approval)
- https://buckparts.com/filter/ultrawf — BuckParts Verified Link → FrigidaireApplianceParts `ULTRAWF/1534529`

### Why Batch A needed scoped Supabase sync (PROVEN)

- `/filter/[slug]` loads retailer links from **Supabase `public.retailer_links`** via `getFilterBySlug` — **not** from `data/retailer_links.csv`.
- Manufacturer-rescue guarded apply (`d468a1c`) wrote **CSV only**.
- Live PDPs stayed on catalogsearch placeholders until scoped writer updated exactly **2** Supabase rows (`aa82ae7` closeout).
- **Do not** use full `npm run seed:import -- --write` for this class of fix when a scoped lane exists.

**Scoped parity / sync (committed):**

| Artifact | Path |
|----------|------|
| CSV apply closeouts | `data/fridge/batch-production/closeout/manufacturer-rescue-guarded-apply-bridge-closeout-edr3rxd1-v1.json`, `...-ultrawf-v1.json` |
| Supabase parity closeout | `data/fridge/batch-production/closeout/coverage-batch-a-fridge-retailer-links-supabase-parity-closeout-v1.json` |
| Post-write parity report | `data/fridge/batch-production/drafts/coverage-batch-a-fridge-retailer-links-supabase-parity-v1.json` (`all_in_parity=true`, `row_count_planned=0`) |
| Owner approvals | `data/owner-decisions/fridge-safe-link-edr3rxd1-owner-approval-v1.json`, `...-ultrawf-owner-approval-v1.json` |
| Apply plans | `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr3rxd1-v1.json`, `...-ultrawf-v1.json` |

**Dry-run (read-only):** `npm run buckparts:coverage-batch-a-fridge-retailer-links-supabase-parity`

### Deploy preflight gap (PROVEN)

- `npm run buckparts:deploy:preflight` / repo-runtime convergence gate is **`air_purifier` only** (`air_purifier_supabase_vs_csv_diff_v1`).
- **Fridge CSV↔Supabase parity is not covered** by current preflight — Batch A proved a silent fridge runtime gap after CSV-only apply.
- Future fridge Verified Link batches must include **scoped Supabase parity dry-run** (and write when authorized) before treating live PDPs as done.

---

## Historical stopping point — Security / RLS / service-role gating (`e19ebbd`)

**Read this section** for HQ / Cursor / HyperAgent chat transfer when security, Supabase, MCP, deploy preflight, or service-role gating is in scope. Proof capture uses **§ Browser Proof Collector owner-review bridge (`bf6e6eb`)**; coverage milestone **§ eptwfu01 live closeout (`d5cbe78`)**.

Prior foundation stack, owner browser proof refresh, AP correctness, and Customer Reality sections below remain **PROVEN historical context** — they do **not** supersede the Batch A closeout for refrigerator Verified Link work unless a fresh Command Center run proves otherwise.

### Milestone summary (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| Repo HEAD (`origin/main`) | **`e19ebbd`** — Fix mutation gate assert preflight typing (Netlify build unblock after Slice 6) |
| Netlify production deploy | **`e19ebbd`** — **green** (service-role security baseline complete) |
| Service-role inventory | **20** `write_guarded` / **0** `write_unguarded` (`scripts/lib/buckparts-supabase-service-role-inventory-v1.ts`) |
| Supabase Security Advisor (live project `anmlqhrlmsnvxgneszbf`) | **ERROR count = 0** (RLS reconcile applied) |
| Working tree | Re-run `git status --short` before citing |

**Recent commits on `main` (security / RLS / service-role slice — newest first):**

| SHA | Subject |
|-----|---------|
| **`e19ebbd`** | Fix mutation gate assert preflight typing (Netlify TypeScript build) |
| **`1107eb2`** | Gate final service role write lanes (Slice 6 — learning outcomes, remove-demo wedges, verify-oem `--write-db`) |
| **`6756914`** | Gate seed import lanes (Slice 5) |
| **`6ae0b2e`** | Gate HQII retailer link ingest lanes (Slice 4) |
| **`a28ad31`** | Record promote-staged truth-ledger outcomes |
| **`2122959`** | Gate staged refrigerator live promotion (Slice 3 — P0 live catalog promotion) |
| **`f1eb888`** | Gate staged search gap service role writes (Slice 2) |
| **`a0cb33c`** | Gate search gaps service role writes (Slice 1) |
| **`26d4b0a`** | Record truth-ledger mutation outcomes (AP / RPWFE apply gates) |

```bash
git rev-parse HEAD
git log --oneline -12
git status --short
npm run buckparts:mcp-supabase-exposure:audit
npm run buckparts:deploy:preflight
```

### Netlify credit rule (operator)

- **Do not push every local slice** — Netlify build minutes are finite.
- **Batch** related security/gating commits locally; push only **deploy-worthy milestones** (preflight green, `npm run build` green, tests for the slice).
- Slice 6 landed as **`1107eb2`** + typing fix **`e19ebbd`** — two commits, one production deploy anchor.

### Audit #2 / pre-hardening reconciliation (do not paste full audit)

Exports under `audit-exports/` (`buckparts-audit-2-business-report.md`, CSVs) and any HyperAgent security packet anchored at **`5cb5fb3`** are **pre-hardening** snapshots. **Do not** treat ranked findings **F1–F6** or action items **A1–A5** from that upload as current severity without re-audit at HEAD **`e19ebbd`**.

| Theme (old audit) | Current repo status (HEAD `e19ebbd`) |
|-------------------|--------------------------------------|
| Unguarded service-role writers | **Closed** — **20** lanes `write_guarded`; **0** `write_unguarded` |
| MCP / Supabase extraction | **Resolved in repo** — `buckparts:mcp-supabase-exposure:audit --enforce` wired into `buckparts:deploy:preflight` |
| Live Supabase apply / buyer-path mutation authority | **Resolved** for AP + RPWFE parity lanes — MUTATION + trust + founder + expiry |
| Supabase RLS / Security Advisor errors | **Resolved live** — migration `20260610120000_security_advisor_rls_reconcile_v1.sql`; ERROR count **0** |
| `/go` buyer-path trust | **Resolved** on deployed slice through `d66ce8e` → `26d4b0a` chain (freshness fail-closed, decision precedence) |
| Broad production automation / seed importers | **Resolved (Slice 5)** — `import-seed.ts` + `vertical-seed.ts` gated; writes in run libs; truth-ledger on `--write` |
| Final unguarded service-role lanes | **Resolved (Slice 6)** — learning outcomes insert, remove-demo wedge brands, verify-oem `--write-db` |

**Intentionally deferred residuals (not ERRORs):**

- Supabase **WARN:** `click_events` INSERT policy `WITH CHECK (true)` — telemetry shape not constrained in SQL yet
- Supabase **WARN:** `upsert_search_gap` `SECURITY DEFINER` executable by anon/authenticated — required by `src/lib/search/telemetry.ts` until service-role telemetry refactor
- Supabase **INFO:** RLS enabled with **no anon/authenticated policies** on private/service-role tables (`search_gaps`, `search_gap_candidates`, `staged_*`, `owner_report_artifacts`, `learning_outcomes`, etc.) — **accepted**; repo has no anon paths; ops/scripts use service role
- Repo security gate **WARN** items (headers, rate limits, npm audit highs) — see `data/command-center/audits/buckparts-security-gate-v1.json`; separate from Supabase Advisor

### Slice 6 resolved — final service-role write lanes (PROVEN in-repo + deployed `e19ebbd`)

| `mutation_lane` | CLI (read_only) | Run lib (`write_guarded`) | Gate |
|-----------------|-----------------|---------------------------|------|
| `learning_outcomes_insert_v1` | `scripts/execute-learning-outcomes-approved-insert-v1.ts` (`--mutate-approved-learning-outcome`) | `scripts/lib/learning-outcomes-insert-run-v1.ts` | MUTATION + trust + founder + `data/ops/learning-outcomes-confidence-approvals.json` + evidence `source_file` when repo-relative/hashable |
| `remove_demo_wedge_brands_v1` | `scripts/remove-demo-wedge-brands.ts` (default dry-run; `--write`) | `scripts/lib/remove-demo-wedge-brands-run-v1.ts` | MUTATION + trust + founder + plan binding + `apply_context_target_slugs` includes `purebrand` and `poewat`; `BUCKPARTS_ALLOW_FROZEN=true` required on `--write` |
| `verify_oem_retailer_links_write_db_v1` | `scripts/verify-oem-retailer-links-playwright.ts` (default CSV report; `--write-db` gated) | `scripts/lib/verify-oem-retailer-links-run-v1.ts` | MUTATION + trust + founder + CSV artifact binding for every loaded retailer_links CSV rel path |

All three record truth-ledger mutation outcomes on write-intent paths. `scripts/lib/learning-outcomes-writer.ts` is validation-only (`read_only`).

**Prior deployed slices (founder-gated + truth-ledger on write-intent):**

| Slice | Lanes | Deploy anchor (representative) |
|-------|-------|------------------------------|
| AP / RPWFE apply | `air_purifier_supabase_parity_apply_v1`, `rpwfe_official_ge_supabase_parity_apply_v1` | `26d4b0a` |
| Promote-staged live catalog | `promote_staged_refrigerator_v1` | `a28ad31` / `2122959` |
| HQII retailer-link ingest | `ingest_hqii_retailer_links_v1`, `hqii_candidate_queue_upsert_v1` | `6ae0b2e` |
| Seed import | `import_seed_fridge_catalog_v1`, `vertical_seed_catalog_v1` | `6756914` |

**Slice 4 resolved (PROVEN in-repo):** `scripts/ingest-hqii-retailer-links.ts` + `scripts/hqii-candidate-queue-upsert.ts` — MUTATION + trust + founder + input JSON artifact binding; writes in `scripts/lib/ingest-hqii-retailer-links-run-v1.ts` and `scripts/lib/hqii-candidate-queue-upsert-run-v1.ts`; truth-ledger on `--write`.

**Slice 5 resolved (PROVEN in-repo):** `scripts/import-seed.ts` + `scripts/lib/vertical-seed.ts` (and vertical wrapper CLIs) — MUTATION + trust + founder + full CSV pack artifact binding; writes in `scripts/lib/import-seed-run-v1.ts` and `scripts/lib/vertical-seed-run-v1.ts`; truth-ledger on `--write`. Default dry-run; `--prune-fridge-catalog --write` blocked (`prune_fridge_catalog_not_authorized_in_founder_schema_v1`) until founder schema supports destructive prune authorization.

Inventory source: `scripts/lib/buckparts-supabase-service-role-inventory-v1.ts`. Drift audit: `auditSupabaseServiceRoleInventoryDriftV1`.

### Truth-ledger coverage (all 20 `write_guarded` lanes — PROVEN)

**20** inventoried `write_guarded` run libs / write CLIs append **`applied`** / **`blocked`** outcomes to **`data/ops/truth-ledger-v1.jsonl`** on write-intent (`recordTruthLedgerMutationOutcomeV1` or `recordCapabilityOnlyMutationTruthLedgerOutcomeV1` in `scripts/lib/capability-only-mutation-truth-ledger-v1.ts`).

| Class | Count | Ledger recorder |
|-------|------:|-----------------|
| Founder-gated run libs | **10** | `recordTruthLedgerMutationOutcomeV1` — AP/RPWFE parity, promote-staged, HQII ingest pair, seed import pair, learning-outcomes insert, remove-demo wedges, verify-oem `--write-db` |
| Capability-only Slice 1–2 | **10** | `recordCapabilityOnlyMutationTruthLedgerOutcomeV1` — `search_gaps` status (3 wedges), classify, candidates generate/apply, staged compat resolve/reprocess/part-choice, staged filter brand |

Capability-only lanes: **`founder_decision_id: null`**, **`bound_artifacts_v1: []`**, one JSONL line per script invocation (not per row).

**Known limitation:** truth-ledger append remains **post-mutation / non-atomic** — DB write may succeed before JSONL append; append failure on write-intent forces exit 1.

### Next recommended work (ordered)

1. **Future — atomic or pre-write truth-ledger intent** — reduce post-mutation append gap
2. **Future — service-role-only `upsert_search_gap` refactor** — removes anon/authenticated EXECUTE on `SECURITY DEFINER` RPC (clears deferred WARN)
3. **Future — tighter `click_events` INSERT `WITH CHECK`** — shape-constrain telemetry inserts (clears deferred WARN)

---

## Security hardening — deployed scope reference (`26d4b0a` → `e19ebbd`)

**Historical label:** Buyer-path / trust / founder-binding slice landed through **`26d4b0a`**; service-role and RLS slices landed **`a0cb33c` → `e19ebbd`**. Use **§ Current stopping point** above for HEAD and deploy anchors.

### Resolved scope (PROVEN on deployed slice)

- `/go` freshness fail-closed
- Decision precedence: DENY / UNKNOWN over ALLOW
- Trust currency: expired / degraded blocking
- Founder approval artifact binding
- **Founder mutation approval expiry** (`e16b4a1`, **published**) — `owner_mutation_approved` requires valid `expires_at`; missing / null / blank / unparseable / past `expires_at` fails closed; `expires_at` must be after `decided_at` (`founder-decision-registry-v1.ts` → `isFounderRegistryRowActiveMutationApproval` / `validateFounderDecisionRegistryRowV1`); AP and RPWFE Supabase apply gates inherit via `founderRegistryRowPassesMutationApprovalGateV1`
- **Truth-ledger v1 mutation outcome recording** (`26d4b0a` → `e19ebbd`, **published**) — append-only JSONL at **`data/ops/truth-ledger-v1.jsonl`** (`TRUTH_LEDGER_V1_JSONL_REL_V1`); `appendTruthLedgerMutationEntryV1` / `recordTruthLedgerMutationOutcomeV1` require **`MUTATION`** IO capability (`READ_INDEX` append fails closed); hash binding at apply-time via `verifyFounderDecisionArtifactBindingsV1` / `buildGuardedApplyTruthLedgerBlockersV1`; **`source_snapshot_v1`** backward compatible when absent — when present, requires `source_url`, `retrieved_at`, and `evidence_sha256` matching the bound evidence artifact hash (broken chain → fail-closed blocker); **founder-gated write lanes** record **`applied`** and **`blocked`** on write-intent: AP + RPWFE parity apply (`26d4b0a`), promote-staged (`a28ad31`), HQII ingest pair (`6ae0b2e`), seed import pair (`6756914`), learning-outcomes insert + remove-demo wedges + verify-oem `--write-db` (`1107eb2`); append failure forces `BLOCKED` reporting on gated paths
- READ_INDEX vs MUTATION capability enforcement
- External signals read-only contract
- **Live Supabase apply lanes gated** (buyer-path flip mutations fail-closed without founder + trust + MUTATION):
  1. **Air-purifier** Supabase parity apply — `scripts/lib/air-purifier-supabase-apply-parity-mutation-gate-v1.ts` (`fb0b379`); truth-ledger outcome recording in `scripts/lib/air-purifier-supabase-apply-parity-v1.ts` (`26d4b0a`)
  2. **RPWFE/GE** Supabase parity apply — `scripts/lib/rpwfe-official-ge-supabase-parity-mutation-gate-v1.ts` (`1fe3666`); truth-ledger outcome recording in `scripts/lib/rpwfe-official-ge-supabase-parity-apply-v1.ts` (`26d4b0a`)
  3. **Promote-staged-refrigerator** live catalog promotion — `scripts/lib/promote-staged-refrigerator-mutation-gate-v1.ts` (Slice 3); truth-ledger outcome recording in `scripts/lib/promote-staged-refrigerator-run-v1.ts`
- **MCP / Supabase extraction controls enforced in Netlify preflight** — `npm run buckparts:deploy:preflight` chains `buckparts:mcp-supabase-exposure:audit` (`--enforce`, exit 0/1) before `buckparts:repo-runtime-convergence:check -- --enforce`; `netlify.toml` runs preflight before `npm run build`. Static FAIL on MCP supabase-admin imports, public MCP listen surfaces, live Command Center fallback without escape hatch, and service-role writer inventory drift. **Anon catalog read surface remains WARN-only by design** (does not block deploy).
- **P2 `search_gaps` service-role writers runtime-gated (Slice 1)** — `apply-search-gap-status-{refrigerator,air-purifier,whole-house-water}` and `search-gaps-classify` require `BUCKPARTS_IO_CAPABILITY=MUTATION` before `--write`; default/dry-run unchanged; inventory reclassified to `write_guarded` with `mutation_lane`. No founder/plan binding for ops-only `search_gaps` metadata.
- **P1 staged search-gap pipeline writers runtime-gated (Slice 2)** — `search-gap-candidates-{generate,apply}`, `resolve-staged-compat-refrigerator`, `reprocess-compat-after-models-refrigerator`, `apply-staged-compat-part-choice-refrigerator`, and `apply-staged-filter-brand-refrigerator` require `BUCKPARTS_IO_CAPABILITY=MUTATION` before `--write`; default/dry-run unchanged; inventory reclassified to `write_guarded` with `mutation_lane`. No founder/plan binding — staged `search_gap_candidates` / `staged_*` tables only.
- **P0 promote-staged-refrigerator live catalog promotion runtime-gated (Slice 3)** — `scripts/promote-staged-refrigerator.ts` requires **`BUCKPARTS_IO_CAPABILITY=MUTATION`**, clean **trust-currency preflight**, and **active founder approval** bound to `scripts/promote-staged-refrigerator.ts` (via `apply_context_apply_plan_rel_paths` + `founderRegistryRowPassesMutationApprovalGateV1` including valid non-expired `expires_at`) before `--write`; default/dry-run unchanged; inventory reclassified to `write_guarded` with `mutation_lane: promote_staged_refrigerator_v1`. **Operator prerequisite:** record `owner_mutation_approved` with `expires_at` and apply-plan binding to `scripts/promote-staged-refrigerator.ts` before live promotion writes.
- **Supabase Security Advisor RLS reconcile (live — project `anmlqhrlmsnvxgneszbf`)** — migration `supabase/migrations/20260610120000_security_advisor_rls_reconcile_v1.sql` applied; **Security Advisor ERROR count = 0**. **PROVEN live:** RLS enabled on flagged public catalog/telemetry tables (`brands`, `fridge_models`, `filters`, `fridge_model_aliases`, `filter_aliases`, `compatibility_mappings`, `help_pages`, `reset_instructions`, `retailer_links`, `click_events`, `search_events`); `retailer_links` anon SELECT policy `status = 'approved'` (live DB retains `status` column); `click_events` table grants **anon INSERT only**; `search_events` table grants **anon + authenticated INSERT only** (no SELECT/UPDATE/DELETE/TRUNCATE); function `search_path` fixed on `norm_compact`, `set_updated_at_learning_outcomes`, `set_updated_at_search_gaps`, `upsert_search_gap`. **WARN intentionally deferred:** `click_events` INSERT policy `WITH CHECK (true)` (telemetry shape not constrained in SQL yet); `upsert_search_gap` `SECURITY DEFINER` executable by anon/authenticated (required by `src/lib/search/telemetry.ts` via anon server client until service-role telemetry refactor). **INFO accepted:** RLS enabled with **no anon/authenticated policies** on private/service-role tables (`search_gaps`, `search_gap_candidates`, `staged_*`, `owner_report_artifacts`, `learning_outcomes`, etc.) — repo has no anon read/write paths to these tables; ops/scripts use service role.

**Scope boundary (PROVEN — `26d4b0a`):** No `data/**`, `data/retailer_links.csv`, public `/go` routes, or buyer-path gates changed. Committed `owner_mutation_approved` rows **without** `expires_at` no longer authorize mutation (from `e16b4a1`); owners must re-record approvals with an explicit `expires_at`. Truth-ledger slice adds code + tests only — no committed evidence or production JSONL seed file required for backward compat.

### Live Supabase Security Advisor — post-apply smoke (manual)

Run after RLS migration or when validating telemetry/`/go` inserts on production/staging.

| Check | Surface | Exact step |
|-------|---------|------------|
| Search API | **Browser** or **Terminal** | `curl -sS 'https://<production-host>/api/search?q=rf28' \| jq '.hits \| length'` — expect HTTP 200 and non-error JSON (hits may be 0). |
| Zero-result telemetry | **Browser** | On production site, run a search unlikely to match catalog (e.g. `zzzznotarealquery999` on `/search`); no user-visible error. Optional **Supabase SQL** (service role): `select id, raw_query, catalog, results_count, created_at from public.search_events order by created_at desc limit 5;` |
| Zero-result gap RPC | **Supabase SQL** (service role) | After zero-result search above: `select id, catalog, normalized_query, status from public.search_gaps order by last_seen_at desc limit 5;` — gap row may update via `upsert_search_gap` (not anon-readable). |
| Known-safe `/go` redirect | **Browser** | Open a **known approved** fridge `retailer_links.id` UUID at `https://<production-host>/go/<uuid>` (must pass buyer-path gate — use a link surfaced on a live PDP, not an invented UUID). Expect 302 to retailer (or `/go-unavailable` if gate blocks). |
| `click_events` insert | **Supabase SQL** (service role) | After `/go` smoke: `select id, target_url, page_type, page_slug, created_at from public.click_events order by created_at desc limit 5;` — expect new row with `target_url` matching redirect hop. |

Repo-safe unit tests (no live Supabase): `BUCKPARTS_TEST_FILES='src/lib/search/telemetry.test.ts src/lib/retailers/go-affiliate-route-handler.test.ts src/lib/retailers/go-route-redirect-gate-coverage.test.ts' bash scripts/npm-test-v1.sh`

**Scope boundary (PROVEN — RLS reconcile):** No `data/**`, `data/retailer_links.csv`, public `/go` route logic, or buyer-path gates changed by the migration; SQL-only + handoff documentation.

### Live Supabase apply authority (PROVEN — both gated lanes)

Apply requires all of:

- **`MUTATION`** IO capability (not `READ_INDEX`)
- Hash-bound **founder approval** matched to exact apply plan/path and slug identity, with **valid non-expired `expires_at`** (inherited via `founderRegistryRowPassesMutationApprovalGateV1`)
- Clean **trust-currency preflight** (`buildGuardedApplyTrustCurrencyPreflightV1`)
- **Live deps fail-closed** — `updateApprovedLink` / `updateRowById` cannot execute when `mutation_authorized` is false

`dry_run` remains read-only and does not require founder approval.

### Remaining blockers before broad production-data automation

1. Truth-ledger append is **post-DB-write / non-atomic** — consider pre-write intent or append-before-write
2. CSV / manufacturer apply lanes outside inventoried service-role writers remain outside truth-ledger coverage (`truth-ledger-v1.ts` `remains_unknown_without_full_lane_coverage`)
3. ~~Runtime-gate remaining **`write_unguarded`** service-role lanes~~ — **DONE (Slice 6, deployed `e19ebbd`)**
4. ~~Capability-only search-gap/staged truth-ledger~~ — **DONE (all 20 `write_guarded` lanes record outcomes)**

```bash
git rev-parse HEAD
git log --oneline 26d4b0a..HEAD
BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/truth-ledger-v1.test.ts' bash scripts/npm-test-v1.sh
BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/founder-decision-registry-v1.test.ts' bash scripts/npm-test-v1.sh
BUCKPARTS_TEST_FILES='scripts/lib/buckparts-security-hardening-v1.test.ts' bash scripts/npm-test-v1.sh
BUCKPARTS_TEST_FILES='scripts/lib/air-purifier-supabase-apply-parity-mutation-gate-v1.test.ts scripts/apply-air-purifier-supabase-parity-v1.test.ts scripts/lib/rpwfe-official-ge-supabase-parity-mutation-gate-v1.test.ts scripts/lib/rpwfe-official-ge-supabase-parity-apply-v1.test.ts' bash scripts/npm-test-v1.sh
BUCKPARTS_TEST_FILES='scripts/lib/promote-staged-refrigerator-run-v1.test.ts scripts/lib/promote-staged-refrigerator-mutation-gate-v1.test.ts scripts/lib/search-gap-status-mutation-gate-v1.test.ts scripts/lib/search-gap-staged-mutation-gate-v1.test.ts scripts/lib/buckparts-supabase-service-role-inventory-v1.test.ts' bash scripts/npm-test-v1.sh
npx tsx scripts/audit-buckparts-readonly-capability-v1.ts
npm run buckparts:mcp-supabase-exposure:audit
npm run buckparts:deploy:preflight
npm run buckparts:repo-runtime-convergence:check -- --enforce
```

---

## Historical stopping point — Owner browser proof refresh + guarded apply exhaustion (`56b4167`) — superseded

**Superseded by § Current stopping point — Security / RLS / service-role gating (`e19ebbd`)** for security, deploy, Supabase, and service-role work. Retained for refrigerator coverage / Session 1 browser proof context only.

Prior foundation stack, AP correctness, and Customer Reality sections below remain **PROVEN historical context** — they do **not** supersede the security stopping point unless a fresh Command Center run proves otherwise.

### Milestone summary (historical — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD at handoff refresh | **`56b4167`** — Add owner browser proof refresh director |
| **`origin/main`** | **Superseded** — see security stopping point (`e19ebbd`) |
| Working tree | Re-run `git status --short` before citing |

**Recent commits on `main` (PROVEN — newest first):**

| SHA | Subject |
|-----|---------|
| **`56b4167`** | Add owner browser proof refresh director |
| **`3ce3ddf`** | Add edr3rxd1 ultrawf evidence readiness director |
| **`3d8d9c5`** | Add HyperAgent evidence production director |
| **`077b1a4`** | Exclude proven slugs from coverage steering |
| **`00f133c`** | Apply 4396508 safe buyer path |
| **`6932497`** | Activate 4396508 founder approval |

```bash
git rev-parse HEAD
git log --oneline -6
git status --short
```

### Proven coverage (re-run census before citing)

**Source:** `node --import tsx scripts/report-all-product-safe-buyer-path-census-v1.ts` · **Sprint v2 inventory:** `npm run buckparts:coverage-production-sprint-v2`

| Metric | Value (live at handoff refresh) |
|--------|----------------------------------|
| Site **`SAFE_BUYER_PATH_PROVEN`** | **50** |
| Site **`SAFE_BUYER_PATH_SUPPRESSED_TRUST`** | **66** |
| **`refrigerator_water`** proven / suppressed | **16 / 41** |
| **`4396508`** page classification | **`SAFE_BUYER_PATH_PROVEN`** (applied at **`00f133c`**) |
| **`edr4rxd1`** page classification | **`SAFE_BUYER_PATH_PROVEN`** |
| Wedge completion **C3** | **FAIL** — `buyer_path_truth_status=MIXED` (16 safe mapped filters / 41 zero-safe) |

```bash
# Terminal — site + wedge census
node --import tsx scripts/report-all-product-safe-buyer-path-census-v1.ts | jq '{site: .classification_counts, fridge: (.wedge_coverage[] | select(.wedge=="refrigerator_water"))}'

# Terminal — C3 / wedge completion (refrigerator_water)
node --import tsx scripts/report-wedge-completion-evaluator-v1.ts | jq '{wedge, overall_status, c3: (.blocking_criteria[] | select(.criterion_id=="C3") | {status, blocking_evidence, metrics})}'
```

**PROVEN:** C3 remains **FAIL** until `buyer_path_truth_status` clears **MIXED** on committed CSV — not from docs or Command Center prose alone.

### Next best action (NBA)

| Label | Finding |
|-------|---------|
| **Immediate guarded applies** | **Exhausted** — Coverage Sprint v2 `largest_achievable_executable_delta=0`; no First4 / parity CSV apply batch with positive delta without fresh evidence first |
| **Current bottleneck** | **Owner browser proof freshness → committed evidence lane** — PASS proof exists on disk but goes **STALE** after 14-day policy; blocks apply-plan READY and guarded apply |
| **Control-plane source** | **`owner-browser-proof-refresh-director-v1`** — ranked refresh queue + batched owner sessions (read-only; does not mutate evidence) |
| **Session 1 (highest priority)** | **`edr3rxd1`, `ultrawf`** — expected **`+2`** `SAFE_BUYER_PATH_PROVEN` after fresh owner browser proof → committed evidence JSON → founder approval → guarded apply (per evidence-readiness director chain) |
| **HyperAgent 14 cohort** | Up to **+5** near-term / **+6** optimistic after evidence lane clears — see `hyperagent-safe-link-evidence-production-director-v1` |

**PROVEN:** Command Center root NBA may still steer demand-selected **air_purifier** batches — factory NBA for **refrigerator_water** coverage production is **owner browser proof refresh**, not another read-only discovery pass.

```bash
# Terminal — refresh queue + owner sessions (read-only)
npm run buckparts:owner-browser-proof-refresh-director

# Terminal — edr3rxd1 + ultrawf end-to-end readiness audit (read-only)
npm run buckparts:edr3rxd1-ultrawf-evidence-readiness-director

# Terminal — HyperAgent 14 cohort ranking (read-only)
npm run buckparts:hyperagent-safe-link-evidence-production-director
```

**Artifacts (durable):**

| Director | JSON | MD |
|----------|------|-----|
| Owner browser proof refresh | `data/fridge/batch-production/drafts/owner-browser-proof-refresh-director-v1.json` | `.../owner-browser-proof-refresh-director-v1.md` |
| HyperAgent evidence production | `data/fridge/batch-production/drafts/hyperagent-safe-link-evidence-production-director-v1.json` | `.../hyperagent-safe-link-evidence-production-director-v1.md` |
| edr3rxd1 + ultrawf evidence readiness | `data/fridge/batch-production/drafts/edr3rxd1-ultrawf-evidence-readiness-director-v1.json` | `.../edr3rxd1-ultrawf-evidence-readiness-director-v1.md` |

**Do not:** mutate CSV/Supabase/evidence; regenerate browser proof in repo; activate founder approvals from directors (all `mutation_authorized: false`).

### Strategic state (PROVEN / INFERRED)

| Label | Finding |
|-------|---------|
| **Execution focus** | **PROVEN:** BuckParts remains the current execution focus — refrigerator_water safe-link rescue and coverage production |
| **Authority-boundary platform thesis** | **INFERRED, NOT PROVEN** — documented in `docs/BuckParts-TO-AUTHORITY-BOUNDARY-THESIS.md` and `docs/BuckParts-AUTHORITY-BOUNDARY-STRATEGY-NOTE.md`; pattern proven **once** at Foundation v2 lifecycle, not at steady cadence |
| **Proving lab** | **PROVEN:** **`refrigerator_water`** wedge — C3 incomplete, HyperAgent 14 cohort, owner-browser-proof refresh queue |

### Exact next chat prompt (copy/paste)

**Surface:** **Cursor**

```
Read docs/BuckParts-HQ-HANDOFF.md (especially **Current stopping point — Owner browser proof refresh + guarded apply exhaustion**), then execute Session 1 owner browser proof refresh for edr3rxd1 and ultrawf using repo truth only.

Constraints:
- Read-only factory planning unless Jared explicitly authorizes evidence intake or apply.
- Do NOT mutate CSV, Supabase, or committed evidence without founder approval.
- Use owner-browser-proof-refresh-director-v1 and edr3rxd1-ultrawf-evidence-readiness-director-v1 as control-plane sources.
- End with exact Browser/Terminal steps for Jared to refresh PASS owner-browser-proof (no auto-pass).

First: re-run npm run buckparts:owner-browser-proof-refresh-director and npm run buckparts:edr3rxd1-ultrawf-evidence-readiness-director; summarize blockers and the smallest owner session checklist.
```

---

## Current stopping point — Foundation v1 stack COMPLETE (`613d6b8`)

**Superseded for next-move authority** by **§ Current stopping point — Security / RLS / service-role gating (`e19ebbd`)** for security/deploy work. For refrigerator Session 1 browser proof, see **§ Historical stopping point — Owner browser proof refresh (`56b4167`)**. Retained for Runner / Coverage Sprint v2 / Owner Decision Queue / Agent Contract foundation context.

Prior tactical stopping points (AP demand-selected correctness, Holmes HAPF30, etc.) remain **PROVEN historical context** below — they do **not** supersede the owner-browser-proof refresh stopping point for Monday execution unless Command Center NBA explicitly overrides.

### Milestone summary (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD at handoff refresh | **`613d6b8`** — Add owner decision queue v1 (Runner v1 + queue + CC lanes in same workstream) |
| **Runner v1** | **`buckparts_runner_v1`** — **v1 scope COMPLETE** |
| **Coverage Production Sprint v2** | **`coverage_production_sprint_v2_v1`** — **COMPLETE** |
| **Owner Decision Queue v1** | **`owner_decision_queue_v1`** — **v1 scope COMPLETE** |
| **Agent Contract + Dispatch Manifest v1** | **`agent_contract_v1`** — **Foundation v2 v1 scope COMPLETE** |
| **Operations Metrics v1** | **`operations_metrics_v1`** — **Measurement mode ACTIVE** |
| **Production Mission v1** | **`production_mission_v1`** — **Reference end-to-end mission COMPLETE** |
| **Next work** | Execute production mission in ops; prove throughput via metrics snapshots before new foundation |

### New operating model (PROVEN doctrine)

```
Truth → Command Center → Runner → External AI → Validation → Owner Decision Queue → Approved Mutation
```

| Stage | Surface | Role |
|-------|---------|------|
| **Truth** | Committed CSV, Supabase read models, `data/evidence/`, census | Repo-owned facts only |
| **Command Center** | `node --import tsx scripts/report-buckparts-command-center.ts` | Read-only steering, lanes, NBA |
| **Runner** | `node --import tsx scripts/report-buckparts-runner-v1.ts` | Mission orchestration over existing reports + validation |
| **External AI** | External operator surface (any tool **outside** Runner) | Human-invoked; dispatch manifest + result artifact; never truth closure alone |
| **Validation** | lint, build, targeted tests, deploy classifier, security gate | Repo-owned proof |
| **Owner Decision Queue** | `data/owner-decisions/queue/` | Pending decisions; **never auto-approves** |
| **Approved Mutation** | Founder Decision Registry + guarded apply executors | `--write-csv` / apply only after `owner_mutation_approved` |

**Cursor** sits across Validation and guarded apply implementation — not a separate truth authority.

### Foundation Completion Rule (PROVEN HQ policy)

After each major **v1 foundation** is completed:

1. **Update this HQ Handoff** — record completed scope and deferred scope
2. **Do not start the next foundation** until step 1 is done
3. **Do not claim v2 capabilities** while v1 scope is still open

Foundations completed in this cycle: **Runner v1**, **Coverage Production Sprint v2**, **Owner Decision Queue v1**, **Agent Contract + Dispatch Manifest v1**. **Measurement mode:** Operations Metrics v1 (`operations_metrics_v1`).

---

### 1. Runner v1 — COMPLETE (declared v1 scope)

**Contract:** `buckparts_runner_v1` · **CLI:** `npm run buckparts:runner` → `scripts/report-buckparts-runner-v1.ts` · **CC lane:** `.command_center_v2.buckparts_runner_v1`

#### Capabilities implemented (v1)

| Capability | PROVEN path |
|------------|-------------|
| Three read-only missions | `coverage_sprint_v1`, `evidence_sprint_v1`, `safe_link_sprint_v1` — `scripts/lib/buckparts-runner-v1.ts` |
| Step kinds | `tsx_report`, `npm_run`, `agent_dispatch` |
| Halt reasons | `FOUNDER_APPROVAL_REQUIRED`, `MUTATION_GATE_BLOCKED`, `EXTERNAL_AGENT_REQUIRED`, `DISPATCH_EXHAUSTED`, `STEP_FAILED`, `RESUME_MISMATCH` |
| Safety | Forbidden argv patterns (`--write-csv`, `--apply`, `git commit`, etc.); mission npm allowlist extends Runner Step allowlist |
| Analysis then validation | Analysis may halt; **validation phase still runs** when halted on approval (proven in tests) |
| Artifacts | `data/command-center/runner-runs/buckparts-runner-<mission>-<run_id>.json` |
| Owner Decision Queue bridge | Halts upsert `owner_decision_request_v1` under `data/owner-decisions/queue/requests/` |
| Resume gate unlock | If founder registry satisfies request → halted step treated as **PASS** without re-running |

#### Proven validation

| Check | PROVEN |
|-------|--------|
| Mission definition validation | `scripts/lib/buckparts-runner-v1.test.ts` — all missions validate |
| Forbidden mutation argv rejected | `--write-csv` blocked in step command validation |
| Supabase parity gap → founder halt | `evaluateStepHaltV1` + coverage mission |
| Guarded apply blocked → mutation gate halt | lifecycle executor dry-run step |
| Validation continues after analysis halt | `runBuckpartsRunnerV1 continues validation after analysis halt` test |
| Evidence sprint external dispatch halt | `HALTED_EXTERNAL_AGENT` at `external_agent_dispatch` — manifest on disk; resume after validated result |
| Lint failure → `FAILED` | safe_link_sprint validation test |

Coverage mission validation bundle: `lint`, `build`, targeted runner+census tests, deploy classifier (`--working-tree`), security gate.

#### Checkpoint / resume behavior

| Behavior | PROVEN |
|----------|--------|
| Checkpoint contract | `buckparts_runner_checkpoint_v1` in `data/command-center/runner-checkpoints/` |
| Idempotent steps skipped on resume | Steps with `idempotent: true` skip if in `completed_step_ids` |
| Resume CLI | `--mission <id> --resume <run_id>` |
| Resume command in report | `resume_command` field on every run artifact |
| Mismatch guard | Checkpoint `mission_id` must match CLI `--mission` |

#### Command Center integration

- Lane builder: `scripts/lib/buckparts-runner-command-center-v1.ts`
- Surfaces latest run from `data/command-center/runner-runs/` only
- `overall_status`, `halt_reason`, `recommended_next_action` projected read-only

#### Deferred v2+ (explicitly NOT in v1)

- **NOT IMPLEMENTED:** Automatic mutation steps in missions (`--write-csv`, Supabase apply, evidence writes)
- **NOT IMPLEMENTED:** HyperAgent/Codex/Cursor auto-invocation or closed-loop output ingestion
- **NOT IMPLEMENTED:** GitHub Actions workflow for `buckparts:runner` (distinct from **Runner Step v1** CI)
- **NOT IMPLEMENTED:** Scheduled/cron mission runs or multi-mission DAG chaining
- **NOT IMPLEMENTED:** Auto-resume after founder approval without explicit `--resume <run_id>`
- **NOT IMPLEMENTED:** Dynamic mission definitions from Command Center (missions are code-defined only)
- **NOT IMPLEMENTED:** Layer 6 closed-loop autonomy — see `docs/BuckParts-RUNNER-STATUS.md` (`layer_6_founder_only_approval: NOT_PROVEN`)
- **NOT IMPLEMENTED:** Merging **Runner Step v1** (`buckparts:runner-step`) into **Runner v1** — both coexist; Step remains CI validation bundle only

```bash
# Terminal — list missions
node --import tsx scripts/report-buckparts-runner-v1.ts --list-missions

# Terminal — run coverage sprint (read-only analysis + validation)
node --import tsx scripts/report-buckparts-runner-v1.ts --mission coverage_sprint_v1

# Terminal — inspect CC lane
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '.command_center_v2.buckparts_runner_v1 | {overall_status, mission_id, halt_reason, recommended_next_action}'
```

---

### 2. Coverage Production Sprint v2 — COMPLETE

**Contract:** `coverage_production_sprint_v2_v1` · **CLI:** `npm run buckparts:coverage-production-sprint-v2` · **Module:** `scripts/lib/coverage-production-sprint-v2.ts`

#### Purpose

Stop optimizing individual slugs. Rank **executable production batches** by expected **`SAFE_BUYER_PATH_PROVEN`** delta using **existing** factories, guarded apply paths, and census — **no new orchestrators**.

#### Mission

- Minimum batch target: **+10** proven paths per sprint when repo supports it
- If +10 impossible, **prove why** and name largest achievable batch
- Reuse: parity factory, universal guarded CSV executor, First4 apply review, batch factory drafts

#### Current proven state (re-run census before citing)

| Metric | Value (live census) |
|--------|---------------------|
| **`SAFE_BUYER_PATH_PROVEN`** | **48** |
| **`SAFE_BUYER_PATH_SUPPRESSED_TRUST`** | **68** (43 fridge + 25 AP) |
| Live wedge product pages | **116** |
| Parity factory ready slugs | **0** (ukf8001 applied; parity candidates blocked) |
| Largest **EXECUTABLE_AFTER_APPROVAL** batch | **+2** (First4 deblocked: `edr4rxd1`, `4396508`) |
| **+10 executable today** | **No** — proven in sprint v2 report |

#### Sprint v2 winning batch (ranked output)

**Fridge safe-link First4 deblocked** — +2 proven, `EXECUTABLE_AFTER_APPROVAL`, excludes `edr3rxd1` (B087PDLZL9) and blocked Waterdrop cluster.

#### Sprint v3 production priority (INFERRED from sprint v2 + family audit — not a new foundation)

**HyperAgent 7-slug owner browser proof batch** — up to **+7** proven, **158 model pages**, evidence sprint before guarded apply. See Coverage Production Sprint v3 analysis in chat; execute via existing owner-browser-proof + parity infrastructure only.

```bash
# Terminal — refresh sprint v2 ranking
node --import tsx scripts/report-coverage-production-sprint-v2.ts

# Terminal — refresh census
node --import tsx scripts/report-all-product-safe-buyer-path-census-v1.ts | jq '.classification_counts'
```

---

### 3. Owner Decision Queue v1 — COMPLETE (declared v1 scope)

**Contract:** `owner_decision_queue_v1` · **CC lane:** `.command_center_v2.owner_decision_queue_v1` · **Module:** `src/lib/owner-dashboard/owner-decision-queue-v1.ts`

#### Architecture

| Artifact | Path |
|----------|------|
| Queue manifest | `data/owner-decisions/queue/owner-decision-queue-v1.json` |
| Request artifacts | `data/owner-decisions/queue/requests/odr-v1-*.json` |
| Request contract | `owner_decision_request_v1` |

Each request records: `decision_type`, `target_slugs`, `options`, `evidence_summary`, `blockers`, `exact_downstream_action_if_approved/rejected`, `founder_decision_registry_bridge`.

**PROVEN:** Queue is **read-only for mutation** — `mutation_authorized: false` always; **never auto-approves** production.

#### Command Center lane

- Builder: `scripts/lib/owner-decision-queue-command-center-v1.ts`
- Surfaces: `pending_count`, `stale_count`, `top_pending_decisions`, `recently_approved_decisions`
- Effective **APPROVED** requires active `founder_decision_registry_v1` row with `owner_mutation_approved` — queue does not grant mutation by itself

#### Runner integration

- On `FOUNDER_APPROVAL_REQUIRED` or `MUTATION_GATE_BLOCKED`, Runner calls `upsertOwnerDecisionRequestFromRunnerHaltV1`
- `ownerDecisionRequestApprovalSatisfiesRunnerGateV1` re-checks registry — can unlock halted step as **PASS** on resume path
- `source_system` pattern: `buckparts_runner_v1:<mission_id>`

#### Founder registry bridge

- `founder_decision_registry_bridge.matching_registry_sources` + `active_mutation_approval_decision_id`
- Jared records outcomes in `data/owner-decisions/*.json` per `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`
- Approved registry row ≠ automatic apply — guarded executor still required

#### Deferred v2+ (explicitly NOT in v1)

- **NOT IMPLEMENTED:** Queue writing founder registry rows (human/agent records registry separately)
- **NOT IMPLEMENTED:** Owner dashboard approve/reject buttons that mutate queue status
- **NOT IMPLEMENTED:** Slack/email/Founder Digest push for new pending decisions
- **NOT IMPLEMENTED:** Batch-level single decision covering many unrelated slugs without per-halt artifacts
- **NOT IMPLEMENTED:** Auto-stale/supersede without operator review

```bash
# Terminal — Owner Decision Queue CC lane
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '.command_center_v2.owner_decision_queue_v1 | {pending_count, stale_count, top_pending: .top_pending_decisions[0].request_artifact_rel_path, recommended_next_action}'
```

---

### Roadmap — foundation sequence

| Foundation | Status | Notes |
|------------|--------|-------|
| **Runner v1** | **COMPLETE** | Missions + checkpoint + CC lane + queue bridge |
| **Coverage Production Sprint v2** | **COMPLETE** | Read-only batch ranking; no new factories |
| **Owner Decision Queue v1** | **COMPLETE** | CC lane + Runner halt artifacts + registry bridge |
| **Agent Contract + Dispatch Manifest v1** | **COMPLETE** | Vendor-agnostic dispatch/result/validation; CC lane `agent_contract_v1`; see `docs/BuckParts-AGENT-CONTRACT-V1.md` |
| **Operations Metrics v1** | **COMPLETE** | Read-only OS measurement; history snapshots; CC lane `operations_metrics_v1`; see `docs/BuckParts-OPERATIONS-METRICS-V1.md` |
| Coverage Sprint v3 execution (7-slug evidence) | **IN PROGRESS (operational)** | Uses existing owner-browser-proof + parity apply — dispatch via Agent Contract v1 |

---

## Strategic identity + second-wedge research (PROVEN audit findings — strategy only)

**Read this section for business identity and long-term wedge doctrine.** None of the second-wedge items below authorize build, product mutation, or Command Center expansion without explicit founder activation.

### Business model (PROVEN — strategic audit)

| Label | Finding |
|-------|---------|
| **PROVEN** | BuckParts is **not** an affiliate site. |
| **PROVEN** | Current primary **near-term** model is **ad-supported trusted search-intent utility / answer engine**. |
| **PROVEN** | Affiliate / referral links are **secondary and gated** — truth and buyer-path evidence outrank monetization lanes. |

### Wedge vs engine (PROVEN — strategic audit)

| Layer | Meaning |
|-------|---------|
| **Wedge (first)** | Home replacement **fit lookup** / trusted consumer utility — *“help me finish this replacement without buying the wrong part.”* |
| **Engine (core)** | **Decision authority under uncertainty** — not a catalog, not a storefront. |

### Core abstraction (PROVEN — strategic audit)

**Evidence → Confidence → Risk → Reversibility → Action Authority → Outcome**

**Plain English (PROVEN):** The system decides whether **enough evidence exists to justify an action**. It must handle cases where humans still need to act under uncertainty. It is **not** simply a truth engine; it is closer to an **authority / permission-to-act engine**.

### First wedge — do not pivot (PROVEN doctrine)

| Label | Finding |
|-------|---------|
| **PROVEN** | BuckParts **replacement-part fitment** remains the **first wedge and proving ground**. |
| **PROVEN** | **Do not pivot away** from replacement-part fit lookup while first-wedge proof is still incomplete. |

### Second-wedge doctrine (PROVEN policy — NOT approved for build)

| Label | Finding |
|-------|---------|
| **PROVEN** | **No second wedge** until BuckParts has **stronger first-wedge proof**. |
| **PROVEN** | **Do not build** medical / legal / insurance / recall / product extensions as runtime wedges yet. |
| **PROVEN** | Second-wedge research is preserved here as **strategy only** — not roadmap authorization. |

### Second-wedge candidates (INFERRED — audit ranking; NOT APPROVED FOR BUILD)

| Rank | Candidate | Framing | Status |
|------|-----------|---------|--------|
| **1 (best audit candidate)** | **Product recall status** | Unit-in-scope only: *“Is **my specific unit** affected, given incomplete serial/lot/model info, and am I **authorized to keep using it**?”* — **not** “does a recall exist?” | **INFERRED / NOT APPROVED FOR BUILD** — recall is **not built**; no recall lane, page, or data mutation authorized. |
| **2 (secondary)** | **Warranty-claim sufficiency** | *“Do I have enough evidence to file?”* — purest literal version of the abstraction | **INFERRED / NOT APPROVED FOR BUILD** — not selected as immediate build. |

### Current priority (PROVEN — founder sequencing)

1. **Continue BuckParts Command Center and customer-outcome work** — authority is earned by **prediction**, not scoring alone.
2. **Build authority outcomes / calibration only if it proves whether Customer Reality predictions were right** — lanes must answer *“were we right?”* not add dashboard surface area.
3. **Avoid new Command Center lanes** unless they answer *“were we right?”* or **change Monday’s action**.

### Next business proof (PROVEN targets — not VC readiness)

| Proof lane | Status |
|------------|--------|
| Catalog contamination **buyer test** | **PROVEN** docs in `docs/business-development/catalog-contamination-audit/` — execution **UNKNOWN** |
| **GSC / GA4** measurement | **PROVEN** freshness lane exists (`external_measurement_freshness_v1`) — live loop maturity **UNKNOWN** |
| **Top suppressed fridge slug rescue** | **INFERRED** from census / Customer Reality steering — not a separate product OKR doc |
| **First ad / revenue truth loop** | **UNKNOWN** — ad-supported model is strategic direction; revenue truth loop **not PROVEN** end-to-end |

**UNKNOWN / not claimed:** VC readiness, second-wedge approval, recall product build, warranty-claim product build.

---

## Current stopping point — AP demand-selected correctness-risk Command Center steering (`3189b9b`)

**Superseded for foundation priority** by **Current stopping point — Foundation v1 stack COMPLETE** above. Retained for AP correctness context only.

**Read this section** when AP demand-selected correctness work is active — not as default HQ pickup.

### 1. Milestone summary (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`3189b9b`** |
| Latest commit | **`3189b9b`** — Wire AP correctness risks into Command Center steering |
| Prior commits (same workstream) | **`a2f5be0`** — Fix AP build type regressions; **`296dc32`** — Add AP demand-selected open-batch proof helpers; **`66e65cc`** — Clear stale AP demand-selected open-batch blocker; **`3266e7e`** — Update Command Center tests for completed AP demand discovery; **`936f6c9`** — Add AP demand-selected correctness issue packets (**BP-000005**, **BP-000006**); **`1a2140a`** — Surface AP demand-selected correctness risks in Command Center; **`d59f3f8`** — Record AP demand-selected noncanonical discovery result |
| Holmes / Production Truth AP | **Retained** — see **Current stopping point — Holmes HAPF30 self-correction + Production Truth AP** below (superseded for next-move authority) |

### 2. Command Center steering — correctness risks (PROVEN — re-run `jq` before citing)

When AP demand-selected discovery is **proven on disk** and blocking correctness verdicts remain, Command Center **`next_best_action`** is steered by **`demand_selected_correctness_risks`** — **not** stale demand-to-coverage batch-planning messaging.

| Field | Value |
|-------|-------|
| `next_best_action` prefix | **`CORRECTNESS_RISKS [CORRECTNESS_RESOLUTION_REQUIRED]:`** |
| `steering_override_source` | **`demand_selected_correctness_risks`** — `.command_center_v2.customer_steering_comparison_v1.factory_steering.steering_override_source` |
| Linked issues cited in NBA | **BP-000005** (`vornado-md1-0023`), **BP-000006** (`renpho-rp-ap003`) |
| Blocking verdicts (audit lane) | **`vornado_md1_0023_status=issue_track_and_split_before_progression`**; **`renpho_rp_ap003_status=exclude_from_future_batch_progression`** |
| Demand lane (unchanged) | **`recommended_wedge: air_purifier`**, **`recommendation_status: START_NEW_DEMAND_SELECTED_BATCH`** — wedge selection unchanged; only root NBA phase demoted from batch planning to correctness resolution |
| Steering precedence | TIER_0 issue registry → re-audit → refrigerator model-first → model-first → **`demand_selected_correctness_risks`** → demand_to_coverage |
| Resolver (read-only) | `scripts/lib/demand-selected-correctness-risks-steering-v1.ts` — **`resolveDemandSelectedCorrectnessRisksSteeringOverrideV1`** |
| CC wiring | `scripts/report-buckparts-command-center.ts` — no new Command Center mirror lane |

```bash
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '{
  next_best_action_prefix: (.next_best_action | split(":")[0]),
  steering_override_source: .command_center_v2.customer_steering_comparison_v1.factory_steering.steering_override_source,
  demand_lane: .command_center_v2.demand_to_coverage_next_lane_v1 | {recommended_wedge, recommendation_status},
  correctness: .command_center_v2.air_purifier_demand_selected_correctness_risks_v1 | {
    source_status, vornado_md1_0023_status, renpho_rp_ap003_status
  },
  mutation: .command_center_v2.air_purifier_demand_selected_batch_owner_review_v1 | {
    batch_start_authorized, csv_apply_authorized, supabase_mutation_authorized,
    evidence_write_authorized, public_ui_mutation_authorized, netlify_api_authorized
  }
}'
```

**PROVEN live NBA (re-run before citing):** `CORRECTNESS_RISKS [CORRECTNESS_RESOLUTION_REQUIRED]: … Resolve owner-approved catalog identity for BP-000005 (vornado-md1-0023) and BP-000006 (renpho-rp-ap003) before resuming demand-selected batch planning. Mutation unauthorized. Demoted: demand_to_coverage START_NEW_DEMAND_SELECTED_BATCH batch-planning messaging (wedge selection unchanged).`

### 3. AP demand-selected run registry + open-batch proof (PROVEN — foundation from `296dc32`)

| Field | Value |
|-------|-------|
| Run registry | **PROVEN** — `data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json` |
| `run_id` | **`ap-demand-selected-batch-run-v1-2026-06-23`** |
| `stage` | **`read_only_evidence_collection_complete`** |
| `closeout_complete` | **`false`** (open batch — not closed for apply) |
| `evidence_collection_started` | **`true`** (demand-selected discovery artifact on disk) |
| Intake status | **`PROVEN_OPEN`** — `batch_run_registry_intake_v1.ap_demand_selected_open_run_registry_status` |
| `demand_blockers` | **`[]`** — `demand_to_coverage_next_lane_v1.blockers` |
| `owner_review_blockers` | **`[]`** — `air_purifier_demand_selected_batch_owner_review_v1.blockers` |
| `open_batch_proof_v1.open_batch_existence` | **`PROVEN`** |
| `open_batch_proof_v1.batch_closeout` | **`NOT_PROVEN`** |
| `open_batch_proof_v1.apply_readiness` | **`NOT_PROVEN`** |

**Discovery artifact (PROVEN — noncanonical, not apply-eligible):**

- `data/air-purifier/batch-production/agent-results-demand-selected-v1/ap-demand-selected-batch-run-v1-2026-06-23.hyperagent-chat-discovery-v1.json`
- Mechanical validation **`VALIDATION_PASS`** (84/84); **`discovery_artifact_not_canonical: true`**; **`discovery_artifact_not_apply_eligible: true`**

**Mutation / authorization (PROVEN — all remain false):**

| Flag | Value |
|------|-------|
| `batch_start_authorized` | **`false`** |
| `csv_apply_authorized` | **`false`** |
| `supabase_mutation_authorized` | **`false`** |
| `evidence_write_authorized` | **`false`** |
| `public_ui_mutation_authorized` | **`false`** |
| `netlify_api_authorized` | **`false`** |

**Builder / contract paths:**

| Contract | jq path | Builder |
|----------|---------|---------|
| `demand_to_coverage_next_lane_v1` | `.command_center_v2.demand_to_coverage_next_lane_v1` | `scripts/lib/demand-to-coverage-next-lane-v1.ts` |
| `air_purifier_demand_selected_batch_owner_review_v1` | `.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1` | `scripts/lib/air-purifier-demand-selected-batch-owner-review-v1.ts` |
| `air_purifier_demand_selected_correctness_risks_v1` | `.command_center_v2.air_purifier_demand_selected_correctness_risks_v1` | `scripts/lib/air-purifier-demand-selected-correctness-risks-command-center-v1.ts` |
| `demand_selected_correctness_risks_steering_v1` | *(resolver-only — no mirror lane)* | `scripts/lib/demand-selected-correctness-risks-steering-v1.ts` |
| `batch_run_registry_intake_v1` | `.command_center_v2.batch_run_registry_intake_v1` | `scripts/lib/batch-run-registry-intake-v1.ts` |

### 4. Correctness risks — tracked TIER_1 issues (PROVEN)

| Issue | Severity | Status | Scope |
|-------|----------|--------|-------|
| **BP-000005** | **TIER_1** | **`PACKET_READY`** | Vornado MD1-0023 HEPA slug vs MD1-0022/MD1-0023 carbon identity split |
| **BP-000006** | **TIER_1** | **`PACKET_READY`** | Renpho RP-AP003 model/filter slug collision |

**Authority artifacts:** `data/command-center/issues/BP-000005.json`, `data/command-center/issues/BP-000006.json`, `data/air-purifier/batch-production/audits/ap-demand-selected-correctness-risks-v1.json`

**PROVEN:** **BP-000001** through **BP-000004** remain **`CLOSED_PROVEN`**.

### 5. Best next action (business/system)

**Next phase is correctness resolution / canonical evidence decision — not more read-only HyperAgent chat discovery.** Command Center steering now reflects this phase directly.

1. **Owner review + resolve BP-000005** — Vornado HEPA vs carbon identity split before any slug progression toward apply.
2. **Owner review + resolve BP-000006** — Renpho model/filter slug collision; exclude from batch progression until disambiguated.
3. **Canonical evidence decision** — promote or reject demand-selected discovery rows only after identity correctness; discovery artifact remains **noncanonical** and **not apply-eligible**.
4. **Holmes / Production Truth / CSV parity** — parallel hygiene workstreams per sections below; do not conflate with demand-selected correctness closure.

### 6. Do not do next (at this stopping point)

- Do **not** run more read-only HyperAgent chat discovery for this run — **`read_only_evidence_collection_complete`**; discovery phase is done.
- Do **not** treat **`open_batch_existence: PROVEN`** or correctness-risk steering as batch closeout, CSV apply, Supabase mutation, evidence write, buy-link promotion, UI deploy, or **`batch_start_authorized`**.
- Do **not** apply demand-selected discovery JSON to CSV/Supabase — artifact is **`not_canonical`** / **`not_apply_eligible`**.
- Do **not** expect **`DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]`** as root NBA while **BP-000005** / **BP-000006** blocking verdicts remain — demand lane data is unchanged; steering demotes batch-planning messaging only.
- Do **not** close **BP-000005** or **BP-000006** without owner-reviewed identity/collision resolution evidence.
- Do **not** reopen **BP-000001**–**BP-000004** without new customer-reality regression evidence.

### 7. Validation (PROVEN before this handoff update)

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run buckparts:operator-proof` | **PASS** (`RESULT: OK`; live `next_best_action` = **`CORRECTNESS_RISKS [CORRECTNESS_RESOLUTION_REQUIRED]`**) |

```bash
npm run build
npm run buckparts:operator-proof
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '{
  steering_override_source: .command_center_v2.customer_steering_comparison_v1.factory_steering.steering_override_source,
  next_best_action_prefix: (.next_best_action | split(":")[0]),
  demand_lane: .command_center_v2.demand_to_coverage_next_lane_v1 | {recommended_wedge, recommendation_status},
  open_batch_proof: .command_center_v2.air_purifier_demand_selected_batch_owner_review_v1.open_batch_proof_v1,
  mutation: .command_center_v2.air_purifier_demand_selected_batch_owner_review_v1 | {
    batch_start_authorized, csv_apply_authorized, evidence_write_authorized
  }
}'
node --import tsx --test scripts/lib/demand-selected-correctness-risks-steering-v1.test.ts
node --import tsx --test --test-name-pattern "air_purifier_demand_selected|demand-selected batch when refrigerator_water" \
  scripts/report-buckparts-command-center.test.ts
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
npm run buckparts:production-truth:ap
```

---

## Current stopping point — Holmes HAPF30 self-correction + Production Truth AP (`2295ebd`)

**Superseded for next-move authority.** Retained for Holmes demotion + Production Truth AP context. **AP demand-selected correctness-risk Command Center steering** section above is the current executive stopping point.

**Read this section first** for HQ / Cursor / HyperAgent pickup.

### 1. Milestone summary (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`2295ebd`** |
| Latest commit | **`2295ebd`** — Document Holmes HAPF30 self-correction and production truth warnings |
| Production Truth AP suite | **Committed** — `npm run buckparts:production-truth:ap` (`scripts/lib/buckparts-production-truth-ap-v1.ts`, golden cases, tests) |
| Holmes runtime self-correction | **PROVEN** — detect → diagnose → owner demote → validate (one AP micro-cycle) |
| Phase 3 Self-Correction (overall) | **PARTIAL** — one **PROVEN** micro-cycle for Supabase-only `direct_buyable` leak defect class; full autonomous loop **not** proven |
| Claim / TIR / belief meta-work | **Do not resume** — parked until AP convergence priority clears |
| Next business/system priority | **AP convergence / parity expansion** + **recurring Production Truth wiring** (not new CC lanes or schema meta-work) |

### 2. Holmes HAPF30 self-correction cycle (PROVEN)

| Step | Detail |
|------|--------|
| **Detect** | Production Truth case `ap-suppressed-holmes-hapf30` — `safe_cta_absent` **FAIL** (runtime `gated_safe_count=1`) |
| **Diagnose** | Supabase-only Amazon row ASIN **B005BFSBVY** carried `browser_truth_classification=direct_buyable` despite CSV (OEM search placeholder only) + model-first **REJECT** |
| **Owner apply** | Demoted row **`da6d3777-c4de-40c0-9f86-abe025b1db32`** via `ap-holmes-hapf30-amazon-demotion-packet-v2.sql` (browser_truth cleared; buy gates **unchanged**) |
| **Validate** | `gated_safe_count=0`; Production Truth `safe_cta_absent` **PASS**; outcome artifact committed |

**Authority artifacts:** `data/air-purifier/batch-production/audits/ap-holmes-hapf30-self-correction-outcome-v1.json`, `ap-holmes-hapf30-amazon-demotion-packet-v2.sql`, `ap-model-first-holmes-hapf30-live-browser-v1.results.json`

**Still open (inventory hygiene — not customer-safety):** raw OEM `is_primary` search URL remains in Supabase (`search_placeholder_rescue_needed`); tracked as non-blocking `inventory_warnings[]` in Production Truth.

### 3. Production Truth live report (PROVEN — 2026-06-23)

```bash
npm run buckparts:production-truth:ap
```

| Field | Value |
|-------|-------|
| `summary.pass` | **4** |
| `summary.fail` | **0** (blocking assertions only) |
| `summary.pass_with_inventory_warnings` | **1** |
| Holmes `customer_safety_status` | **PASS** (`safe_cta_absent`, `actual: 0`) |
| Holmes `status` (blocking) | **PASS** |
| Holmes `inventory_warnings` | **1** — `no_search_primary_win` (PARTIAL; `blocks_case_pass: false`) |

Exit code **0** when only inventory warnings fail. Buy-path gates (`filterRealBuyRetailerLinks`, `buyLinkGateFailureKind`) were **not** weakened.

### 4. Do not do next (at this stopping point)

- Do **not** resume **claim / TIR / belief** meta-architecture work yet.
- Do **not** restore Holmes Amazon `direct_buyable` without fresh owner browser evidence contradicting model-first **REJECT**.
- Do **not** treat Holmes OEM search primary as a customer-safety FAIL — it is gated off the buy path; rescue is **`search_placeholder_rescue_needed`** (separate workstream).
- Do **not** run **`npm run seed:import:air-purifier`** or broad Supabase parity without explicit owner scope.
- Do **not** expand Command Center lanes for this milestone — Production Truth is the recurring runtime alarm surface.

### 5. Best next action (business/system)

1. **AP convergence / parity expansion** — close remaining CSV↔Supabase safe-CTA drift (parity packet slugs, `ap-runtime-convergence-gap-v1.json` authority).
2. **Wire Production Truth recurring** — daily operator / CI read of `buckparts:production-truth:ap` (blocking FAIL only fails the job).
3. **Holmes OEM rescue** — only when owner scopes `search_placeholder_rescue`; not required to keep customer-safety **PASS**.

### 6. Validation (PROVEN before this handoff update)

```bash
npm run buckparts:production-truth:ap
node --import tsx --test scripts/lib/buckparts-production-truth-ap-v1.test.ts
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

---

## Current stopping point — AP CSV Execution Progress (historical — superseded by `3189b9b`)

**Superseded for next-move authority.** Retained for CSV apply history through **`c780e82`**. **AP demand-selected correctness-risk Command Center steering** section above is the current executive stopping point.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`c780e82`** |
| Latest commit | **`c780e82`** — Renpho RP-AP003 live-browser model-first evidence |
| AP wave commits (pushed on `origin/main`) | **`567a3c5`** — Vornado carbon pad buyer path; **`2410e51`** — Coway Airmega 400 Max2 buyer path; **`82f8f9e`** — GermGuardian FLT4825 buyer path; **`b05a405`** — Holmes HAPF30 live-browser rejection evidence; **`c780e82`** — Renpho RP-AP003 live-browser evidence |
| Prior AP commits (pushed) | **`8a840e1`** — Blueair 211 Plus; **`2acc8f9`** — GermGuardian FLT4100; **`07d1281`** — Coway Airmega 250 Max2; **`b4c94f8`** — Rabbit MinusA2 carbon; **`03dcf49`** — Winix Filter I / 116131; **`f9dc3a9`** — Levoit Core 300 Option A; **`254f6c6`** — Shark carbon-foam HE1 partial re-home |
| Working tree | **Re-verify** — handoff records pushed `origin/main` truth at **`c780e82`**; local uncommitted work may exist |
| Live deploy | **UNKNOWN** — handoff records repo truth only; re-run Command Center locally before citing live numbers |
| Supabase parity | **UNKNOWN** — seed import still not run; CSV commits do not prove Supabase parity |

### 2. AP CSV apply milestones (PROVEN — pushed to `origin/main`)

| Commit | Lane | Summary |
|--------|------|---------|
| **`f9dc3a9`** | Levoit Core 300 | Option A identity correction — `levoit-rf-rar029` OEM → `LEVOIT-CORE-300-P-RF`; official PDP `direct_buyable`; Core 300 family notes |
| **`254f6c6`** | Shark carbon-foam | HE1 **PROVEN** cohort partial re-home — `shark-hepa-he1fkbas` filter + `likely_valid` OEM PDP; 6 models off `shark-carbon-foam`; HE2 deferred (no PDP proof) |
| **`03dcf49`** | Winix 116131 | Filter I identity correction — `winix-carbon-116131` reclassified as annual HEPA + washable AOC set; official Filter I PDP `direct_buyable`; compat restricted to **`winix-c555`** + **`winix-c555b`**; **26** wrong-family mappings removed |
| **`b4c94f8`** | Rabbit MinusA2 | `rabbit-carbon-minusa2` — official MinusA2 charcoal PDP `direct_buyable`; identity notes (SKU A2-AC, not A3) |
| **`07d1281`** | Coway Airmega 250 | `coway-airmega250-rf` — canonical token `COWAY-3109144` (AP-1720-FP); official cowaymega Airmega 250 Max2 PDP `direct_buyable`; compat restricted to **`coway-airmega-250`** / **`250s`** / **`250-graphite`**; **4** wrong-family mappings removed (150/160/240 + `coway-ap-2520f-p-` held) |
| **`2acc8f9`** | GermGuardian FLT4100 | `gg-flt4100` — official Guardian Technologies FLT4100 Filter E PDP `direct_buyable`; notes corrected (Filter E tabletop, not 22″ tower FLT4825); **3** compat rows removed (**`gg-ac4820`** wrong-family Filter B; phantom **`gg-ac4225`** / **`gg-ac4230`**) |
| **`8a840e1`** | Blueair 211 Plus | `blueair-f2-211` — token `BLUEAIR-F2MAX211PAC` → **`BLUEAIR-211PLUS-PAC`**; name/notes corrected (211+ Series Particle+Carbon; not F2MAX / 211i Max); official Blueair 211+ PDP `direct_buyable`; live-browser artifact `ap-model-first-blueair-f2-211-live-browser-v1.results.json`; **4** wrong-family compat rows removed (**`blueair-211-auto`**, **`blueair-121`**, **`blueair-blue-pure-311`**, **`blueair-blue-pure-311-auto`**); **`blueair-211-plus`** kept — re-home deferred |
| **`567a3c5`** | Vornado carbon pad | `vornado-carbon-pad` — official MD1-0023 activated carbon filter PDP `direct_buyable`; name/notes corrected (MD1-0023, not generic “carbon pad”); **1** wrong-family row removed (**`vornado-pc300`**); **`vornado-ac500b`** / **`vornado-ac550w`** held |
| **`2410e51`** | Coway Airmega 400 Max2 | `coway-airmega400-rf` — token `COWAY-AMI400-RF` → **`COWAY-3104756`**; official cowaymega Airmega 400 Max2 PDP `direct_buyable`; **2** wrong-family rows removed (**`coway-airmega-300`** / **`300s`**); **`coway-airmega-400`** / **`400s`** + **`coway-ap-3019f-p-`** kept |
| **`82f8f9e`** | GermGuardian FLT4825 | `gg-flt4825` — official Guardian Technologies FLT4825 Filter B PDP `direct_buyable`; search placeholder abandoned; compat unchanged (**4** models) |

**Evidence-only commits (no CSV apply):**

| Commit | Lane | Verdict |
|--------|------|---------|
| **`b05a405`** | Holmes HAPF30 | **`direct_buyable` REJECT** — official aer1 PDPs Out of Stock + Where To Buy only; artifact `ap-model-first-holmes-hapf30-live-browser-v1.results.json` |
| **`c780e82`** | Renpho RP-AP003 | **NO_SAFE_PATH_FOUND** — no official Renpho filter sale path; model/filter slug collision; artifact `ap-model-first-renpho-rp-ap003-live-browser-v1.results.json` |

**Out of scope in these commits (explicit follow-up):** Filter A / Filter H / Filter S / Filter T Winix compat repair; Shark HE2/HE4/HE6 carbon-foam remainder; C555 → `winix-hepa-115115` wrong-family rows; Coway 300/300S re-home (SKU 3104757); `coway-ap-3019f-p-` verification on 400 filter; Blueair 121 / 211+ Auto / 311 / 311 Auto filter slugs (models unmapped after wrong-family trim); Holmes HAPF30 reference-only lane; Renpho catalog identity / re-home.

### 3. AP buyer-path census (PROVEN — re-run audit before citing)

| Metric | Value |
|--------|------:|
| Safe direct-buyable filters | **29** |
| Weak linked filters | **24** |
| Weak model coverage | **104** |
| Search-placeholder primary (weak) | **21** |
| Guardrails (`buckparts:guardrails:air-purifier`) | **pass** |
| `lint` / `build` | **pass** |
| Weak-buyer-path audit | **pass** |

```bash
npx tsx scripts/report-air-purifier-weak-buyer-path-audit-v1.ts | jq '{
  safe_direct_buyable_filter_count,
  weak_linked_filter_count,
  weak_model_coverage_count,
  search_placeholder_primary_count
}'
npm run buckparts:guardrails:air-purifier
```

### 4. Model-first evidence verdicts (PROVEN — artifacts on `origin/main`)

| `filter_slug` | Verdict | Notes |
|---------------|---------|-------|
| `holmes-hapf30` | **`direct_buyable` REJECT** | Official aer1 PDPs real but OOS + Where To Buy; **20/31** PROVEN_FITS, **11** UNKNOWN compat |
| `renpho-rp-ap003` | **NO_SAFE_PATH_FOUND** | No official filter PDP; `RENPHO-RP-AP003` is purifier model token; slug collision |
| `blueair-particle-411` | **REJECT** | Wrong-family split required (not yet applied) |
| `alen-fl40` | **NO_SAFE_PATH_FOUND_CURRENTLY** | Sold out on checked OEM path |
| `hb-trueair-04384` | **Recoverable candidate** | Token bridge + wrong-family removal — **not yet applied** |

### 5. Remaining high-leverage weak AP filters (PROVEN at handoff refresh)

| `filter_slug` | Weak model coverage | Notes |
|---------------|--------------------:|-------|
| `holmes-hapf30` | **31** | **Runtime Amazon leak closed (`2295ebd`)** — `gated_safe_count=0`; OEM search primary rescue still **`search_placeholder_rescue_needed`** |
| `shark-carbon-foam` | **15** | **15** compat rows remain after HE1 partial re-home; invalid identity / re-home lane |
| `shark-hepa-he1fkbas` | **6** | `likely_valid` OEM PDP (notify/OOS) — not `direct_buyable` |
| `alen-fl40` | **4** | **NO_SAFE_PATH_FOUND_CURRENTLY** (sold out) |
| `renpho-rp-ap003` | **4** | **NO_SAFE_PATH_FOUND** — evidence committed **`c780e82`** |
| `hb-trueair-04384` | **4** | Recoverable token-bridge candidate — not applied |
| `blueair-particle-411` | **3** | **REJECT** — wrong-family split required |

**Recently promoted (no longer weak):** `gg-flt4100` (**`2acc8f9`**), `blueair-f2-211` (**`8a840e1`**), `vornado-carbon-pad` (**`567a3c5`**), `coway-airmega400-rf` (**`2410e51`**), `gg-flt4825` (**`82f8f9e`**).

### 6. Do not do next (at this stopping point)

- Do **not** run **`npm run seed:import:air-purifier`** without explicit owner scope — Supabase parity **UNKNOWN**.
- Do **not** treat AP CSV commits as live-site proof — re-run weak-buyer-path audit + guardrails after pull.
- Do **not** promote **`holmes-hapf30`** to `direct_buyable` without new buyability proof (Amazon demotion **`2295ebd`** closed the Supabase-only leak; OEM rescue is separate).
- Do **not** promote **`renpho-rp-ap003`** to `direct_buyable` without new buyability proof.
- Do **not** expand Shark carbon-foam / Winix follow-up in the same lane without owner-approved apply plan.
- Do **not** reopen **BP-000001**–**BP-000004** without new customer-reality regression evidence.

### 7. Validation (PROVEN before this handoff update)

```bash
npm run lint
npm run build
npx tsx scripts/report-air-purifier-weak-buyer-path-audit-v1.ts
npm run buckparts:guardrails:air-purifier
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

---

## Current stopping point — AP Demand-to-Coverage Selector Alignment (historical — superseded by `c780e82`)

**Superseded for next-move authority.** Retained for selector-alignment proof. **AP CSV Execution Progress** section above is the current executive stopping point.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`a4fcaade451af327e720328dbae874e29fb55ad6`** |
| Latest commit | **`a4fcaad`** — Align air purifier owner review with batch priority queue |
| Prior milestone | **`7d27869`** — Add planning-only opportunity registries |
| Working tree | **Re-verify** — handoff records pushed `origin/main` truth; local uncommitted work may exist |
| Live deploy | **UNKNOWN** — handoff records repo truth only; re-run Command Center locally before citing live numbers |

### 2. Milestone stack (PROVEN)

| Label | Finding |
|-------|---------|
| **PROVEN** | **Opportunity Registry** milestone committed at **`7d27869`**. |
| **PROVEN** | Opportunity registries (`seo_opportunity_registry_v1`, `revenue_opportunity_registry_v1`, `distribution_opportunity_registry_v1`) are **planning-only**, **read-only**, **non-steering**, and **do not override NBA**. |
| **PROVEN** | **BP-000001** through **BP-000004** remain **`CLOSED_PROVEN`**. |
| **PROVEN** | Issue re-audit queue cleared (`total_deployed_awaiting_reaudit: 0`). |
| **PROVEN** | **`demand_to_coverage_next_lane_v1`** remains authoritative for wedge selection. |
| **PROVEN** | **AP selector alignment** committed at **`a4fcaad`** — owner-review candidate rows now project from **`air_purifier_batch_production_lane_v1.top_candidates`**. |

### 3. AP selector alignment — before vs after (`a4fcaad`)

**Before (pre-`a4fcaad`):**

| Label | Finding |
|-------|---------|
| **PROVEN** | `air_purifier_demand_selected_batch_owner_review_v1` selected candidates by **CSV scan order** on `data/air-purifier/retailer_links.csv`. |
| **PROVEN** | Owner-review top rows were **Levoit-heavy** (first blocked slugs in CSV file order). |
| **PROVEN** | **`levoit-rf-rar029`** surfaced in owner-review top 10 while batch-production classified it **`wrong_family_reject`**. |
| **PROVEN** | Owner-review and batch-production slug queues **diverged**. |

**After (`a4fcaad`):**

| Label | Finding |
|-------|---------|
| **PROVEN** | Owner-review **`candidate_rows`** are a **read-only projection** of `air_purifier_batch_production_lane_v1.top_candidates` priority order. |
| **PROVEN** | Actionable states only: `search_placeholder_rescue_needed`, `reference_candidate`, `direct_buy_candidate`, `catalog_identity_gap`. |
| **PROVEN** | Excluded states include `wrong_family_reject`, `existing_direct_buyable`, `existing_official_reference`. |
| **PROVEN** | **`levoit-rf-rar029`** no longer appears in owner-review candidate rows. |
| **PROVEN** | Top actionable priorities now surface **Blueair / Holmes / Shark** correctly (examples below). |
| **PROVEN** | Owner-review lane remains **read-only** and **authorization-focused** (`batch_start_authorized=false`). |
| **PROVEN** | **`air_purifier_batch_production_lane_v1`** remains authoritative for **slug-level rescue ranking** and agent packet grouping. |

**Top owner-review candidate examples (PROVEN at handoff refresh — re-run `jq` before citing):**

| Rank | `filter_slug` | `state` | Notes |
|------|---------------|---------|-------|
| 1 | `blueair-particle-411` | `catalog_identity_gap` | `owner_review_required: true` |
| 2 | `holmes-hapf30` | `search_placeholder_rescue_needed` | — |
| 3 | `winix-carbon-116131` | `search_placeholder_rescue_needed` | — |
| 4 | `shark-carbon-foam` | `search_placeholder_rescue_needed` | — |

**Builder / contract paths:**

| Contract | jq path | Builder |
|----------|---------|---------|
| `air_purifier_demand_selected_batch_owner_review_v1` | `.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1` | `scripts/lib/air-purifier-demand-selected-batch-owner-review-v1.ts` |
| `air_purifier_batch_production_lane_v1` | *(standalone stdout)* | `scripts/lib/air-purifier-batch-production-lane-v1.ts` |
| `demand_to_coverage_next_lane_v1` | `.command_center_v2.demand_to_coverage_next_lane_v1` | `scripts/lib/demand-to-coverage-next-lane-v1.ts` |

```bash
npm run buckparts:command-center | jq '{
  nba: .next_best_action,
  d2c: .command_center_v2.demand_to_coverage_next_lane_v1 | {recommended_wedge, recommendation_status, next_batch_candidate},
  ap_review: .command_center_v2.air_purifier_demand_selected_batch_owner_review_v1 | {
    source_batch_production_report,
    batch_start_authorized,
    blockers,
    top_4: [.candidate_rows[0:4][] | {rank, filter_slug, state, priority_score}]
  }
}'
```

### 4. Current factory truth (PROVEN — re-run before citing)

| Label | Finding |
|-------|---------|
| **PROVEN** | Factory **`next_best_action`** remains **Demand-to-Coverage** (`START_NEW_DEMAND_SELECTED_BATCH`). |
| **PROVEN** | **`recommended_wedge`** remains **`air_purifier`**. |
| **PROVEN** | **Selector alignment complete** — owner-review and batch-production slug priority are aligned. |
| **PROVEN** | **Batch execution not started** — AP demand-selected batch remains blocked. |
| **PROVEN** | AP batch start blockers include **`owner_batch_start_approval_missing`**, **`batch_run_registry_not_created`**, **`evidence_collection_not_started`**. |

**INFERRED at handoff refresh (re-run `jq` before citing):** factory NBA text references refrigerator_water closed lifecycle + air_purifier demand-selected planning; mutation unauthorized on all owner-review authorization flags.

### 5. Owner Operating Audit Lane (DESIGN ONLY — NOT IMPLEMENTED)

| Label | Finding |
|-------|---------|
| **PROVEN** | Design exists in HQ/agent conversation only — **not implemented**, **not committed**, **not authorized**. |
| **PROVEN** | **No** `data/command-center/owner-operating-audit/` registry files exist. |
| **PROVEN** | **No** `.command_center_v2.owner_operating_audit_v1` lane exists in repo today. |

**Proposed contract (design only):** `owner_operating_audit_v1`

**Purpose (design doctrine):**

- Track **owner/founder bottlenecks** with **measurable blockers** (approval delay, SEO weakness, research ops weakness, context switching, distribution/content/research gaps).
- Mirror product-lane discipline: **`read_only`**, **`planning_only`**, **`steering_override_active: false`**, **`replaces_next_best_action: false`**.
- **Never override NBA**; **never become a journal** — records require `measurable_blocker`, `stalled_lane_contract`, and `closure_criteria`.

**Status:** **DESIGN ONLY** — implementation requires explicit founder activation; do not treat as operational truth.

### 6. Do not do next (at this stopping point)

- Do **not** treat **selector alignment** as **batch execution authorization** — `batch_start_authorized=false` until owner approval + run-registry exist.
- Do **not** implement **`owner_operating_audit_v1`** without explicit founder activation.
- Do **not** treat **opportunity registry** records as executable repair work — planning-only; issue registry owns repair closure.
- Do **not** wire opportunity registries or owner-operating-audit design to **`next_best_action`** without explicit precedence rules.
- Do **not** reopen **BP-000001**–**BP-000004** without new customer-reality regression evidence.

### 7. Validation (PROVEN before this handoff update)

```bash
npm run lint
npm run build
node --import tsx --test scripts/lib/air-purifier-demand-selected-batch-owner-review-v1.test.ts
node --import tsx --test scripts/report-air-purifier-batch-production-lane-v1.test.ts
npx tsx --test scripts/report-buckparts-command-center.test.ts --test-name-pattern "air_purifier_demand_selected|demand_to_coverage|next_best_action"
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

---

## Current stopping point — Issue Lifecycle CLOSED_PROVEN Milestone (historical — superseded by `8a840e1`)

**Superseded for next-move authority.** Retained for issue registry closure proof and re-audit doctrine. **AP CSV Execution Progress** section at top is the current executive stopping point.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`4bac7aaf23f62d251cf4b97102d4d2433339ca3c`** |
| Latest commit | **`4bac7aa`** — Issue Registry v1 seeded issues **BP-000001**–**BP-000004** owner-closed **CLOSED_PROVEN** |
| Working tree | **Re-verify** — handoff records pushed `origin/main` truth; local uncommitted work may exist |
| Live deploy | **UNKNOWN** — handoff records repo truth only; re-run Command Center locally before citing live numbers |

**Issue lifecycle milestone (PROVEN):**

| Label | Finding |
|-------|---------|
| **PROVEN** | **Issue Registry v1** is proven through **CLOSED_PROVEN** lifecycle — not just DEPLOYED + re-audit planning. |
| **PROVEN** | Four seeded issues **BP-000001** through **BP-000004** are **`CLOSED_PROVEN`** with owner-approved closure metadata. |
| **PROVEN** | The **full issue lifecycle** loop is proven end-to-end: `DISCOVERED` → `PACKET_READY` → `APPROVED` → `REPAIR_IN_PROGRESS` → `VALIDATED` → `DEPLOYED` → `RE_AUDITED` → **`CLOSED_PROVEN`**. |
| **PROVEN** | **HyperAgent live re-audits** verified customer reality on production routes before owner closure. |
| **PROVEN** | **BP-000001** exposed deploy/customer-reality gap → production **500** fix **`d010d58`** (static import for learned-failure guard bundle). |
| **PROVEN** | **BP-000002**, **BP-000003**, **BP-000004** live re-audited (**PASS**) and owner-closed by Jared (`closure_approved: true`). |
| **PROVEN** | Command Center **`next_best_action`** returns to **demand-to-coverage** steering when **no issue re-audit candidates** remain (`total_deployed_awaiting_reaudit: 0`). |
| **PROVEN** | **`command_center_issue_reaudit_v1`** lane remains read-only — does **not** auto-close from PASS alone; **CLOSED_PROVEN** requires `re_audit_outcome: PASS` + `closure_approved` + `closed_at` + `closure_reason` + non-empty `closure_evidence`. |

**Seeded issue closure summary (PROVEN at handoff refresh):**

| Issue | Title (short) | Closure note |
|-------|---------------|--------------|
| **BP-000001** | Wrong-filter BLOCK customer exposure quarantine | HyperAgent PASS + **`d010d58`** deploy fix; owner-closed |
| **BP-000002** | Filter PDP / search quarantined-model exposure | Live filter + search probes; owner-closed |
| **BP-000003** | GSWF single-filter-family WARN ambiguity | GSWF/GSWF2 caution + search suppression; owner-closed |
| **BP-000004** | Frigidaire confusion-family model-page caution | Frigidaire model-page caution probes + PASS control; owner-closed |

**Issue JSON paths:** `data/command-center/issues/BP-000001.json` … `BP-000004.json`

**Issue lifecycle Command Center lanes (PROVEN — read-only):**

| Contract | jq path | Builder |
|----------|---------|---------|
| `command_center_issue_registry_v1` | `.command_center_v2.command_center_issue_registry_v1` | `scripts/lib/command-center-issue-registry-v1.ts` |
| `command_center_issue_reaudit_v1` | `.command_center_v2.command_center_issue_reaudit_v1` | `scripts/lib/command-center-issue-reaudit-v1.ts` |
| `command_center_issue_closure_v1` | *(eligibility on registry lifecycle audit rows)* | `scripts/lib/command-center-issue-closure-v1.ts` |

**Re-run before citing issue registry or steering:**

```bash
npm run buckparts:command-center | jq '{
  total_open: .command_center_v2.command_center_issue_registry_v1.total_open,
  total_closed: .command_center_v2.command_center_issue_registry_v1.total_closed,
  closed_proven_issue_ids: .command_center_v2.command_center_issue_registry_v1.closed_proven_issue_ids,
  reaudits_awaiting: .command_center_v2.command_center_issue_reaudit_v1.total_deployed_awaiting_reaudit,
  top_reaudit_issue_id: .command_center_v2.command_center_issue_reaudit_v1.top_reaudit_candidate.issue_id,
  next_best_action: .next_best_action
}'
```

**INFERRED at handoff refresh (re-run `jq` before citing):** `total_open: 0`, `total_closed: 4`, `closed_proven_issue_ids: ["BP-000001","BP-000002","BP-000003","BP-000004"]`, `reaudits_awaiting: 0`, `top_reaudit_issue_id: null`, factory NBA steers **demand-to-coverage** (not `ISSUE RE-AUDIT`).

### 2. Customer Reality lanes — retained (PROVEN; superseded for next-move authority)

Customer Reality Command Center lanes (`customer_reality_scoreboard_v1`, `customer_steering_comparison_v1`, `customer_closure_report_v1`, `customer_authority_score_v1`, `customer_authority_history_status_v1`) **remain operational** — see **Current stopping point — Customer Reality Command Center (historical — superseded by `4bac7aa`)** below. Factory NBA may differ from customer dry-run.

### 2.5 Opportunity registries — planning-only scaffold (committed `7d27869`; not production-ready)

**PROVEN:** Opportunity registry milestone committed at **`7d27869`**. Three read-only opportunity registry lanes are wired into Command Center v2:

| Contract | jq path | Data |
|----------|---------|------|
| `seo_opportunity_registry_v1` | `.command_center_v2.seo_opportunity_registry_v1` | `data/command-center/opportunities/seo/` |
| `revenue_opportunity_registry_v1` | `.command_center_v2.revenue_opportunity_registry_v1` | `data/command-center/opportunities/revenue/` |
| `distribution_opportunity_registry_v1` | `.command_center_v2.distribution_opportunity_registry_v1` | `data/command-center/opportunities/distribution/` |

**PROVEN doctrine:**

| Label | Finding |
|-------|---------|
| **PROVEN** | All three lanes are **`read_only`**, **`planning_only`**, **`automation_authorized: false`**, **`steering_override_active: false`**. |
| **PROVEN** | Opportunity registries **do not** steer **`next_best_action`** and **do not** mix with the issue repair lifecycle. |
| **PROVEN** | **`command_center_issue_registry_v1`** remains the **only repair lifecycle tracker** for trust-gate customer-safety work. |
| **PROVEN** | Seeded `SEO-*`, `REV-*`, `DIST-*` JSON records are **starter planning examples**, not production work orders or executable repair tasks. |
| **INFERRED** | Opportunity lifecycle statuses mirror issue statuses for planning vocabulary only — opportunities are **not** CLOSED_PROVEN repair proof. |

```bash
npm run buckparts:command-center | jq '{
  seo: .command_center_v2.seo_opportunity_registry_v1 | {contract, planning_only, total_opportunities, highest: .highest_priority_opportunity.opportunity_id},
  revenue: .command_center_v2.revenue_opportunity_registry_v1 | {contract, planning_only, total_opportunities},
  distribution: .command_center_v2.distribution_opportunity_registry_v1 | {contract, planning_only, total_opportunities}
}'
```

### 3. Do not do next (at this stopping point)

- Do **not** treat **`re_audit_outcome: PASS`** alone as **CLOSED_PROVEN** — owner approval + closure metadata required.
- Do **not** treat **opportunity registry** records as executable repair work — they are **planning-only**; issue registry owns repair closure.
- Do **not** wire opportunity registries to **`next_best_action`** steering without explicit owner activation and precedence rules.
- Do **not** reopen **BP-000001**–**BP-000004** without new customer-reality regression evidence and explicit owner direction.
- Do **not** mutate issue JSON from Command Center lanes (`data_mutation: false` on registry + re-audit lanes).

### 4. Validation (PROVEN before this handoff update)

```bash
npm run lint
npm run build
node --import tsx --test scripts/lib/command-center-issue-closure-v1.test.ts
node --import tsx --test scripts/lib/command-center-issue-lifecycle-audit-v1.test.ts
node --import tsx --test scripts/lib/command-center-issue-registry-v1.test.ts
node --import tsx --test scripts/lib/command-center-issue-reaudit-v1.test.ts
node --import tsx --test scripts/lib/command-center-opportunity-registries-v1.test.ts
npx tsx --test scripts/report-buckparts-command-center.test.ts --test-name-pattern "command_center_issue|opportunity_registry"
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

---

## Current stopping point — Customer Reality Command Center (historical — superseded by `4bac7aa`)

**Superseded for next-move authority.** Retained for Customer Reality lane inventory and authority-history context. **Issue Lifecycle CLOSED_PROVEN** section above is the current executive stopping point.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`4246889ffe043e282b976455de3df7271b5270fe`** |
| Latest commit | **`4246889`** — `Record first customer authority history snapshot` |
| Working tree | **Re-verify** — handoff records pushed `origin/main` truth; local uncommitted work may exist |
| Live deploy | **UNKNOWN** — handoff records repo truth only; re-run Command Center locally before citing live numbers |

**Customer Reality stack on `main` / `origin/main` (PROVEN — newest first):**

| SHA | Subject |
|-----|---------|
| **`4246889`** | Record first customer authority history snapshot |
| **`eb97443`** | Add customer authority history report command |
| **`f0ff0d6`** | Add customer authority history snapshots |
| **`1d12b4b`** | Update HQ handoff for Customer Reality Command Center stopping point |
| **`9245206`** | Add customer authority score lane |
| **`b728d6a`** | Fix partial repo owner dashboard fixture test |
| **`6992f2f`** | Add authority-gated customer reality dashboard section |
| **`190373e`** | Add customer closure report lane |
| **`b50f306`** | Add customer steering comparison lane |
| **`7da5b10`** | Add Customer Reality Scoreboard Slice 1 and unblock production build |
| **`8bd1b40`** | Add customer reality command center architecture and buyer-test docs |

### 2. Customer Reality Command Center lanes (PROVEN — read-only; `replaces_next_best_action: false`)

**Operating truth:** `npm run buckparts:command-center` → `scripts/report-buckparts-command-center.ts` → `command_center_v2` Customer Reality lanes below. Root **`next_best_action`** remains **factory-primary** — Customer Reality does **not** replace NBA yet.

| Slice | Contract | jq path | Builder / test |
|-------|----------|---------|----------------|
| 1 | `customer_reality_scoreboard_v1` | `.command_center_v2.customer_reality_scoreboard_v1` | `scripts/lib/customer-reality-scoreboard-v1.ts` · `customer-reality-scoreboard-v1.test.ts` |
| 2 | `customer_steering_comparison_v1` | `.command_center_v2.customer_steering_comparison_v1` | `scripts/lib/customer-steering-comparison-v1.ts` · `customer-steering-comparison-v1.test.ts` |
| 3 | `customer_closure_report_v1` | `.command_center_v2.customer_closure_report_v1` | `scripts/lib/customer-closure-report-v1.ts` · `customer-closure-report-v1.test.ts` |
| 5a | `customer_authority_score_v1` | `.command_center_v2.customer_authority_score_v1` | `scripts/lib/customer-authority-score-v1.ts` · `customer-authority-score-v1.test.ts` |
| 5b | `customer_authority_history_status_v1` | `.command_center_v2.customer_authority_history_status_v1` | `scripts/lib/customer-authority-history-v1.ts` · `customer-authority-history-v1.test.ts` |
| Gates (shared) | `customer-authority-gates-v1` | *(logic only)* | `scripts/lib/customer-authority-gates-v1.ts` — used by authority score + owner dashboard |

**Append-only authority snapshots (PROVEN — Phase 5b):** `data/command-center/customer-authority-history/YYYY-MM-DD.json` — first snapshot **PROVEN** on disk (`2026-06-10.json` at `4246889`). Write with `npm run buckparts:command-center -- --write-authority-history` or `npm run buckparts:customer-authority-history`.

**Re-run before citing live steering or scores:**

```bash
npm run buckparts:command-center | jq '.command_center_v2.customer_reality_scoreboard_v1.recommended_next_customer_action_dry_run'
npm run buckparts:command-center | jq '.command_center_v2.customer_steering_comparison_v1.comparison'
npm run buckparts:command-center | jq '.command_center_v2.customer_closure_report_v1.customer_visible_closures_count'
npm run buckparts:command-center | jq '.command_center_v2.customer_authority_score_v1'
npm run buckparts:command-center | jq '.command_center_v2.customer_authority_history_status_v1'
npm run buckparts:command-center | jq '.next_best_action'
```

**INFERRED at handoff refresh (re-run `jq` before citing):** point-in-time `customer_authority_score_v1` may show `authority_mode=AUTHORITY_GATED_ACTIVE` when tier-0 trust stop-the-line + `blocks_discovery` gates are PROVEN; numeric `authority_score_100` is a simple v1 composite — **not** a validated Customer Maturity Score.

**PROVEN — Phase 5b retrospective logging:** append-only authority snapshots under `data/command-center/customer-authority-history/`; `customer_authority_history_status_v1` reports `snapshot_count`, `trend_measurable`, `steering_history_logged`.

**PROVEN — Slice 5a point-in-time honesty:** `customer_authority_score_v1.retrospective.trend_measurable=false` until longitudinal outcome proof exists; scoring alone does **not** earn authority.

**UNKNOWN:** `data/command-center/customer-closures/` per-slug closure registry — **not implemented** (distinct from authority history snapshots).

### Issue lifecycle — `command_center_issue_reaudit_v1` (PROVEN — `bf5627c`)

**Purpose:** Read-only re-audit plan for **DEPLOYED** issues awaiting live **RE_AUDITED** proof. Feeds HyperAgent; does **not** mutate issue JSON or mark **CLOSED_PROVEN** without owner proof.

| Item | Value |
|------|-------|
| Contract | `command_center_issue_reaudit_v1` |
| jq path | `.command_center_v2.command_center_issue_reaudit_v1` |
| Builder | `scripts/lib/command-center-issue-reaudit-v1.ts` |
| Steering | `scripts/lib/command-center-issue-reaudit-steering-v1.ts` → `steering_override_source: issue_registry_reaudit` |
| Registry companion | `.command_center_v2.command_center_issue_registry_v1` (repair steering **off** when issues are DEPLOYED) |

**Lifecycle support:** `DEPLOYED` → *(re-audit lane)* → `RE_AUDITED` → `CLOSED_PROVEN` / `STILL_OPEN` / `REGRESSED`. Lane plans bounded probes only; closure requires explicit `re_audit_outcome` + owner-approved JSON update.

**Re-audit candidate selection (PROVEN):** DEPLOYED issues without `re_audit_outcome`; rank **TIER_0** first, then oldest `detected_at`. Current seeded set: **4** candidates (`BP-000001` … `BP-000004`).

**Top candidate (PROVEN at validation):** **`BP-000001`** — Wrong-filter BLOCK customer exposure quarantine (`TIER_0`, oldest).

**Steering behavior (PROVEN):** When no repair-eligible issue exists, root **`next_best_action`** steers to `ISSUE RE-AUDIT: BP-000001 …` with **`next_move_mode: READ_ONLY`**; `close_allowed: false` on all candidates; `data_mutation: false`, `mutation_authorized: false`.

**Validation at implementation (PROVEN):** `153/153` Command Center integration tests; issue registry + lifecycle audit unit tests; `npm run lint` + `npm run build` passing.

```bash
npm run buckparts:command-center | jq '{
  issue_reaudit_candidate_count: .command_center_v2.command_center_issue_reaudit_v1.total_deployed_awaiting_reaudit,
  top_reaudit_issue_id: .command_center_v2.command_center_issue_reaudit_v1.top_reaudit_candidate.issue_id,
  next_best_action: .next_best_action,
  steering_mode: .command_center_v2.customer_steering_comparison_v1.factory_steering.steering_override_source
}'
```

### 3. Owner Dashboard — authority-gated Customer Reality UI (PROVEN — Slice 4)

**PROVEN:** `/ownerdashboard/[secret]` renders a collapsible **Customer Reality · authority-gated visibility** section after Founder Control Plane — visibility-only by default; claims steering authority only when gates are PROVEN.

| File | Role |
|------|------|
| `src/app/ownerdashboard/[secret]/page.tsx` | `CustomerRealityAuthorityGatedSection` UI |
| `src/lib/owner-dashboard/customer-reality-authority-gated-v1.ts` | `buildCustomerRealityAuthorityGatedModelV1` (imports shared gates from `scripts/lib/customer-authority-gates-v1.ts`) |
| `src/lib/owner-dashboard/customer-reality-authority-gated-v1.test.ts` | Gate + model unit tests |
| `src/lib/owner-dashboard/load-command-center-report.test.ts` | Partial-repo fixture test fix (`b728d6a`) |

**PROVEN:** Dashboard shows `dry_run_only` and `replaces_next_best_action=false`; factory `next_best_action` stays primary unless authority gates are PROVEN on the snapshot.

### 4. Architecture + buyer-test docs (PROVEN)

| Artifact | Path |
|----------|------|
| Customer Reality architecture spec | `docs/command-center/BuckParts-COMMAND-CENTER-CUSTOMER-REALITY-ARCHITECTURE-V1.md` |
| Catalog contamination 7-day buyer test | `docs/business-development/catalog-contamination-audit/BUCKPARTS-CATALOG-CONTAMINATION-AUDIT-7-DAY-BUYER-TEST.md` |
| GSWF sample contamination audit | `docs/business-development/catalog-contamination-audit/GSWF-SAMPLE-CATALOG-CONTAMINATION-AUDIT.md` |
| Audit #2 exports (supporting) | `audit-exports/` (`buckparts-audit-2-business-report.md`, CSVs) |

### 5. Strategic initiatives + long-term capability map (PARKED — not authorized)

**PROVEN registry:** `docs/strategic-initiatives/BP-STRATEGIC-INITIATIVES-REGISTRY.md` (BP-SI-001 – BP-SI-008). All **PARKED**; none authorize work without explicit founder activation.

| Theme | Registry / handoff status |
|-------|---------------------------|
| **BuckResearch / BuckParts-specific research agent** | **PROVEN** as BP-SI-001 — specialized replacement-part research using BuckParts verification rubric, evidence contracts, OEM/retailer source rules, wrong-part-prevention doctrine; intended to reduce HyperAgent dependency over time |
| Failure database | BP-SI-002 |
| Visual repair / scanner AI | BP-SI-003 + BP-SI-007 (BuckParts Scanner) |
| Digital twin of the house | BP-SI-004 |
| Homeowner memory system | BP-SI-005 |
| Home repair agent / operating system | BP-SI-008 (capstone) |
| Failure prediction network | BP-SI-006 |
| **Catalog contamination audit / buyer test** | **PROVEN** docs in `docs/business-development/catalog-contamination-audit/` — commercial validation lane, not runtime |
| **Fitment truth graph / negative wrongness corpus** | **INFERRED** strategic direction — not a separate registry ID yet; aligns with control-graph mapping audits + wrong-part doctrine |
| **Compatibility infrastructure / institutional truth layer** | **INFERRED** — Mission Factory + evidence lanes + certainty checklist as partial foundation; full institutional layer **UNKNOWN** |

### 6. Current doctrine (PROVEN policy — not yet NBA replacement)

1. **Do not force Customer Reality to the top by UI opinion alone.** Slice 4 is authority-**gated** visibility — not hierarchy override.
2. **Customer Reality must earn authority** through gates, closure proof, `customer_authority_score_v1`, and (future) longitudinal outcome evidence.
3. **Factory `next_best_action` remains unchanged** until retrospective proof supports replacement (`replaces_next_best_action: false` on all Customer Reality lanes).
4. **HyperAgent `DISCOVERY_COMPLETE` is not customer-visible closure.** Use `customer_closure_report_v1` proof chain (closeout + census + mission PROMOTED).

### 7. Next correct lane (INFERRED — founder-approved sequencing)

**Do not replace NBA yet.**

**PROVEN — Phase 5b complete (`4246889`):** append-only authority snapshots capture customer steering, factory NBA, closure counts, coverage, and wrong-part exposure at snapshot time.

**Next likely work — Phase 5c authority outcomes / calibration (INFERRED — build only if it answers “were we right?”):**
- Compare historical authority snapshots to **later** customer-visible outcomes (`customer_closure_report_v1`, scoreboard, steering)
- Lane contract target: `customer_authority_outcomes_v1` — verdict only when **≥2 snapshots** and PROVEN closure link to `closure_target_slug`
- **Do not** add CC lanes for dashboard surface area; outcomes must calibrate whether Customer Steering beat Factory NBA
- Only then consider architecture-spec Slice 5 NBA replacement

**UNKNOWN:** schedule/cadence for daily `--write-authority-history` and `buckparts:command-surface:snapshot` — blueprint recommends daily archive; **not enforced in repo**.

### 8. Factory control plane — retained context (PROVEN; superseded for next-move)

Command Center control graph, frozen Frigidaire families, EDR4RXD1 bounded evidence, and HyperAgent dispatch lanes **remain operational** — see **Current stopping point — Command Center control graph + EDR4RXD1 bounded evidence research (historical — superseded by `4246889`)** below. Factory NBA and control-graph NBA may **differ** from customer dry-run (`customer_steering_comparison_v1.comparison.conflicts_with_next_best_action`).

### 9. Do not do next (at this stopping point)

- Do **not** promote `recommended_next_customer_action_dry_run` to replace root `next_best_action` — longitudinal outcome verdict **not PROVEN** yet (`customer_authority_outcomes_v1` requires ≥2 snapshots + closure proof).
- Do **not** build **recall**, **warranty-claim**, medical, legal, or insurance wedges — second-wedge candidates are **INFERRED / NOT APPROVED FOR BUILD** (strategy only).
- Do **not** claim **VC readiness**, second-wedge approval, or recall product existence.
- Do **not** treat `customer_authority_score_v1` as Customer Maturity Score or deploy-gating score — v1 composite is point-in-time only; authority is earned by **prediction**, not score.
- Do **not** mutate product data, CSVs, Supabase, evidence, retailer links, sitemap/robots, or pages from Customer Reality lanes (all `data_mutation: false`).
- Do **not** scale **`filter::whirlpool::edr4rxd1`** as a full family or unfreeze **`filter::frigidaire::eptwfu01`** / **`fppwfu01`** without owner proof (factory control plane guardrails still apply).

### 10. Validation (PROVEN before this handoff update)

```bash
npm run lint
npm run build
npx tsx --test scripts/report-buckparts-command-center.test.ts
npx tsx --test src/lib/owner-dashboard/load-command-center-report.test.ts
npx tsx --test scripts/lib/customer-authority-score-v1.test.ts
npx tsx --test scripts/lib/customer-authority-history-v1.test.ts
npx tsx --test src/lib/owner-dashboard/customer-reality-authority-gated-v1.test.ts
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

---

## Current stopping point — Command Center control graph + EDR4RXD1 bounded evidence research (historical — superseded by `4246889`)

**Superseded for next-move authority.** Retained for factory control-plane / HyperAgent / frozen-family context. Customer Reality lanes above are the current executive stopping point.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`21995787ec62106ed8431f4fcc419ad085649720`** |
| Latest commit | **`2199578`** — `Add EDR4RXD1 owner review packet` |
| Working tree | **Clean** at handoff refresh (`git status --short` empty) |

**Recent control-plane commits on `main` / `origin/main` (PROVEN at `2199578` checkpoint):**

| SHA | Subject |
|-----|---------|
| **`2199578`** | Add EDR4RXD1 owner review packet |
| **`8ae438f`** | Tighten command center evidence action semantics |
| **`0f463b6`** | Add EDR4RXD1 HyperAgent validation packet |
| **`4c043b9`** | Add read-only family reconciliation lane |
| **`2d5c2ab`** | Wire family pre-research screen into command center |
| **`5b12e1b`** | Add family pre-research risk screen |
| **`2e9f6d3`** | Add Frigidaire FPPWFU01 contamination guard |
| **`8ba2115`** | Add command center control graph rollup |
| **`820d5dd`** | Add calibrated anchor integrity audit |
| **`70b2efb`** | Export per-slug learned failure guard impact |
| **`2e2f022`** | Add read-only evidence leverage prioritization |

### 2. Command Center control graph rollup (PROVEN)

**Operating truth:** `npm run buckparts:command-center` → `command_center_v2.command_center_control_graph_rollup_v1` (`command_center_control_graph_rollup_v1`, `read_only`, `data_mutation: false`).

**Connected read-only lanes (repo truth only — no mutation authorized):**

| Lane | npm alias | Contract / artifact |
|------|-----------|---------------------|
| Control graph rollup | `buckparts:command-center` | `command_center_control_graph_rollup_v1` |
| Anchor integrity audit (calibrated) | `buckparts:anchor-integrity-audit` | `anchor_integrity_audit_v1` → `data/fridge/batch-production/audits/anchor-integrity-audit-v1.json` |
| Learned failure guards (+ EPTWFU01/FPPWFU01 contamination) | `buckparts:learned-failure-guards` | `learned_failure_guards_v1` |
| Evidence leverage (+ contamination penalty) | `buckparts:evidence-leverage-prioritization` | live build in rollup |
| Family pre-research risk screen | `buckparts:family-pre-research-risk-screen` | pre-research screen before HyperAgent |
| Family reconciliation | `buckparts:family-reconciliation` | `family_reconciliation_v1` |
| EDR4RXD1 Cursor validation | *(read draft)* | `buckparts_cursor_validation_packet_v1` → `data/fridge/batch-production/drafts/edr4rxd1-evidence-batch-cursor-validation-v1.json` |
| EDR4RXD1 owner review packet | `buckparts:edr4rxd1-owner-review-packet` | `edr4rxd1_owner_review_packet_v1` |

**Re-run before citing live steering:**

```bash
npm run buckparts:command-center | jq '.command_center_v2.command_center_control_graph_rollup_v1.next_best_action'
npm run buckparts:edr4rxd1-owner-review-packet
```

### 3. Frozen Frigidaire families (PROVEN — Command Center `FREEZE` tier)

| Family | Freeze reason (repo truth) |
|--------|----------------------------|
| **`filter::frigidaire::eptwfu01`** | Anchor integrity **sibling-family conflict** on primary anchor (`frigidaire-fghb2868pf`, `frigidaire-fgsc2335tf`) — clone expansion frozen until resolved |
| **`filter::frigidaire::fppwfu01`** | **Prefix contamination / zero proven anchor** — evidence scaling frozen until prefix/sibling contamination resolved |

### 4. WF2CB pre-research block (PROVEN)

**PROVEN:** `filter::frigidaire::wf2cb` is **blocked from full-family HyperAgent dispatch** — pre-research risk screen **HIGH** / `NEEDS_REPO_RECONCILIATION_FIRST`.

**PROVEN:** Command Center allows only an **optional 5-slug conflict-free research slice** (`frigidaire-cfse2333tb`, `frigidaire-ffhb2860ts`, `frigidaire-fgsc2345tf`, `frigidaire-fpru19f8re`, `frigidaire-frfs2623as`) — **not full-family scaling**.

### 5. EDR4RXD1 — bounded evidence research only (PROVEN)

**PROVEN:** `filter::whirlpool::edr4rxd1` is **`BOUNDED_EVIDENCE_RESEARCH` only** — **not safe for scaling**.

| Field | Value |
|-------|-------|
| `safety_tier` | **`BOUNDED_EVIDENCE_RESEARCH`** (not `SAFE_EVIDENCE`) |
| `safe_for_scaling` | **`false`** |
| `safe_for_bounded_research` | **`true`** |
| `recommended_action_scope` | **`BOUNDED_RESEARCH_ONLY`** |
| `requires_owner_review_before_mutation` | **`true`** |
| `family_reconciliation_severity` | **`MEDIUM`** |
| HyperAgent batch validation | **`VALIDATION_PARTIAL`** (`edr4rxd1-evidence-batch-cursor-validation-v1.json`) |

**PROVEN:** Command Center `next_best_action` ends with bounded research language for EDR4RXD1 — **not full-family scaling**, **no compat mutation**, **no evidence promotion without owner-reviewed manual evidence**; family reconciliation remains **MEDIUM**; HyperAgent validation **partial**.

**Do not read `BOUNDED_EVIDENCE_RESEARCH` as permission to scale the full edr4rxd1 unlock cohort.**

### 6. EDR4RXD1 owner review packet (PROVEN)

**PROVEN:** Read-only owner review packet exists: `edr4rxd1_owner_review_packet_v1`.

**Draft artifacts (optional `--write-artifacts`):**
- `data/fridge/batch-production/drafts/edr4rxd1-owner-review-packet-v1.json`
- `data/fridge/batch-production/drafts/edr4rxd1-owner-review-packet-v1.md`

**Owner action buckets (repo truth from validation + packet):**

| Bucket | Slugs |
|--------|-------|
| **Evidence promotion candidate** (existing PROVEN_CORRECT only) | `whirlpool-wrf540cwhz` |
| **Browser proof targets** | `whirlpool-wrf535sdhz`, `whirlpool-wrf540cwhm` |
| **Compat review candidates** | `whirlpool-wrf535smhb`, `whirlpool-wrf736sdam`, `whirlpool-wrf757sdfz`, `whirlpool-wrf757sihz`, `whirlpool-wrf767sdam`, `whirlpool-wrs315sdhv` |
| **No-action rows** | 8 HyperAgent closure claims rejected for automatic repo truth closure (see packet JSON) |

**INFERRED:** `whirlpool-wrf535sibz` appears in family-reconciliation owner context but is **absent** from the HyperAgent validation batch — **not** a browser-proof target in the EDR4RXD1 owner review packet.

### 7. Mutation guardrails (PROVEN)

**PROVEN:** All lanes above are **read-only**. **`mutation_authorized=false`** on control graph rollup, validation packet, and owner review packet.

**Not authorized without explicit owner approval:**
- `data/compatibility_mappings.csv` edits
- `data/manual-evidence/**` writes
- Supabase mutations
- sitemap / robots / public page changes
- `data/retailer_links.csv` / buyer-path changes
- HQ handoff does **not** authorize apply work by itself

**HyperAgent `DISCOVERY_COMPLETE` is not repo truth closure.** Command Center completion requires repo validation (`buckparts_cursor_validation_packet_v1`).

### 8. Do not do next (at this stopping point)

- Do **not** scale **`filter::whirlpool::edr4rxd1`** as a full family — Command Center explicitly forbids full-family scaling.
- Do **not** auto-apply HyperAgent WRONG_PART_RISK compat removals — repo `wrong_part_risk_count=0` for the batch slugs.
- Do **not** unfreeze **`filter::frigidaire::eptwfu01`** or **`filter::frigidaire::fppwfu01`** without anchor/contamination owner proof.
- Do **not** dispatch full-family HyperAgent on **`filter::frigidaire::wf2cb`** — optional 5-slug slice only.
- Do **not** treat **`VALIDATION_PARTIAL`** or owner review packet buckets as mutation authorization.

### 9. Validation (PROVEN before this handoff update)

```bash
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
node --import tsx --test scripts/lib/command-center-control-graph-rollup-v1.test.ts
node --import tsx --test scripts/lib/edr4rxd1-owner-review-packet-v1.test.ts
npm run buckparts:command-center | jq '.command_center_v2.command_center_control_graph_rollup_v1.next_best_action'
npm run buckparts:edr4rxd1-owner-review-packet
npm run lint
```

---

## Current stopping point — Page Factory preflight v1 (historical — superseded by `2199578`)

**Superseded for next-move authority.** Retained for RF28R7351SR / preflight context only.

### 1. Current repo state (PROVEN — re-verify before citing)

| Item | Value |
|------|-------|
| Branch | **`main`** |
| HEAD / `origin/main` at handoff refresh | **`9116a742a9aaa7680d924ebc3566c30da16eff84`** |
| Latest commit | **`9116a74`** — `Add read-only page factory preflight v1` |
| Working tree | **Clean** at handoff refresh |

### 2. Page Factory preflight v0.1 (PROVEN)

**PROVEN:** Read-only Page Factory preflight v0.1 is implemented. The tool reports gate status from repo truth only; it does **not** authorize mutation.

**New files:**
- `data/fridge/batch-production/page-factory-targets-v1.csv`
- `scripts/lib/buckparts-page-factory-preflight-v1.ts`
- `scripts/report-buckparts-page-factory-preflight-v1.ts`
- `scripts/lib/buckparts-page-factory-preflight-v1.test.ts`

**`package.json` npm alias:**
- `buckparts:page-factory-preflight` → `tsx scripts/report-buckparts-page-factory-preflight-v1.ts`

**Validated:**
- `node --import tsx --test scripts/lib/buckparts-page-factory-preflight-v1.test.ts`
- `npm run buckparts:page-factory-preflight -- --fridge-slug samsung-rf28r7351sr`
- `npm run lint`

**First registry target:** `samsung-rf28r7351sr` → expected filter `da97-17376b`; forbidden `da29-00020b`, `da29-00012b`; official marketing token `HAF-QIN`.

**v0.1 UNKNOWN gates (not evaluated or not implemented yet):**
- `supabase_compat_parity` — UNKNOWN unless `--check-supabase` is passed
- `local_page_proof` — UNKNOWN unless `--base-url` is passed (curl proof not implemented in v0.1)
- `live_page_proof` — UNKNOWN unless `--live-base-url` is passed (curl proof not implemented in v0.1)

**Observed WARN (not a mutation blocker):** `retailer_link_csv_gates_observed` is **WARN** for `da97-17376b` because CSV primary is `search_placeholder` and has no `direct_buyable` row.

**Mutation guardrails:** `mutation_authorized=false` and `mutation_blocked_until_owner_approval=true` on every report. Passing preflight does **not** authorize CSV, Supabase, quarantine, buyer-path, or `/go` changes.

### 3. Next operating lane (INFERRED)

**Recommended next:** extend preflight v0.1 with `--check-supabase` compat parity proof, local/live curl proof, and the next Page Factory target row — only after owner approval for any apply lane.

**Do not start the next model page as raw mutation until preflight reports `READY_FOR_OWNER_REVIEW` on repo gates and owner explicitly approves apply work.**

---

## Current stopping point — SEO Phase 1 + RF28R7351SR Page Factory v1 (PROVEN through `a070797`)

**Historical context** — retained for RF28R7351SR lane proof and seed/import lessons.

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

**Evidence timestamp:** Re-run `npm run buckparts:command-center`, census, and the three production directors (`buckparts:owner-browser-proof-refresh-director`, `buckparts:edr3rxd1-ultrawf-evidence-readiness-director`, `buckparts:hyperagent-safe-link-evidence-production-director`) before trusting live numbers. **Security/repo checkpoint (HEAD / origin main / Netlify production):** **`e19ebbd`** — see **§ Current stopping point — Security / RLS / service-role gating** at top. **Coverage checkpoint (historical `56b4167`):** site **`SAFE_BUYER_PATH_PROVEN=50`**; **`4396508`** proven; refrigerator_water **C3 FAIL** (`buyer_path_truth_status=MIXED`); factory NBA = **Session 1 owner browser proof refresh (`edr3rxd1`, `ultrawf`)** — treat as **UNKNOWN** until re-run. **Prior checkpoints** remain documented below — treat as historical unless re-validated.

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

8. When an action is to be taken, **end the message** with the next-best **exact copy/paste prompt or command** — not prose-only next steps. Identify the **surface** when relevant: **Terminal**, **Cursor**, **HyperAgent**, **Supabase SQL**, **Browser**, etc.

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

1. **BuckParts is not ecommerce and not an affiliate site.** It is a **truth-first homeowner-help / wrong-part-prevention system** — primary near-term model is **ad-supported trusted search-intent utility / answer engine**; not a parts catalog or affiliate storefront.
2. **Affiliate links are secondary and gated** — overhead support only; revenue does not override fit evidence or buyer-path gates.
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

## Current stopping point / chat migration state (historical — superseded by `4bac7aa`)

**Superseded:** Use **Current stopping point — Issue Lifecycle CLOSED_PROVEN Milestone (through `4bac7aa`)** at the top of this file first. This block retains **fridge spine / batch / Command Center** context from **`7b09529`** — still valid read-only inventory, not the latest HEAD or next-move authority.

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

**At stopping point `3189b9b` (re-run named reports before trusting):**

1. **AP demand-selected correctness** — owner-resolve **BP-000005** (Vornado identity split) and **BP-000006** (Renpho collision); canonical evidence decision; Command Center NBA already steers to this phase via **`demand_selected_correctness_risks`**; **not** more read-only discovery.
2. **Holmes / Production Truth AP** — recurring `npm run buckparts:production-truth:ap`; OEM search-primary rescue only when owner-scoped.
3. **AP convergence / parity** — close remaining CSV↔Supabase safe-CTA drift where owner approves apply scope.
4. **Fridge (unchanged spine truth):** do **not** redo fridge products from scratch; CSV backfill **plan only** until founder approval.
5. **Save credits:** focused tests unless production/public route changes require **`npm run build`**.

**Historical priority at `aec8b8c` (superseded):**

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
- **Demand-to-coverage next lane (`841980c`+; reconciled at `296dc32`; steering demoted at `3189b9b` when correctness blocks):** Command Center v2 includes read-only `command_center_v2.demand_to_coverage_next_lane_v1`. When AP demand-selected registry is **PROVEN_OPEN** with **`evidence_collection_started=true`**, **`open_batch_not_proven`** is cleared; **`open_batch_proof_v1`** distinguishes open batch existence (**PROVEN**) from closeout and apply readiness (**NOT_PROVEN**). Wedge selection remains authoritative; root NBA may be demoted by **`demand_selected_correctness_risks`** steering when **BP-000005** / **BP-000006** block progression. **Does not** authorize batch start, CSV apply, or evidence writes.
- **AP demand-selected owner review (`a4fcaad`+; reconciled at `296dc32`):** Command Center v2 includes read-only `command_center_v2.air_purifier_demand_selected_batch_owner_review_v1`. **`candidate_rows`** project from **`air_purifier_batch_production_lane_v1.top_candidates`**. **`batch_start_authorized=false`**; when discovery complete, blockers may be **`[]`** while mutation flags remain false.
- **AP demand-selected correctness risks (`1a2140a`+; steered at `3189b9b`):** Command Center v2 includes read-only `command_center_v2.air_purifier_demand_selected_correctness_risks_v1`; **BP-000005** and **BP-000006** are TIER_1 **`PACKET_READY`**. When blocking verdicts remain and open batch existence is **PROVEN**, **`resolveDemandSelectedCorrectnessRisksSteeringOverrideV1`** sets **`steering_override_source=demand_selected_correctness_risks`** and root NBA **`CORRECTNESS_RISKS [CORRECTNESS_RESOLUTION_REQUIRED]`**.
- **RPWFE purchase-option rescue owner review (local):** Command Center v2 now includes read-only `command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1` for `/filter/rpwfe`, where the customer-visible state is `no_buy_options` because the committed GE catalog search row is blocked as a search placeholder. The lane records the GE spec PDP path as repo-doc proven but not applied, Waterdrop `WD-F19C` as an unproven compatible-replacement candidate, and keeps `official_label_authorized=false`, `compatible_label_authorized=false`, `csv_apply_authorized=false`, `supabase_mutation_authorized=false`, `evidence_write_authorized=false`, `public_ui_mutation_authorized=false`, and `netlify_api_authorized=false`. No buy CTA is authorized.
- **BuckParts Certainty Engine Checklist (local):** Command Center v2 now includes read-only `command_center_v2.buckparts_certainty_engine_checklist_v1` — a north-star judge lane (not mutation authority) asking whether homeowners would feel less certain buying a replacement filter without checking BuckParts first. **Stable top-level jq fields:** `branded_term` = BuckParts Verified Link, `branded_term_definition`, `ai_vs_buckparts_positioning` = “AI can suggest. BuckParts verifies.” (with explanation that BuckParts beats generic AI only when evidence and verified buying paths exist — not when it guesses). Checklist adds **Visual Match Proof / Picture Match Check** and **label/photo/screenshot upload** (model sticker, filter label, Amazon/retailer screenshots, appliance tag) as major future trust features (**NOT_PROVEN** until live). Checklist item #1 stays **NOT_PROVEN**/**BLOCKED** until 100% fridge verified-link coverage. All authorization flags false. Inspect: `node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.buckparts_certainty_engine_checklist_v1 | {branded_term, branded_term_definition, ai_vs_buckparts_positioning, checklist_item_count, first_checklist_item: .checklist_items[0]}'`.
- **Fridge money queues vs spine:** `top_money_queue` may still surface refrigerator monetization lanes; **`fridge_truth_spine_v1`** is the **truth inventory** lane (buyer-path + Supabase-vs-CSV + public-truth summary). **`next_best_action`** may remain **AP model-first steering** when evidence queue is READY — spine does **not** override.
- **Runner Step live JSON is not Command Center-owned by default** — `npm run buckparts:runner-step` is CLI/CI; optional digest env `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` only.
- **Daily Operator status is not Command Center-owned** — `npm run buckparts:daily` is a separate `buckparts_daily_operator_v1` report (builds on Command Center internally but not merged into CC JSON).
- **Founder Digest status is not Command Center-owned** — `npm run buckparts:founder-digest` is Markdown stdout; slices Command Center but is a separate surface.

### Operator rules (do not regress)

**HQ / agent chat behavior (required):** When BuckParts work requires Jared to take an action, the assistant must **end the message** with **execution surface** + **exact copy/paste prompt or command**. See **HQ operating rule (execution mode)** at top of this doc for exceptions (`UNKNOWN`, explanation-only, explicit no-prompt).

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

**Foundation Completion Rule:** When a major v1 foundation ships (Runner, Coverage Sprint tooling, Owner Decision Queue, etc.), update this HQ Handoff with completed vs deferred scope **before** starting the next foundation. See **Current stopping point — Foundation v1 stack COMPLETE**.

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
- when an action is to be taken, end the message with the next-best exact copy/paste prompt or command, naming the surface when relevant (Terminal, Cursor, HyperAgent, Supabase SQL, Browser, etc.);
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
Read docs/BuckParts-HQ-HANDOFF.md (especially **Current stopping point — Owner browser proof refresh + guarded apply exhaustion (`56b4167`)**, **Do not do next**, and docs/BuckParts-TRUTH-MAP.md), then re-run npm run buckparts:owner-browser-proof-refresh-director and npm run buckparts:edr3rxd1-ultrawf-evidence-readiness-director; propose Session 1 owner browser proof refresh checklist with exact Browser/Terminal steps. Do not mutate CSV/evidence/apply unless Jared explicitly authorizes.
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

**Positioning:** BuckParts is **not** a parts catalog page or an affiliate site. **Wedge:** home replacement fit lookup / trusted consumer utility. **Engine:** decision authority under uncertainty (permission-to-act under incomplete evidence). Primary near-term model: **ad-supported search-intent utility**; affiliates secondary and gated.

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
