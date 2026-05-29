# BuckParts Grant Truth Claims Register v1

**Repo checkpoint:** `aec8b8c`  
**Rule:** Grants may cite **PROVEN** and carefully labeled **INFERRED** facts only. Everything else is **UNKNOWN** or **FORBIDDEN**.

---

## PROVEN (repo evidence)

| Claim | Evidence |
|-------|----------|
| BuckParts is a truth-first homeowner-help site for replacement filters/parts | Public trust pages, product architecture, grant readiness summary |
| Public routes `/truth-policy` and `/wrong-part-prevention` exist | `src/app/truth-policy/page.tsx`, `src/app/wrong-part-prevention/page.tsx` |
| Grant readiness contract `buckparts_grant_readiness_v1` is read-only | `scripts/report-buckparts-grant-readiness-v1.ts` |
| `read_only: true`, `data_mutation: false` on grant readiness report | `scripts/lib/buckparts-grant-readiness-v1.ts` |
| `truth_policy_route_present: true`, `wrong_part_prevention_route_present: true` | Grant readiness builder |
| `ecommerce_positioning_risk: LOW`, `affiliate_overclaim_risk: LOW` | Grant readiness builder (trust page copy scan) |
| Refrigerator wedge launch state is `LIVE` | `src/lib/catalog/vertical-launch-state.ts` |
| Air purifier wedge launch state is `LIVE` | `src/lib/catalog/vertical-launch-state.ts` |
| Whole-house water launch state is `NOINDEX_UNPROVEN` | `src/lib/catalog/vertical-launch-state.ts` |
| WHW is not publicly opened despite partial CSV proof | Launch state + WHW buyer-path `do_not_open_public: true` |
| WHW `3m-ap810` has one committed safe `direct_buyable` aquapure-dealer row | `data/whole-house-water/retailer_links.csv` row for Aqua-Pure Filters authorized dealer |
| WHW `3m-ap811` buyer-path proof: PASS=0, `safe_apply_authorized=false` | `data/whole-house-water/batch-production/agent-results-buyer-path-v1/whw-buyer-path-3m-ap811-batch-v1.results.json` |
| WHW `3m-ap811` lane is `BROWSER_TRUTH_READY` in safe-CTA expansion queue | `scripts/lib/whole-house-water-safe-cta-expansion-queue-v1.ts` + HQ handoff |
| Affiliate links described as secondary to truth on public pages | `/truth-policy` copy |
| BuckParts is not an online store / not the seller | `/truth-policy`, `/disclosure`, `/about` |
| HEAD on main at kit authoring checkpoint | `aec8b8c` — Add BuckParts grant readiness public trust pack |

---

## INFERRED (reasonable from repo; label as inferred in applications)

| Claim | Basis |
|-------|-------|
| BuckParts is not ecommerce | Store/seller disclaimers + buy-gate architecture |
| Grant funds align with verification and trust UX, not affiliate growth | Use-of-funds categories across grant docs |
| Solo-founder / microbusiness scale | Repo structure; no employee roster file |
| One WHW safe CTA does not justify broad WHW public opening | `NOINDEX_UNPROVEN` + queue discipline |
| Founder wrong-part motivation is plausible product direction | Stated in kit; not independently verified third-party data |
| Next WHW step for AP811 is browser truth capture | Expansion queue + buyer-path artifacts |

---

## UNKNOWN (do not assert as fact in grants)

| Topic | Notes |
|-------|-------|
| Monthly/active users, traffic, sessions | Not in repo |
| Revenue, MRR, ARR, profit | Not in repo |
| Customer counts, conversion rates | Not in repo |
| User interviews conducted (count or quotes) | Not in repo |
| Grant eligibility for any specific program | Program-specific |
| Missouri / Kansas City regional eligibility | Not documented in repo |
| Awards or prior grant awards | Not in repo |
| Live production deploy commit at application time | Re-verify before citing |
| Wrong-part reduction rate | Not measured in repo |
| Accessibility audit pass/fail | Not in repo |
| WHW public opening date | Explicitly not authorized |
| Total verified filters site-wide | Requires wedge reports; not single number in repo |
| Legal entity, EIN, business address | Jared to supply |
| Fiscal sponsor availability | Jared to supply |

---

## Forbidden claims (never submit as fact)

Do **not** claim the following in grant applications, pitch decks, or public grant attachments:

1. **Ecommerce / store positioning:** BuckParts is an online store, marketplace, or primary shopping destination.
2. **Universal verification:** Every filter or part on BuckParts has been verified; complete catalog coverage.
3. **Guaranteed fit or savings:** Guaranteed fit, guaranteed savings, best price, or specific dollar savings amounts.
4. **Absolute truth authority:** BuckParts is the only or definitive source of truth for compatibility.
5. **Affiliate-first editorial:** Affiliate commissions or revenue decide which buying options appear.
6. **Unproven traction:** Specific user counts, traffic totals, revenue figures, interview counts, or growth percentages unless Jared supplies verified numbers and you label the source.
7. **WHW public opening:** Whole-house water is publicly launched or indexable for homeowners when launch state is `NOINDEX_UNPROVEN`.
8. **AP811 safe apply:** WHW AP811 has a committed safe CSV apply or public buy path (`safe_apply_authorized=false` in buyer-path artifact).
9. **Grant eligibility:** “We are eligible for [program]” without program-specific confirmation.
10. **Awards:** Any grant already awarded unless documented.
11. **AI magic:** Hype language implying AI replaces manual verification or eliminates uncertainty.
12. **Customer testimonials:** Quotes not documented and approved.

---

## Application-safe language snippets (approved tone)

- “BuckParts helps homeowners compare model and part evidence before ordering replacement filters.”
- “Buying options appear only when listing checks pass; missing buy buttons are often intentional.”
- “Affiliate links are secondary to truth and help cover operating costs—they do not decide what we show.”
- “Refrigerator and air purifier lookup are public in our repo; other categories remain preview-only until proof improves.”
- “We do not claim to verify every filter site-wide.”
- “Traffic and revenue metrics are not cited here; impact is framed as wrong-part prevention and public trust.”

---

## Change control

Update this register when:

- Launch states change
- New public trust pages ship
- WHW or other wedges gain/l lose proof
- Jared approves new metrics for external use

Re-run:

```bash
npx tsx scripts/report-buckparts-grant-application-kit-readiness-v1.ts
npx tsx scripts/report-buckparts-grant-readiness-v1.ts
```
