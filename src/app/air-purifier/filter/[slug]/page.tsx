import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  HoneywellHrfFamilyRail,
  isHoneywellHrfSlug,
} from "@/components/air-purifier/HoneywellHrfFamilyRail";
import { ApHomeownerFilterPage } from "@/components/air-purifier/homeowner/ApHomeownerFilterPage";
import { VerticalFilterPageContent } from "@/components/vertical/VerticalFilterPageContent";
import { isApHomeownerFilterPilotSlug } from "@/lib/air-purifier/ap-homeowner-framework-v1";
import { getApHomeownerFilterPageCopy } from "@/lib/copy/ap-homeowner-filter-copy-v1";
import {
  AIR_PURIFIER_FILTER_PAGE_INTRO,
  FILTER_PAGE_FIT_CONFIRMATION_AIR_PURIFIER,
} from "@/lib/copy/vertical-fit";
import { getAirPurifierFilterBySlug } from "@/lib/data/air-purifier/filters";
import {
  filterCompatModelsForCustomerDisplayV1,
  filterPageCompatExclusionNoteV1,
} from "@/lib/air-purifier/air-purifier-compat-display-overrides-v1";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildAirPurifierFilterGoAttribution } from "@/lib/retailers/ap-go-attribution-v1";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getAirPurifierFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  return {
    title: `${filter.oem_part_number} air purifier filter`,
    description: `Replacement cartridge ${filter.oem_part_number}${
      filter.brand.name ? ` (${filter.brand.name})` : ""
    }—which purifier models it fits, change interval if listed, and where to buy.`,
  };
}

export default async function AirPurifierFilterPage({ params }: Props) {
  const filter = await getAirPurifierFilterBySlug(params.slug);
  if (!filter) notFound();

  const showHoneywellRail = isHoneywellHrfSlug(filter.slug);
  const compatNote = filterPageCompatExclusionNoteV1(filter.slug);
  const displayModels = filterCompatModelsForCustomerDisplayV1(filter.slug, filter.models);

  if (isApHomeownerFilterPilotSlug(filter.slug)) {
    const copy = getApHomeownerFilterPageCopy(filter.slug);
    if (!copy) notFound();

    const buyPathSortContext = buyPathSortContextForFilter(
      filter.slug,
      filter.name,
      filter.oem_part_number,
    );
    const trust = buildPartPageTrust({
      modelsCount: displayModels.length,
      retailerLinks: filter.retailer_links,
      oemPartNumber: filter.oem_part_number,
      alsoKnownAs: filter.also_known_as,
      notes: filter.notes,
      buyPathSortContext,
    });

    return (
      <ApHomeownerFilterPage
        copy={copy}
        oemPartNumber={filter.oem_part_number}
        filterName={filter.name}
        replacementIntervalMonths={filter.replacement_interval_months}
        models={displayModels}
        retailerLinks={filter.retailer_links}
        trust={trust}
        gateSuppressionSummary={filter.buy_path_gate_suppression}
        buyPathSortContext={buyPathSortContext}
        goAttribution={buildAirPurifierFilterGoAttribution(filter.slug) ?? undefined}
      />
    );
  }

  return (
    <div className="space-y-10">
      {showHoneywellRail ? <HoneywellHrfFamilyRail currentSlug={filter.slug} /> : null}
      {compatNote ? (
        <div className="rounded-2xl border border-bp-caution/40 bg-bp-caution-soft p-6 text-[15px] leading-relaxed text-bp-caution">
          {compatNote}
        </div>
      ) : null}
      <VerticalFilterPageContent
        brandName={filter.brand.name}
        filterSlug={filter.slug}
        oemPartNumber={filter.oem_part_number}
        name={filter.name}
        replacementIntervalMonths={filter.replacement_interval_months}
        notes={filter.notes}
        models={displayModels}
        modelBasePath="/air-purifier/model"
        retailerLinks={filter.retailer_links}
        officialReferenceLinks={filter.official_reference_links}
        gateSuppressionSummary={filter.buy_path_gate_suppression}
        goBase="/air-purifier/go"
        searchHref="/air-purifier/search"
        fitConfirmation={FILTER_PAGE_FIT_CONFIRMATION_AIR_PURIFIER}
        utilityIntro={AIR_PURIFIER_FILTER_PAGE_INTRO}
        notesSectionTitle="Notes & next steps"
        expandedSearchFooter
        alsoKnownAs={filter.also_known_as}
        goAttribution={buildAirPurifierFilterGoAttribution(filter.slug) ?? undefined}
        wayfinding={
          <p className="text-sm text-bp-muted">
            <Link
              href="/air-purifier/search"
              className="transition-colors hover:text-bp-text"
            >
              Search
            </Link>
            <span className="mx-2 text-bp-muted/70">·</span>
            <span>{filter.brand.name}</span>
          </p>
        }
      />
    </div>
  );
}
