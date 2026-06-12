# AP Consumer Naming Bridge — owner review v1

## Class policy (Levoit primary cohort)

**Report type:** read-only owner decision support — **class policy review only**  
**Generated:** 2026-06-12  
**Repo checkpoint:** `cf7ca82` or newer HEAD  
**Scope:** Consumer Naming Bridge policy for AP identity-block recovery — **not** CSV apply, evidence write, deploy, or Supabase  
**Truth source:** batch-v2 Levoit evidence (`ap-levoit-oem-discovery-v1`), batch-v3 rollup, weak buyer-path audit, safe Levoit precedents in `retailer_links.csv`

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner review of whether BuckParts may accept **Consumer Naming Bridge** as a repeatable identity policy | Permission to mutate `retailer_links.csv`, `filter_aliases.csv`, or any CSV |
| A scope lock on **four clean Levoit slugs** as the primary cohort | Authorization for Blueair, Coway, Medify, Rabbit, or other brands |
| Docs-only until owner records Option A, B, or C in chat | Creation of `data/owner-decisions/` registry rows |
| Policy input for a **future** evidence-write packet | Live browser re-proof, canonical evidence commit, apply planner, or executor run |

**PROVEN:** No production, app, CSV, Supabase, evidence-file, or deploy mutation occurs from this document alone.

---

## 1. What is Consumer Naming Bridge?

**Consumer Naming Bridge** is an owner-approved equivalence rule:

> A BuckParts anchor (`filter_slug` + internal `oem_part_number`) may map to an official manufacturer PDP when the **internal OEM token is absent** from the storefront primary slice, but **official consumer naming and model-family tokens** in the PDP title/H1/body/schema clearly identify the same sellable replacement unit for the mapped compat family.

**Typical AP pattern (PROVEN on blocked Levoit cohort):**

| Layer | BuckParts | Levoit storefront |
|-------|-----------|-------------------|
| Search token | `LEVOIT-RF-RAR040` | 0 search results |
| Internal OEM | `LEVOIT-RF-RAR040` / `RAR040` | Not printed in primary slice |
| Consumer identity | `Core 400 / Core 400S` (catalog name) | `Core 400S-P 3-Stage Replacement Filter` (H1) |
| Buy path | Search placeholder | Official PDP with Add to Cart |

**PROVEN precedents already safe in repo** (same bridge class, not identical token rule):

| Slug | Internal token absent on search | Accepted storefront identity |
|------|--------------------------------|------------------------------|
| `levoit-vital100-rf` | `LEVOIT-VITAL100-RF` search → 0 | `Vital 100-RF` in PDP body → `direct_buyable` |
| `levoit-rf-lv-h128` | `LEVOIT-RF-LV-H128` search → 0 | `LV-H128` / `H128-RF` in primary area → `direct_buyable` |
| `rabbit-biogs-minusa2` | `RABBIT-BIOGS-MA2` not on PDP | `BioGS` / `MinusA2` consumer naming → `direct_buyable` |

**INFERRED:** Consumer Naming Bridge is the highest near-term AP identity class (~7 slugs cluster-wide; **+5 immediate** safe CTA potential for buyable PDPs in the four-slug primary cohort).

---

## 2. Evidence required before accepting a bridge

For each slug, **all** of the following must be true in a **live or freshly re-run read-only browser session** before any future evidence-write packet may claim `PASS_DIRECT_BUYABLE`:

| # | Requirement | Primary cohort status (batch-v2 committed) |
|---|-------------|-----------------------------------------------|
| 1 | **Official manufacturer PDP** — HTTP 200 product page on brand OEM domain (`levoit.com`), not search/category only | **PROVEN** for all four |
| 2 | **Primary-slice family tokens** — consumer/model-family strings visible in H1/title/primary body match catalog compat family | **PROVEN** for all four |
| 3 | **Wrong-family clear** — `wrong_family_tokens_seen` empty in primary slice; sibling SKUs only in cross-sell or explicitly checked out | **PROVEN** for all four |
| 4 | **Buy action** — Add to Cart (or equivalent) present; not notify-only / out-of-stock | **PROVEN** for all four |
| 5 | **Compat alignment** — mapped models in `compatibility_mappings.csv` belong to the PDP’s stated family | **PROVEN** (repo mappings exist) |
| 6 | **Bridge record** — owner policy (this packet) or per-slug owner note documenting accepted equivalence: internal OEM → consumer PDP identity | **Pending** — this packet |
| 7 | **Re-proof freshness** — session date after policy approval; batch-v2 artifacts alone are directional, not post-policy canonical | **UNKNOWN** until future session |

**Optional strengthening (not required for Option A if primary tokens suffice):**

- `filter_aliases.csv` row for consumer tokens (`400S-P`, `LV-PUR131`, etc.) — **PROVEN:** all four slugs currently **missing** alias rows (slug-status `catalog_present` pending).

---

## 3. What is NOT enough

| Insufficient evidence | Why |
|----------------------|-----|
| Batch-v2 `NEEDS_OWNER_REVIEW` row alone | Commits discovery; explicitly flags `owner_review_required: true` — **PROVEN** |
| Search placeholder URL returning 0 results | Expected for Levoit; not proof of safe CTA |
| Compat row count / mapping count without PDP proof | BuckParts factory rules forbid row-count-as-truth — **PROVEN** in batch director |
| Model-first artifact without per-slug live PDP re-proof | Directional only per model-first contract — **PROVEN** |
| Amazon-secondary PDP | Not in scope; OEM-primary policy unchanged |
| Assuming internal `LEVOIT-RF-*` token will appear on PDP | Contradicts committed evidence — token absent by design |
| Class policy approval alone | Does not write evidence or promote `direct_buyable` |
| Neighboring safe slug (`levoit-vital100-rf`) without slug-specific proof | Precedent informs policy; does not substitute per-slug session |

---

## 4. Wrong-purchase risks that remain

| Risk | Severity | Mitigation in policy |
|------|----------|----------------------|
| **Non-S vs S model cartridge drift** — e.g. Core 400 vs 400S-P naming | **LOW–MEDIUM** | **INFERRED:** PDP explicitly names 400S-P family; compat includes Core 400 variants — owner accepts family-level bridge |
| **Alternate OEM handles** — e.g. `levoit-rf-rar060` alternate handle sold out | **LOW** | **PROVEN:** batch-v2 chose in-stock primary PDP |
| **Internal token absent forever** — support/docs may use RAR040; storefront uses -P | **LOW** if policy accepted | Alias row optional; public page must not imply RAR040 is printed on box |
| **Future Levoit SKU rename** | **UNKNOWN** | Re-proof required on material storefront change |
| **Extending policy to Blueair without compat review** | **HIGH** | **Explicitly out of scope** — `blueair-f2-211` has 211+ Auto topology edge |
| **Extending to `levoit-rf-rar029`** | **HIGH** | **Explicitly excluded** — wrong-variant / Pet sub-line — **PROVEN** `REJECT_WRONG_FAMILY` |

---

## 5. Primary cohort — eligible now (pending policy only)

All four slugs have committed batch-v2 evidence: official PDP, Add to Cart, empty wrong-family in primary slice, consumer naming match. **Eligible for Option A class policy** — not yet eligible for CSV apply.

| Slug | Catalog OEM | Official PDP (batch-v2) | Primary storefront tokens | Compat models |
|------|-------------|-------------------------|---------------------------|---------------|
| `levoit-rf-rar040` | `LEVOIT-RF-RAR040` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` | `400S-P`, `Core 400` | 6 |
| `levoit-rf-rar060` | `LEVOIT-RF-RAR060` | `https://levoit.com/products/core-600s-p-original-replacement-filter` | `600S-P`, `Core 600` | 5 |
| `levoit-rf-c131` | `LEVOIT-RF-C131` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` | `LV-PUR131`, `PUR131` | 3 |
| `levoit-rf-cr200` | `LEVOIT-RF-CR200` | `https://levoit.com/products/core-200s-p-replacement-filter` | `200S-P`, `Core 200` | 3 |

**Current buyer path:** search placeholder on all four — **PROVEN** `retailer_links.csv`.

**Estimated lift if policy + future evidence/apply complete:** **+4** safe CTAs — **INFERRED**.

---

## 6. Explicitly excluded or conditional (out of Option A scope)

| Slug | Status | Reason |
|------|--------|--------|
| `levoit-vital200-rf` | **Conditional** | Consumer Naming Bridge shape matches cohort, but **inventory gate**: `buy_action_seen: false`, `available:false` — **PROVEN** batch-v2/batch-v3 |
| `blueair-f2-211` | **Excluded from this packet** | Consumer naming plus **topology edge**: `blueair-211-auto` compat vs separate 211+ Auto PDP — **PROVEN** |
| `blueair-pro-m-particle` | **Conditional** | Naming bridge shape, but **out of stock** / reference-only — **PROVEN** batch-v2 |
| `levoit-rf-rar029` | **Excluded** | Wrong variant — `REJECT_WRONG_FAMILY` — **PROVEN** |
| All non-Levoit slugs | **Excluded** | Separate owner packets required |
| Entire 16-slug identity cluster | **Not bulk-authorized** | This packet covers **class policy + four slugs only** |

---

## 7. Owner decision options

Record **exactly one** option in chat. **Do not** create `data/owner-decisions/` rows unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE CONSUMER NAMING BRIDGE POLICY (FOUR LEVOIT SLUGS)      │
│                                                                             │
│  I approve Consumer Naming Bridge as a repeatable BuckParts identity rule   │
│  for the primary cohort only:                                               │
│    levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200      │
│                                                                             │
│  I accept that official Levoit consumer PDP naming may satisfy identity     │
│  when internal LEVOIT-RF-* / RAR* / C131 / CR200 tokens are absent from     │
│  the primary slice, subject to §2 evidence requirements.                    │
│                                                                             │
│  I do NOT approve: CSV apply, evidence write, Supabase, deploy, gate        │
│  weakening, Blueair/Coway/Medify extension, or levoit-vital200-rf.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — PER-SLUG REVIEW ONLY (NO CLASS POLICY)                          │
│                                                                             │
│  I do not approve a class-wide Consumer Naming Bridge policy.              │
│  Future promotion requires individual slug owner review packets.            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — REJECT / HOLD                                                   │
│                                                                             │
│  I reject Consumer Naming Bridge for these slugs at this time.              │
│  Slugs remain search-placeholder / owner_review_required.                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. What this does NOT authorize

Regardless of option chosen, **this packet does not authorize:**

- Writing or updating `data/air-purifier/batch-production/agent-results*/` evidence rows
- `retailer_links.csv` or any CSV mutation
- Apply planner generation or apply executor runs
- Supabase seed, SQL commit, or parity apply
- Netlify deploy or public UI / `/go` gate changes
- `data/owner-decisions/` registry rows
- Weakening `buyLinkGateFailureKind`, aggregator strict validation, or reference/buy gates
- Policy application to **Blueair**, **Coway**, **Medify**, **Rabbit**, **Winix**, or other brands
- Promotion of `levoit-vital200-rf`, `blueair-f2-211`, or `blueair-pro-m-particle`
- Claim that safe CTA count has increased

---

## 9. If Option A is approved later — next read-only evidence packet

**Next artifact (not created by this step):**

`docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md`

That packet should authorize **read-only live browser re-proof** and **conditional** canonical evidence write for the **four-slug cohort only**, mirroring the Winix Filter H evidence-write pattern — still **no CSV apply**.

### Pre-flight (read-only)

```bash
npm run buckparts:ap:slug-status -- --slug levoit-rf-rar040
npm run buckparts:ap:slug-status -- --slug levoit-rf-rar060
npm run buckparts:ap:slug-status -- --slug levoit-rf-c131
npm run buckparts:ap:slug-status -- --slug levoit-rf-cr200
```

### Read-only re-proof prompt (copy after Option A)

```
Repo: /Users/jaredbuckman/bucksites-tools
Checkpoint: cf7ca82 or newer

Scope: AP Consumer Naming Bridge — four-slug Levoit cohort only.
Policy: docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md Option A approved.

Slugs:
- levoit-rf-rar040
- levoit-rf-rar060
- levoit-rf-c131
- levoit-rf-cr200

Read-only live browser re-proof only.
Do not mutate CSVs.
Do not write evidence rows unless a separate evidence-write owner packet is approved.
Do not run apply planners or executor.
Do not mutate Supabase or deploy.

For each slug:
1. Open committed search placeholder from retailer_links.csv.
2. Navigate to batch-v2 final_url PDP on levoit.com.
3. Verify primary-slice consumer tokens per AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md §2.
4. Confirm wrong_family_tokens_seen empty in primary slice.
5. Confirm Add to Cart / buy action present.
6. Classify PASS_DIRECT_BUYABLE vs fail using existing BuckParts gates only.
7. Record PROVEN / INFERRED / UNKNOWN per finding.

Do not extend to levoit-vital200-rf, blueair-f2-211, or non-Levoit slugs.
```

---

## Appendix — committed evidence pointers

| Artifact | Path |
|----------|------|
| Batch-v2 Levoit evidence | `data/air-purifier/batch-production/agent-results-batch-v2/ap-levoit-oem-discovery-v1.results.json` |
| Batch-v3 rollup | `data/air-purifier/batch-production/agent-results-batch-v3/ap-levoit-oem-discovery-v1.results.json` |
| Batch-v2 refused_changes | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` |
| Model-first (non-canonical) | `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-levoit-rf-rar040-v1.results.json` (and rar060 sibling) |
| Safe precedents | `data/air-purifier/retailer_links.csv` — `levoit-vital100-rf`, `levoit-rf-lv-h128` |
| Normative contract | `docs/BuckParts-PRODUCT-ADDITION-MODEL-FIRST-CONTRACT.md` |

---

## PROVEN / INFERRED / UNKNOWN

| Topic | Label |
|-------|--------|
| Four primary slugs blocked on `NEEDS_OWNER_REVIEW` for token-not-on-PDP | **PROVEN** |
| All four have batch-v2 Add to Cart on official PDP | **PROVEN** |
| All four have `wrong_family_tokens_seen: []` in batch-v2 | **PROVEN** |
| No `filter_aliases.csv` row for four primary slugs | **PROVEN** (slug-status) |
| `levoit-vital100-rf` / `levoit-rf-lv-h128` safe via consumer naming | **PROVEN** |
| +4 safe CTA lift after full factory completion | **INFERRED** |
| +5 cluster-wide immediate lift including Blueair | **INFERRED** (Blueair not in Option A) |
| Core 400 non-S units use same cartridge as 400S-P PDP | **UNKNOWN** (family bridge accepted under Option A) |
| Current Levoit stock/price on live storefront | **UNKNOWN** (re-proof required) |
| Option A approval recorded | **UNKNOWN** until owner chat decision |
