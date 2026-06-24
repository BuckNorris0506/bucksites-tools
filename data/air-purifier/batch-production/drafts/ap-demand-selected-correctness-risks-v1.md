# AP Demand-Selected Batch — Correctness Risks (vornado superseded, renpho-rp-ap003)

**Contract:** `ap_demand_selected_correctness_risks_v1`  
**Run:** `ap-demand-selected-batch-run-v1-2026-06-23`  
**Git HEAD:** `f3c2141` — Repair Vornado MD1-0022 HEPA identity  
**Supersession:** BP-000005 **CLOSED_PROVEN** at `f3c2141`  
**Mode:** Read-only audit — **no CSV, Supabase, registry, evidence, or owner-decision writes**

---

## Executive verdict

| Slug | Recommendation | Label |
|------|----------------|-------|
| `vornado-md1-0023` (retired) | **Superseded** — BP-000005 CLOSED_PROVEN; CSV split repaired at `f3c2141` | PROVEN |
| `vornado-md1-0022` (new HEPA) | HEPA identity live in CSV; search-placeholder primary; carbon on `vornado-carbon-pad` | PROVEN |
| `renpho-rp-ap003` | **Exclude** from future demand-selected batch progression; issue-track model/filter collision | PROVEN |

Mechanical discovery validation (`VALIDATION_PASS`, 84/84) does **not** clear **renpho-rp-ap003** for progression. Vornado blocking verdict **cleared** after CSV repair and BP-000005 closure.

---

## BP-000005 supersession (`f3c2141`)

| Repair | Status |
|--------|--------|
| `vornado-md1-0022` HEPA slug created (`VORNADO-MD1-0022`) | PROVEN |
| `vornado-md1-0023` HEPA-on-MD1-0023 identity retired | PROVEN |
| Carbon remains `vornado-carbon-pad` (`direct_buyable`) | PROVEN |
| `vornado-pc300 -> vornado-md1-0023` edge removed | PROVEN |
| AC-family HEPA compat remapped to `vornado-md1-0022` | PROVEN |
| Supabase parity | **Not claimed** |

**Runtime validation observed (not durable artifacts in repo):** `npm run build` PASS; `npm run buckparts:operator-proof` RESULT OK; `buckparts:production-truth:ap` exit 0 (Supabase cases skipped).

**Updated audit verdict:** `vornado_md1_0023_status=catalog_identity_repaired_csv_f3c2141` (non-blocking).

---

## vornado-md1-0023 (historical — superseded)

Pre-repair discovery and catalog conflict analysis remain valid as **historical evidence** at `d59f3f8`. Post-repair catalog state is authoritative at `f3c2141`. Do not treat demand-selected discovery on the retired slug as apply progression.

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

**Answer:** **No** — discovery is consistent with model-first `NO_SAFE_PATH_FOUND`; collision remains unaddressed. **BP-000006 remains open.**

| Fact | Label |
|------|-------|
| `renpho-rp-ap003` in **both** `filters.csv` and `models.csv` | PROVEN |
| `oem_part_number` = `RENPHO-RP-AP003` (model code, not filter part) | PROVEN |
| Self-referential compat edge `renpho-rp-ap003,renpho-rp-ap003,true` | PROVEN |
| Model-first: `NO_SAFE_PATH_FOUND`, `expected_safe_edge_gain_if_corrected` = 0 | PROVEN |
| Renpho.com filter collection = 0 products; no official Amazon filter listings | PROVEN |
| Distinct OEM filter part number outside Renpho channels | UNKNOWN |

### Recommendation

- **Exclude** from future demand-selected batch progression until collision resolved.
- **Issue-track** model/filter disambiguation (BP-000006).
- **Exclude from apply progression** — keep suppressed (`no_safe_link`).

---

## Cross-slug findings

| Finding | Label |
|---------|-------|
| BP-000005 Vornado CSV identity split repaired at `f3c2141` | PROVEN |
| renpho-rp-ap003: search-placeholder primary, blocking verdict active | PROVEN |
| Discovery artifact: noncanonical, not apply-eligible | PROVEN |
| Command Center correctness steering may remain active for BP-000006 only | INFERRED |

---

## Recommended next steps (read-only / planning only)

1. Resolve **BP-000006** renpho model/filter collision.
2. Remove `renpho-rp-ap003` from future demand-selected candidate scopes.
3. Optional: bounded MD1-0022 HEPA PDP browser evidence for `vornado-md1-0022`.
4. `vornado-carbon-pad` carbon apply readiness — separate owner track.

---

## Authority artifacts

- `data/command-center/issues/BP-000005.json` (CLOSED_PROVEN at `f3c2141`)
- `data/air-purifier/filters.csv`, `retailer_links.csv`, `compatibility_mappings.csv` (repaired at `f3c2141`)
- `data/air-purifier/batch-production/agent-results-demand-selected-v1/ap-demand-selected-batch-run-v1-2026-06-23.hyperagent-chat-discovery-v1.json` (historical)
- `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-renpho-rp-ap003-live-browser-v1.results.json`

**Structured audit JSON:** `data/air-purifier/batch-production/audits/ap-demand-selected-correctness-risks-v1.json`
