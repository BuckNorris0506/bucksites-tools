import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerticalModelPageContent } from "@/components/vertical/VerticalModelPageContent";
import {
  MODEL_PAGE_FIT_CONFIRMATION_WHOLE_HOUSE,
  WHOLE_HOUSE_WATER_MODEL_PAGE_INTRO,
} from "@/lib/copy/vertical-fit";
import { getWholeHouseWaterModelBySlug } from "@/lib/data/whole-house-water/models";

export const dynamic = "force-dynamic";

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

  return (
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
    />
  );
}
