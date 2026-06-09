# Frigidaire 242017801 bounded evidence slice 046fb82e — Cursor validation v1

**Executive verdict:** `VALIDATION_PARTIAL`

Ingest packet contract **passes**. All 4 slugs exist in repo and packet `current_mapped_filters` match `compatibility_mappings.csv` (6 filters each). HyperAgent discovery supports token identity `242017801=ULTRAWF` and directionally useful filter-family signals, but **0/4** rows have exact-model Frigidaire manufacturer evidence. **2/4** rows fail validation due to phantom/typo catalog defects. No repo truth closure authorized.

| Field | Value |
|-------|-------|
| `validation_status` | **VALIDATION_PARTIAL** |
| `repo_truth_closure_authorized` | **false** |
| `mutation_authorized` | **false** |
| `owner_review_required` | **true** |
| pass / partial / fail | **0 / 2 / 2** |

**Artifacts:**
- Ingest: `data/fridge/batch-production/drafts/frig-242017801-bounded-evidence-slice-046fb82e-hyperagent-ingest-packet-v1.json`
- Validation: `data/fridge/batch-production/drafts/frig-242017801-bounded-evidence-slice-046fb82e-cursor-validation-v1.json`

---

## 1. Packet contract

| Check | Result |
|-------|--------|
| `packet_type=buckparts_hyperagent_ingest_packet_v1` | ✔ |
| `mission_type=BOUNDED_EVIDENCE_SLICE` | ✔ |
| `family_key=filter::frigidaire::frig-242017801` | ✔ |
| `queue_item_id=ada897261219ce09` | ✔ |
| `discovery_status=DISCOVERY_COMPLETE` | ✔ |
| `truth_closure_claimed=false` | ✔ |
| `mutation_authorized=false` | ✔ |
| `read_only=true` / `data_mutation=false` | ✔ |

---

## 2. Repo baseline

| Check | Result |
|-------|--------|
| Slugs in `fridge_models.csv` | **4/4** |
| Packet `current_mapped_filters` = `compatibility_mappings.csv` | **4/4** (6 filters each) |
| Audit classification | **4/4** `LIKELY_CORRECT_NEEDS_EVIDENCE` (not `WRONG_PART_RISK`) |
| Manual evidence in batch | **0/4** |
| Multi-mapped (6 filters) | **4/4** |
| `frig-242017801` family reconciliation | **15** model-line conflicts / **HIGH** severity |

**Packet drift:** HyperAgent marks `frigidaire-frfs2613as` as `DISCOVERY_COMPLETE` / `PROVEN` FPPWFU01; repo audit still classifies all 4 as `LIKELY_CORRECT_NEEDS_EVIDENCE` with `evidence_status=NONE` because evidence is family PDF inference, not exact-model manufacturer proof.

---

## 3. Token identity: 242017801 = ULTRAWF

| Item | Repo truth |
|------|------------|
| `filters.csv` | Separate rows: `ultrawf` (ULTRAWF) and `frig-242017801` (242017801) |
| `filter_aliases.csv` | `ultrawf` → ULTRAWF, PureSource Ultra; `frig-242017801` → 242017801 |
| Cross-alias ultrawf ↔ frig-242017801 | **None** |
| Batch slug co-maps | **Both** `ultrawf` and `frig-242017801` on all 4 slugs |

**Cursor assessment:** External cross-reference discovery supports identity claim; repo models duplicate catalog tokens with parallel compat co-maps. **No consolidation performed.** Recommend a **separate owner-review lane** for alias/token consolidation — not auto-merge during this bounded slice.

---

## 4. Data-quality alerts

| Slug | Alert | Cursor assessment |
|------|-------|-------------------|
| `frigidaire-grfs2633af` | PHANTOM_MODEL_NUMBER | Slug in `fridge_models.csv` but zero public database hits — suppress or verify before filter work |
| `frigidaire-grfs2833af` | PHANTOM_MODEL_NUMBER_LIKELY_TYPO | Likely 2833→2853 transposition (GRFS2853AF external only; **not** in repo) — do not retarget without rating-plate proof |

**GRFS prefix correction:** HyperAgent reports GRFS is **French Door** (Gallery), not side-by-side. Affects reconciliation heuristics; repo still holds phantom GRFS slugs with 6-filter co-maps.

---

## 5. Evidence row separation

| Category | Count | Slugs |
|----------|-------|-------|
| Exact official manufacturer | **0** | — |
| Third-party / direct parts | **1** | `fghd2365tf` |
| Sibling / family-inferred | **1** | `frfs2613as` |
| Token-identity (external) | **1** | 242017801=ULTRAWF scope |
| Phantom / typo model | **2** | `grfs2633af`, `grfs2833af` |
| Owner-browser-required | **4** | all slugs |

---

## 6. Per-slug verdict table

| Slug | Repo maps | Discovered | Category | Verdict |
|------|-----------|------------|----------|---------|
| `frigidaire-fghd2365tf` | 6 co-maps incl. `ultrawf`, `frig-242017801` | ULTRAWF (242017801); EPTWFU01 ambiguity | third-party + token identity | **PARTIAL** |
| `frigidaire-frfs2613as` | 6 co-maps | FPPWFU01 → `purepour` | family PDF inference | **PARTIAL** |
| `frigidaire-grfs2633af` | 6 co-maps | none (phantom) | phantom model | **FAIL** |
| `frigidaire-grfs2833af` | 6 co-maps | none (likely GRFS2853AF typo) | phantom/typo | **FAIL** |

**Verdict key:** PASS = `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`; PARTIAL = `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`; FAIL = `VALIDATION_FAIL`

---

## 7. Recommended owner action

1. **Catalog reconciliation first** — `frigidaire-grfs2633af` (phantom) and `frigidaire-grfs2833af` (likely typo). No compat edits until owner confirms or suppresses slugs.
2. **Owner-browser Tier-1 proof** — exact-model Frigidaire `filter_specification` for `fghd2365tf` (resolve ULTRAWF vs EPTWFU01) and `frfs2613as` (confirm FPPWFU01 on exact model, not family PDF alone).
3. **Separate token-consolidation lane** — evaluate `242017801` / `ULTRAWF` / `frig-242017801` / `ultrawf` alias consolidation with owner approval; this validation does not merge tokens.
4. **Hold 6-filter co-map removals** — discovery is directionally useful but repo audit has not elevated these slugs to `WRONG_PART_RISK`; no CSV/Supabase/page mutation until per-slug checklist passes.
5. **Do not mutate** compat CSV, manual-evidence JSON, Supabase, pages, retailer links, sitemap/robots, or HQ handoff from this validation.

**Proposed next Cursor step:** Extend `refrigerator-truth-repair-owner-review-v1` with this bounded-slice cohort after catalog defects cleared.

---

## 8. Alias consolidation lane recommendation

| Field | Value |
|-------|-------|
| Recommend separate lane? | **Yes** |
| Proposed lane | `frigidaire-242017801-ultrawf-token-consolidation-owner-review-v1` |
| Why | Repo duplicate slugs with parallel co-maps; external identity claim is discovery-only until owner approves catalog/alias merge |
