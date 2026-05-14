/**
 * Customer UX doctrine — version marker and slice-1 scan targets for tests.
 * Human-readable rules: `docs/BuckParts-CUSTOMER-UX-DOCTRINE.md`.
 * Does not affect buy-path or redirect logic.
 */

/** Bump when doctrine or scan list changes meaningfully. */
export const CUSTOMER_UX_DOCTRINE_VERSION = 1;

/** Public / customer-facing sources enforced in slice-1 doctrine tests. */
export const CUSTOMER_UX_DOCTRINE_SLICE1_REL_PATHS = [
  "src/app/page.tsx",
  "src/components/fridge/FridgeModelFilterSection.tsx",
  "src/components/vertical/VerticalFilterPageContent.tsx",
  "src/components/vertical/VerticalModelPageContent.tsx",
] as const;
