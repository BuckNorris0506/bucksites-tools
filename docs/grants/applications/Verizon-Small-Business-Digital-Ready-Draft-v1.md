# Verizon Small Business Digital Ready — Application Draft v1

**Status:** First-round draft — review before submit  
**Repo checkpoint:** `f411a9e`  
**Contact:** admin@buckparts.com  
**Source docs:** [Grant packet](../BuckParts-GRANT-APPLICATION-PACKET-v1.md) · [Fact sheet](../BuckParts-GRANT-FACT-SHEET-v1.md) · [Do not claim](../BuckParts-GRANT-DO-NOT-CLAIM-v1.md)

**Program eligibility:** **UNKNOWN** — confirm Verizon Digital Ready requirements before submit.

---

## 50-word description

BuckParts helps homeowners find the correct replacement filter for home appliances by comparing model and part evidence before any purchase link appears. It is not an online store. Buying options appear only when internal safety checks pass. Affiliate links are secondary to truth. A validated digital prototype with live lookup for some filter categories.

---

## 100-word description

BuckParts is a truth-first homeowner-help website for replacement appliance filters—not a store or marketplace. Homeowners often order the wrong filter because model numbers, alias codes, and “compatible” listings are confusing. BuckParts compares evidence before showing a buying option; missing buy buttons are often intentional when proof is weak. Public trust pages explain limits and compare-before-buy habits. Refrigerator and air purifier lookup are live with formal verification reporting in the repo; other categories stay preview-only until proof improves. Funding would support digital verification tooling, research time, and plain-language trust UX—not inventory or ads.

---

## 250-word description

BuckParts helps homeowners avoid buying the wrong replacement filter or consumable part for home appliances such as refrigerator water filters and air purifier filters. Wrong orders waste money and delay maintenance. Marketplace listings and similar part numbers make mistakes easy.

BuckParts is not an online store. It does not sell inventory or run checkout. When a buying option appears, it follows internal evidence and safety gates—affiliate links, where present, are secondary to truth and help cover operating costs; they do not decide what BuckParts shows.

The project is a validated prototype with working digital infrastructure: public trust pages (`/truth-policy`, `/wrong-part-prevention`), formal truth-spine reporting for refrigerator and air purifier categories, and a read-only Command Center that tracks what is and is not proven. Air purifier lookup is public with ten safe buying paths on committed data (re-run repo reports before citing). Whole-house water and vacuum categories remain not publicly opened until proof improves.

Grant support would fund AI and tool credits, validation scripts, bounded OEM research, accessibility and content polish, and search measurement—so BuckParts can expand coverage safely without becoming a storefront. Revenue, traffic, and customer counts are not cited here (**UNKNOWN** in repo).

---

## Problem statement

Homeowners struggle to match a specific appliance model to the correct replacement filter or part. Part numbers change, aliases collide, and third-party “compatible” packs look official. A wrong purchase wastes money and time and erodes confidence in DIY upkeep.

---

## Solution statement

BuckParts provides evidence-first replacement intelligence: model-to-part mappings where repo proof exists, clear uncertainty when proof is weak, and buying options only after listing checks pass. Public pages teach compare-before-buy habits. Internal read-only reports track confidence by category so the site does not overclaim.

---

## Founder / business stage statement

BuckParts is a **solo-founder, microbusiness-scale** digital product (**INFERRED** from repo structure; employee count **UNKNOWN**). Stage: **validated prototype** with bounded live surfaces—not a completed marketplace. Legal entity details, EIN, and address: **UNKNOWN** in repo—founder to supply for application forms.

---

## Use of funds

Align with [Use of funds](../BuckParts-Grant-Use-Of-Funds-v1.md). Dollar amounts: **UNKNOWN** until set per form.

| Category | Digital Ready fit |
|----------|-------------------|
| AI and tool credits | Verification assistance, copy review, operator workflows |
| Research time | Bounded OEM/manual research; no ungated product data |
| Validation tooling | Read-only audit pipelines and Command Center lanes |
| Indexing and search measurement | GSC artifact refresh and indexability audits (reporting only) |
| Accessibility and content polish | Plain-language trust pages and lookup UX |
| Safe category expansion | Evidence-disciplined growth where repo proof supports it |

**Would not fund:** inventory, affiliate ad spend, storefront positioning, or opening unproven categories publicly.

---

## Why now

The verification prototype, trust pages, and formal reporting for key categories exist today. BuckParts deliberately withholds buy paths where proof is weak. Without funded tooling and research time, safe expansion and measurement stall while wrong-part confusion in the market continues. This is a digital-readiness investment in verification infrastructure—not a retail launch.

---

## Public benefit / consumer protection angle

BuckParts foregrounds wrong-part prevention, transparent limits, and compare-before-buy guidance. It does not present itself as the seller. Withholding unsafe buy buttons protects consumers from confident-but-wrong listings. Impact is framed as homeowner decision support and trust—not guaranteed savings or measured reduction rates (**UNKNOWN**).

---

## What is already built (PROVEN in repo at `f411a9e`)

- Public trust routes: `/truth-policy`, `/wrong-part-prevention`
- Grant readiness report: `buckparts_grant_readiness_v1` (read-only)
- Refrigerator wedge: `fridge_truth_spine_v1` — formal spine; routes live
- Air purifier wedge: `air_purifier_truth_spine_v1` — formal spine; public LIVE; ten safe CTAs on committed CSV (re-run AP spine report)
- Command Center operational reporting for gates and wedge status
- Whole-house water: partial operational proof; **not** publicly opened (`NOINDEX_UNPROVEN`)
- Vacuum bags: research lanes only; no inventory or safe CTA

---

## What funding would help build next

- Stronger validation tooling and operator reports
- Bounded OEM evidence research (e.g. vacuum bag families; WHW browser-truth capture)
- Accessibility and plain-language improvements on trust and lookup pages
- Search/index measurement without claiming current campaign readiness
- Safe, evidence-disciplined expansion in categories where proof supports it

---

## UNKNOWN / DO NOT CLAIM

| Topic | Status |
|-------|--------|
| Verizon program eligibility | **UNKNOWN** — verify before submit |
| Revenue, customers, traffic, conversion | **UNKNOWN** |
| Grant already awarded | **UNKNOWN** |
| 75+ indexed pages / campaign READY | **NOT claimed** — audit: **NOT_READY** / **UNKNOWN** |
| All filters verified site-wide | **NOT claimed** |
| BuckParts is a completed marketplace | **DO NOT CLAIM** |
| Affiliate marketing funded by grant | **DO NOT CLAIM** |
| WHW or vacuum publicly launched | **DO NOT CLAIM** |
| Guaranteed fit or savings | **DO NOT CLAIM** |
| Measured wrong-part reduction | **UNKNOWN** |
| Legal entity / EIN / regional eligibility | **UNKNOWN** — founder to supply |

---

## Pre-submit checklist

```bash
git rev-parse --short HEAD
node --import tsx scripts/report-buckparts-grant-readiness-v1.ts | jq '{truth_policy_route_present, wrong_part_prevention_route_present}'
node --import tsx scripts/report-buckparts-grant-application-kit-readiness-v1.ts | jq '{kit_ready_for_jared_review}'
```
