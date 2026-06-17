import React from "react";
import type { BuyLinkRow } from "@/components/BuyLinks";
import {
  BUCKPARTS_VERIFIED_LINK_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX,
  BUCKPARTS_VERIFIED_LINK_ALTERNATES_LABEL,
  buckpartsVerifiedLinksHiddenCountNote,
} from "@/lib/copy/buckparts-verified-link-copy";
import { primaryStoreLinkBuyCheckFootnote } from "@/lib/copy/public-trust";
import {
  buyLinkGateFailureKind,
  filterRealBuyRetailerLinks,
  isOemCatalogSlotKey,
  MULTIPACK_FALLBACK_COPY,
  shouldShowMultipackFallbackCopy,
  sortBestVerifiedBuyLinks,
  type BuyPathSortContext,
} from "@/lib/retailers/launch-buy-links";
import {
  appendApGoAttributionToGoHref,
  type ApGoAttributionV1,
} from "@/lib/retailers/ap-go-attribution-v1";

const MAX_SECONDARY = 2;

/**
 * OEM catalog slot rows that fail live buy gating but are clearly manufacturer site-search URLs.
 * Shown only as direct outbound links (never `/go`) when at least one gated buy link exists.
 */
function firstSuppressedOemCatalogFootnoteLink(links: BuyLinkRow[]): BuyLinkRow | null {
  for (const l of links) {
    if (!isOemCatalogSlotKey(l.retailer_key)) continue;
    const k = buyLinkGateFailureKind(l);
    if (k === "unsafe_browser_truth" || k === "search_placeholder") return l;
  }
  return null;
}

/**
 * One primary storefront CTA and up to two alternates. Reduces choice overload.
 * Uses plain `<a href>` for `/go/...` so only the real navigation hits the Route Handler (no Link prefetch/RSC).
 */
export function TieredBuyLinks({
  links,
  goBase = "/go",
  primaryCtaLabel = BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX,
  buyPathSortContext,
  goAttribution,
}: {
  links: BuyLinkRow[];
  goBase?: string;
  /** Screen-reader + button prefix; store name is appended. */
  primaryCtaLabel?: string;
  /** When set (e.g. from `buyPathSortContextForFilter`), exact-OEM context can affect tie-break among gated links. */
  buyPathSortContext?: BuyPathSortContext;
  /** When set (AP phase 1), appended as query params on `/go` hrefs for click_events attribution. */
  goAttribution?: ApGoAttributionV1 | null;
}) {
  const base = goBase.replace(/\/$/, "");

  const realLinks = filterRealBuyRetailerLinks(links);

  if (!realLinks.length) {
    return (
      <p className="text-sm text-bp-muted">{BUCKPARTS_VERIFIED_LINK_NONE_YET}</p>
    );
  }

  const sorted = sortBestVerifiedBuyLinks(realLinks, buyPathSortContext);
  const primary = sorted[0];
  const alternates = sorted.slice(1, 1 + MAX_SECONDARY);
  const hiddenCount = Math.max(0, sorted.length - 1 - MAX_SECONDARY);
  const oemCatalogFootnote = firstSuppressedOemCatalogFootnoteLink(links);
  const showMultipackFallbackCopy = shouldShowMultipackFallbackCopy(sorted);

  const primaryName = primary.retailer_name?.trim() || "Recommended store";
  const primaryCheckNote =
    primary.browser_truth_checked_at != null && String(primary.browser_truth_checked_at).trim() !== ""
      ? primaryStoreLinkBuyCheckFootnote(String(primary.browser_truth_checked_at))
      : null;

  return (
    <div className="space-y-3">
      {showMultipackFallbackCopy ? (
        <p className="text-sm text-bp-text/90">{MULTIPACK_FALLBACK_COPY}</p>
      ) : null}
      <div>
        <a
          href={appendApGoAttributionToGoHref(`${base}/${primary.id}`, goAttribution)}
          rel="nofollow sponsored"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-bp-trust/15 bg-bp-trust px-5 text-center text-base font-semibold text-white transition-colors hover:bg-bp-trust/90 focus:outline-none focus:ring-2 focus:ring-bp-trust/40 focus:ring-offset-2 focus:ring-offset-bp-bg sm:w-auto sm:min-w-[14rem]"
        >
          <span className="sr-only">{primaryCtaLabel} at </span>
          {primaryName}
          <span className="ml-2 text-white/75" aria-hidden>
            →
          </span>
        </a>
        {primaryCheckNote ? (
          <p className="mt-2 text-xs leading-relaxed text-bp-muted">
            {primaryCheckNote}
          </p>
        ) : null}
      </div>

      {alternates.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-bp-border pt-3">
          <p className="text-xs font-medium text-bp-muted">
            {BUCKPARTS_VERIFIED_LINK_ALTERNATES_LABEL}
          </p>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {alternates.map((link) => (
              <li key={link.id}>
                <a
                  href={appendApGoAttributionToGoHref(`${base}/${link.id}`, goAttribution)}
                  rel="nofollow sponsored"
                  className="inline-flex w-full items-center justify-center rounded-md border border-bp-border bg-bp-surface px-3 py-2 text-sm font-medium text-bp-text transition-colors hover:bg-bp-trust-soft/50 sm:w-auto"
                >
                  {link.retailer_name?.trim() || "Buy online"}
                  <span className="ml-1.5 text-bp-muted" aria-hidden>
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <p className="text-xs text-bp-muted">
              {buckpartsVerifiedLinksHiddenCountNote(hiddenCount)}
            </p>
          )}
        </div>
      )}

      {oemCatalogFootnote ? (
        <div className="border-t border-bp-border pt-3">
          <p className="text-xs font-medium text-bp-muted">
            Brand parts reference
          </p>
          <p className="mt-1 text-xs text-bp-muted">
            Opens the manufacturer site for reference. This is not a BuckParts Verified Link
            above—use it to double-check fit if you need to.
          </p>
          <a
            href={oemCatalogFootnote.affiliate_url}
            rel="nofollow noopener noreferrer"
            className="mt-2 inline-flex text-sm font-medium text-bp-trust underline-offset-2 hover:underline"
          >
            {oemCatalogFootnote.retailer_name?.trim() || "Manufacturer parts search page"}
            <span className="ml-1 text-bp-muted" aria-hidden>
              ↗
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
