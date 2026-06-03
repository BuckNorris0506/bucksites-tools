/**
 * Customer-facing trust language for replacement-part pages (decision clarity first).
 * Does not replace launch-buy-links gate logic — copy only.
 *
 * Customer UX doctrine (human + slice-1 scan list): `docs/BuckParts-CUSTOMER-UX-DOCTRINE.md`, `customer-ux-doctrine.ts`.
 */

import type { OemOrCompatible } from "@/lib/trust/part-trust";
import {
  BUCKPARTS_VERIFIED_LINK_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE,
} from "@/lib/copy/buckparts-verified-link-copy";

export { CUSTOMER_UX_DOCTRINE_VERSION } from "./customer-ux-doctrine";

/** Homepage meta — homeowner-first; refrigerator water focus; reviewed links, not vague “verified”. */
export function homePageMetaDescription(siteDisplayName: string): string {
  return `Look up refrigerator water filters by fridge model or part number on ${siteDisplayName}, compare what we list with your old filter, and use reviewed store links when we have them available.`;
}

/** About page meta description (aligned with homepage trust framing). */
export const ABOUT_PAGE_META_DESCRIPTION =
  "What BuckParts does: replacement filter lookup, fit guidance, and reviewed store links when we list them.";

/** Truth Policy page meta — grant-readiness / public trust pack. */
export const TRUTH_POLICY_PAGE_META_DESCRIPTION =
  "How BuckParts handles fit evidence, uncertainty, original vs compatible labels, and when buying options appear.";

/** Wrong-part prevention page meta — homeowner-facing prevention guide. */
export const WRONG_PART_PREVENTION_PAGE_META_DESCRIPTION =
  "Why replacement filter shopping is confusing, common wrong-part traps, and how BuckParts helps you compare your old filter before you buy.";

/** Compare-before-buy checklist — reuse on panels or future standalone blocks. */
export const COMPARE_BEFORE_BUY_CHECKLIST_LINES = [
  "Compare the part number printed on the cartridge or frame you are removing.",
  "Compare your appliance model number or housing/model sticker against what this page lists.",
  "When in doubt, check your owner’s manual before ordering.",
] as const;

/** Pill label from trust classification — no extra product claims beyond `PartTrustSummary`. */
export function partIdentityPillLabel(oemOrCompatible: OemOrCompatible): string {
  if (oemOrCompatible === "oem") return "Original part";
  if (oemOrCompatible === "compatible") return "Compatible replacement";
  if (oemOrCompatible === "unknown") return "Part identity";
  return "Original or compatible part";
}

/** Third bullet under “Why this fits” / link gate outcome. */
export function buyPathStoreLinksBullet(buyerPathIsSuppress: boolean): string {
  return buyerPathIsSuppress
    ? BUCKPARTS_VERIFIED_LINK_NONE_YET
    : BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE;
}

/** Gate hints when inventory exists but rows fail gating (TrustAwareBuySection). */
export function buyPathGateHintSearchPlaceholder(): string {
  return "Some listings we have on file are not product pages we can safely link to yet, so those stay hidden.";
}

export function buyPathGateHintMissingBrowserTruth(): string {
  return "Some listings are still being reviewed before we show a BuckParts Verified Link.";
}

export function buyPathGateHintUnsafeBrowserTruth(): string {
  return "Some listings did not pass our safety review for now, so those stay hidden.";
}

/** ISO 8601 datetime → `YYYY-MM-DD` (UTC) for footnotes; invalid → null (caller omits). */
export function formatBuyLinkCheckedYyyyMmDd(isoDateTime: string): string | null {
  const ms = Date.parse(isoDateTime);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Primary `/go` buying-option footnote when `browser_truth_checked_at` exists on the displayed primary row.
 * Does not claim current price/stock.
 */
export function primaryStoreLinkBuyCheckFootnote(isoDateTime: string): string | null {
  const d = formatBuyLinkCheckedYyyyMmDd(isoDateTime);
  if (!d) return null;
  return `Shown as a BuckParts Verified Link after we checked the product page against this filter number (${d}).`;
}
