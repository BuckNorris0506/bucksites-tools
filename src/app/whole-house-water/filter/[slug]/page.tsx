import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerticalFilterPageContent } from "@/components/vertical/VerticalFilterPageContent";
import {
  FILTER_PAGE_FIT_CONFIRMATION_WHOLE_HOUSE,
  WHOLE_HOUSE_WATER_FILTER_PAGE_INTRO,
} from "@/lib/copy/vertical-fit";
import { getWholeHouseWaterPartBySlug } from "@/lib/data/whole-house-water/filters";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const part = await getWholeHouseWaterPartBySlug(params.slug);
  if (!part) return { title: "Cartridge not found" };
  return {
    title: `${part.oem_part_number} whole-house water filter`,
    description: `Whole-home cartridge ${part.oem_part_number}${
      part.brand.name ? ` (${part.brand.name})` : ""
    }—compatible system models, notes, and buying links. Always match your housing size and rating.`,
  };
}

export default async function WholeHouseWaterFilterPage({ params }: Props) {
  const part = await getWholeHouseWaterPartBySlug(params.slug);
  if (!part) notFound();

  return (
    <VerticalFilterPageContent
      brandName={part.brand.name}
      oemPartNumber={part.oem_part_number}
      name={part.name}
      replacementIntervalMonths={part.replacement_interval_months}
      notes={part.notes}
      models={part.models}
      modelBasePath="/whole-house-water/model"
      retailerLinks={part.retailer_links}
      goBase="/whole-house-water/go"
      searchHref="/whole-house-water/search"
      fitConfirmation={FILTER_PAGE_FIT_CONFIRMATION_WHOLE_HOUSE}
      utilityIntro={WHOLE_HOUSE_WATER_FILTER_PAGE_INTRO}
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
          <span>{part.brand.name}</span>
        </p>
      }
    />
  );
}
