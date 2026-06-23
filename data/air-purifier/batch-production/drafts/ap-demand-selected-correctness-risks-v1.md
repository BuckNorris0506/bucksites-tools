# AP Demand-Selected Batch — Correctness Risks (vornado-md1-0023, renpho-rp-ap003)

**Contract:** `ap_demand_selected_correctness_risks_v1`  
**Run:** `ap-demand-selected-batch-run-v1-2026-06-23`  
**Git HEAD:** `d59f3f8` — Record AP demand-selected noncanonical discovery result  
**Mode:** Read-only audit — **no CSV, Supabase, registry, evidence, or owner-decision writes**

---

## Executive verdict

| Slug | Recommendation | Label |
|------|----------------|-------|
| `vornado-md1-0023` | **Issue-track + split** — hold apply progression; resolve MD1-0023 vs MD1-0022 identity before batch closeout | PROVEN |
| `renpho-rp-ap003` | **Exclude** from future demand-selected batch progression; issue-track model/filter collision | PROVEN |

Mechanical discovery validation (`VALIDATION_PASS`, 84/84) does **not** clear either slug for progression. Both remain search-placeholder primaries with catalog correctness defects documented in committed repo sources.

---

## vornado-md1-0023

### Discovery result (noncanonical)

| Field | Value | Label |
|-------|-------|-------|
| Recommendation | `REJECT_SEARCH_CATEGORY` | PROVEN |
| Owner review required | `true` | PROVEN |
| Search placeholder defect | `true` | PROVEN |
| Wrong-family tokens noted | MD1-0023 (official carbon), MD1-0022 (repo HEPA) | PROVEN |
| `recommended_csv_mutation` | `null` | PROVEN |

### MD1-0023 vs MD1-0022 — conflict analysis

**Question:** Is this a new HyperAgent finding or already-known repo truth?

**Answer:** **Already-known catalog conflict** — discovery restates it; it does not resolve it.

| Fact | Label |
|------|-------|
| `filters.csv` row `vornado-md1-0023` uses OEM token `VORNADO-MD1-0023` and display name "AC350/500/550 HEPA cartridge" | PROVEN |
| `filters.csv` row `vornado-carbon-pad` documents official MD1-0023 = Activated Carbon 2-Pack; official HEPA = **MD1-0022**; note "pending vornado-md1-0023 HEPA slug correction" | PROVEN |
| `retailer_links.csv`: `vornado-md1-0023` primary = Vornado search URL; `browser_truth` null | PROVEN |
| `retailer_links.csv`: `vornado-carbon-pad` primary = `vornado.com/products/md1-0023-activated-carbon-filter-2-pack-1`; `browser_truth` = `direct_buyable` | PROVEN |
| Model-first (`ap-model-first-vornado-carbon-pad-live-browser-v1`): carbon MD1-0023 PROVEN buyable; companion HEPA token MD1-0022 | PROVEN |
| Official MD1-0022 HEPA PDP with Add to Cart — not opened in demand-selected bounded attempt | UNKNOWN |

**INFERRED:** Continuing batch progression on `vornado-md1-0023` without catalog split risks treating the carbon SKU as HEPA identity or promoting wrong-family compat edges.

### Catalog risks

1. **Token collision (high, PROVEN):** Manufacturer token MD1-0023 is bound to carbon on `vornado-carbon-pad` but to HEPA on `vornado-md1-0023`.
2. **Wrong-family compat (high, PROVEN):** `vornado-pc300` → `vornado-md1-0023`; model-first PROVEN PCO300 carbon = MD1-0027, not MD1-0023.
3. **Batch scope mismatch (medium, PROVEN):** Carbon path already resolved on `vornado-carbon-pad`; demand-selected batch targets the unresolved HEPA slug.

### Recommendation

- **Issue-track** catalog identity split (HEPA → MD1-0022 token / corrected slug vs carbon on `vornado-carbon-pad`).
- **Split** — do not progress `vornado-md1-0023` toward apply as HEPA-on-MD1-0023-token.
- **Exclude from apply progression** until identity packet is owner-reviewed.
- **Reclassify** owner-review disposition to `hold_needs_owner_review`.
- Carbon apply readiness is a **separate track** on `vornado-carbon-pad`, not this slug.

---

## renpho-rp-ap003

### Discovery result (noncanonical)

| Field | Value | Label |
|-------|-------|-------|
| Recommendation | `REJECT_SEARCH_CATEGORY` | PROVEN |
| Owner review required | `true` | PROVEN |
| Search placeholder defect | `true` | PROVEN |
| Brand search results | 0 | PROVEN |
| `recommended_csv_mutation` | `null` | PROVEN |

### Model / filter collision analysis

**Question:** Does demand-selected discovery change the prior posture?

**Answer:** **No** — discovery is consistent with model-first `NO_SAFE_PATH_FOUND`; collision remains unaddressed.

| Fact | Label |
|------|-------|
| `renpho-rp-ap003` in **both** `filters.csv` and `models.csv` | PROVEN |
| `oem_part_number` = `RENPHO-RP-AP003` (model code, not filter part) | PROVEN |
| Self-referential compat edge `renpho-rp-ap003,renpho-rp-ap003,true` | PROVEN |
| Model-first: `NO_SAFE_PATH_FOUND`, `expected_safe_edge_gain_if_corrected` = 0 | PROVEN |
| Renpho.com filter collection = 0 products; no official Amazon filter listings | PROVEN |
| Distinct OEM filter part number outside Renpho channels | UNKNOWN |
| Owner-review lane `discovery_ready` / `owner_review_required=false` despite model-first blockers | INFERRED |

**INFERRED:** Bare-token discovery might surface product pages, but model-first already established no official filter sold and no OEM part number — low value for batch progression.

### Catalog risks

1. **Slug collision (high, PROVEN):** Filter slug duplicates model slug; no distinct filter identity.
2. **No official buyer path (high, PROVEN):** Model-first blockers stand; discovery adds no safe link.
3. **Owner-review underweighted (medium, INFERRED):** Model-first blockers not in canonical evidence index for owner-review lane.

### Recommendation

- **Exclude** from future demand-selected batch progression until collision resolved.
- **Issue-track** model/filter disambiguation (new filter slug vs model-only slug).
- **Exclude from apply progression** — keep suppressed (`no_safe_link`).
- **Reclassify** owner-review to `exclude_no_safe_path` or `hold_needs_owner_review`.
- Review `renpho-rp-ap080` edge (possibly phantom) in identity packet.

---

## Cross-slug findings

| Finding | Label |
|---------|-------|
| Both slugs: search-placeholder primary, null `browser_truth` | PROVEN |
| Discovery artifact: noncanonical, not apply-eligible | PROVEN |
| Neither slug in canonical `AP_OWNER_REVIEW_EVIDENCE_RESULT_DIRS_V1` | PROVEN |
| Validation pass does not override catalog correctness risks | INFERRED |

---

## Recommended next steps (read-only / planning only)

1. Open Command Center issue packet(s) for Vornado HEPA/carbon split and Renpho model/filter collision.
2. Remove `renpho-rp-ap003` from future demand-selected candidate scopes.
3. Scope Vornado work to `vornado-carbon-pad` (carbon) and MD1-0022 HEPA identity correction — not `vornado-md1-0023` as HEPA-on-MD1-0023-token.
4. Reconcile owner-review evidence index to surface model-first blockers for both families.

---

## Authority artifacts (committed at `d59f3f8`)

- `data/air-purifier/batch-production/agent-results-demand-selected-v1/ap-demand-selected-batch-run-v1-2026-06-23.hyperagent-chat-discovery-v1.json`
- `data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json`
- `data/air-purifier/filters.csv`, `models.csv`, `retailer_links.csv`, `compatibility_mappings.csv`
- `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-vornado-carbon-pad-live-browser-v1.results.json`
- `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-renpho-rp-ap003-live-browser-v1.results.json`

**Structured audit JSON:** `data/air-purifier/batch-production/audits/ap-demand-selected-correctness-risks-v1.json`
