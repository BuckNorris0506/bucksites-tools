import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  VerticalModelPageContent,
  type VerticalModelPrimaryTrustBuy,
} from "@/components/vertical/VerticalModelPageContent";
import {
  AIR_PURIFIER_MODEL_PAGE_INTRO,
  MODEL_PAGE_FIT_CONFIRMATION_AIR_PURIFIER,
} from "@/lib/copy/vertical-fit";
import { getAirPurifierModelBySlug } from "@/lib/data/air-purifier/models";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import {
  AIR_PURIFIER_MODEL_TRUTH_COPY,
  ModelTruthPanelCopyProvider,
} from "@/components/trust/ModelTruthPanel";
import { buildModelPageTrust } from "@/lib/trust/part-trust";

export const dynamic = "force-dynamic";

const AIR_PURIFIER_MODEL_PRIMARY_BUY_SUPPRESS =
  "BuckParts does not have enough proof to show a buy button for this replacement filter yet. Verify the OEM number on your current cartridge or your owner’s manual first.";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getAirPurifierModelBySlug(params.slug);
  if (!model) {
    return { title: "Model not found" };
  }
  return {
    title: `${model.model_number} air purifier filters`,
    description: `Replacement filter numbers for ${model.brand.name} air purifier model ${model.model_number}. Confirm OEM fit, see alternates if listed, compare buying options.`,
    openGraph: { title: `${model.model_number} · ${model.brand.name}` },
  };
}

export default async function AirPurifierModelPage({ params }: Props) {
  const model = await getAirPurifierModelBySlug(params.slug);
  if (!model) notFound();

  let primaryTrustBuy: VerticalModelPrimaryTrustBuy | undefined;
  if (model.filters.length > 0) {
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

  return (
    <ModelTruthPanelCopyProvider value={AIR_PURIFIER_MODEL_TRUTH_COPY}>
      <VerticalModelPageContent
        brandName={model.brand.name}
        modelNumber={model.model_number}
        title={model.title}
        series={model.series}
        notes={model.notes}
        filters={model.filters}
        filterBasePath="/air-purifier/filter"
        goBase="/air-purifier/go"
        searchHref="/air-purifier/search"
        fitConfirmation={MODEL_PAGE_FIT_CONFIRMATION_AIR_PURIFIER}
        utilityIntro={AIR_PURIFIER_MODEL_PAGE_INTRO}
        notesSectionTitle="Notes & next steps"
        expandedSearchFooter
        wayfinding={
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <Link
              href="/air-purifier/search"
              className="hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Search
            </Link>
            <span className="mx-2">·</span>
            <span>{model.brand.name}</span>
          </p>
        }
        primaryTrustBuy={primaryTrustBuy}
      />
    </ModelTruthPanelCopyProvider>
  );
}
