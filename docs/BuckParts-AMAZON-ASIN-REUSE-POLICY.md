# BuckParts Amazon ASIN Reuse / Collision Policy

## Purpose

BuckParts may encounter one Amazon ASIN that truthfully represents multiple replacement-part tokens, especially aftermarket compatible and multipack PDPs. Reuse is allowed only as review evidence until the relationship is explicitly proven for the target token.

## Policy

A reused ASIN can be classified as safe-for-review only when all of these are proven:

- The target token is visible in seller-controlled PDP identity/title or an equivalent seller-controlled field.
- The page clearly describes a replacement or compatible relationship for the target token.
- Buyability is visible or status is clearly known.
- The future row can be labeled compatible, aftermarket, or multipack when appropriate.
- Reuse does not imply original manufacturer status unless original manufacturer status is proven.
- Existing ASIN usage does not conflict with the target token relationship.

If proof is incomplete, classification remains `EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED`, `HUMAN_BROWSER_VERIFICATION_REQUIRED`, `NO_SAFE_PDP_FOUND`, or `UNKNOWN`.

## Mutation Boundary

Exact-token proof alone must not make `mutation_ready` true when the same ASIN is already used for other tokens. ASIN reuse/collision review is an owner policy blocker. It is not an agent mutation action and does not authorize retailer_links inserts, CTA promotion, Amazon rescue promotion, token-control edits, or compatibility mapping changes.

## Current Known Application

- `EDR3RXD1` has exact-token PDP evidence for ASIN `B087PDLZL9`, but that ASIN is also used by `4396710` and `4396841` evidence/live rows. Classification remains `EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED`; `mutation_ready` remains `false`.
- `4396508` owner-review evidence uses ASIN `B00NXPKBQ2`; collision status is only what current read-only checks prove.
- `4396842` owner-review evidence remains `NO_SAFE_PDP_FOUND`; proof for `4396841` must not be reused for `4396842`.

