# RepairClinic Air Purifier Evidence Plan (Manual, Read-Only)

## Purpose

This plan defines the required manual evidence workflow for the current top OEM blocked cohort:
`air_purifier_retailer_links` rows on `www.repairclinic.com` that are `BLOCKED_SEARCH_OR_DISCOVERY`.

This plan is evidence-only. No DB mutation is performed in this step.

## Non-Negotiable Rule

Search/catalog pages cannot become CTAs.

Any URL that remains a search/discovery page must stay blocked and cannot be promoted.

## Source Report

Run:

```bash
npm run buckparts:repairclinic-air-blocked-details
```

Use `sample_rows` as the priority queue for manual verification.

## Evidence Required Per Sample Row

For each `sample_rows` item (`link_id`, `affiliate_url`, `detected_token`), collect all of the following:

1. Direct PDP URL (final navigated URL, not search/catalog endpoint).
2. Exact token visible on page (must exactly match `detected_token` where token is known).
3. Product title (human-readable).
4. Buyability signal (for example: Add to Cart, In Stock, purchasable quantity controls).
5. Decision rule outcome:
   - `PASS`: direct PDP + exact token + buyability signal.
   - `FAIL`: still search/catalog, token mismatch, or clear wrong product.
   - `UNKNOWN`: incomplete/ambiguous evidence or no direct PDP found yet.

## Operator Instruction Before Any DB Mutation

Manually verify top `sample_rows` first and capture evidence per row.
Do not perform any DB mutation until evidence shows a valid direct PDP candidate that satisfies the `PASS` rule.

