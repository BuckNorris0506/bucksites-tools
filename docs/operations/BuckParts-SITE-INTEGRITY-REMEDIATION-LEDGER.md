# BuckParts Site-Integrity Remediation Ledger

**Purpose:** Durable anti-drift closure record for roots **R01–R17** from the **October 10, 2026 BuckParts Production Site Integrity Baseline**.  
**This document is not the baseline.** Do not rewrite or replace the historical baseline artifact.

**Ledger contract:** `buckparts_site_integrity_remediation_ledger_v1`  
**Ledger created:** 2026-10-10  
**Repo worktree:** `/Users/jaredbuckman/bucksites-tools-r01`

---

## Immutable baseline reference

| Field | Value |
|--------|--------|
| Baseline name | October 10, 2026 BuckParts Production Site Integrity Baseline |
| Root ID namespace | `R01` … `R17` (17 roots) |
| Baseline artifact in repo | **UNKNOWN** — no committed copy of the full baseline text or per-root definitions was found under `docs/`, `data/ops/`, or `data/command-center/` at ledger creation time |
| Rule | Copy titles, priorities, scopes, and audit wording from the immutable baseline when ingesting; **do not paraphrase the baseline into this ledger as if it were the source of truth** |

---

## Release gate policy

**BROAD_DISTRIBUTION_RELEASE = BLOCKED** while any audit-defined **required pre-distribution P0/P1** root remains in a state other than:

- **VERIFIED_CLOSED**, or  
- **DEFERRED_ALLOWED** only where the **original baseline explicitly permits deferral** (not convenience).

**Audit sequencing (unchanged):**

1. R01 — production / static assets  
2. Restore / verify **search** and **measurement** consequences  
3. P1 **truth / claim / data** corrections  
4. **Current commercial-link** reconciliation  
5. **Navigation / origin / indexability / provenance / social-image** fixes  
6. **Rerun** the production integrity baseline  
7. Only then reconsider **broad distribution**

---

## Closure standard

**VERIFIED_CLOSED** never means: worker says done, local code only, local tests only, commit exists, or deploy CLI success alone.

| Defect class | Closure requires |
|--------------|------------------|
| Production / runtime | Independent **production** verification (readback), not local-only proof |
| Truth / claims | Authoritative source or evidence validation + proof that **affected rendered outputs** changed correctly |
| Commercial / affiliate paths | Current destination, classification, and tag evidence **without** contaminating production click analytics |
| Measurement | **Natural** observed instrumentation behavior (no injected / manual fake events) |

If full closure cannot be established: **BLOCKED**, **AWAITING_PRODUCTION_VERIFICATION**, or another truthful state. **UNKNOWN** stays **UNKNOWN**.

---

## Anti-drift rules

1. Never remove an audit root from this ledger because priority changed.  
2. Close only with **durable evidence** recorded under **CLOSURE_EVIDENCE**.  
3. If a repair exposes a **different** root cause, add or split a root explicitly; do not silently expand scope of an existing root.  
4. Do not reopen **VERIFIED_CLOSED** without new **contradictory** evidence.  
5. Every active root must have **NEXT_LAWFUL_ACTION**, **BLOCKER**, **VERIFIED_CLOSED**, or justified **DEFERRED_ALLOWED**. No orphaned **IN_PROGRESS** without owner and next step.  
6. A new conversation, branch, model, or worker must determine state from **this ledger + immutable baseline**, not chat memory.  
7. The **historical audit baseline remains immutable.**

---

## Root records

### R01

| Field | Value |
|--------|--------|
| **ROOT_ID** | R01 |
| **TITLE** | Referenced production assets missing (CSS and Next.js static chunks) |
| **PRIORITY** | P0 |
| **RELEASE_BLOCKER** | YES |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | Site-wide public HTML references `/_next/static/*` assets that return **404** with **`text/html`**; unstyled rendering and failed hydration (October 10, 2026 baseline). |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN — tracked on `codex/buckparts-r01-production-assets` (separate release candidate). |
| **CLOSURE_REQUIREMENTS** | Per baseline + production closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Separate R01 lane |
| **NEXT_LAWFUL_ACTION** | Close via R01 PR — not this Amazon truth branch |
| **LAST_UPDATED** | 2026-10-10 |

**R01 audit closure expectations (not passed until evidence exists):**

- Production HTML loads  
- Referenced JS/CSS assets return **2xx**  
- Correct MIME types (not HTML for JS/CSS)  
- Styled rendering  
- Hydration succeeds  
- Homepage search behavior restored **or** tracked under **R02**  
- No unrelated critical regression  
- Regression protection catches missing/bad asset responses  

---

### R02

| Field | Value |
|--------|--------|
| **ROOT_ID** | R02 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R02** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — baseline text not in repo; audit sequencing places **search consequences** after R01 |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN — copy from immutable baseline root R02 when ingested |
| **CLOSURE_REQUIREMENTS** | Per baseline root R02 + closure standard above |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | R01 production static assets; baseline root definitions not in repo |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R02** definition into repo read-only storage; do not start until R01 **VERIFIED_CLOSED** or baseline explicitly allows parallel work |
| **LAST_UPDATED** | 2026-10-10 |

---

### R03

| Field | Value |
|--------|--------|
| **ROOT_ID** | R03 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R03** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit sequencing places **measurement consequences** after R01 |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN — copy from immutable baseline root R03 when ingested |
| **CLOSURE_REQUIREMENTS** | Per baseline root R03 + closure standard (natural GA/instrumentation behavior) |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | R01; baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R03**; sequence after R01 closure unless baseline permits otherwise |
| **LAST_UPDATED** | 2026-10-10 |

---

### R04

| Field | Value |
|--------|--------|
| **ROOT_ID** | R04 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R04** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: P1 truth / claim / data corrections |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + truth closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested; R01 release gate |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R04** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R05

| Field | Value |
|--------|--------|
| **ROOT_ID** | R05 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R05** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: P1 truth / claim / data corrections |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + truth closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R05** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R06

| Field | Value |
|--------|--------|
| **ROOT_ID** | R06 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R06** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: P1 truth / claim / data corrections |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + truth closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R06** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R07

| Field | Value |
|--------|--------|
| **ROOT_ID** | R07 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R07** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: P1 truth / claim / data corrections |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + truth closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R07** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R08

| Field | Value |
|--------|--------|
| **ROOT_ID** | R08 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R08** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: current commercial-link reconciliation |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + commercial-path closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R08** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R09

| Field | Value |
|--------|--------|
| **ROOT_ID** | R09 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R09** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: current commercial-link reconciliation |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + commercial-path closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R09** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R10

| Field | Value |
|--------|--------|
| **ROOT_ID** | R10 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R10** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: navigation / origin / indexability / provenance / social-image |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + production readback |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R10** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R11

| Field | Value |
|--------|--------|
| **ROOT_ID** | R11 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R11** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: navigation / origin / indexability / provenance / social-image |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + production readback |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R11** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R12

| Field | Value |
|--------|--------|
| **ROOT_ID** | R12 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R12** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: navigation / origin / indexability / provenance / social-image |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + production readback |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R12** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R13

| Field | Value |
|--------|--------|
| **ROOT_ID** | R13 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R13** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R13** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R14

| Field | Value |
|--------|--------|
| **ROOT_ID** | R14 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R14** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R14** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R15

| Field | Value |
|--------|--------|
| **ROOT_ID** | R15 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R15** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R15** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R16

| Field | Value |
|--------|--------|
| **ROOT_ID** | R16 |
| **TITLE** | Commercial-link / affiliate monetization reconciliation (includes Amazon Associates program state) |
| **PRIORITY** | UNKNOWN — confirm against immutable baseline **R16** when ingested |
| **RELEASE_BLOCKER** | UNKNOWN — treat Amazon monetization as **not current** until reconciled |
| **CURRENT_STATE** | IN_PROGRESS |
| **CURRENT_OWNER / EXECUTOR** | Founder / operator commercial truth; no link mutations in this lane |
| **ACTIVE_BRANCH / WORKTREE** | Documentation + tracker truth only (2026-10-10) |
| **EXACT_SCOPE** | Amazon Associates no longer an active approved monetization partner; live Amazon CTAs may still exist in production/catalog and require **product/destination** reconciliation; affiliate tagging must **not** be treated as valid monetization while account is closed |
| **AMAZON_COMMERCIAL_STATE** | **`CLOSED_REJECTED_PENDING_REAPPLICATION`** — `AMAZON_ASSOCIATES_STATUS=CLOSED_REJECTED`; reason: fewer than three qualifying purchases within 180 days; `REAPPLICATION_ALLOWED=YES`; `ACTIVE_AFFILIATE_TAG=NO`; `HISTORICAL_STORE_ID=buckparts20-20` |
| **SMALLEST_REQUIRED_FIX** | Record durable closure truth (done); plan authorized public-link / routing changes **after** R01 site integrity + separate review; **do not reapply** until distribution readiness restored |
| **CLOSURE_REQUIREMENTS** | Per baseline **R16** when ingested + commercial-path closure standard: production links/tags aligned with **current** partner eligibility without contaminating click analytics during investigation |
| **CLOSURE_EVIDENCE** | **PROVEN (2026-10-09):** Founder-verified Amazon Associates email — application rejected, account closed (all `buckparts20-20` countries), reapplication allowed. **Repo:** `data/evidence/amazon-associates-account-closure-readonly.2026-10-09.json`; tracker row `amazon-associates` → `REJECTED`, `tagVerified: false`. **PENDING:** Live `/go` and `retailer_links` reconciliation; public-link changes **not authorized** in this update |
| **BLOCKER** | Baseline **R16** text not ingested; **R01** production static assets; live link mutations not authorized |
| **NEXT_LAWFUL_ACTION** | After **R01** closure, owner review: inventory live Amazon-tagged destinations vs closed Associates account; authorize bounded link/routing changes separately; defer Amazon **reapplication** until site integrity and distribution readiness restored |
| **LAST_UPDATED** | 2026-10-10 (Amazon Associates closure reconciled) |

---

### R17

| Field | Value |
|--------|--------|
| **ROOT_ID** | R17 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R17** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit sequencing: **rerun production integrity baseline** before broad distribution |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN — likely full baseline re-execution after R01–R16 closure; confirm in immutable baseline |
| **CLOSURE_REQUIREMENTS** | Successful baseline rerun with durable artifact; no required P0/P1 open except explicitly deferred |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Prior roots; baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R17** definition; execute only after sequencing gates satisfied |
| **LAST_UPDATED** | 2026-10-10 |

---

## Ledger maintenance

- Update **CURRENT_STATE**, **CLOSURE_EVIDENCE**, **BLOCKER**, and **LAST_UPDATED** when work advances.  
- Recommended read-only baseline ingest path (when authorized): `data/ops/site-integrity/production-integrity-baseline-2026-10-10/` — **not created in this documentation-only change**.  
- Related but **separate** systems: `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md`, `data/truth-integrity/truth-integrity-registry-v1.json` (different ID namespace).
