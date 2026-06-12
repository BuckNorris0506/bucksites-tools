# AP evidence-write owner review — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** read-only owner decision support — **live re-proof + canonical evidence write authorization only**  
**Generated:** 2026-06-10  
**Repo checkpoint:** `ce9de9c`  
**Scope:** **one** filter slug only — `winix-filter-h-116130` — **not** `winix-filter-s-1712-0096-00`, **not** `winix-carbon-116131` demotion/repair  
**Truth source:** committed CSV, discovery fixture, mechanical validator, batch-v2 reference slugs (not HQ handoff)

**Prior packet:** Catalog ingest was authorized separately in `docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (Option A). This packet covers the **next** factory step only.

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to run **live browser re-proof** for `winix-filter-h-116130` | CSV apply, apply-plan execution, or executor run |
| Owner approval to write **canonical** `air_purifier_agent_evidence_result_v1` **only if** live re-proof passes existing gates | Authorization for safe CTA, live coverage, `/go`, or public UI mutation |
| A scope lock on evidence write for **one slug** | Supabase seed/import, deploy, or `data/owner-decisions/` row creation |
| Docs-only until owner records Option A in chat | Permission to use model-first proof alone as canonical evidence |

**PROVEN:** No production, app, CSV, Supabase, evidence-file, or deploy mutation occurs from this document alone.

**PROVEN:** Option A does **not** set `csv_apply_authorized`, `batch_start_authorized`, `supabase_mutation_authorized`, `public_ui_mutation_authorized`, or `netlify_api_authorized`.

**PROVEN:** Option A authorizes **attempting** live re-proof and **conditional** evidence write — not unconditional promotion to `direct_buyable` in `retailer_links.csv`.

---

## Owner decision box

Choose **exactly one** and record in chat. **Do not** create `data/owner-decisions/` registry rows from this packet unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE LIVE RE-PROOF + CONDITIONAL EVIDENCE WRITE ONLY         │
│                                                                             │
│  I approve live browser re-proof for winix-filter-h-116130 per §2.          │
│                                                                             │
│  I authorize canonical evidence write ONLY IF the live session produces     │
│  a row satisfying air_purifier_agent_evidence_result_v1 gates per §3      │
│  (PASS_DIRECT_BUYABLE, direct_buyable, buy_action_seen true,               │
│  wrong_family_tokens_seen [], owner_review_required false).                │
│                                                                             │
│  I do NOT approve: CSV apply, apply plan, executor, Supabase, deploy,       │
│  safe CTA claim, or gate weakening.                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve live re-proof or evidence write for                       │
│  winix-filter-h-116130 at this time.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Current state (PROVEN at `ce9de9c`)

### Catalog identity — complete

| Artifact | Status | Proof |
|----------|--------|-------|
| `data/air-purifier/filters.csv` | Row exists | `winix,winix-filter-h-116130,WINIX-116130,...` |
| `data/air-purifier/retailer_links.csv` | Primary `oem-catalog` search placeholder | `https://www.winixamerica.com/search?q=WINIX-116130`; empty `browser_truth_*` |
| `data/air-purifier/filter_aliases.csv` | Alias `116130` | `winix-filter-h-116130,116130` |
| `data/air-purifier/compatibility_mappings.csv` | PROVEN mapping only | `winix-5500-2,winix-filter-h-116130,true` |

**PROVEN:** `winix-5500-2 → winix-carbon-116131` row still present — demotion/repair is a **separate** owner task.

### Discovery — fixture exists, mechanically validated

| Artifact | Path |
|----------|------|
| Discovery fixture | `data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-winix-filter-h-116130-v1.json` |
| Contract | `ap_hyperagent_chat_discovery_output_v1` |
| Mechanical validator | `scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts` |
| Last known result | `VALIDATION_PASS` (23/23 checks) |

**PROVEN:** Fixture has `not_canonical_evidence: true`, `not_apply_eligible: true`, `owner_review_required: true` on the candidate row.

**INFERRED:** Fixture synthesizes buyer-path facts from model-first artifact — not a substitute for canonical evidence.

### Canonical evidence — missing

| Check | Status |
|-------|--------|
| Row in `data/air-purifier/batch-production/agent-results/*.results.json` | **No** row for `winix-filter-h-116130` |
| Row in `data/air-purifier/batch-production/agent-results-batch-v2/*.results.json` | **No** row for `winix-filter-h-116130` |
| Aggregator `auto_apply_eligible` | **No** entry for this slug |
| `retailer_links.csv` `browser_truth_classification` | **Empty** (search placeholder) |

### Live coverage — not claimed

**PROVEN:** No `direct_buyable` browser truth on committed `retailer_links.csv` row.  
**PROVEN:** No apply plan or executor run exists for this slug.  
**UNKNOWN:** Current in-stock / price on Winix storefront at time of future live session.

### Supporting (non-canonical) proof — reference only

| Source | Use |
|--------|-----|
| `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-winix-carbon-116131-live-browser-v1.results.json` | Directional PDP URL + token + buyability under anchor `winix-carbon-116131` |
| Batch-v2 sibling `winix-hepa-115115` row | Pattern for Winix OEM search-placeholder → PDP promotion after evidence + apply |

**Explicit rule:** Model-first `candidate_buyer_paths[]` for Filter H **must not** be transcribed into canonical evidence without the dedicated live re-proof in §2.

---

## 2. Required live re-proof (session checklist)

HyperAgent or equivalent live browser — **one slug only**: `winix-filter-h-116130`.

### Open path

1. Read `repo_csv_primary_url` from committed `retailer_links.csv` primary row:
   - **PROVEN:** `https://www.winixamerica.com/search?q=WINIX-116130`
2. Open that URL first (`candidate_url` / `searched_url` in evidence row).
3. If brand-prefixed search fails or returns no in-family PDP, document alternate path in `evidence_notes` (holmes-class / winix-hepa-class rescue) — **do not** weaken token gates.

### Target PDP

- **Expected (INFERRED from model-first):** `https://www.winixamerica.com/product/filter-h-116130/`
- **Required:** `final_url` must be the **inspected** official manufacturer PDP, not the CSV search placeholder alone.

### Primary product area — must prove

| Requirement | Gate |
|-------------|------|
| Exact token `116130` visible | Required in `exact_tokens_seen`; `exact_token_in_primary_slice` equivalent in notes |
| Add to Cart (or equivalent buy) | `buy_action_seen: true` |
| In stock (or equivalent buyable state) | Document in `evidence_notes` |
| Wrong-family tokens in primary slice | **None** — `wrong_family_tokens_seen: []` |
| Cross-sell / related products | Document neighboring tokens (e.g. `115115`, `116131`) **only** if seen outside primary slice — mirror batch-v2 winix-hepa note pattern |

### Fail-closed outcomes (no evidence write)

| Live outcome | Evidence `decision` |
|--------------|---------------------|
| No official PDP reached | `NO_SAFE_PATH` or `REJECT_SEARCH_CATEGORY` |
| PDP reached but wrong product family vs catalog slug | `REJECT_WRONG_FAMILY` or `NEEDS_OWNER_REVIEW` |
| PDP reached, correct family, no Add to Cart | `PASS_REFERENCE` (not authorized for write under Option A) |
| Primary slice contains wrong-family tokens | `NEEDS_OWNER_REVIEW` or invalid row — **not** `PASS_DIRECT_BUYABLE` with non-empty `wrong_family_tokens_seen` |

**PROVEN:** `validateAgentEvidenceRowV1()` rejects `PASS_DIRECT_BUYABLE` when `wrong_family_tokens_seen.length > 0` or `buy_action_seen !== true`.

---

## 3. Required canonical evidence row shape (write only if §2 passes)

### File envelope

Target path (operator choice after Option A):

- `data/air-purifier/batch-production/agent-results-batch-v2/ap-oem-search-placeholder-v1.results.json` (append row — matches batch-v2 winners), **or**
- New results file under `data/air-purifier/batch-production/agent-results/` consumed by aggregator

```json
{
  "contract": "air_purifier_agent_evidence_result_v1",
  "packet_id": "ap-oem-search-placeholder-v1",
  "generated_at": "<ISO-8601 live session timestamp>",
  "read_only_submission": true,
  "no_commit": true,
  "no_deploy": true,
  "rows": [ "<single row below>" ]
}
```

### Row template (illustrative — values from live session, not pre-filled)

```json
{
  "packet_id": "ap-oem-search-placeholder-v1",
  "slug": "winix-filter-h-116130",
  "decision": "PASS_DIRECT_BUYABLE",
  "candidate_url": "https://www.winixamerica.com/search?q=WINIX-116130",
  "final_url": "https://www.winixamerica.com/product/filter-h-116130/",
  "browser_truth_classification": "direct_buyable",
  "exact_tokens_seen": ["116130", "Filter H – 116130"],
  "wrong_family_tokens_seen": [],
  "buy_action_seen": true,
  "reference_only_reason": null,
  "evidence_notes": "PROVEN: <live session date> opened repo search placeholder. PROVEN: Official Filter H PDP primary H1/title Filter H – 116130; exact token 116130 in primary product area. PROVEN: In stock with Add to cart. PROVEN: Compatible models include 5500-2 per product copy. INFERRED: Catalog internal token WINIX-116130 not printed on PDP (alias 116130 per filter_aliases.csv). PROVEN: Neighboring SKUs <list if seen> appear only in cross-sell/related—not wrong-family in primary slice.",
  "recommended_csv_mutation": null,
  "owner_review_required": false
}
```

### Field rules (from repo contracts)

| Field | Required value | Source |
|-------|----------------|--------|
| `contract` (file) | `air_purifier_agent_evidence_result_v1` | `scripts/lib/air-purifier-agent-packets-v1.ts` |
| `slug` | `winix-filter-h-116130` | Scope lock |
| `decision` | `PASS_DIRECT_BUYABLE` | Only if live §2 passes |
| `browser_truth_classification` | `direct_buyable` | Aggregator strict check |
| `buy_action_seen` | `true` | `validateAgentEvidenceRowV1` |
| `exact_tokens_seen` | Must include `116130` | Primary slice only |
| `wrong_family_tokens_seen` | `[]` | Required for `auto_apply_eligible` |
| `owner_review_required` | `false` | Required for `auto_apply_eligible` |
| `recommended_csv_mutation` | `null` | **PROVEN:** batch-v2 winners use `null`; `scripts/lib/air-purifier-apply-planner-batch-v2-v1.ts` synthesizes mutation from `final_url` |
| `evidence_notes` | PROVEN / INFERRED / UNKNOWN prefixes | Per `AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md` labeling |

### Reference slugs that reached apply (batch-v2)

| Slug | `final_url` pattern | `recommended_csv_mutation` |
|------|---------------------|----------------------------|
| `winix-hepa-115115` | `…/product/filter-a-115115/` | `null` → synthesized at apply-plan time |
| `gg-flt5000` | Guardian Technologies PDP | `null` |
| `coway-max2-hepa` | cowaymega.com PDP | `null` |
| `rabbit-biogs-minusa2` | rabbitair.com PDP | `null` |

**INFERRED:** `winix-filter-h-116130` should follow the same `recommended_csv_mutation: null` pattern unless a future planner version changes requirements.

### Post-write validation (read-only)

After evidence file commit (separate step, owner-authorized):

```bash
node --import tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  --results-dir=data/air-purifier/batch-production/agent-results-batch-v2
```

Expect `winix-filter-h-116130` in `review_groups.auto_apply_eligible` **only if** row passes all strict checks.

---

## 4. Explicit owner decision

See **Owner decision box** above.

| Option | Authorizes | Does **not** authorize |
|--------|------------|------------------------|
| **A** | Live re-proof; conditional canonical evidence write if gates pass | CSV apply, apply plan, executor, Supabase, deploy, safe CTA, gate weakening |
| **B** | Nothing | — |

---

## 5. Boundaries (hard)

- [ ] No CSV apply (`retailer_links.csv` stays search placeholder until **separate** apply authorization)
- [ ] No apply plan write or executor run from this packet
- [ ] No live safe CTA or coverage claim
- [ ] No Supabase mutation (`import-air-purifier-seed` or other)
- [ ] No deploy / Netlify API mutation
- [ ] No gate weakening, family-token override, or token exceptions
- [ ] No use of model-first proof alone as canonical evidence
- [ ] No `data/owner-decisions/` row unless separately requested
- [ ] No demotion of `winix-carbon-116131` compat mappings in this packet
- [ ] Do **not** include `winix-filter-s-1712-0096-00`

### Factory sequence after Option A (informational — not authorized by this packet alone)

1. Live browser re-proof (§2)
2. Canonical evidence write (§3) — **if and only if** gates pass
3. `scripts/report-air-purifier-agent-results-aggregator-v1.ts` (read-only verify)
4. **Separate** owner packet for apply / CSV mutation
5. `scripts/report-air-purifier-apply-planner-batch-v2-v1.ts` (read-only plan)
6. **Separate** owner approval → apply executor

---

## 6. Validation (read-only commands)

Run from repo root at checkpoint `ce9de9c` or later.

### Inspect this packet

```bash
grep -n 'winix-filter-h-116130' docs/air-purifier/AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md
test -f docs/air-purifier/AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md && echo "packet: OK"
```

### Confirm catalog rows exist

```bash
grep 'winix-filter-h-116130' data/air-purifier/filters.csv \
  data/air-purifier/retailer_links.csv \
  data/air-purifier/filter_aliases.csv \
  data/air-purifier/compatibility_mappings.csv
```

### Rerun discovery fixture mechanical validator

```bash
node --import tsx scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts \
  --packet=data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-winix-filter-h-116130-v1.json \
  --scope=winix-filter-h-116130
```

Expect `validation_status: "VALIDATION_PASS"`.

### Confirm retailer_links row is still search-placeholder (pre-evidence-write)

```bash
awk -F',' '$1=="winix-filter-h-116130" && $4=="true" {
  print "filter_slug:", $1
  print "destination_url:", $7
  print "browser_truth_classification:", $8
  print "browser_truth_notes:", $9
  print "browser_truth_checked_at:", $10
}' data/air-purifier/retailer_links.csv
```

**PROVEN expected before evidence write:**

- `destination_url` contains `/search?q=WINIX-116130`
- `browser_truth_classification` empty
- `browser_truth_notes` empty
- `browser_truth_checked_at` empty

### Confirm canonical evidence still absent

```bash
grep -r 'winix-filter-h-116130' data/air-purifier/batch-production/agent-results/ \
  data/air-purifier/batch-production/agent-results-batch-v2/ 2>/dev/null || echo "canonical evidence: absent (expected)"
```

### Confirm Command Center mutation flags (read-only snapshot)

```bash
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    const lane=j.command_center_v2?.air_purifier_demand_selected_batch_owner_review_v1;
    if(!lane){console.log('lane: not found');process.exit(0)}
    console.log(JSON.stringify({
      evidence_write_authorized: lane.evidence_write_authorized,
      csv_apply_authorized: lane.csv_apply_authorized,
      batch_start_authorized: lane.batch_start_authorized,
      supabase_mutation_authorized: lane.supabase_mutation_authorized
    },null,2));
  });"
```

**PROVEN:** This packet alone does not flip these flags.

---

## 7. Related docs

- `docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` — prior catalog ingest (complete)
- `docs/air-purifier/AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md` — discovery contract + post-validation checklist
- `data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-winix-filter-h-116130-v1.json` — non-canonical discovery input
- `data/air-purifier/batch-production/agent-results-batch-v2/ap-oem-search-placeholder-v1.results.json` — batch-v2 reference rows (`winix-hepa-115115`, etc.)

---

## 8. Disclaimer

This packet is owner decision support only. Option A authorizes **attempting** live re-proof and **conditional** canonical evidence write. It does **not** authorize CSV apply, safe CTA, live coverage claims, Supabase mutation, or deploy. Model-first artifacts are directional reference only and must not be used alone as canonical evidence.
