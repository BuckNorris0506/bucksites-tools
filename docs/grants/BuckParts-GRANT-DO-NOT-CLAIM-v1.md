# BuckParts Grant Do Not Claim v1

**Repo checkpoint:** `ad25736`  
**Rule:** If a statement is not **PROVEN** in repo, a named report, or Jared-supplied verified data labeled with source, treat it as **UNKNOWN**—do **not** submit it as fact.

See also: [BuckParts-Grant-Truth-Claims-Register-v1.md](./BuckParts-Grant-Truth-Claims-Register-v1.md)

---

## Never claim (forbidden as fact)

1. **Marketplace / store:** BuckParts is an online store, ecommerce platform, marketplace, or primary shopping destination.  
2. **Universal verification:** Every filter, bag, or part on BuckParts is verified; complete catalog coverage.  
3. **Guaranteed outcomes:** Guaranteed fit, guaranteed savings, best price, or specific dollar savings.  
4. **Absolute authority:** BuckParts is the only or definitive source of truth for compatibility.  
5. **Affiliate-first editorial:** Commissions or revenue decide which buying options appear.  
6. **Unproven traction:** User counts, sessions, traffic totals, revenue, MRR, customer counts, conversion rates, interview counts, or growth percentages (**UNKNOWN** in repo).  
7. **Grant outcomes:** Grant already submitted, approved, or funded (**UNKNOWN** unless documented).  
8. **WHW public launch:** Whole-house water is publicly launched or broadly indexable for homeowners when launch state is **NOINDEX_UNPROVEN** and **`whw_public_opening_authorized: false`**.  
9. **WHW AP811 safe apply:** AP811 has committed safe CSV apply or a proven public buy path when artifacts say **`safe_apply_authorized: false`**.  
10. **Vacuum bag fit:** Any model-to-bag compatibility for Miele, Hoover, Kenmore, or other vacuum families—**OEM evidence UNKNOWN** in repo (`families_ready_for_truth_spine_seed_count=0`).  
11. **Vacuum launch:** Vacuum bags are live inventory with safe CTAs—**all vacuum mutation/opening gates are false**.  
12. **Search / campaign readiness:** Campaign indexability **READY**, 75+ indexed pages, or specific GSC indexed counts when audit reports **UNKNOWN** / **NOT_READY**.  
13. **Social impact metrics:** Measured wrong-part reduction, environmental impact totals, or community reach without study data.  
14. **AI magic:** Language implying AI replaces manual verification or eliminates uncertainty.  
15. **Testimonials:** Customer quotes not documented and approved.  
16. **Legal/business facts:** EIN, legal entity name, business address, fiscal sponsor, regional eligibility—**UNKNOWN** in repo unless Jared supplies.  
17. **Accessibility compliance:** WCAG certification or audit pass without a documented audit.  
18. **Finished product:** BuckParts is a complete, scaled product with full category coverage—frame as **validated prototype** with **bounded live surfaces**.

---

## Do not imply (high-risk phrasing)

- “Shop now,” “add to cart,” “best deal,” “lowest price”  
- “All homeowners trust BuckParts” or “thousands of users”  
- “Grant funding will scale revenue” or “monetization-first roadmap”  
- “We index every appliance model”  
- “Whole-house water filters are available on BuckParts” (public opening unauthorized)  
- “Vacuum bags verified on BuckParts” (research only)

---

## Safe to say (approved tone — still label limits)

- “BuckParts helps homeowners **compare model and part evidence** before ordering replacement filters.”  
- “Buying options appear **only when listing checks pass**; missing buy buttons are often intentional.”  
- “Affiliate links are **secondary to truth** and help cover operating costs—they do not decide what we show.”  
- “Refrigerator and air purifier lookup are **public in our repo** with formal truth spines; other categories remain **preview-only or research-only** until proof improves.”  
- “We **do not claim** to verify every filter site-wide.”  
- “We are a **validated prototype** seeking funding for verification tooling and **safe** expansion—not retail inventory.”  
- “Impact is framed as **wrong-part prevention and consumer trust**—not guaranteed savings or unmeasured traction.”

---

## PROVEN boundaries (cite reports, not memory)

| Topic | Safe boundary |
|-------|----------------|
| Air purifier safe CTAs | Re-run `report-air-purifier-truth-spine-v1.ts` for `safe_cta_count` (10 at `ad25736`) |
| WHW public opening | **Not authorized** — launch state **NOINDEX_UNPROVEN** |
| Vacuum | **Research only** — `NEEDS_MORE_OEM_EVIDENCE` |
| GSC / campaign | **NOT_READY** / **UNKNOWN** — re-run sitemap audit |
| Grant kit scan | **LOW** ecommerce/affiliate risk — not approval to overclaim |

---

## Before every submission

1. Re-run verification commands in [application packet](./BuckParts-GRANT-APPLICATION-PACKET-v1.md).  
2. Cross-check any number against Command Center or standalone report stdout.  
3. Remove metrics Jared has not explicitly approved with source.  
4. Keep **WHW**, **vacuum**, and **campaign** language aligned with gates above.

**Contact:** admin@buckparts.com
