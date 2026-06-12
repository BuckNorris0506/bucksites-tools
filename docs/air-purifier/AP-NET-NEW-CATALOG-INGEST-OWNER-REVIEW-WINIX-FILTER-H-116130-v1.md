# AP net-new catalog ingest — owner review packet v1

## Winix Filter H `116130` (`winix-filter-h-116130`)

**Report type:** read-only owner decision support — **catalog ingest specification only**  
**Generated:** 2026-06-12  
**Repo checkpoint:** `3079c66`  
**Scope:** **one** net-new filter identity only — **not** `winix-filter-s-1712-0096-00`  
**Truth source:** repo CSV + committed model-first evidence (not HQ handoff)

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| A **proposed catalog ingest specification** for owner review | A CSV write, evidence file, or apply plan |
| Pre-factory setup so the **existing** AP Discovery → Evidence → Apply chain can run **later** | Authorization for safe CTA, live coverage, or `/go` |
| Docs-only until owner approves ingest | A Supabase mutation (`import-air-purifier-seed` requires separate authorization) |

**PROVEN:** No production, app, or `data/air-purifier/*.csv` mutation occurs from this document alone.

**PROVEN:** `data/air-purifier/filters.csv` has **no** `priority` column; repo uses `replacement_interval_months` and `name` (not `display_name`).

---

## Owner decision box

Choose **exactly one** and record in chat. **Do not** create `owner-decision` registry rows from this packet.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE CATALOG INGEST ONLY                                     │
│                                                                             │
│  I approve adding winix-filter-h-116130 to AP catalog CSVs per §1–§4       │
│  (filters, retailer_links primary placeholder, filter_aliases, compat      │
│  rows marked PROVEN only unless I explicitly approve INFERRED rows).       │
│                                                                             │
│  I do NOT approve: evidence write, apply, deploy, Supabase, safe CTA.       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve catalog ingest for winix-filter-h-116130 at this time.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Proposed `data/air-purifier/filters.csv` row

| Column (repo) | Proposed value | Label |
|---------------|----------------|-------|
| `brand_slug` | `winix` | **PROVEN** — Winix brand exists (`filters.csv` row 12–13) |
| `slug` | `winix-filter-h-116130` | **PROVEN** — absent today (grep) |
| `oem_part_number` | `WINIX-116130` | **INFERRED** — matches `WINIX-115115` / `WINIX-116131` convention |
| `name` | `Winix Filter H (116130)` | **INFERRED** — aligns with official PDP token `Filter H – 116130` (model-first) |
| `replacement_interval_months` | `12` | **INFERRED** — sibling Winix cartridge `winix-hepa-115115` uses `12`; **UNKNOWN** official interval on PDP |
| `notes` | `Official Winix Filter H replacement set SKU 116130; net-new identity — do not alias to winix-carbon-116131` | **PROVEN** intent from model-first + agent-results |

**CSV one-liner (proposed, not applied):**

```csv
winix,winix-filter-h-116130,WINIX-116130,Winix Filter H (116130),12,Official Winix Filter H replacement set SKU 116130; net-new identity — do not alias to winix-carbon-116131
```

---

## 2. Proposed `data/air-purifier/retailer_links.csv` primary row

| Column | Proposed value | Label |
|--------|----------------|-------|
| `filter_slug` | `winix-filter-h-116130` | **PROVEN** — absent today |
| `retailer_name` | `OEM / manufacturer catalog (keyword lookup)` | **PROVEN** — matches `winix-carbon-116131` placeholder row pattern |
| `retailer_key` | `oem-catalog` | **PROVEN** |
| `retailer_slug` | `oem-catalog` | **PROVEN** |
| `is_primary` | `true` | **PROVEN** |
| `destination_url` | `https://www.winixamerica.com/search?q=WINIX-116130` | **INFERRED** — mirrors `winix-carbon-116131` search pattern (`WINIX-116131`) |
| `affiliate_url` | `https://www.winixamerica.com/search?q=WINIX-116130` | **INFERRED** — repo primary rows use same URL for both when placeholder |
| `browser_truth_classification` | *(empty)* | **PROVEN** — required for ingest-only |
| `browser_truth_notes` | *(empty)* | **PROVEN** |
| `browser_truth_checked_at` | *(empty)* | **PROVEN** |

**Target PDP after factory apply (not at ingest):** `https://www.winixamerica.com/product/filter-h-116130/` — **PROVEN** in model-first `candidate_buyer_paths[]`.

---

## 3. Proposed `data/air-purifier/filter_aliases.csv` rows

| filter_slug | alias | Label |
|-------------|-------|-------|
| `winix-filter-h-116130` | `116130` | **PROVEN** — repo Winix aliases use numeric SKU (`115115`, `116131` in `filter_aliases.csv`) |
| `winix-filter-h-116130` | `Filter H` | **INFERRED** — official PDP primary token per model-first; **not** an existing Winix alias pattern in repo |

**Do not add without owner OK:** `WINIX-116130` in `filter_aliases.csv` — **PROVEN** OEM token belongs in `filters.oem_part_number`, not proven as alias-row convention for Winix.

---

## 4. Proposed `data/air-purifier/compatibility_mappings.csv` rows

Format: `model_slug,filter_slug,is_recommended`

### PROVEN — include if owner approves §4 ingest

| model_slug | filter_slug | is_recommended | Proof |
|------------|-------------|----------------|-------|
| `winix-5500-2` | `winix-filter-h-116130` | `true` | **PROVEN:** `ap-model-first-winix-carbon-116131-live-browser-v1.results.json` — 5500-2 manual lists Replacement Filter H / SKU `116130`; Filter H PDP lists 5500-2 compatibility; in stock + Add to cart |

### INFERRED — hold unless owner explicitly approves in Option A

| model_slug | filter_slug | is_recommended | Proof |
|------------|-------------|----------------|-------|
| `winix-am80` | `winix-filter-h-116130` | `true` | **INFERRED:** same artifact — Filter H PDP copy cited as compatible with AM80 in `winix-5500-2` model row notes; **no** dedicated AM80 model-first row in committed pass |

### UNKNOWN — do not ingest on this packet

| model_slug | Reason |
|------------|--------|
| All other `winix-*` models currently mapped to `winix-carbon-116131` | **UNKNOWN** whether any legitimately need `116131` vs other official SKUs (model-first `unknown_facts`) |
| `winix-c535`, `winix-5300-2` | **PROVEN** map to `winix-hepa-115115` (Filter A), not `116130` |
| `winix-c545` | **PROVEN** maps to Filter S `1712-0096-00` (out of scope) |
| `winix-hr900` | **PROVEN** maps to Filter T `1712-0093-00` (out of scope) |

**PROVEN:** Ingest of `winix-5500-2 → winix-filter-h-116130` does **not** remove existing `winix-5500-2 → winix-carbon-116131` row. Demotion/repair of wrong `116131` mappings is a **separate** owner-approved catalog task.

---

## 5. Source proof

### Official PDP / token / buyability (PROVEN)

| Claim | Path |
|-------|------|
| Official PDP URL | `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-winix-carbon-116131-live-browser-v1.results.json` → `candidate_buyer_paths[]` url `https://www.winixamerica.com/product/filter-h-116130/` |
| Exact token in primary area | Same file → `exact_token_proof`: `Filter H – 116130` |
| Add to Cart + in stock | Same file → `buyability_proof`: `In stock and Add to cart` |
| 5500-2 manual + model fit | Same file → `model_rows[]` slug `winix-5500-2` |

### Supporting agent-results (PROVEN — not canonical ingest proof)

| Claim | Path |
|-------|------|
| Filter H documented as 5500-2 replacement; `116131` wrong product family | `data/air-purifier/batch-production/agent-results/ap-oem-search-placeholder-v1.results.json` → slug `winix-carbon-116131` |
| Batch-v2 re-proof | `data/air-purifier/batch-production/agent-results-batch-v2/ap-oem-search-placeholder-v1.results.json` → slug `winix-carbon-116131` |

### Candidate absent today (PROVEN)

| Artifact | Check |
|----------|-------|
| `data/air-purifier/filters.csv` | **No** row with slug `winix-filter-h-116130` |
| `data/air-purifier/retailer_links.csv` | **No** row for `winix-filter-h-116130` |
| `data/air-purifier/filter_aliases.csv` | **No** `116130` alias row (only `115115`, `116131` for Winix) |
| `data/air-purifier/compatibility_mappings.csv` | **No** mapping to `winix-filter-h-116130` |

### HyperAgent validation precondition (PROVEN)

`scripts/lib/air-purifier-hyperagent-chat-discovery-validation-v1.ts` mechanical check `filter_slug_in_catalog` **fails** until §1–§2 ingest completes.

### Apply planner precondition (PROVEN)

`scripts/lib/air-purifier-apply-planner-v1.ts` → `findUniqueCsvRowV1` returns `csv_row_missing` without §2 retailer_links row.

---

## 6. Risk section

### Why this must not route through `winix-carbon-116131`

| Risk | Label |
|------|-------|
| Catalog describes `WINIX-116131` as granular carbon sheet (Filter B) | **PROVEN** `filters.csv` row 13 + `ap-oem-search-placeholder-v1.results.json` |
| Official PDP for `116131` is **Filter I** for **C555 only** | **PROVEN** model-first `candidate_buyer_paths[]` wrong_family + agent-results |
| Model-first anchor `winix-carbon-116131`: **0 PASS**, **5 FAIL**, `recommended_csv_mutation: null` | **PROVEN** model-first artifact |
| Promoting Filter H on `116131` slug would violate exact-token / wrong-family gates | **INFERRED** from aggregator rules in `air-purifier-agent-results-aggregator-v1.ts` |

### Wrong-family risks

| Risk | Label |
|------|-------|
| Filter H PDP must be re-proven with empty `wrong_family_tokens_seen` at evidence time | **UNKNOWN** — not captured in `air_purifier_agent_evidence_result_v1` shape yet |
| Neighboring SKUs `115115` / `116131` on Winix storefront | **PROVEN** cross-sell noted on live `winix-hepa-115115` retailer_links notes |
| Dual compat: 5500-2 still linked to `winix-carbon-116131` after ingest | **PROVEN** until separate demotion |

### Compatibility uncertainty

| Item | Label |
|------|-------|
| AM80 → Filter H | **INFERRED** only (PDP copy); not in 5-model sample as standalone PASS |
| Remaining 23+ models on `winix-carbon-116131` | **UNKNOWN** (model-first `unknown_facts`) |
| Pack vs single-unit semantics for Filter H | **UNKNOWN** |

### Why this does not authorize a safe CTA yet

| Gate | Status |
|------|--------|
| Catalog ingest only | No `browser_truth_classification` |
| No `air_purifier_agent_evidence_result_v1` row | No `PASS_DIRECT_BUYABLE` |
| No aggregator `auto_apply_eligible` | No apply plan / executor |
| Compat incomplete / dual-mapped | Fit-lookup may still surface wrong filter |
| Supabase parity | **PROVEN** no insert path without seed + separate auth |

---

## 7. Explicit owner decision

| Option | Effect |
|--------|--------|
| **A — APPROVE catalog ingest only** | Owner may authorize a **separate** CSV edit PR implementing §1–§4 (PROVEN rows minimum) |
| **B — DO NOT APPROVE** | No CSV changes; factory chain remains blocked at validation |

**PROVEN:** Option A does **not** set `evidence_write_authorized`, `csv_apply_authorized`, or `batch_start_authorized` in Command Center lanes.

---

## 8. Boundaries (hard)

- [ ] No evidence write (`data/air-purifier/batch-production/agent-results/`)
- [ ] No apply plan or executor run
- [ ] No CSV mutation until owner Option A + separate implementation step
- [ ] No Supabase mutation unless owner separately authorizes `import-air-purifier-seed`
- [ ] No live coverage or safe CTA claim
- [ ] No gate weakening, family-token override, or alias of `116130` → `winix-carbon-116131`
- [ ] Do **not** include `winix-filter-s-1712-0096-00` in this ingest

---

## 9. Post-ingest factory sequence (informational only)

After owner-approved CSV ingest, existing tooling (**PROVEN** sufficient):

1. `ap_hyperagent_chat_discovery_output_v1` (read-only discovery)
2. `scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts`
3. `air_purifier_agent_evidence_result_v1` commit (owner-authorized evidence write — **not** this packet)
4. `scripts/report-air-purifier-agent-results-aggregator-v1.ts`
5. `scripts/report-air-purifier-apply-planner-v1.ts`
6. `scripts/report-air-purifier-apply-executor-v1.ts` (owner-approved apply)

---

## 10. Validation commands (inspect packet only)

```bash
# Packet exists and names the slug
test -f docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md
grep -n 'winix-filter-h-116130' docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md

# Confirm candidate still absent from catalog (pre-ingest expected state)
grep -n 'winix-filter-h-116130' data/air-purifier/filters.csv data/air-purifier/retailer_links.csv data/air-purifier/filter_aliases.csv data/air-purifier/compatibility_mappings.csv; test $? -eq 1

# Confirm source evidence paths exist
test -f data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-winix-carbon-116131-live-browser-v1.results.json

# Confirm factory gates reference catalog row requirement
rg -n 'filter_slug_in_catalog|csv_row_missing' scripts/lib/air-purifier-hyperagent-chat-discovery-validation-v1.ts scripts/lib/air-purifier-apply-planner-v1.ts
```

**Expected pre-ingest:** last `rg` on `data/air-purifier/*.csv` exits **1** (no matches).

---

## 11. Mutation confirmation

| Surface | Mutated by this packet? |
|---------|-------------------------|
| `data/air-purifier/*.csv` | **No** |
| `data/air-purifier/batch-production/agent-results/` | **No** |
| Supabase | **No** |
| Public UI / deploy | **No** |
| `docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` | **Yes** — docs-only addition |
