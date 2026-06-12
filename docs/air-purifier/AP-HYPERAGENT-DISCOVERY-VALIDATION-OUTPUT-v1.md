# AP HyperAgent chat discovery — validation-ready output v1

**Report type:** docs-only contract / checklist (no production mutation)  
**Wedge:** `air_purifier`  
**Truth source:** repo contracts below — not `docs/BuckParts-HQ-HANDOFF.md`

This document defines the **smallest structured shape** HyperAgent must return in **chat/output only** so Cursor can validate AP first-slice discovery without re-deriving browser facts or re-reading manufacturer sites.

---

## 1. Existing repo contracts used (PROVEN)

| Contract | Location | AP relevance |
|----------|----------|----------------|
| `buckparts_hyperagent_ingest_packet_v1` | `docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md` | `discovery_status`, `truth_closure_claimed: false`, `not_authorized[]` |
| `buckparts_cursor_validation_packet_v1` | `docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md` | Cursor closure packet — **written by Cursor after** ingest review; HyperAgent does **not** emit this |
| `air_purifier_agent_evidence_result_v1` / `ApAgentEvidenceRowV1` | `scripts/lib/air-purifier-agent-packets-v1.ts` | Row field names + `AP_AGENT_EVIDENCE_DECISIONS_V1` enum |
| `air_purifier_agent_packet_result_v1` | `scripts/lib/air-purifier-agent-results-aggregator-v1.ts` | batch-v3 `candidate_results[]` shape (`evidence_status`, `token_evidence`, etc.) |
| `post_hyperagent_validation_checklist` | `scripts/lib/bad-mapping-correction-batch-runner-v1.ts` | Pattern for post-discovery Cursor checklist (fridge compat; adapted below for AP buyer-path) |
| AP owner-review evidence index | `scripts/lib/air-purifier-owner-review-evidence-index-v1.ts` | Promotion/hold rules Cursor must reconcile (`promote_pass_reference`, batch-v3 withhold, search-placeholder defect) |
| AP owner-review lane | `.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1` | `evidence_disposition`, `owner_review_required`, mutation flags |

**UNKNOWN:** No existing repo file named `ap_hyperagent_chat_discovery_output_v1` before this doc. This doc **introduces** a chat-only ingest shape aligned with the contracts above — **not** a new Command Center lane.

---

## 2. Contract: `ap_hyperagent_chat_discovery_output_v1`

HyperAgent returns **one JSON object in chat** (fenced code block). **Do not write files.**

### Packet-level required fields

| Field | Required | Allowed values / rules |
|-------|----------|------------------------|
| `contract` | yes | `"ap_hyperagent_chat_discovery_output_v1"` |
| `packet_id` | yes | e.g. `"ap-oem-search-placeholder-v1"` (from `data/air-purifier/batch-production/agent-packets/`) |
| `wedge` | yes | `"air_purifier"` |
| `discovery_status` | yes | `DISCOVERY_OPEN` \| `DISCOVERY_COMPLETE` \| `DISCOVERY_BLOCKED` only |
| `truth_closure_claimed` | yes | **must be `false`** |
| `mutation_authorized` | yes | **must be `false`** |
| `read_only` | yes | **must be `true`** |
| `data_mutation` | yes | **must be `false`** |
| `not_canonical_evidence` | yes | **must be `true`** |
| `not_apply_eligible` | yes | **must be `true`** |
| `owner_decision` | yes | e.g. `"APPROVE_READ_ONLY_DISCOVERY_FIRST_SLICE_ONLY"` |
| `candidate_rows` | yes | non-empty array; **one row per slug in scope** |
| `proven_facts` | yes | string array; label **PROVEN:** prefix on each claim |
| `inferred_facts` | yes | string array; label **INFERRED:** prefix |
| `unknown_facts` | yes | string array; label **UNKNOWN:** prefix |

### Per-row required fields (`candidate_rows[]`)

Maps to `ApAgentEvidenceRowV1` + owner-review evidence index expectations.

| Field | Required | Rules |
|-------|----------|-------|
| `filter_slug` | yes | Must exist in `data/air-purifier/filters.csv` |
| `repo_csv_primary_url` | yes | **PROVEN** from `data/air-purifier/retailer_links.csv` primary row |
| `searched_url` | yes | URL actually opened first (usually = `repo_csv_primary_url`) |
| `final_url` | yes | Browser final URL after redirects |
| `pdp_like_final_url` | yes | `true` if official product/reference PDP; `false` if search/category/home only |
| `exact_tokens_seen` | yes | string array; tokens visible in **primary product area** only; `[]` if none |
| `wrong_family_tokens_seen` | yes | string array; competing/wrong-family tokens in primary slice; `[]` if none |
| `exact_token_in_primary_slice` | yes | boolean |
| `buy_action_seen` | yes | `true` \| `false` \| `null` (`null` = not observed) |
| `stock_state` | yes | `in_stock` \| `out_of_stock` \| `notify_me` \| `where_to_buy_only` \| `not_shown` \| `unknown` |
| `browser_truth_classification_recommendation` | yes | `direct_buyable` \| `likely_valid` \| `blocked` \| `null` |
| `recommendation` | yes | One of `AP_AGENT_EVIDENCE_DECISIONS_V1` (see §4) |
| `reference_only_reason` | if reference | Required when `recommendation` is `PASS_REFERENCE` or buy absent |
| `search_placeholder_defect` | yes | `true` if brand-prefixed catalog search returns 0 results / homepage / category only |
| `alternate_discovery_path` | no | If `search_placeholder_defect=true`, note bare-token or cross-link path tried |
| `evidence_confidence` | yes | `PROVEN` \| `INFERRED` \| `UNKNOWN` per row |
| `evidence_notes` | yes | One paragraph; cite what was seen in primary slice |
| `owner_review_required` | yes | boolean |
| `recommended_csv_mutation` | yes | **`null` for chat-only discovery** (Cursor may draft later; not HyperAgent) |
| `prior_repo_pass_reference_url` | no | If repo has `PASS_REFERENCE` PDP URL, echo it for Cursor cross-check |

### Disclaimer (required footer in chat, outside JSON)

HyperAgent must end with this exact sentence:

> This output is discovery input only — not canonical repo evidence, not apply-eligible, and not authorized to mutate CSV, Supabase, evidence files, public UI, or deploy.

---

## 3. `recommendation` allowed values (from repo)

From `scripts/lib/air-purifier-agent-packets-v1.ts` — `AP_AGENT_EVIDENCE_DECISIONS_V1`:

| Value | When to use (AP buyer-path) |
|-------|----------------------------|
| `PASS_DIRECT_BUYABLE` | Official PDP; exact token in primary slice; Add to Cart (or equivalent buy) observed |
| `PASS_REFERENCE` | Official PDP; exact or family token proven; **no** safe buy action (OOS / notify / where-to-buy only) |
| `NEEDS_OWNER_REVIEW` | PDP found but identity conflict, token ambiguity, or wrong-family notes in primary slice |
| `NO_SAFE_PATH` | No official PDP; search/homepage only; or cannot prove manufacturer product page |
| `REJECT_WRONG_FAMILY` | Official page is wrong product family vs catalog slug |
| `REJECT_SEARCH_CATEGORY` | Final URL is search/category/marketing only |
| `CATALOG_GAP` | **Do not use** in chat-only OEM discovery unless catalog row missing |
| `ALIAS_REDIRECT_GAP` | **Do not use** unless GSC/catalog alias task explicitly in scope |

**Trust gate:** HyperAgent must **not** emit `PASS_DIRECT_BUYABLE` unless `buy_action_seen === true` and exact token in primary slice — same bar as `validateAgentEvidenceRowV1()` in `scripts/lib/air-purifier-agent-results-aggregator-v1.ts`.

---

## 4. PROVEN / INFERRED / UNKNOWN labeling

| Label | Use when |
|-------|----------|
| **PROVEN** | Directly observed in live browser primary product area this session |
| **INFERRED** | Directionally supported (cross-links, bare-token search, prior repo file cited but not re-fetched live) |
| **UNKNOWN** | Not checked this session (e.g. committed PDP URL not opened) |

Put row-level claims in `evidence_notes` with prefix. Packet-level arrays must not contradict row fields.

---

## 5. Cursor `post_hyperagent_validation_checklist` (AP buyer-path)

After HyperAgent returns `ap_hyperagent_chat_discovery_output_v1`, Cursor checks **without re-browsing** when possible:

1. `contract === "ap_hyperagent_chat_discovery_output_v1"` and `truth_closure_claimed === false`
2. Every `filter_slug` ∈ scope was listed in owner decision packet / prompt
3. `repo_csv_primary_url` matches `data/air-purifier/retailer_links.csv` (**PROVEN** grep/read)
4. `recommendation` ∈ `AP_AGENT_EVIDENCE_DECISIONS_V1`
5. `PASS_DIRECT_BUYABLE` only if `buy_action_seen === true` and `exact_tokens_seen.length > 0`
6. `PASS_REFERENCE` only if `pdp_like_final_url === true` and (`reference_only_reason` or `buy_action_seen === false`)
7. `NO_SAFE_PATH` / `REJECT_SEARCH_CATEGORY` if `pdp_like_final_url === false`
8. `recommended_csv_mutation === null` (chat-only)
9. Reconcile with `loadApOwnerReviewEvidenceIndexV1()`:
   - batch-v3 withhold: promotion blocked when batch-v3 `UNKNOWN` + null mutation unless documented search-placeholder defect in prior v1 notes
   - `shark-hepa-hp100`: expect `hold_needs_owner_review` until live PDP re-proof of committed `HE1FKBAS` URL
   - `holmes-hapf30`: may stay `promote_pass_reference` with `owner_review_required: true` when search defect documented
10. Command Center mutation flags remain `false`: `batch_start_authorized`, `csv_apply_authorized`, `evidence_write_authorized`, etc.
11. **Do not** write `data/air-purifier/batch-production/agent-results/*.results.json` unless separate evidence-write authorization
12. **Do not** create `data/owner-decisions/` rows from validation alone

Optional Cursor output: `buckparts_cursor_validation_packet_v1` draft in chat with `validation_status: VALIDATION_PASS | VALIDATION_PARTIAL | VALIDATION_FAIL` — still **not** canonical until owner authorizes evidence write.

---

## 6. Example output (holmes-hapf30 — illustrative, not canonical)

```json
{
  "contract": "ap_hyperagent_chat_discovery_output_v1",
  "packet_id": "ap-oem-search-placeholder-v1",
  "wedge": "air_purifier",
  "owner_decision": "APPROVE_READ_ONLY_DISCOVERY_FIRST_SLICE_ONLY",
  "discovery_status": "DISCOVERY_COMPLETE",
  "truth_closure_claimed": false,
  "mutation_authorized": false,
  "read_only": true,
  "data_mutation": false,
  "not_canonical_evidence": true,
  "not_apply_eligible": true,
  "candidate_rows": [
    {
      "filter_slug": "holmes-hapf30",
      "repo_csv_primary_url": "https://www.holmesproducts.com/search?q=HOLMES-HAPF30",
      "searched_url": "https://www.holmesproducts.com/search?q=HOLMES-HAPF30",
      "final_url": "https://www.holmesproducts.com/search?q=HOLMES-HAPF30",
      "pdp_like_final_url": false,
      "exact_tokens_seen": [],
      "wrong_family_tokens_seen": [],
      "exact_token_in_primary_slice": false,
      "buy_action_seen": false,
      "stock_state": "not_shown",
      "browser_truth_classification_recommendation": null,
      "recommendation": "REJECT_SEARCH_CATEGORY",
      "reference_only_reason": null,
      "search_placeholder_defect": true,
      "alternate_discovery_path": "PROVEN: /search?q=HAPF30 returned reference result with HAPF300AHD / Aer1 tokens (not PDP)",
      "evidence_confidence": "PROVEN",
      "evidence_notes": "PROVEN: Brand-prefixed HOLMES-HAPF30 search returns 0 results. PROVEN: Bare HAPF30 search returns one reference/info result with HAPF300AHD and Aer1 tokens. INFERRED: Aligns with prior repo PASS_REFERENCE PDP SP_763535 (not re-fetched this session).",
      "owner_review_required": true,
      "recommended_csv_mutation": null,
      "prior_repo_pass_reference_url": "https://www.holmesproducts.com/filters/air-purifier-filters/noname/SP_763535.html"
    }
  ],
  "proven_facts": [
    "PROVEN: HOLMES-HAPF30 search placeholder returns zero results this session.",
    "PROVEN: Bare HAPF30 search returns reference tokens HAPF300AHD / Aer1."
  ],
  "inferred_facts": [
    "INFERRED: Holmes remains reference-capable via aer1 family PDP path documented in repo agent-results."
  ],
  "unknown_facts": [
    "UNKNOWN: Live stock/buy state on SP_763535 PDP — not re-fetched this session."
  ]
}
```

---

## 7. Ready-to-copy HyperAgent prompt (next AP slice)

**Surface: HyperAgent** — use after owner approves read-only discovery. **Current repo truth (2026-06-12):** first slice = **`holmes-hapf30` only**; `shark-hepa-hp100` is held until live PDP re-proof of `HE1FKBAS` URL.

```text
BuckParts AP read-only discovery — validation-ready chat output

Repo: /Users/jaredbuckman/bucksites-tools
Contract: ap_hyperagent_chat_discovery_output_v1 (see docs/air-purifier/AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md)
Owner decision: APPROVE READ ONLY DISCOVERY FIRST SLICE ONLY

Scope — exactly 1 filter slug:
- holmes-hapf30

Do NOT include shark-hepa-hp100 or any other slug.

Task:
1. Read repo_csv_primary_url from data/air-purifier/retailer_links.csv for holmes-hapf30.
2. Run live-browser manufacturer discovery.
3. If brand-prefixed search fails, try one documented alternate path (e.g. bare HAPF30) and record it in alternate_discovery_path.
4. Return ONE fenced JSON object matching ap_hyperagent_chat_discovery_output_v1 exactly (all required packet + row fields).
5. Use recommendation values from AP_AGENT_EVIDENCE_DECISIONS_V1 only.
6. Label claims PROVEN / INFERRED / UNKNOWN in evidence_notes and packet fact arrays.
7. Set recommended_csv_mutation to null.

Hard boundaries — MUST NOT:
- Write any repo file
- Set truth_closure_claimed, mutation_authorized, or not_apply_eligible to true
- Claim PASS_DIRECT_BUYABLE without buy_action_seen true and exact token in primary slice
- Claim canonical evidence or apply eligibility

End your message with:
"This output is discovery input only — not canonical repo evidence, not apply-eligible, and not authorized to mutate CSV, Supabase, evidence files, public UI, or deploy."
```

**Surface: Terminal** — Cursor validation (read-only):

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1 | {batch_start_authorized, evidence_write_authorized, csv_apply_authorized, candidate_rows: [.candidate_rows[] | select(.filter_slug=="holmes-hapf30") | {filter_slug, evidence_disposition, owner_review_required}]}'
```

---

## 8. Related docs

- `docs/air-purifier/AP-DEMAND-SELECTED-BATCH-START-OWNER-DECISION-v1.md` — owner decision scope and boundaries
- `docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md` — global HyperAgent → Cursor validation pipeline
