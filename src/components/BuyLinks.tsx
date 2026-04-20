import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

export type BuyLinkRow = {
  id: string;
  retailer_name: string | null;
  affiliate_url: string;
  is_primary?: boolean | null;
  /** When present, used to hide import mistakes / legacy placeholder keys in buy UI. */
  retailer_key?: string | null;
  /** Present on DB-backed rows; required for Phase 1 buy-path gating in TieredBuyLinks. */
  browser_truth_classification?: string | null;
};

/**
 * Plain `<a href>` (not Next `Link`) so the browser performs a normal navigation to `/go/...`.
 * Next.js `Link` can still trigger duplicate GETs to Route Handlers despite `prefetch={false}`.
 */
export function BuyLinks({
  links,
  goBase = "/go",
}: {
  links: BuyLinkRow[];
  /** e.g. `/air-purifier/go` — no trailing slash */
  goBase?: string;
}) {
  const realLinks = filterRealBuyRetailerLinks(links);

  if (!realLinks.length) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No store checkout links listed here yet. Use the OEM number to shop at a retailer you
        trust.
      </p>
    );
  }

  const base = goBase.replace(/\/$/, "");

  return (
    <ul className="flex flex-col gap-2">
      {realLinks.map((link) => (
        <li key={link.id}>
          <a
            href={`${base}/${link.id}`}
            rel="nofollow sponsored"
            className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {link.retailer_name?.trim() || "Buy online"}
            <span className="ml-2 text-neutral-400" aria-hidden>
              →
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
