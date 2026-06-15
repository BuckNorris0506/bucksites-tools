# AP Medify MA-series — evidence-write owner review v1

## Six-slug direct_buyable cohort

**Report type:** read-only owner decision support — **canonical evidence write authorization only**  
**Generated:** 2026-06-13  
**Repo checkpoint:** `1d798ad`  
**Scope:** **six** filter slugs only — `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`  
**Truth source:** Medify cohort discovery deliverable, validator fixture, mechanical validation (2026-06-13)

**Prior discovery:** `ap-medify-ma-series-cohort-discovery-7-slugs-consolidated-deliverable.md` (operator session; 6/7 `direct_buyable`, 1 `NEEDS_OWNER_REVIEW` for `medify-ma35-rf`)

**Mechanical validation:** `VALIDATION_PASS` — 68/68 checks, 0 failures

**Fixture:** `data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-medify-cohort-v1.json`

**Evidence write executed:** **No** — awaiting owner decision below.

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Six-slug discovery → `PASS_DIRECT_BUYABLE` | Yes — all six in fixture | **PROVEN** (deliverable + fixture) |
| Mechanical validation | `VALIDATION_PASS` | **PROVEN** |
| `medify-ma35-rf` excluded | Slug-binding unresolved | **PROVEN** (explicit exclusion) |
| Amazon secondary rows excluded | Out of scope | **PROVEN** |
| Committed CSV still search-placeholder / empty `browser_truth_*` | No safe CTA yet | **PROVEN** |
| Current `safe_cta_count` | 15 | **PROVEN** (truth spine at `1d798ad`) |
| Expected delta after full factory (+6) | 15 → 21 | **INFERRED** |
| Any mutation performed by this packet | **None** | **PROVEN** |

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to write **canonical** `air_purifier_agent_evidence_result_v1` rows for **six slugs** | CSV apply, apply-plan execution, or executor `--apply` |
| Bounded authorization for evidence classification on **primary `oem-catalog`** rows only | Amazon `browser_truth` promotion or primary flip |
| Docs-only until owner records Option A, B, or C in chat | Supabase seed/SQL, deploy, or `data/owner-decisions/` row creation |
| Gate after `VALIDATION_PASS` mechanical checks | Authorization for `medify-ma35-rf` until slug-binding resolved |

**PROVEN:** No production, app, CSV, Supabase, canonical evidence-file, or deploy mutation occurs from this document alone.

---

## Owner decision box

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE CANONICAL EVIDENCE WRITE (ALL SIX)                      │
│                                                                             │
│  I authorize canonical evidence write for all six direct_buyable Medify     │
│  slugs: medify-ma18-rf, medify-ma22-rf, medify-ma25-rf, medify-ma40-rf,    │
│  medify-ma50-rf, medify-ma112-rf per §2.                                    │
│                                                                             │
│  I do NOT authorize: medify-ma35-rf, Amazon rows, CSV apply, Supabase,     │
│  deploy, or other slugs.                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — APPROVE NAMED SUBSET ONLY                                       │
│                                                                             │
│  I authorize canonical evidence write only for these slugs (list in chat):  │
│  _______________________________________________                            │
│                                                                             │
│  All non-listed cohort slugs remain on hold.                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — HOLD                                                            │
│                                                                             │
│  I do not authorize canonical evidence write for the Medify MA-series        │
│  cohort at this time.                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Mechanical validation result (PROVEN)

**Command:**

```bash
node --import tsx scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts \
  --packet=data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-medify-cohort-v1.json \
  --scope=medify-ma18-rf,medify-ma22-rf,medify-ma25-rf,medify-ma40-rf,medify-ma50-rf,medify-ma112-rf
```

| Field | Value |
|-------|-------|
| `validation_status` | **`VALIDATION_PASS`** |
| `mechanical_checks_passed_count` | **68** |
| `mechanical_checks_failed_count` | **0** |
| `approved_scope_slugs` | 6 cohort slugs (matches packet) |
| `not_canonical_evidence` | `true` |
| `not_apply_eligible` | `true` |

**Judgment required (non-blocking):** Reconcile legacy `ap-amazon-secondary-v1` evidence for `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf` (`hold_needs_owner_review` in evidence index) when writing new OEM-primary evidence — new rows should supersede Amazon-secondary path for primary `oem-catalog` promotion only.

---

## 2. Per-slug proof table (discovery deliverable → fixture)

**Method:** Medify collections/filters enumeration + Shopify sitemap pin; live PDP verification; site search **not** trusted for classification.

| Slug | Official PDP (`final_url`) | Consumer token (primary) | Cart / stock | Price | Wrong-family (primary) |
|------|----------------------------|--------------------------|--------------|-------|------------------------|
| `medify-ma18-rf` | `https://medifyair.com/products/ma-18-replacement-filter` | MA-18 | cart ✓ / in_stock | $39.99 | none |
| `medify-ma22-rf` | `https://medifyair.com/products/ma-22-replacement-filter` | MA-22 | cart ✓ / in_stock | $45.99 | none |
| `medify-ma25-rf` | `https://medifyair.com/products/ma-25-replacement-filter-set` | MA-25 | cart ✓ / in_stock | $49.99 | none |
| `medify-ma40-rf` | `https://medifyair.com/products/ma-40-replacement-filter-set` | MA-40 | cart ✓ / in_stock | $59.99 | none |
| `medify-ma50-rf` | `https://medifyair.com/products/ma-50-replacement-filter` | MA-50 | cart ✓ / in_stock | $69.99 | none in buy box |
| `medify-ma112-rf` | `https://medifyair.com/products/ma-112-filter-replacement-set` | MA-112 | cart ✓ / in_stock | $138.99 | none |

**Committed CSV `before_row` (all six):** primary `oem-catalog` search placeholder (`https://medifyair.com/search?q=MEDIFY-MA-*-RF`), empty `browser_truth_*`.

**CRITICAL — exact URL rule:** Medify PDP path suffixes vary per model (`-replacement-filter`, `-replacement-filter-set`, `filter-replacement-set`). Apply and evidence write must use **Table A URLs exactly** — do not template from slug.

---

## 3. Exact evidence-write authorization boundaries

### Allowed (only if Option A or named slugs in Option B)

- Write or update **canonical** `air_purifier_agent_evidence_result_v1` rows for authorized slugs only
- Target: **primary `oem-catalog`** row per slug in `data/air-purifier/retailer_links.csv`
- Evidence fields per fixture / deliverable:
  - `decision`: `PASS_DIRECT_BUYABLE`
  - `final_url`: official PDP in §2 (exact paths)
  - `browser_truth_classification`: `direct_buyable`
  - `buy_action_seen`: `true`
  - `wrong_family_tokens_seen`: `[]`
  - `owner_review_required`: `false`
  - `exact_tokens_seen`: consumer MA-series tokens (e.g. `MA-25`, not only `MEDIFY-MA-25-RF`)
- Suggested packet id: `ap-medify-ma-series-cohort-v1`
- Suggested results path: `data/air-purifier/batch-production/agent-results/ap-medify-ma-series-cohort-v1.results.json` (and batch-v2 mirror if repo convention requires)

### Explicitly not authorized

- `medify-ma35-rf` — slug-binding fork (filter PDP vs stand PDP) unresolved
- Amazon `retailer_key=amazon` rows — separate lane; no `browser_truth` promotion here
- `retailer_links.csv` mutation
- `filter_aliases.csv` mutation
- Apply planner, executor dry-run, executor `--apply`
- Supabase parity or seed import
- Deploy / public UI mutation
- `data/owner-decisions/` rows unless separately requested

---

## 4. Expected downstream impact (INFERRED — post evidence write)

| Stage | Expected outcome |
|-------|------------------|
| Aggregator | Six rows → `auto_apply_eligible` if `validateAgentEvidenceRowV1` passes (no wrong-family, `owner_review_required: false`) |
| Apply planner | Cohort plan with 6 `planned_changes` (primary `oem-catalog` search → PDP) |
| Executor apply | `ap_safe_cta_delta: +6` (15 → 21) if all six apply cleanly |
| Live CTA ordering | **UNKNOWN** — orphan Supabase Amazon rows + `amazonExactOemPrimaryBoost` may still yield Amazon-primary `/go` (Levoit-class risk) |

---

## 5. Risks and reconciliations

| Risk | Mitigation |
|------|------------|
| Legacy `ap-amazon-secondary-v1` wrong-family flags on ma25/40/50 | New OEM-primary evidence supersedes; do not promote Amazon rows |
| PDP URL suffix drift | Use §2 exact URLs in evidence + apply plan |
| MA-50 below-fold CMS MA-12 PRO leak | Evidence notes only; buy box clean per discovery |
| `medify-ma18-rf` shared by ma-20/ma-32 compat | Monitor wrong-family at evidence validation; no compat edits in this packet |
| Filter Set vs single-unit presentation (ma25/35/112) | Document in `browser_truth_notes`; no pack-subtype change unless gate requires |

---

## 6. Hard boundaries

- [ ] No CSV mutation from this packet
- [ ] No canonical evidence JSON write until owner Option A or B recorded
- [ ] No `medify-ma35-rf`
- [ ] No Amazon row mutation
- [ ] No Supabase / deploy
- [ ] No `data/owner-decisions/` rows unless separately requested
- [ ] No apply planner or executor

---

## 7. Validation commands (read-only re-check)

```bash
node --import tsx scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts \
  --packet=data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-medify-cohort-v1.json \
  --scope=medify-ma18-rf,medify-ma22-rf,medify-ma25-rf,medify-ma40-rf,medify-ma50-rf,medify-ma112-rf

npx tsx scripts/report-air-purifier-truth-spine-v1.ts | jq '{safe_cta_count, filters_with_zero: .filters_with_zero_safe_buy_path_count}'
```

---

## 8. Related docs

- `docs/air-purifier/AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` (pattern)
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-PRODUCTION-SMOKE-RESULT-v1.md` (Amazon-primary CTA lesson)
- `data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-medify-cohort-v1.json`
- `data/air-purifier/batch-production/agent-results/ap-amazon-secondary-v1.results.json` (legacy — do not use for OEM primary)

---

## 9. Disclaimer

Mechanical validation **PASS** does not make discovery canonical evidence or apply-eligible. This packet authorizes **evidence write only** after owner Option A or B. CSV safe CTA expansion (+6), Supabase parity, and live buyer-path proof require **separate** owner authorizations in the factory chain.
