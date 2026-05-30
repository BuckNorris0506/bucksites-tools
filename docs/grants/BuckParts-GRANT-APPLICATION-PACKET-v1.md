# BuckParts Grant Application Packet v1

**Repo checkpoint:** `ad25736` (re-verify with `git rev-parse --short HEAD` before submit)  
**Operating truth source:** `npm run buckparts:command-center` → `scripts/report-buckparts-command-center.ts`  
**Companion docs:** [Fact sheet](./BuckParts-GRANT-FACT-SHEET-v1.md) · [Use of funds](./BuckParts-GRANT-USE-OF-FUNDS-v1.md) · [Do not claim](./BuckParts-GRANT-DO-NOT-CLAIM-v1.md) · [Truth claims register](./BuckParts-Grant-Truth-Claims-Register-v1.md)

---

## One-paragraph description (plain English)

BuckParts is a **truth-first homeowner-help system** that helps people find the **correct replacement filters and consumable parts** for home appliances—refrigerator water filters, air purifier filters, and related categories—by comparing **model and part evidence** before any purchase link appears. BuckParts is **not an online store** and does **not** sell inventory; when a buying option is shown, it appears only after **evidence and safety gates** pass in the repo’s verification system. Affiliate links, where present, are **secondary to truth** and help cover operating costs—they do **not** decide what BuckParts shows. The project is a **validated prototype** with formal verification infrastructure for some categories and deliberate **preview-only** treatment for others until proof improves.

---

## Problem statement

Homeowners routinely struggle to identify the **correct replacement filter or part** for a specific appliance model. Part numbers, aliases, and “compatible” marketplace listings are easy to confuse. A wrong purchase wastes money, delays maintenance, and can reduce trust in DIY upkeep. BuckParts exists to reduce **wrong-part risk** through **evidence-first replacement intelligence**, not through catalog breadth or checkout convenience.

---

## Solution (how BuckParts addresses the problem)

| Element | Description |
|---------|-------------|
| **Evidence-first lookup** | Model → consumable mappings, aliases, and proof artifacts tracked in repo before public claims |
| **Confidence states** | Fit and buyer-path quality are classified (e.g. exact match vs compatible-only vs do-not-buy)—not binary “verified/unverified” hype |
| **No buy button until safe** | Retailer links pass buy-gate checks; missing buy buttons are often **intentional** when proof is insufficient |
| **Public trust pages** | `/truth-policy` and `/wrong-part-prevention` explain limits and compare-before-buy habits |
| **Operator truth spine** | Read-only Command Center reports (`fridge_truth_spine_v1`, `air_purifier_truth_spine_v1`, etc.) track what is and is not proven |

---

## Current proven status (repo / Command Center only)

Re-run named reports before citing in an application. Facts below are **PROVEN** at checkpoint `ad25736` unless labeled **INFERRED** or **UNKNOWN**.

### Platform and grant readiness

| Item | Status |
|------|--------|
| Grant readiness contract | `buckparts_grant_readiness_v1` — `read_only: true` |
| Public trust routes | `/truth-policy`, `/wrong-part-prevention` — present |
| Ecommerce / affiliate overclaim risk (grant scan) | **LOW** / **LOW** — not permission to add storefront copy |
| Grant kit docs (prior kit) | Application kit, answer bank, use-of-funds, truth register — present |
| Official contact email | **`admin@buckparts.com`** — in `src/app/about/page.tsx`, `src/app/privacy/page.tsx` |
| Command Center | Current operational truth source for wedge status and gates |

### Wedge coverage (wedge truth spine coverage matrix + spine reports)

| Wedge | Formal truth spine | Public launch | Notes |
|-------|-------------------|---------------|--------|
| **Refrigerator water** | **Yes** — `fridge_truth_spine_v1` | Routes live / indexable | **Do not** claim every fridge filter verified |
| **Air purifier** | **Yes** — `air_purifier_truth_spine_v1` (`formal_spine_status: PROVEN`) | **LIVE** | **PROVEN:** `safe_cta_count=10`; **PROVEN:** 45 filters with zero safe buy path (re-run AP spine) |
| **Whole-house water** | **No** — partial operational proof | **NOINDEX_UNPROVEN** | **`whw_public_opening_authorized: false`** |
| **Vacuum bags** | **No** — research lanes only | **NOINDEX_UNPROVEN** | OEM evidence **NEEDS_MORE_OEM_EVIDENCE**; `families_ready_for_truth_spine_seed_count=0` |

### Whole-house water (partial proof — not public opening)

- **PROVEN:** `3m-ap810` has a committed safe `direct_buyable` retailer row in WHW CSV (one safe path—not broad WHW launch).
- **PROVEN:** WHW remains **not publicly opened**; launch state **NOINDEX_UNPROVEN**.
- **INFERRED:** Next WHW work is evidence capture (e.g. browser truth), not public opening.

### Vacuum bags (research only)

- **PROVEN:** Feasibility, seed packet, and OEM research evidence lanes exist on Command Center.
- **PROVEN:** No vacuum product CSV inventory, no safe CTA, all mutation/opening gates **false**.
- **UNKNOWN:** Any model-to-bag fit for Miele GN, FJM, Hoover Type Y, or Kenmore Q in repo.

### Search / indexing / campaign (sitemap audit)

| Item | Status |
|------|--------|
| `gsc_indexed_count` | **UNKNOWN** |
| `first_campaign_indexability_status` | **NOT_READY** |
| 75-page indexed threshold | **UNKNOWN** |

---

## What is not yet proven

| Area | Status |
|------|--------|
| Grant submitted or awarded | **UNKNOWN** |
| Revenue, profit, customer counts, conversion | **UNKNOWN** |
| Site traffic / monthly users | **UNKNOWN** |
| Wrong-part reduction rate (measured impact) | **UNKNOWN** |
| All filters site-wide verified | **NOT claimed** |
| Whole-house water public launch | **Unauthorized** |
| Vacuum bag compatibility | **NOT claimed** |
| Formal accessibility audit pass/fail | **UNKNOWN** |
| Legal entity details, EIN, fiscal sponsor | **UNKNOWN** — founder to supply |

---

## Why grant funding is needed now

BuckParts has built a **working verification prototype**—formal truth spines, buy gates, public trust pages, and read-only operator reporting—but **cannot responsibly scale coverage or measurement** without funded **research time, AI/tool credits, validation tooling, and indexing/search measurement**. The system deliberately **withholds** buy paths where proof is weak; expanding **safely** into more categories (e.g. whole-house water, future consumables) requires **OEM evidence capture, browser verification, and operator tooling**—not inventory purchases or ecommerce marketing. Grant support at this stopping point funds **trust infrastructure and bounded expansion**, not marketplace growth.

---

## Grant framing (truthful language)

### Small business / digital readiness

- BuckParts is a **solo-founder, microbusiness-scale** truth product (**INFERRED** from repo structure; headcount not documented).
- Funding supports **digital verification tooling**, **read-only audit pipelines**, and **plain-language trust UX**—not a storefront launch.
- The site is a **validated prototype** with **live lookup for some categories** and **preview-only** treatment elsewhere until proof improves.
- **Do not** cite revenue, traffic, or customer counts unless Jared supplies verified figures.

### Public benefit / consumer protection

- BuckParts aligns with **consumer protection** by foregrounding **wrong-part prevention**, **uncertainty labels**, and **compare-before-buy** guidance.
- **Affiliate links are secondary to truth**; BuckParts does not present itself as the seller.
- Missing buy buttons and narrow public opening for unproven categories are **features of safety**, not gaps to hide.
- Impact should be framed as **trust, verification discipline, and homeowner decision support**—not guaranteed savings or measured wrong-part reduction unless later proven.

---

## Packet contents

| Document | Purpose |
|----------|---------|
| [BuckParts-GRANT-FACT-SHEET-v1.md](./BuckParts-GRANT-FACT-SHEET-v1.md) | One-page facts for reviewers |
| [BuckParts-GRANT-USE-OF-FUNDS-v1.md](./BuckParts-GRANT-USE-OF-FUNDS-v1.md) | Budget categories (amounts **UNKNOWN** until set per application) |
| [BuckParts-GRANT-DO-NOT-CLAIM-v1.md](./BuckParts-GRANT-DO-NOT-CLAIM-v1.md) | Forbidden and unsupported claims |
| [BuckParts-Grant-Truth-Claims-Register-v1.md](./BuckParts-Grant-Truth-Claims-Register-v1.md) | PROVEN / INFERRED / UNKNOWN register |

---

## Verification commands (before submit)

```bash
git rev-parse --short HEAD
node --import tsx scripts/report-buckparts-grant-readiness-v1.ts | jq '{contract, truth_policy_route_present, wrong_part_prevention_route_present}'
node --import tsx scripts/report-buckparts-grant-application-kit-readiness-v1.ts | jq '{kit_ready_for_jared_review, grant_doc_present}'
node --import tsx scripts/report-air-purifier-truth-spine-v1.ts | jq '{safe_cta_count, formal_spine_status, public_launch_state}'
node --import tsx scripts/report-wedge-truth-spine-coverage-matrix-v1.ts | jq '.inspect_summary'
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.vacuum_bags_oem_research_evidence_packet_v1.inspect_summary'
node --import tsx scripts/report-buckparts-sitemap-indexability-audit-v1.ts | jq '{gsc_indexed_count, first_campaign_indexability_status}'
```

**Contact:** admin@buckparts.com
