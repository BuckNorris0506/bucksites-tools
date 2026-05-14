import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FridgeTrustFunnelViewTracker } from "@/components/analytics/FridgeTrustFunnelViewTracker";
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
import { publicFacingRefrigeratorFilterNotes } from "@/lib/copy/fridge-filter-notes-public";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import { intervalLabel } from "@/lib/vertical/interval";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

const FRIDGE_FILTER_BUY_SUPPRESS =
  "No buying options yet. We haven’t found a product page we’re comfortable showing for this filter number.";

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
    description: `Part ${filter.oem_part_number} refrigerator water filter — compatible models and replacement timing.`,
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

  const publicNotes = publicFacingRefrigeratorFilterNotes(filter.notes);
  const filterTrustState =
    trustSummary.buyer_path_state === "suppress_buy" ? "suppress_buy" : "show_buy";
  const filterTelemetryBase = {
    page_type: "fridge_filter" as const,
    page_slug: filter.slug,
    model_slug: null,
    trust_state: filterTrustState as "suppress_buy" | "show_buy",
    source_tier_present: false,
    has_safe_cta: trustSummary.buyer_path_state !== "suppress_buy",
    is_quarantined: false,
  };

  return (
    <section className="-mx-4 bg-bp-bg px-4 py-8 sm:-mx-6 sm:px-6 sm:py-10 lg:-mx-8 lg:px-8 lg:py-12">
      <article className="mx-auto max-w-2xl space-y-10 sm:space-y-12">
        <FridgeTrustFunnelViewTracker
          onceKey={`fridge_filter_view:${filter.slug}`}
          payload={{
            event_name: "fridge_filter_view",
            ...filterTelemetryBase,
            filter_slug: filter.slug,
          }}
        />
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
          telemetryBase={{
            ...filterTelemetryBase,
          }}
        />

        <div className="overflow-hidden rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7">
          {publicNotes ? (
            <div className="max-w-prose text-sm text-bp-text/90">
              <Prose>{publicNotes}</Prose>
            </div>
          ) : null}

          <div className={publicNotes ? "mt-7 border-t border-bp-border pt-7" : ""}>
            <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">Buying options</p>
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

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-bp-text">
            Compatible refrigerator models ({filter.fridge_models.length})
          </h2>
          {filter.fridge_models.length === 0 ? (
            <p className="text-sm leading-relaxed text-bp-muted">
              No refrigerator models are linked to this part number on file yet. If you have your fridge model or
              another code from the old filter,{" "}
              <Link
                href="/search"
                className="font-semibold text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55"
              >
                try search
              </Link>{" "}
              to check spelling, then compare what you see to the numbers on the cartridge before you buy.
            </p>
          ) : (
            <ul className="divide-y divide-bp-border overflow-hidden rounded-xl border border-bp-border bg-bp-surface">
              {filter.fridge_models.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/fridge/${m.slug}`}
                    className="block px-4 py-3.5 text-sm transition hover:bg-bp-trust-soft/40"
                  >
                    <span className="bp-code font-semibold text-bp-text">{m.model_number}</span>
                    <span className="ml-2 text-bp-muted">{m.brand.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </section>
  );
}
