# RepairClinic Refrigerator Evidence Plan (Manual, Read-Only)

## Purpose

This plan defines the manual evidence workflow for blocked RepairClinic refrigerator OEM search rows from `public.retailer_links` where state is `BLOCKED_SEARCH_OR_DISCOVERY`.

This is an evidence-only step. No DB mutation is performed here.

## Non-Negotiable Rule

Search/catalog pages cannot be CTAs.

Any URL that remains a search/discovery page must remain blocked and cannot be promoted.

## Source Report

Run:

```bash
npm run buckparts:repairclinic-fridge-blocked-details
```

Use `sample_rows` as the manual verification queue.

## Evidence Required Per Sample Row

For each `sample_rows` row (`link_id`, `affiliate_url`, `detected_token`), capture:

1. Direct PDP URL (final navigated URL; must not be search/catalog endpoint).
2. Exact token visible on page (must match `detected_token` when token is known).
3. Product title (human-readable).
4. Buyability signal (for example: Add to Cart, In Stock, quantity control).
5. Decision outcome:
   - `PASS`: direct PDP + exact token + buyability signal.
   - `FAIL`: still search/catalog, token mismatch, or clearly wrong product.
   - `UNKNOWN`: insufficient evidence or no direct PDP found.

## Operator Instruction Before Mutation

Manually verify top `sample_rows` first and capture evidence for each row.
Do not mutate DB until evidence demonstrates valid `PASS` candidates.

