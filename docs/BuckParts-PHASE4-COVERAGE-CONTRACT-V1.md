# BuckParts Phase 4 Coverage Contract v1

**Status:** PROVEN as the durable P4-ENTRY definition for Command Center scoreboard wiring.
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does not authorize mutation, deploy, founder approval, or HyperAgent eligibility.
**Anchor:** Phase 3 complete at `2b39ee9e7443d990392bb880613b613bb9de6ac6` (`PHASE_3_COMPLETE_ANCHOR_PROVEN`).

---

## 1. What Phase 4 “Coverage” means

Coverage is **not** page count. Phase 4 measures distinct, non-interchangeable dimensions:

| Dimension | Meaning | Canonical source |
|-----------|---------|------------------|
| Safe buyer paths | `SAFE_BUYER_PATH_PROVEN` inventory | `all_product_safe_buyer_path_census_v1` |
| Suppression / noindex | Suppressed-trust and noindex page states | Same census |
| Inventory | Committed CSV product pages + launch state by wedge | Census `wedge_coverage` |
| Demand gaps | GSC × wedge join / next-lane recommendation | `demand_to_coverage_next_lane_v1` |
| Sitemap / indexability | Repo expected vs live sitemap; campaign readiness | `buckparts_sitemap_indexability_audit_v1` |
| Retailer-link parity | CSV↔Supabase parity posture (truth sync, not new SKUs) | `buckparts_retailer_link_parity_correction_v1` |
| Wedge launch state | Formal spine / partial / sample + public opening posture | `wedge_truth_spine_coverage_matrix_v1` |
| Customer-visible closure | Live HTML / CTA-go proof when available | `fridge_truth_spine_v1.model_pdp_live_html_proof` (and peers when proven) |

**Hard rule:** Prefer census safe-buyer-path counts over incompatible or differently-defined `safe_cta_count` fields from other lanes. Do not invent aggregate coverage percentages or wedge-completion claims.

**Constitution:** Coverage breadth is Trust Hierarchy #7. Thin pages must not justify weak buy paths. Demand is not proof of fit or buy eligibility.

---

## 2. P4-ENTRY deliverable

The entry layer is a **read-only Command Center scoreboard**:

- Contract: `phase4_coverage_scoreboard_v1`
- CC path: `.command_center_v2.phase4_coverage_scoreboard_v1`
- Impl: `scripts/lib/buckparts-phase4-coverage-scoreboard-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`
- No autonomous steering or mutation authority
- Recommendations remain evidence-oriented and read-only

---

## 3. Fail-closed gates

1. Missing or malformed required census report → `runtime_status=NOT_PROVEN` with exact blockers; no invented counts.
2. Blockers are exact strings, deduplicated, and sorted.
3. Source lane paths are listed deterministically.
4. UNKNOWN is preserved where GSC, live proof, or peer wedge closure evidence is unavailable.
5. Scoreboard never authorizes CSV, Supabase, retailer_links, evidence, dispatch, or deploy mutation.

---

## 4. Out of scope for P4-ENTRY

- New product pages or inventory expansion apply
- WHW or sample-wedge public opening
- Evidence packet generation / mutation
- Founder approvals, dispatch history writes, commit/push/deploy
- HQ handoff rewrite (separate founder-gated step)
- Claiming Phase 4 complete or HyperAgent eligibility

---

## 5. Validation

```bash
BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase4-coverage-scoreboard-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:phase4-p4-entry
# or full packet:
npm run buckparts:phase3-self-correction
npm run buckparts:phase2-operating-coherence
npm run buckparts:deploy:preflight
npm run buckparts:credit-control
npm run buckparts:ship-guard -- --enforce
npm run build
git diff --check
```

Prove scoreboard presence:

```bash
node --import tsx scripts/report-buckparts-command-center.ts \
  | jq '.command_center_v2.phase4_coverage_scoreboard_v1 | {contract,read_only,data_mutation,mutation_authorized,runtime_status}'
```

---

## 6. Sibling pointer (Decision-Capture)

Supply-side P4-ENTRY scoreboard behavior is unchanged by Decision-Capture.

Customer decision outcomes (BUY / DO-NOT-BUY / UNKNOWN) are measured by the sibling contract:

- `docs/BuckParts-PHASE4-DECISION-CAPTURE-CONTRACT-V1.md`
- CC path: `.command_center_v2.phase4_decision_capture_v1`

Decision-Capture does not overwrite census-backed supply dimensions in `phase4_coverage_scoreboard_v1`.

---

## 7. Not claimed

Conversion, revenue, ranking, SEO impact, executable safe-buyer-path delta, Phase 4 complete, HyperAgent eligibility, deploy/credit spend authorization.
