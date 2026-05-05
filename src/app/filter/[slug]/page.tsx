import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import {
  deriveFridgeFilterStorePlainStatus,
  VisualReplacementMatchCard,
} from "@/components/trust/VisualReplacementMatchCard";
import { FridgeWinnerFamilyRail } from "@/components/fridge/FridgeWinnerFamilyRail";
import { Prose } from "@/components/Prose";
import { getFilterBySlug } from "@/lib/data/filters";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { classifyPageState } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import { intervalLabel } from "@/lib/vertical/interval";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

const FRIDGE_FILTER_BUY_SUPPRESS =
  "Compare your old filter or manual first — we're not showing a store button on this page yet.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  const usefulFilterIds = await loadRefrigeratorUsefulFilterIds();
  const pageState = classifyPageState({
    isIndexable: usefulFilterIds.has(filter.id),
    validCtaCount: filter.retailer_links.length,
    buyerPathState:
      filter.fridge_models.length > 0 && filter.retailer_links.length > 0
        ? "show_buy"
        : "suppress_buy",
    hasDemandSignal: null,
  });
  const title = `${filter.oem_part_number} refrigerator filter`;
  return {
    title,
    description: `OEM part ${filter.oem_part_number}. Compatible refrigerators and replacement interval.`,
    openGraph: { title: `${filter.oem_part_number} · ${SITE_DISPLAY_NAME}` },
    robots: getRobotsFromPageState(pageState),
  };
}

export default async function FilterPage({ params }: Props) {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) notFound();

  const interval = intervalLabel(filter.replacement_interval_months);
  const buyPathSortContext = buyPathSortContextForFilter(
    filter.slug,
    filter.name,
    filter.oem_part_number,
  );
  const trustSummary = buildPartPageTrust({
    modelsCount: filter.fridge_models.length,
    retailerLinks: filter.retailer_links,
    oemPartNumber: filter.oem_part_number,
    alsoKnownAs: filter.also_known_as,
    notes: filter.notes,
    buyPathSortContext,
  });

  const storePlainStatus = deriveFridgeFilterStorePlainStatus({
    gatedLinkCount: filter.retailer_links.length,
    rawLinkCount: filter.retailer_links_raw_count,
    buyerPathShowsStoreButtons: trustSummary.buyer_path_state !== "suppress_buy",
  });

  return (
    <article className="space-y-10">
      <FridgeWinnerFamilyRail currentSlug={filter.slug} />

      <VisualReplacementMatchCard
        variant="fridge_filter"
        brandName={filter.brand.name}
        brandSlug={filter.brand.slug}
        oemPartNumber={filter.oem_part_number}
        productName={filter.name}
        aliases={filter.also_known_as}
        intervalLabel={interval ?? undefined}
        compatibleModelCount={filter.fridge_models.length}
        storePlainStatus={storePlainStatus}
      />

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-7">
        {filter.notes ? (
          <div className="max-w-prose">
            <Prose>{filter.notes}</Prose>
          </div>
        ) : null}

        <div
          className={
            filter.notes ? "mt-7 border-t border-neutral-100 pt-6 dark:border-neutral-800" : ""
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Where to buy
          </p>
          <div className="mt-3">
            <TrustAwareBuySection
              trust={trustSummary}
              links={filter.retailer_links}
              goBase="/go"
              primaryCtaLabel="Buy this part at"
              suppressMessage={FRIDGE_FILTER_BUY_SUPPRESS}
              gateSuppressionSummary={filter.buy_path_gate_suppression}
              buyPathSortContext={buyPathSortContext}
            />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Compatible refrigerator models ({filter.fridge_models.length})
        </h2>
        {filter.fridge_models.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No models are listed yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {filter.fridge_models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/fridge/${m.slug}`}
                  className="block px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {m.model_number}
                  </span>
                  <span className="ml-2 text-neutral-500">{m.brand.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
