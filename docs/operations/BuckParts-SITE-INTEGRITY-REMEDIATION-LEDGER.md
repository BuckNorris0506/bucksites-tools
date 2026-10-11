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
| Baseline artifact in repo | `data/ops/site-integrity/production-integrity-baseline-2026-10-10/READ_ME_AUDIT_REPORT.md` (SHA256 `45b8ad9587718d30fd3fb8e42b376b1f9d43ff1c5999245178675e1ceffbd188`; provenance `read-me-audit-report-provenance-v1.json`) |
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
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE (corrected)** | **SUPERVISED_DEPLOYMENT_PATH** — not Netlify UI publish directory alone; plus Netlify ignore hook skipping production when merge commit tree matched deploy-preview cache (fixed PR #39) |
| **CURRENT_OWNER / EXECUTOR** | Release lane closed 2026-10-10 after Git-connected production recovery |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `f7c43787d615dd061ac6885f66cb53bb0e4e6e32` (merge PR #39 atop canonical PR #38 merge) |
| **EXACT_SCOPE** | Site-wide public HTML references `/_next/static/*` assets that return **404** with **`text/html`**; unstyled rendering and failed hydration; reproduces on custom domain and Netlify alias; **1,343** pages / **40** chunk URLs / **1** stylesheet cited in baseline audit |
| **SMALLEST_REQUIRED_FIX** | Replace broken **API / raw-`.next` directory** production publish with a **Git-connected Netlify build** using repo `netlify.toml` (`buckparts:deploy:preflight` + `npm run build` + `@netlify/plugin-nextjs` full packaging). Add **live-site static asset regression** (referenced `/_next/static/*` + key `public/` probes). **No** temporary `/_next/static` → `/static` rewrite unless post–correct-deploy proof requires it (none expected). |
| **CLOSURE_REQUIREMENTS** | **Source fix:** correct deploy mechanism + merged release candidate on `main`. **Tests:** scoped R01 smoke/static-asset tests pass. **Build:** production build passes on candidate. **Commit:** authorized commit(s) on `main`. **Deploy:** authorized **Git-triggered** Netlify production build (not API `--dir=.next` upload). **Production readback:** HTML 200; referenced JS/CSS **2xx** + correct MIME; `public/` assets **2xx** where probed; styled rendering; hydration; `static_asset_status=OK` on live smoke. |
| **CLOSURE_EVIDENCE** | **PROVEN (2026-10-10 post–PR #39):** Netlify production deploy `6aca7be17df72c00089c2748` — `context=production`, `branch=main`, `commit_ref=f7c43787d615dd061ac6885f66cb53bb0e4e6e32`, `manual_deploy=false`, `published_at=2026-10-10T18:00:54.545Z`; buckparts.com RUM + `meta buckparts-deploy-commit` match. Live smoke: `runtime_status=OK`, `static_asset_status=OK`, `route_http_status=OK`, `content_contract_status=OK`. Sampled `/_next/static/*.js` + `*.css` **2xx** with JS/CSS MIME; `/buckparts-logo-black-transparent.png` **200** `image/png`; `/fo-verify.html` **200**. Canonical homepage: `bp-home`, “Find the filter” / “that fits.”, Find my filter / Find my number, `RealLookupExample`; no “Wrong Buck. Right Parts.” `/filter/4396395`: successor copy, EDR4RXD1 treatment, compatible-model section, `Compare the` visual card band. **Historical defect:** deploy `6ac92ad95ab3e8477f6b92d8` raw `.next` API publish (superseded). |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed); monitor via `npm run buckparts:live-site-smoke:check` on future production deploys |
| **LAST_UPDATED** | 2026-10-10 (R01 VERIFIED_CLOSED — production recovery after PR #39) |

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
| **TITLE** | R02 — P1 — Hydration-dependent GA and interactive search are not operational |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after R01 recovery) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE (historical)** | R01 missing `/_next/static` assets broke hydration; SearchForm without hydration fell through to broken `/?q=` behavior; GA `afterInteractive` never initialized (`gtag` / `dataLayer` absent in baseline browser sample) |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign closure 2026-10-11 (verification-only; no product-code repair) |
| **ACTIVE_BRANCH / WORKTREE** | `docs/r02-verified-closure` |
| **EXACT_SCOPE** | Sitewide dependency on hydration for interactive homepage search and GA4 + fridge funnel events; baseline 1,343 paths / 23-route runtime sample; historical homepage submit to `/?q=` with UTM loss |
| **SMALLEST_REQUIRED_FIX** | Restore R01 (done); verify natural search nav to `/search?q=` (or intentional direct-model redirect); verify natural GA `page_view` and fridge funnel events — **no redesign** |
| **CLOSURE_REQUIREMENTS** | Production browser proof: chunks load, hydration, search cases, natural GA collect (no injected events), attribution contract documented |
| **CLOSURE_EVIDENCE** | Baseline: `r02-baseline-root-v1.json` + `READ_ME_AUDIT_REPORT.md` §R02. Closure: `r02-closure-verification-2026-10-11.json`. Production main `6f9dbac660f63056fb7cc2b08a88e475a73dad13`; deploy meta on buckparts.com matches. Hydration: `gtag` function, `dataLayer`, Next chunks 200. Search: WRX735SDHZ → `/fridge/whirlpool-wrx735sdhz`; EDR4RXD1 → `/search?q=EDR4RXD1`; HE15FKPET → `/search?q=HE15FKPET` disambiguation; no `/?q=` fallback. GA: natural `g/collect` `page_view` (UTMs in `dl` on landing), `fridge_model_view`; no duplicate `page_view` in sampled nav. GA search events **not** in source contract (Supabase search telemetry). **No product-code change.** |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

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
| **TITLE** | R16 — P1 — Exposed buying paths lack auditable current UUID-to-destination proof |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **CURRENT_OWNER / EXECUTOR** | R16 commercial-link reconciliation completed 2026-10-11 |
| **ACTIVE_BRANCH / WORKTREE** | docs/r16-verified-closure |
| **EXACT_SCOPE** | Historical baseline commercial root covering 81 CTA occurrences / 6 redirect IDs / 64 pages, reconciled against current production inventory and all currently exposed commercial UUIDs. |
| **SMALLEST_REQUIRED_FIX** | Reconcile current UUID-to-destination truth, inactive Amazon monetization behavior, customer-compatible labeling, and deterministic commercial regression coverage. |
| **CLOSURE_REQUIREMENTS** | Current exposed UUIDs auditable; destination identity known; official/compatible labeling truthful; Amazon monetization eligibility enforced; GE unaffected; unsafe/stale rows fail closed; production SHA and current CTA inventory verified. |
| **CLOSURE_EVIDENCE** | Historical baseline: `data/ops/site-integrity/production-integrity-baseline-2026-10-10/r16-baseline-root-v1.json` (81 CTA / 6 IDs / 64 pages). Current rescan: `r16-production-cta-inventory-2026-10-11.json` (92 CTA / 46 pages / 6 IDs). Closure rerun: `r16-closure-verification-2026-10-11.json`. Production SHA `c583fd19f297b5bb8a8066a50e24c09a5189d9f8`; deploy `6acb0a069dae3700085f8899`. Shark HE15/HE3 production compatible-label proof (PR #44). 4396508 / 4396710 / MWFP / XWFE destination evidence in closure artifact. Amazon Associates REJECTED / tagVerified=false (`data/affiliate/affiliate-application-tracker.json`). Phase A outbound tag stripping. launch-buy-links deterministic clock repair (PR #44). Tests: launch-buy-links, part-trust, go-first-hop smoke, go-redirect-gate, affiliate-application — PASS. `npm run buckparts:ship-guard -- --enforce` SAFE. `NEXT_PUBLIC_SITE_URL=https://buckparts.com npm run build` PASS. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed; R17 baseline rerun remains separate) |
| **LAST_UPDATED** | 2026-10-11 |

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
