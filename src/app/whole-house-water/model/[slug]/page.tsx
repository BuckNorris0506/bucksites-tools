import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  VerticalModelPageContent,
  type VerticalModelPrimaryTrustBuy,
} from "@/components/vertical/VerticalModelPageContent";
import {
  ModelTruthPanelCopyProvider,
  WHOLE_HOUSE_WATER_MODEL_TRUTH_COPY,
} from "@/components/trust/ModelTruthPanel";
import {
  MODEL_PAGE_FIT_CONFIRMATION_WHOLE_HOUSE,
  WHOLE_HOUSE_WATER_MODEL_PAGE_INTRO,
} from "@/lib/copy/vertical-fit";
import { getWholeHouseWaterModelBySlug } from "@/lib/data/whole-house-water/models";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildModelPageTrust } from "@/lib/trust/part-trust";

export const dynamic = "force-dynamic";

const WHOLE_HOUSE_WATER_MODEL_PRIMARY_BUY_SUPPRESS =
  "BuckParts does not have enough proof to show a buy button for this replacement cartridge yet. Verify the OEM number and dimensions against the cartridge you are removing or your housing specs first.";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getWholeHouseWaterModelBySlug(params.slug);
  if (!model) return { title: "Model not found" };
  return {
    title: `${model.model_number} whole-house water filters`,
    description: `Replacement cartridges for ${model.brand.name} whole-house system ${model.model_number}. Match OEM numbers and housing specs before you buy.`,
  };
}

export default async function WholeHouseWaterModelPage({ params }: Props) {
  const model = await getWholeHouseWaterModelBySlug(params.slug);
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
      buySuppressMessage: WHOLE_HOUSE_WATER_MODEL_PRIMARY_BUY_SUPPRESS,
    };
  }

  return (
    <ModelTruthPanelCopyProvider value={WHOLE_HOUSE_WATER_MODEL_TRUTH_COPY}>
      <VerticalModelPageContent
        brandName={model.brand.name}
        modelNumber={model.model_number}
        title={model.title}
        series={model.series}
        notes={model.notes}
        filters={model.filters}
        filterBasePath="/whole-house-water/filter"
        goBase="/whole-house-water/go"
        searchHref="/whole-house-water/search"
        fitConfirmation={MODEL_PAGE_FIT_CONFIRMATION_WHOLE_HOUSE}
        utilityIntro={WHOLE_HOUSE_WATER_MODEL_PAGE_INTRO}
        notesSectionTitle="Notes & next steps"
        expandedSearchFooter
        wayfinding={
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <Link
              href="/whole-house-water/search"
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
