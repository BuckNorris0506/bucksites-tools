import type { BuyLinkRow } from "@/components/BuyLinks";
import {
  buyLinkGateFailureKind,
  filterRealBuyRetailerLinks,
  isOemCatalogSlotKey,
} from "@/lib/retailers/launch-buy-links";

function sortRetailerLinks(links: BuyLinkRow[]): BuyLinkRow[] {
  return [...links].sort((a, b) => {
    const ap = a.is_primary ? 1 : 0;
    const bp = b.is_primary ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (a.retailer_name ?? "").localeCompare(b.retailer_name ?? "");
  });
}

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
  primaryCtaLabel = "Buy replacement",
}: {
  links: BuyLinkRow[];
  goBase?: string;
  /** Screen-reader + button prefix; store name is appended. */
  primaryCtaLabel?: string;
}) {
  const base = goBase.replace(/\/$/, "");

  const realLinks = filterRealBuyRetailerLinks(links);

  if (!realLinks.length) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        No store checkout links listed here yet. Use the OEM part number above to shop at a
        retailer you trust—we don’t show web search as a buy button.
      </p>
    );
  }

  const sorted = sortRetailerLinks(realLinks);
  const primary = sorted[0];
  const alternates = sorted.slice(1, 1 + MAX_SECONDARY);
  const hiddenCount = Math.max(0, sorted.length - 1 - MAX_SECONDARY);
  const oemCatalogFootnote = firstSuppressedOemCatalogFootnoteLink(links);

  const primaryName = primary.retailer_name?.trim() || "Recommended store";

  return (
    <div className="space-y-3">
      <div>
        <a
          href={`${base}/${primary.id}`}
          rel="nofollow sponsored"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-neutral-900 px-5 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white dark:focus:ring-offset-neutral-950 sm:w-auto sm:min-w-[14rem]"
        >
          <span className="sr-only">{primaryCtaLabel} at </span>
          {primaryName}
          <span className="ml-2 text-neutral-300 dark:text-neutral-600" aria-hidden>
            →
          </span>
        </a>
      </div>

      {alternates.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Other options
          </p>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {alternates.map((link) => (
              <li key={link.id}>
                <a
                  href={`${base}/${link.id}`}
                  rel="nofollow sponsored"
                  className="inline-flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 sm:w-auto"
                >
                  {link.retailer_name?.trim() || "Buy online"}
                  <span className="ml-1.5 text-neutral-400" aria-hidden>
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              +{hiddenCount} more store link{hiddenCount !== 1 ? "s" : ""} not shown — same part
              page.
            </p>
          )}
        </div>
      )}

      {oemCatalogFootnote ? (
        <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Manufacturer catalog lookup
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Not a verified checkout deep link — opens the OEM site directly (not a BuckParts /go hop).
          </p>
          <a
            href={oemCatalogFootnote.affiliate_url}
            rel="nofollow noopener noreferrer"
            className="mt-2 inline-flex text-sm font-medium text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-200"
          >
            {oemCatalogFootnote.retailer_name?.trim() || "OEM / manufacturer catalog (keyword lookup)"}
            <span className="ml-1 text-neutral-400" aria-hidden>
              ↗
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
