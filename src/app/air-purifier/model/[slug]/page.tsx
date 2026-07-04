import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  VerticalModelPageContent,
  type VerticalModelPrimaryTrustBuy,
} from "@/components/vertical/VerticalModelPageContent";
import { Core400sFlagshipPage } from "@/components/air-purifier/core-400s-flagship/Core400sFlagshipPage";
import {
  AIR_PURIFIER_MODEL_PAGE_INTRO,
  MODEL_PAGE_FIT_CONFIRMATION_AIR_PURIFIER,
} from "@/lib/copy/vertical-fit";
import { isCore400sFlagshipSlug } from "@/lib/air-purifier/core-400s-flagship-v1";
import { getCore400sFlagshipBundle } from "@/lib/data/air-purifier/core-400s-flagship-bundle";
import { getAirPurifierModelBySlug } from "@/lib/data/air-purifier/models";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildAirPurifierModelGoAttribution } from "@/lib/retailers/ap-go-attribution-v1";
import {
  AIR_PURIFIER_MODEL_TRUTH_COPY,
  ModelTruthPanelCopyProvider,
} from "@/components/trust/ModelTruthPanel";
import { buildModelPageTrust } from "@/lib/trust/part-trust";
import { getAirPurifierModelReviewOverride } from "@/lib/air-purifier/air-purifier-model-review-overrides";

export const dynamic = "force-dynamic";

const AIR_PURIFIER_MODEL_PRIMARY_BUY_SUPPRESS =
  "BuckParts does not have enough proof to show a buy button for this replacement filter yet. Verify the part number on your current cartridge or your owner’s manual first.";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getAirPurifierModelBySlug(params.slug);
  if (!model) {
    return { title: "Model not found" };
  }
  return {
    title: `${model.model_number} air purifier filters`,
    description: `Replacement filter numbers for ${model.brand.name} air purifier model ${model.model_number}. Confirm fit, see alternates if listed, compare buying options.`,
    openGraph: { title: `${model.model_number} · ${model.brand.name}` },
  };
}

export default async function AirPurifierModelPage({ params }: Props) {
  const model = await getAirPurifierModelBySlug(params.slug);
  if (!model) notFound();
  const reviewOverride = getAirPurifierModelReviewOverride(params.slug);

  let primaryTrustBuy: VerticalModelPrimaryTrustBuy | undefined;
  if (!reviewOverride && model.filters.length > 0) {
    const primary = model.filters[0]!;
    const buyPathSortContext = buyPathSortContextForFilter(
      primary.slug,
      primary.name,
      primary.oem_part_number,
    );
    const trust = buildModelPageTrust({
      totalFits: model.filters.length,
      hasRecommendedFit: model.filters.some((f) => f.is_recommended_fit),
      primaryIsRecommended: primary.is_recommended_fit,
      retailerLinks: primary.retailer_links,
      oemPartNumber: primary.oem_part_number,
      modelNumber: model.model_number,
      buyPathSortContext,
    });
    primaryTrustBuy = {
      trust,
      mappedPartOptionsCount: model.filters.length,
      hasPrimaryPartNotes: Boolean(primary.notes),
      retailerLinks: primary.retailer_links,
      gateSuppressionSummary: model.primary_buy_path_gate_suppression,
      buySuppressMessage: AIR_PURIFIER_MODEL_PRIMARY_BUY_SUPPRESS,
    };
  }

  if (!reviewOverride && isCore400sFlagshipSlug(params.slug)) {
    const bundle = await getCore400sFlagshipBundle(model);
    return (
      <ModelTruthPanelCopyProvider value={AIR_PURIFIER_MODEL_TRUTH_COPY}>
        <Core400sFlagshipPage
          model={model}
          bundle={bundle}
          primaryTrustBuy={primaryTrustBuy}
          goAttribution={buildAirPurifierModelGoAttribution(model.slug) ?? undefined}
        />
      </ModelTruthPanelCopyProvider>
    );
  }

  return (
    <ModelTruthPanelCopyProvider value={AIR_PURIFIER_MODEL_TRUTH_COPY}>
      {reviewOverride ? (
        <div className="mb-8 rounded-2xl border border-bp-caution/40 bg-bp-caution-soft p-6 text-[15px] leading-relaxed text-bp-caution">
          {reviewOverride.public_message}
        </div>
      ) : null}
      <VerticalModelPageContent
        brandName={model.brand.name}
        modelNumber={model.model_number}
        title={model.title}
        series={model.series}
        notes={model.notes}
        filters={reviewOverride ? [] : model.filters}
        filterBasePath="/air-purifier/filter"
        goBase="/air-purifier/go"
        searchHref="/air-purifier/search"
        fitConfirmation={MODEL_PAGE_FIT_CONFIRMATION_AIR_PURIFIER}
        utilityIntro={AIR_PURIFIER_MODEL_PAGE_INTRO}
        notesSectionTitle="Notes & next steps"
        expandedSearchFooter
        wayfinding={
          <p className="text-sm text-bp-muted">
            <Link
              href="/air-purifier/search"
              className="transition-colors hover:text-bp-text"
            >
              Search
            </Link>
            <span className="mx-2 text-bp-muted/70">·</span>
            <span>{model.brand.name}</span>
          </p>
        }
        primaryTrustBuy={primaryTrustBuy}
        goAttribution={buildAirPurifierModelGoAttribution(params.slug) ?? undefined}
      />
    </ModelTruthPanelCopyProvider>
  );
}
