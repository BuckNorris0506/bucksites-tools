# BuckParts fridge model PDP live / customer-visible proof readiness v1

Generated: 2026-07-14T05:59:47.072Z

## Status

- contract: `buckparts_fridge_model_pdp_live_customer_visible_proof_readiness_v1`
- read_only: **true**
- deploy_authorized: **false**
- live_production_fetch_enabled: **false**
- live_html_claimed: **false**
- slug_count: **21** (SAFE_BUYER_PATH_PASS only)
- excluded FAIL: ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-gne27jstss, ge-gse25hskss, ge-gte18gsnrss, ge-pvd28bymfs
- excluded quarantined: 11
- excluded PARTIAL: ge-gfe28hmkww, ge-gsc25frshss, ge-gse26gshess

## Summary

- SAFE_BUYER_PATH_PASS_scoped: 21
- page_exposes_proof_metadata_visibly_count: 0
- live_html_proven_count: 0
- live_html_unknown_count: 21
- ready_for_future_live_proof_pass_count: 21
- visible_metadata_gap_count: 21

## Recommended next move

Owner-approved UI prototype of the proposed visible trust metadata block on fridge model PDPs (read-only language; no CTA expansion), then a guarded live HTML proof pass for the same 21 slugs that asserts visible metadata + gated Verified Link presence without claiming conversion.

## Proposed visible trust metadata contract (not applied)

- applied_to_production: **false**
- invent_offers_authorized: **false**
- unsafe_cta_promotion_authorized: **false**

### Fields

- **Filter number(s) to compare** (`mapped_filter_numbers`): Show the part number(s) listed for this model; ask homeowner to compare to the cartridge they remove.
- **Link check status** (`proof_status`): Customer-facing status only; never raw enums like direct_buyable.
- **Last checked** (`freshness_stamp`): YYYY-MM-DD (UTC) from browser_truth_checked_at when present; omit if unknown.
- **When a store link appears** (`verified_link_gate_note`): Only when a gated safe Verified Link is eligible; never invent or promote unsafe CTAs.

### Proof status language

- direct product page: "We checked a direct store product page against this filter number."
- search only: "We only found a store search page, not a direct product page, so we are not linking it yet."
- unconfirmed: "We have not confirmed a safe store link yet."

### Freshness

- format: `Last checked YYYY-MM-DD`
- source: browser_truth_checked_at ISO → UTC calendar date

### Safe identity language

- prefer: Original part / Compatible replacement / Part identity / Original or compatible part
- avoid unless proven: OEM; genuine OEM; factory original guaranteed

## Slugs (21)

| slug | filters | safe go-link IDs | visible metadata | live HTML | ready future live |
|---|---|---|---|---|---|
| frigidaire-ffhb2740ps | ultrawf | b23eac97-d064-46e1-b086-617e4a79f002 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| frigidaire-fghb2868pf | eptwfu01 | 96dd791c-4a8f-42f4-9b4d-cb424ea5e879 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| frigidaire-fgsc2335tf | eptwfu01 | 96dd791c-4a8f-42f4-9b4d-cb424ea5e879 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-cwe23sshww | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gfe28gmkbb | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gfe28gmkes | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gfe28gskes | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gfe28gskss | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gfe28gynfs | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gfe28hskss | rpwfe, smartwater-mwfp | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-gye22gskww | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-pfe28kmkww | rpwfe, xwf | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| ge-pfe28kynbb | rpwfe | 32db89d7-4d99-4073-bfb0-d07138ee0703 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| samsung-rf263beaesr | da29-00020b | 055f383a-4d14-4997-a19f-894afe56721e, d4cbad0c-4bab-4854-89bf-59e6d6492c6b | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| samsung-rf28nhedbsr | da29-00020b | 055f383a-4d14-4997-a19f-894afe56721e, d4cbad0c-4bab-4854-89bf-59e6d6492c6b | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| samsung-rf28r7201sr | da97-17376b | 2edeb286-7906-4183-abb9-5ddfc0b00148 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| samsung-rf28r7351sg | da97-17376a, da97-17376b | 2edeb286-7906-4183-abb9-5ddfc0b00148 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| whirlpool-wrf540cwhz | edr4rxd1 | 5504e020-a08e-4c14-bd9b-0f7bb2534e5b | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| whirlpool-wrs325sdhz | edr1rxd1 | 32288a9b-4ff3-4424-86fa-99f716308ef5 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| whirlpool-wrx735sdhz | edr4rxd1 | 5504e020-a08e-4c14-bd9b-0f7bb2534e5b | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |
| whirlpool-wrx986sihz | edr2rxd1 | 6f81b4ce-a3b0-4c09-b0d9-965aca5bfc17 | PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY | UNKNOWN | true |

## Proven facts

- PROVEN: read_only=true; deploy_authorized=false; live_production_fetch_enabled=false; live_html_claimed=false.
- PROVEN: exact scope=21 SAFE_BUYER_PATH_PASS slugs from CTA/go proof pack.
- PROVEN: excluded FAIL=7; quarantined=11; PARTIAL=3.
- PROVEN: summary={"SAFE_BUYER_PATH_PASS_scoped":21,"page_exposes_proof_metadata_visibly_count":0,"live_html_proven_count":0,"live_html_unknown_count":21,"ready_for_future_live_proof_pass_count":21,"visible_metadata_gap_count":21}.
- PROVEN: fridge model PDP has no dedicated customer-visible proof metadata block equivalent to filter PDP FilterPdpRepoEvidenceSection (code surface).
- PROVEN: proposed visible trust metadata contract forbids Product JSON-LD offer invent and unsafe CTA promotion.

## Unknown facts

- UNKNOWN: Live production HTML for the 21 SAFE_BUYER_PATH_PASS fridge PDPs (no fetch in this lane).
- UNKNOWN: Homeowner-visible rendering of the proposed trust metadata block until a future UI + live HTML proof pass.

## Risk notes

- This readiness lane does not authorize deploy, Supabase/CSV/retailer_links mutation, buy CTA changes, sitemap/robots, Product JSON-LD, or owner-decision edits.
- Do not claim live HTML proof from backend SAFE_BUYER_PATH_PASS alone.
- Do not use 'OEM' in customer-visible trust copy unless identity is proven; prefer Original part / Compatible replacement labels.
- Do not invent Product offers, review, or aggregateRating.
