/**
 * Read-only proof helpers: extract purchase-option `/go` CTA order from rendered HTML.
 * Avoids raw `indexOf("Amazon")` false positives outside the buying-options block.
 */

export type PurchaseOptionCtaTierV1 = "primary" | "alternate";

export type PurchaseOptionCtaEntryV1 = {
  tier: PurchaseOptionCtaTierV1;
  link_id: string;
  retailer_label: string;
  href: string;
};

export type PurchaseOptionCtaOrderProofV1 = {
  buying_options_section_found: boolean;
  /** Ordered `/go/{id}` CTAs inside the buying-options block only. */
  cta_order: PurchaseOptionCtaEntryV1[];
  primary: PurchaseOptionCtaEntryV1 | null;
  alternates: PurchaseOptionCtaEntryV1[];
  /** Document-wide first index (diagnostic only — not used for pass/fail). */
  raw_text_index_amazon: number;
  raw_text_index_waterdrop: number;
};

const BUYING_OPTIONS_MARKER = "Buying options";
/** End of buying-options block (do not include "Other options" — that labels alternates inside the block). */
const SECTION_END_MARKERS = ["Compatible refrigerator models", "Compatible models"] as const;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractBuyingOptionsSlice(html: string): string | null {
  const start = html.indexOf(BUYING_OPTIONS_MARKER);
  if (start < 0) return null;
  let end = html.length;
  for (const marker of SECTION_END_MARKERS) {
    const i = html.indexOf(marker, start + BUYING_OPTIONS_MARKER.length);
    if (i >= 0) end = Math.min(end, i);
  }
  const modelsIdx = html.indexOf("<h2", start + 1);
  if (modelsIdx >= 0) end = Math.min(end, modelsIdx);
  return html.slice(start, end);
}

/** Trailing CTA arrow (U+2192) from TieredBuyLinks markup — no `u` regex flag (ES5-safe target). */
function stripTrailingCtaArrow(text: string): string {
  return text.replace(/\u2192\s*$/, "").trim();
}

function retailerLabelFromAnchorInner(html: string): string {
  const withoutSr = html.replace(/<span[^>]*class="[^"]*sr-only[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");
  const text = stripTags(withoutSr);
  return stripTrailingCtaArrow(text);
}

function parseGoAnchorsInOrder(html: string): PurchaseOptionCtaEntryV1[] {
  const cta_order: PurchaseOptionCtaEntryV1[] = [];
  const anchorRe = /<a\b[^>]*\bhref="(\/go\/([a-f0-9-]+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const tier: PurchaseOptionCtaTierV1 = cta_order.length === 0 ? "primary" : "alternate";
    cta_order.push({
      tier,
      link_id: m[2]!,
      retailer_label: retailerLabelFromAnchorInner(m[3]!),
      href: m[1]!,
    });
  }
  return cta_order;
}

/** TieredBuyLinks primary CTA uses `bg-bp-trust` on the anchor (filter PDP buying block). */
function extractFromTieredBuyLinksStructure(html: string): PurchaseOptionCtaEntryV1[] | null {
  const primaryRe =
    /<a\b([^>]*)\bhref="(\/go\/([a-f0-9-]+))"([^>]*)>([\s\S]*?)<\/a>/gi;
  const alternates: PurchaseOptionCtaEntryV1[] = [];
  let primary: PurchaseOptionCtaEntryV1 | null = null;
  let m: RegExpExecArray | null;
  while ((m = primaryRe.exec(html)) !== null) {
    const attrs = `${m[1] ?? ""} ${m[4] ?? ""}`;
    const entry: PurchaseOptionCtaEntryV1 = {
      tier: "alternate",
      link_id: m[3]!,
      retailer_label: retailerLabelFromAnchorInner(m[5]!),
      href: m[2]!,
    };
    if (!primary && /\bbg-bp-trust\b/.test(attrs)) {
      primary = { ...entry, tier: "primary" };
      continue;
    }
    alternates.push(entry);
  }
  if (!primary) return null;
  return [primary, ...alternates];
}

/**
 * Parse TieredBuyLinks markup inside the buying-options block when present; otherwise
 * fall back to structural primary (`bg-bp-trust` + `/go/`).
 */
export function extractPurchaseOptionCtaOrderFromHtml(html: string): PurchaseOptionCtaOrderProofV1 {
  const raw_text_index_amazon = html.indexOf("Amazon");
  const raw_text_index_waterdrop = html.indexOf("Waterdrop");

  const slice = extractBuyingOptionsSlice(html);
  const structural = slice ? null : extractFromTieredBuyLinksStructure(html);
  const cta_order = slice
    ? parseGoAnchorsInOrder(slice)
    : structural ?? [];

  const primary = cta_order.find((e) => e.tier === "primary") ?? null;
  const alternates = cta_order.filter((e) => e.tier === "alternate");

  return {
    buying_options_section_found: slice != null || structural != null,
    cta_order,
    primary,
    alternates,
    raw_text_index_amazon,
    raw_text_index_waterdrop,
  };
}

export type ExpectedPurchaseOptionOrderCheckV1 = {
  ok: boolean;
  reason: string;
  expected_primary_link_id: string;
  actual_primary_link_id: string | null;
  proof: PurchaseOptionCtaOrderProofV1;
};

/** Pass when primary `/go` id matches expected (e.g. Waterdrop row on da29-00020b proof slice). */
export function checkExpectedPrimaryPurchaseOptionCta(
  html: string,
  expectedPrimaryLinkId: string,
): ExpectedPurchaseOptionOrderCheckV1 {
  const proof = extractPurchaseOptionCtaOrderFromHtml(html);
  const expected = expectedPrimaryLinkId.trim().toLowerCase();
  const actual = proof.primary?.link_id?.trim().toLowerCase() ?? null;

  if (!proof.buying_options_section_found) {
    return {
      ok: false,
      reason: "Buying options section not found in HTML",
      expected_primary_link_id: expected,
      actual_primary_link_id: actual,
      proof,
    };
  }
  if (!actual) {
    return {
      ok: false,
      reason: "No primary /go CTA found in buying-options section",
      expected_primary_link_id: expected,
      actual_primary_link_id: null,
      proof,
    };
  }
  if (actual !== expected) {
    return {
      ok: false,
      reason: `Primary CTA is ${proof.primary?.retailer_label ?? actual} (${actual}), expected ${expected}`,
      expected_primary_link_id: expected,
      actual_primary_link_id: actual,
      proof,
    };
  }
  return {
    ok: true,
    reason: "Primary purchase-option CTA matches expected link id",
    expected_primary_link_id: expected,
    actual_primary_link_id: actual,
    proof,
  };
}
