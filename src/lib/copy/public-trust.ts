/**
 * Customer-facing trust language for replacement-part pages (decision clarity first).
 * Does not replace launch-buy-links gate logic — copy only.
 */

import type { OemOrCompatible } from "@/lib/trust/part-trust";

/** Homepage meta — homeowner-first; refrigerator water focus; buy-link checks, not vague “verified”. */
export function homePageMetaDescription(siteDisplayName: string): string {
  return `Look up refrigerator water filters by fridge model or OEM cartridge on ${siteDisplayName}, compare what we list against our reference, then follow store links that pass BuckParts buy-link checks when we have them available.`;
}

/** About page meta description (aligned with homepage trust framing). */
export const ABOUT_PAGE_META_DESCRIPTION =
  "What BuckParts does: replacement filter lookup, fit guidance, and store links that pass BuckParts buy-link checks when we list them.";

/** Compare-before-buy checklist — reuse on panels or future standalone blocks. */
export const COMPARE_BEFORE_BUY_CHECKLIST_LINES = [
  "Compare the OEM or part number printed on the cartridge or frame you are removing.",
  "Compare your appliance model number or housing/model sticker against what this page lists.",
  "When in doubt, check your owner’s manual before ordering.",
] as const;

/** Pill label from trust classification — no extra product claims beyond `PartTrustSummary`. */
export function partIdentityPillLabel(oemOrCompatible: OemOrCompatible): string {
  if (oemOrCompatible === "oem") return "OEM part";
  if (oemOrCompatible === "compatible") return "Compatible replacement";
  if (oemOrCompatible === "unknown") return "Part identity";
  return "OEM or compatible part";
}

/** Third bullet under “Why this fits” / link gate outcome. */
export function buyPathStoreLinksBullet(buyerPathIsSuppress: boolean): string {
  return buyerPathIsSuppress
    ? "Store links are not shown until they pass BuckParts buy-link checks"
    : "Store links shown here passed BuckParts buy-link checks";
}

/** Gate hints when inventory exists but rows fail gating (TrustAwareBuySection). */
export function buyPathGateHintSearchPlaceholder(): string {
  return "Some on-file retailer targets are manufacturer search or other discovery URLs, not BuckParts buy-link–checked checkout deep links — those stay hidden.";
}

export function buyPathGateHintMissingBrowserTruth(): string {
  return "Some on-file retailer targets have not completed BuckParts buy-link checks yet.";
}

export function buyPathGateHintUnsafeBrowserTruth(): string {
  return "Some on-file retailer targets failed BuckParts buy-link safety checks for now.";
}

/** ISO 8601 datetime → `YYYY-MM-DD` (UTC) for footnotes; invalid → null (caller omits). */
export function formatBuyLinkCheckedYyyyMmDd(isoDateTime: string): string | null {
  const ms = Date.parse(isoDateTime);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Primary `/go` CTA footnote when `browser_truth_checked_at` exists on the displayed primary row.
 * Does not claim current price/stock.
 */
export function primaryStoreLinkBuyCheckFootnote(isoDateTime: string): string | null {
  const d = formatBuyLinkCheckedYyyyMmDd(isoDateTime);
  if (!d) return null;
  return `This store link passed BuckParts buy-link checks on ${d}. Listing details may have changed since then.`;
}
