# AP Consumer Naming Bridge — evidence-write owner review v1

## Four-slug Levoit cohort

**Report type:** read-only owner decision support — **canonical evidence write authorization only**  
**Generated:** 2026-06-12  
**Repo checkpoint:** `46f8b22`  
**Scope:** **four** filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`  
**Truth source:** Option A policy packet, 2026-06-12 live re-proof session, batch-v2 Levoit evidence, slug-status reporter

**Prior packet:** `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` — **Option A approved** (owner chat, checkpoint `46f8b22`). Live re-proof completed 2026-06-12 (read-only; no repo mutation).

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Consumer Naming Bridge **class policy** approved (Option A) | Yes — four Levoit slugs only | **PROVEN** (owner decision) |
| **2026-06-12 live re-proof** passed §2 gates for all four slugs | All four → `PASS_DIRECT_BUYABLE` candidate | **PROVEN** (live session) |
| Committed repo evidence still `NEEDS_OWNER_REVIEW` | Unchanged until evidence write | **PROVEN** |
| `retailer_links.csv` still search-placeholder / empty `browser_truth_*` | No safe CTA claimed | **PROVEN** |
| Any mutation performed by this packet | **None** | **PROVEN** |

**INFERRED:** If Option A below is approved and evidence rows are written per §3, aggregator may classify all four `auto_apply_eligible` — **apply still requires separate owner authorization**.

**Estimated coverage delta after full factory (evidence + apply + smoke):** **+4** safe CTAs — **INFERRED**.

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to write **canonical** `air_purifier_agent_evidence_result_v1` rows for **four slugs** supported by 2026-06-12 live proof | CSV apply, apply-plan execution, or executor `--apply` |
| Bounded authorization for evidence classification updates only | `filter_aliases.csv` insertion or catalog ingest |
| Docs-only until owner records Option A, B, or C in chat | Supabase seed/SQL, deploy, or `data/owner-decisions/` row creation |
| Conversion of approved policy + live proof into evidence-write gate | Permission to extend bridge to Blueair, Coway, Medify, or `levoit-vital200-rf` |

**PROVEN:** No production, app, CSV, Supabase, evidence-file, or deploy mutation occurs from this document alone.

---

## 1. Per-slug proof table (2026-06-12 live re-proof)

Probe method: read-only HTTP (`curl`, `BuckPartsOEMBrowserTruth/1.0`) against committed search placeholders and batch-v2 `final_url` PDPs on `levoit.com`.

| Slug | PDP URL | H1 / title (primary) | Consumer naming (primary) | Add to Cart | `available:true` | Wrong-family (primary) | Internal token absent (primary) |
|------|---------|------------------------|---------------------------|-------------|------------------|------------------------|--------------------------------|
| `levoit-rf-rar040` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` | Levoit Core® **400S-P** 3-Stage Replacement Filter | **400S-P**, Core 400, Core 400S | **Yes** | **Yes** (HTML product JSON) | **Clear** `[]` | **RAR040**, **LEVOIT-RF-RAR040** absent |
| `levoit-rf-rar060` | `https://levoit.com/products/core-600s-p-original-replacement-filter` | Levoit Core® **600S-P** Original Replacement Filter | **600S-P** (Core 600/S not in primary HTML slice) | **Yes** | **Yes** | **Clear** `[]` | **RAR060**, **LEVOIT-RF-RAR060** absent |
| `levoit-rf-c131` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` | Levoit **LV-PUR131** Air Purifier Replacement Filter | **LV-PUR131**, **PUR131** | **Yes** | **Yes** | **Clear** `[]` | **C131**, **LEVOIT-RF-C131** absent |
| `levoit-rf-cr200` | `https://levoit.com/products/core-200s-p-replacement-filter` | Levoit Core **200S-P** 3-Stage Replacement Filter | **200S-P**, Core 200, Core 200S | **Yes** | **Yes** | **Clear** `[]` | **CR200**, **LEVOIT-RF-CR200** absent |

### Supplementary live facts

| Slug | Search placeholder | Search result | Shopify SKU | Compat statement (manufacturer) | Cross-sell only (not primary) |
|------|-------------------|---------------|-------------|--------------------------------|------------------------------|
| `levoit-rf-rar040` | `...search?q=LEVOIT-RF-RAR040` | 0 results | `HEACAFLVNUS0051A` | Compatible with only: **Core 400S-P** | Vital 200, 600S-P, 200S-P |
| `levoit-rf-rar060` | `...search?q=LEVOIT-RF-RAR060` | 0 results | `HEACAFLVNUS0061A` | Body cites **600-P** family; title **600S-P** | Vital 200, 400S-P, 200S-P |
| `levoit-rf-c131` | `...search?q=LEVOIT-RF-C131` | Product links (non-zero) | `HEACAFLVNUS0002` | Compatible with only: **LV-PUR131, LV-PUR131S** | 400S-P, 600S-P, 200S-P |
| `levoit-rf-cr200` | `...search?q=LEVOIT-RF-CR200` | Product links (non-zero) | `HEACAFLVNUS0105Y` | Compatible for **Core 200S-P** only | 400S-P, 600S-P, Vital 200 |

**PROVEN:** Sibling-family tokens appear only outside primary product slice (cross-sell / related products).

---

## 2. Exact evidence-write authorization boundaries

### Allowed (only if Option A approved)

- Write or update **canonical** `air_purifier_agent_evidence_result_v1` rows for the **four slugs listed above** and **no others**
- Set evidence fields supported by 2026-06-12 live proof, including:
  - `decision`: `PASS_DIRECT_BUYABLE`
  - `final_url`: official PDP URLs in §1 table
  - `browser_truth_classification`: `direct_buyable`
  - `buy_action_seen`: `true`
  - `wrong_family_tokens_seen`: `[]`
  - `owner_review_required`: `false`
  - `exact_tokens_seen`: consumer naming tokens from §1 (not internal `LEVOIT-RF-*` / `RAR*` unless observed)
  - `evidence_notes`: must cite Consumer Naming Bridge policy + live session date + internal-token absence + cross-sell check
- Target artifacts (bounded): `data/air-purifier/batch-production/agent-results/ap-levoit-oem-discovery-v1.results.json` and/or `data/air-purifier/batch-production/agent-results-batch-v2/ap-levoit-oem-discovery-v1.results.json` — **four rows only**

### Not allowed (regardless of option)

- Any `data/air-purifier/*.csv` mutation (`filters.csv`, `retailer_links.csv`, `filter_aliases.csv`, `compatibility_mappings.csv`)
- Alias insertion or catalog ingest tasks
- Compatibility mapping changes
- Apply planner generation, apply executor, or `--apply`
- Supabase seed, SQL commit, parity apply, or deploy
- `data/owner-decisions/` registry rows (unless separately requested)
- Evidence write for `levoit-vital200-rf`, Blueair slugs, Coway, Medify, Rabbit, or any fifth slug
- Gate weakening (`buyLinkGateFailureKind`, aggregator strict checks, `/go` rules)
- Claim that safe CTA count has increased (requires CSV apply + smoke)

---

## 3. Per-slug expected classification

| Slug | Current repo classification | Expected post-evidence-write (evidence row only) | `retailer_links.csv` after evidence only |
|------|----------------------------|--------------------------------------------------|----------------------------------------|
| `levoit-rf-rar040` | `NEEDS_OWNER_REVIEW` | `PASS_DIRECT_BUYABLE` | **Unchanged** — still search placeholder |
| `levoit-rf-rar060` | `NEEDS_OWNER_REVIEW` | `PASS_DIRECT_BUYABLE` | **Unchanged** |
| `levoit-rf-c131` | `NEEDS_OWNER_REVIEW` | `PASS_DIRECT_BUYABLE` | **Unchanged** |
| `levoit-rf-cr200` | `NEEDS_OWNER_REVIEW` | `PASS_DIRECT_BUYABLE` | **Unchanged** |

**PROVEN:** Slug-status `canonical_evidence_present` currently cites `decision=NEEDS_OWNER_REVIEW` from `agent-results/ap-levoit-oem-discovery-v1.results.json`.

**INFERRED:** Post-write, `aggregator_auto_apply_eligible` may move from `blocked` to `complete` per slug — **CSV apply still blocked** without separate packet.

**PROVEN:** `catalog_present` may remain `pending` (missing `filter_aliases.csv`) — alias gap is **not** authorized for repair in this packet.

---

## 4. Risk section

### Why this is Consumer Naming Bridge only

All four slugs share one failure mode: **internal BuckParts OEM token absent on Levoit storefront; consumer `-P` / model-family naming present on official buyable PDP**. Live proof confirms:

- Official `levoit.com` PDP per slug
- Consumer tokens in primary slice
- Internal tokens absent (expected under bridge)
- Wrong-family clear in primary slice
- Add to Cart + in-stock signals

No slug in this cohort requires SKU-number equivalence (`coway-airmega250-rf`), catalog family split (`blueair-particle-411`), multi-PDP pick (`rabbit-carbon-minusa2`), or wrong-variant rejection (`levoit-rf-rar029`).

### Why this does not authorize Blueair

- `blueair-f2-211` has **topology edge** (`blueair-211-auto` compat vs separate 211+ Auto PDP) — excluded from policy packet
- `blueair-pro-m-particle` has **inventory gate** (out of stock) — excluded
- Blueair engineering tokens (`F2MAX211PAC`, `BLUEAIR-PRO-M-PART`) are a different brand storefront — **not** covered by Levoit-only Option A

### Why this does not authorize `levoit-vital200-rf`

- Same naming-bridge **shape**, but committed + live evidence shows **`buy_action_seen: false`** / `available:false` — inventory gate
- Explicitly excluded from `AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` Option A scope

### Why this does not authorize topology repairs

- No catalog family split, compat remap, or slug merge required for these four slugs
- Evidence notes manufacturer compat strings aligned with existing `compatibility_mappings.csv` families
- Extending bridge to slugs requiring catalog surgery would bypass owner catalog-task gates (`CATALOG_GAP`, `REJECT_WRONG_FAMILY`)

---

## 5. Owner decision options

Record **exactly one** option in chat. **Do not** create `data/owner-decisions/` rows unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE EVIDENCE WRITE (FOUR-SLUG COHORT)                       │
│                                                                             │
│  I approve canonical evidence write for:                                    │
│    levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200      │
│                                                                             │
│  Rows must follow 2026-06-12 live proof in §1 and boundaries in §2.         │
│  Expected decision: PASS_DIRECT_BUYABLE per slug.                           │
│                                                                             │
│  I do NOT approve: CSV apply, alias ingest, compat edits, apply planner,    │
│  executor, Supabase, deploy, vital200-rf, Blueair, or non-Levoit slugs.     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — APPROVE SUBSET ONLY                                             │
│                                                                             │
│  I approve canonical evidence write for this subset only:                   │
│    [ owner lists slug(s) ]                                                  │
│                                                                             │
│  All unlisted cohort slugs remain NEEDS_OWNER_REVIEW.                        │
│  Same §2 not-allowed list applies.                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — HOLD                                                            │
│                                                                             │
│  I do not approve evidence write for this cohort at this time.              │
│  Committed repo state unchanged; live re-proof remains directional only.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Post-approval evidence row checklist (per slug)

When Option A or B is approved, each written row must satisfy:

| Field | Required value |
|-------|----------------|
| `packet_id` | `ap-levoit-oem-discovery-v1` (match existing packet) |
| `decision` | `PASS_DIRECT_BUYABLE` |
| `candidate_url` | Committed search placeholder from `retailer_links.csv` |
| `final_url` | §1 PDP URL |
| `browser_truth_classification` | `direct_buyable` |
| `buy_action_seen` | `true` |
| `wrong_family_tokens_seen` | `[]` |
| `owner_review_required` | `false` |
| `recommended_csv_mutation` | `null` (no CSV authorized here) |
| `evidence_notes` | Must include: `Consumer Naming Bridge Option A`; session `2026-06-12`; consumer tokens seen; internal token absence; cross-sell siblings checked |

---

## Appendix — repo pointers

| Artifact | Path |
|----------|------|
| Policy packet (Option A) | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` |
| Pre-write evidence | `data/air-purifier/batch-production/agent-results/ap-levoit-oem-discovery-v1.results.json` |
| Batch-v2 evidence | `data/air-purifier/batch-production/agent-results-batch-v2/ap-levoit-oem-discovery-v1.results.json` |
| Search placeholders | `data/air-purifier/retailer_links.csv` |
| Safe Levoit precedents | `levoit-vital100-rf`, `levoit-rf-lv-h128` in `retailer_links.csv` |

---

## PROVEN / INFERRED / UNKNOWN

| Topic | Label |
|-------|--------|
| Option A policy approved; live re-proof 2026-06-12 passed all four | **PROVEN** |
| Repo evidence still `NEEDS_OWNER_REVIEW` for all four | **PROVEN** |
| No mutation from this document | **PROVEN** |
| Post-evidence aggregator `auto_apply_eligible` for four slugs | **INFERRED** |
| `catalog_present` alias pending after evidence write | **INFERRED** |
| +4 safe CTAs after full factory | **INFERRED** |
| Levoit storefront stock/price at future apply time | **UNKNOWN** |
