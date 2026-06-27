import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FridgeTrustFunnelViewTracker } from "@/components/analytics/FridgeTrustFunnelViewTracker";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { BuckPartsVerifiedLinksSection } from "@/components/trust/BuckPartsVerifiedLinksSection";
import {
  deriveFridgeFilterStorePlainStatus,
  VisualReplacementMatchCard,
} from "@/components/trust/VisualReplacementMatchCard";
import { FridgeWinnerFamilyRail } from "@/components/fridge/FridgeWinnerFamilyRail";
import { FilterPdpCompatibleModelsSection } from "@/components/fridge/FilterPdpCompatibleModelsSection";
import { FilterPdpRepoEvidenceSection } from "@/components/fridge/FilterPdpRepoEvidenceSection";
import { FilterPdpTrustDecisionSection } from "@/components/fridge/FilterPdpTrustDecisionSection";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Prose } from "@/components/Prose";
import { getFilterBySlug } from "@/lib/data/filters";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import {
  canonicalAlternatesForIndexablePath,
  isIndexablePageState,
} from "@/lib/seo/canonical";
import {
  buildRefrigeratorFilterProductJsonLd,
  refrigeratorFilterMetadataDescription,
} from "@/lib/seo/structured-data";
import { classifyPageState } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import {
  SITE_SOCIAL_OG_IMAGE,
  SITE_SOCIAL_OG_IMAGE_PATH,
} from "@/lib/site-social-metadata";
import { publicFacingRefrigeratorFilterNotes } from "@/lib/copy/fridge-filter-notes-public";
import {
  BUCKPARTS_VERIFIED_LINK_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX,
} from "@/lib/copy/buckparts-verified-link-copy";
import { resolveFridgeFilterPdpCustomerSafetyV1 } from "@/lib/fridge/fridge-filter-pdp-customer-safety-v1";
import {
  buildFilterPdpRepoEvidencePaths,
  primaryBrowserProofMeta,
} from "@/lib/fridge/filter-pdp-repo-evidence";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import { intervalLabel } from "@/lib/vertical/interval";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

const FRIDGE_FILTER_BUY_SUPPRESS = BUCKPARTS_VERIFIED_LINK_NONE_YET;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  const usefulFilterIds = await loadRefrigeratorUsefulFilterIds();
  const pdpSafety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: filter.slug,
    fridgeModels: filter.fridge_models,
    gatedRetailerLinkCount: filter.retailer_links.length,
  });
  const pageState = classifyPageState({
    isIndexable: pdpSafety.prefer_noindex ? false : usefulFilterIds.has(filter.id),
    validCtaCount: pdpSafety.force_suppress_buy ? 0 : filter.retailer_links.length,
    buyerPathState:
      pdpSafety.force_suppress_buy ||
      !(pdpSafety.display_models_count > 0 && filter.retailer_links.length > 0)
        ? "suppress_buy"
        : "show_buy",
    hasDemandSignal: null,
  });
  const title = `${filter.oem_part_number} refrigerator filter`;
  const description = refrigeratorFilterMetadataDescription(filter.oem_part_number);
  const ogTitle = `${filter.oem_part_number} · ${SITE_DISPLAY_NAME}`;
  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: [SITE_SOCIAL_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [SITE_SOCIAL_OG_IMAGE_PATH],
    },
    robots: getRobotsFromPageState(pageState),
    ...canonicalAlternatesForIndexablePath(`/filter/${params.slug}`, pageState),
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
  const pdpSafety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: filter.slug,
    fridgeModels: filter.fridge_models,
    gatedRetailerLinkCount: filter.retailer_links.length,
  });
  const displayFridgeModels = pdpSafety.display_fridge_models;
  const trustSummary = buildPartPageTrust({
    modelsCount: pdpSafety.display_models_count,
    retailerLinks: filter.retailer_links,
    oemPartNumber: filter.oem_part_number,
    alsoKnownAs: filter.also_known_as,
    notes: filter.notes,
    buyPathSortContext,
  });
  if (pdpSafety.force_suppress_buy) {
    trustSummary.buyer_path_state = "suppress_buy";
  } else if (
    (pdpSafety.prefer_caution_buy ||
      pdpSafety.hidden_quarantined_model_count > 0) &&
    pdpSafety.display_models_count > 0 &&
    filter.retailer_links.length > 0
  ) {
    trustSummary.buyer_path_state = "show_caution_buy";
  }

  const storePlainStatus = deriveFridgeFilterStorePlainStatus({
    gatedLinkCount: filter.retailer_links.length,
    rawLinkCount: filter.retailer_links_raw_count,
    buyerPathShowsStoreButtons: trustSummary.buyer_path_state !== "suppress_buy",
  });

  const publicNotes = publicFacingRefrigeratorFilterNotes(filter.notes);
  const usefulFilterIds = await loadRefrigeratorUsefulFilterIds();
  const filterPageState = classifyPageState({
    isIndexable: pdpSafety.prefer_noindex ? false : usefulFilterIds.has(filter.id),
    validCtaCount: pdpSafety.force_suppress_buy ? 0 : filter.retailer_links.length,
    buyerPathState:
      pdpSafety.force_suppress_buy ||
      !(pdpSafety.display_models_count > 0 && filter.retailer_links.length > 0)
        ? "suppress_buy"
        : "show_buy",
    hasDemandSignal: null,
  });
  const filterProductJsonLd = isIndexablePageState(filterPageState)
    ? buildRefrigeratorFilterProductJsonLd({
        slug: filter.slug,
        oemPartNumber: filter.oem_part_number,
        name: filter.name,
        brandName: filter.brand.name,
        description: refrigeratorFilterMetadataDescription(filter.oem_part_number),
      })
    : null;

  const filterTrustState =
    trustSummary.buyer_path_state === "suppress_buy" ? "suppress_buy" : "show_buy";
  const buyingOptionsShown = trustSummary.buyer_path_state !== "suppress_buy";
  const repoEvidencePaths = buildFilterPdpRepoEvidencePaths({
    censusEvidenceFiles: [],
    retailerLinks: filter.retailer_links,
  });
  const browserProofMeta = primaryBrowserProofMeta(filter.retailer_links);
  const filterTelemetryBase = {
    page_type: "fridge_filter" as const,
    page_slug: filter.slug,
    model_slug: null,
    trust_state: filterTrustState as "suppress_buy" | "show_buy",
    source_tier_present: false,
    has_safe_cta: trustSummary.buyer_path_state !== "suppress_buy",
    is_quarantined: pdpSafety.hidden_quarantined_model_count > 0,
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

        {pdpSafety.filter_page_caution_note ? (
          <div className="rounded-2xl border border-bp-caution/40 bg-bp-caution-soft p-6 text-[15px] leading-relaxed text-bp-caution">
            {pdpSafety.filter_page_caution_note}
          </div>
        ) : null}

        <VisualReplacementMatchCard
          variant="fridge_filter"
          brandName={filter.brand.name}
          brandSlug={filter.brand.slug}
          oemPartNumber={filter.oem_part_number}
          productName={filter.name}
          aliases={filter.also_known_as}
          intervalLabel={interval ?? undefined}
          compatibleModelCount={pdpSafety.display_models_count}
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
            <BuckPartsVerifiedLinksSection>
              <TrustAwareBuySection
                trust={trustSummary}
                links={filter.retailer_links}
                goBase="/go"
                primaryCtaLabel={BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX}
                suppressMessage={FRIDGE_FILTER_BUY_SUPPRESS}
                gateSuppressionSummary={filter.buy_path_gate_suppression}
                buyPathSortContext={buyPathSortContext}
              />
            </BuckPartsVerifiedLinksSection>
          </div>
        </div>

        <FilterPdpTrustDecisionSection
          oemPartNumber={filter.oem_part_number}
          compatibleModelCount={pdpSafety.display_models_count}
          buyingOptionsShown={buyingOptionsShown}
        />

        <FilterPdpRepoEvidenceSection
          repoEvidencePaths={repoEvidencePaths}
          browserProofCheckedAt={browserProofMeta.checkedAt}
          browserProofClassification={browserProofMeta.classification}
        />

        <FilterPdpCompatibleModelsSection
          oemPartNumber={filter.oem_part_number}
          displayModelCount={pdpSafety.display_models_count}
          hiddenQuarantinedModelCount={pdpSafety.hidden_quarantined_model_count}
          models={displayFridgeModels.map((m) => ({
            id: m.id,
            slug: m.slug,
            model_number: m.model_number,
            brand_name: m.brand.name,
          }))}
        />
      </article>
      {filterProductJsonLd ? <JsonLdScript data={filterProductJsonLd} /> : null}
    </section>
  );
}
